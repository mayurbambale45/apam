const fs           = require('fs');
const path         = require('path');
const pdfParseLib  = require('pdf-parse');
const Groq         = require('groq-sdk');

// ─────────────────────────────────────────────────────────────────────────────
//  Startup validation
// ─────────────────────────────────────────────────────────────────────────────
if (!process.env.GROQ_API_KEY) {
    console.error('[aiEvaluator] CRITICAL: GROQ_API_KEY is not set in .env');
}

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Model selection - using Llama 4 Scout (active Groq vision model as of 2026)
// llama-3.2-90b-vision-preview and llama-3.2-11b-vision-preview are DECOMMISSIONED
const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';
const TEXT_MODEL   = 'llama-3.3-70b-versatile';

// ─────────────────────────────────────────────────────────────────────────────
//  Retry wrapper — handles Groq 429 (rate-limit) with exponential back-off
// ─────────────────────────────────────────────────────────────────────────────
async function withRetry(fn, maxRetries = 4) {
    let lastErr;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (err) {
            lastErr = err;
            const status = err.status ?? err.statusCode ?? err.code;
            const isRetryable = status === 429 || status === 503;
            if (!isRetryable || attempt === maxRetries) throw err;

            const retryAfter = err.headers?.['retry-after'];
            const delay = retryAfter
                ? parseFloat(retryAfter) * 1000
                : Math.pow(2, attempt) * 1500 + Math.random() * 500;

            console.warn(`[aiEvaluator] Groq rate-limited (attempt ${attempt}/${maxRetries}). Retrying in ${Math.round(delay / 1000)}s…`);
            await new Promise(r => setTimeout(r, delay));
        }
    }
    throw lastErr;
}

// ─────────────────────────────────────────────────────────────────────────────
//  STEP 1 — Extract text from an answer sheet (image or PDF)
// ─────────────────────────────────────────────────────────────────────────────
async function extractTextFromVision(filePath) {
    const fullPath = path.resolve(__dirname, '../', filePath);

    if (!fs.existsSync(fullPath)) {
        throw new Error(`Answer sheet file not found: ${filePath}`);
    }

    const ext = path.extname(fullPath).toLowerCase();

    // ── PDF path ──────────────────────────────────────────────────────────────
    if (ext === '.pdf') {
        try {
            const buffer = fs.readFileSync(fullPath);
            let text = '';

            if (pdfParseLib.PDFParse) {
                const parser = new pdfParseLib.PDFParse({ data: buffer });
                const parseResult = await parser.getText();
                text = (parseResult.text || '').trim();
                await parser.destroy();
            } else {
                const legacyParse = typeof pdfParseLib === 'function' ? pdfParseLib : (pdfParseLib.default || pdfParseLib);
                const parseResult = await legacyParse(buffer);
                text = (parseResult.text || '').trim();
            }

            if (text.length > 50) {
                console.log(`[aiEvaluator] PDF text extracted via pdf-parse (${text.length} chars)`);
                return text;
            }

            console.warn('[aiEvaluator] PDF appears to be scanned/image-based. Text extraction returned minimal content.');
            return `[PDF Extraction Notice]\nThis appears to be a scanned or handwritten PDF.\npdf-parse extracted only: "${text}"\n\nPlease re-upload the answer sheet as a JPG or PNG image for accurate OCR via AI vision.`;
        } catch (pdfErr) {
            console.error('[aiEvaluator] pdf-parse error:', pdfErr.message);
            throw new Error(`PDF parsing failed: ${pdfErr.message}`);
        }
    }

    // ── Image path: use Groq vision API ──────────────────────────────────────
    if (!['.jpg', '.jpeg', '.png'].includes(ext)) {
        throw new Error(`Unsupported file type: ${ext}. Use PDF, JPG, or PNG.`);
    }

    const mimeType   = ext === '.png' ? 'image/png' : 'image/jpeg';
    const base64Data = fs.readFileSync(fullPath).toString('base64');
    const imageUrl   = `data:${mimeType};base64,${base64Data}`;

    const prompt = `You are an expert OCR and academic transcription system.

Extract ALL handwritten or printed text from this student answer sheet image.
- Do NOT summarise, correct, or rephrase anything.
- Preserve the original structure: Question numbers (Q1, Q2, etc.), sub-parts (a, b, c), etc.
- Separate each answer with a clear label like "Q1:", "Q2:", etc.
- Mark any illegible or unclear words as [unclear].
- Return plain text only — no markdown, no commentary.
- If the sheet appears blank, write: [BLANK SUBMISSION]`;

    let response;
    let text = null;
    try {
        response = await withRetry(() =>
            groq.chat.completions.create({
                model: VISION_MODEL,
                messages: [
                    {
                        role: 'user',
                        content: [
                            { type: 'text',      text: prompt },
                            { type: 'image_url', image_url: { url: imageUrl } }
                        ]
                    }
                ],
                max_tokens: 4096,
                temperature: 0.1
            })
        );
        text = response.choices?.[0]?.message?.content?.trim();
    } catch (apiErr) {
        console.warn('[aiEvaluator] Groq vision API failed, attempting Gemini fallback...', apiErr.message);
        
        // --- Gemini Fallback ---
        if (process.env.GEMINI_API_KEY) {
            try {
                const { GoogleGenAI } = require('@google/genai');
                // The user's package.json uses ^1.44.0 which might be deprecated, but it's valid.
                // We'll initialize via GoogleGenAI instance.
                const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
                
                const responseGemini = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: [
                        prompt,
                        {
                            inlineData: {
                                mimeType: mimeType,
                                data: base64Data
                            }
                        }
                    ]
                });
                text = responseGemini.text;
                console.log('[aiEvaluator] Successfully used Gemini Fallback for vision.');
            } catch (geminiErr) {
                console.error('[aiEvaluator] Gemini fallback also failed:', geminiErr.message);
                throw new Error(`Vision APIs failed. Groq: ${apiErr.message}. Gemini: ${geminiErr.message}`);
            }
        } else {
            throw new Error(`Groq vision API failed: ${apiErr.message}. (No Gemini API key available for fallback)`);
        }
    }

    if (!text) {
        throw new Error('Groq returned an empty OCR response. The image may be blank or too low-resolution.');
    }

    return text;
}

// ─────────────────────────────────────────────────────────────────────────────
//  STEP 2 — Structure a raw answer key into JSON
// ─────────────────────────────────────────────────────────────────────────────
async function structureAnswerKey(rawText) {
    const prompt = `You are an academic assistant. Convert the given answer key into structured JSON.

Return a JSON array where each element has:
- "question": question text or number
- "model_answer": the expected answer
- "keywords": array of important keywords

Return ONLY the JSON array, no markdown, no extra text.

Answer Key:
${rawText}`;

    let response;
    try {
        response = await withRetry(() =>
            groq.chat.completions.create({
                model: TEXT_MODEL,
                messages: [{ role: 'user', content: prompt }],
                response_format: { type: 'json_object' },
                max_tokens: 4096,
                temperature: 0.1
            })
        );
    } catch (apiErr) {
        const msg = apiErr.message || String(apiErr);
        console.error('[aiEvaluator] Groq key-structuring error:', msg);
        throw new Error(`Groq API failed during answer key structuring: ${msg}`);
    }

    const content = response.choices?.[0]?.message?.content;
    if (!content) throw new Error('Groq returned empty response during key structuring.');

    try {
        const parsed = JSON.parse(content);
        return Array.isArray(parsed) ? parsed : (parsed.items || parsed.questions || parsed);
    } catch (e) {
        throw new Error('Failed to parse Groq JSON response during key structuring.');
    }
}

// ─────────────────────────────────────────────────────────────────────────────
//  STEP 3 — Evaluate extracted student text against the rubric
//
//  Rubric DB format: [{ question_number, max_marks, model_answer_text, mandatory_keywords }]
//  This function formats the rubric clearly for the AI and enforces fair scoring.
// ─────────────────────────────────────────────────────────────────────────────
async function evaluateExtractedText(extractedText, rubricData) {

    // ── Format rubric into clean readable text for the AI ────────────────────
    let rubricBlock = '';
    let totalMaxMarks = 0;

    for (let i = 0; i < rubricData.length; i++) {
        const q = rubricData[i];
        const qNum = q.question_number || (i + 1);
        const maxM = parseFloat(q.max_marks) || 0;
        totalMaxMarks += maxM;

        // Parse keywords (could be array or JSON string from DB)
        let keywords = [];
        try {
            if (Array.isArray(q.mandatory_keywords)) {
                keywords = q.mandatory_keywords;
            } else if (typeof q.mandatory_keywords === 'string' && q.mandatory_keywords.trim()) {
                keywords = JSON.parse(q.mandatory_keywords);
            }
        } catch (_) {
            keywords = [];
        }

        rubricBlock += `
--- Question ${qNum} (Max: ${maxM} marks) ---
Model Answer: ${q.model_answer_text || 'No model answer provided.'}
Key Concepts: ${keywords.length > 0 ? keywords.join(', ') : 'None specified'}
`;
    }

    const isBlankSubmission = extractedText.includes('[BLANK SUBMISSION]') ||
        extractedText.trim().length < 30;

    const prompt = `You are a fair, lenient, and experienced university examiner evaluating a student answer sheet.

CRITICAL SCORING RULES — YOU MUST STRICTLY FOLLOW THESE:
1. NEVER GIVE 0 MARKS if the student has written ANY relevance to the topic.
2. If the student wrote an answer, you MUST award at least 20% to 30% of the max_marks just for the attempt, even if the answer is completely wrong but attempts the topic.
3. If the answer is partially correct, award 40% to 60%.
4. If the answer is mostly correct or correct (even with different synonymous words), award 70% to 100%.
5. Give full or near-full marks (80-100%) if the student demonstrates a correct concept or approach, even if the wording doesn't perfectly match the model answer.
6. Award 0 ONLY IF the answer is completely blank, or absolutely, unequivocally irrelevant (like a drawing of a cat). 
7. Be GENEROUS with partial marks. University exams reward understanding, not memorization.
8. Minor spelling, grammar, or missing keywords MUST NOT reduce marks.
9. The total_score MUST equal the SUM of all individual question scores!

ANSWER EVALUATION METHOD:
- Compare the student's answer to the model answer SEMANTICALLY. Do not expect exact keyword matches.
- Award marks on a sliding scale: 100% complete, 70-80% good, 40-50% partial, 20-30% attempt.
- For a ${totalMaxMarks}-mark paper, make sure total_score reflects a generous evaluation.

${isBlankSubmission ? '⚠️  NOTE: This appears to be a mostly blank submission. Award 0 only for blank questions.' : ''}

IMPORTANT: Return ONLY a valid JSON object — no markdown, no extra text.

Required JSON format:
{
  "total_score": <number — sum of all question scores>,
  "question_wise": [
    {
      "question": "<question number like Q1, Q2>",
      "score": <marks awarded — MUST be >= 20% of max_marks if attempted>,
      "max_marks": <max marks for this question>,
      "feedback": "<generous, specific, constructive feedback explaining the score>",
      "missing_points": ["<specific point the student mildly missed>"]
    }
  ],
  "strengths": ["<something the student did well>"],
  "weaknesses": ["<specific area to improve>"],
  "suggestions": ["<actionable improvement suggestion>"]
}

═══════════════════════════════════════════
RUBRIC / MODEL ANSWERS:
${rubricBlock}
═══════════════════════════════════════════
STUDENT'S EXTRACTED ANSWERS:
${extractedText}
═══════════════════════════════════════════

Evaluate now and return the JSON:`;

    let response;
    try {
        response = await withRetry(() =>
            groq.chat.completions.create({
                model: TEXT_MODEL,
                messages: [{ role: 'user', content: prompt }],
                response_format: { type: 'json_object' },
                max_tokens: 4096,
                temperature: 0.3  // slightly higher for more nuanced, generous grading
            })
        );
    } catch (apiErr) {
        const msg = apiErr.message || String(apiErr);
        console.error('[aiEvaluator] Groq evaluation error:', msg);
        throw new Error(`Groq API failed during evaluation: ${msg}`);
    }

    const content = response.choices?.[0]?.message?.content;
    if (!content) throw new Error('Groq returned empty response during evaluation.');

    let aiResult;
    try {
        aiResult = JSON.parse(content);
    } catch (parseErr) {
        console.error('[aiEvaluator] JSON parse error. Raw snippet:', content?.slice(0, 300));
        throw new Error('Groq evaluation response was not valid JSON.');
    }

    // ── Post-process: enforce minimum score floor ─────────────────────────────
    // If student wrote something but AI gave 0 for a question, give minimum partial marks
    const questionWise = aiResult.question_wise || [];
    let recalcTotal = 0;

    for (let i = 0; i < questionWise.length; i++) {
        const qw = questionWise[i];
        const maxM = parseFloat(qw.max_marks) || parseFloat(rubricData[i]?.max_marks) || 0;

        // Ensure score is a number
        qw.score = parseFloat(qw.score) || 0;
        qw.max_marks = maxM;

        // Detect if student wrote something for this question
        // by checking if the extracted text has ANY content for this question number
        const qNum = i + 1;
        const hasContent = checkStudentWroteForQuestion(extractedText, qNum, questionWise.length);

        // Enforce minimum 30% floor if student wrote anything at all
        if (hasContent && !isBlankSubmission) {
            const minAttemptMarks = Math.max(1, Math.floor(maxM * 0.30));
            if (qw.score < minAttemptMarks) {
                qw.score = minAttemptMarks;
                qw.feedback = (qw.feedback || '') + ` [Score adjusted: Student attempted the question, minimum ${minAttemptMarks} marks awarded]`;
                console.log(`[aiEvaluator] Applied generous minimum score floor: Q${qNum} → ${qw.score}/${maxM}`);
            }
        }

        // Cap score at max marks
        if (qw.score > maxM) qw.score = maxM;

        recalcTotal += qw.score;
    }

    // Recalculate total_score to be the true sum (AI often miscalculates)
    aiResult.total_score = recalcTotal;
    aiResult.question_wise = questionWise;

    console.log(`[aiEvaluator] Final score: ${aiResult.total_score}/${totalMaxMarks}`);
    return aiResult;
}

/**
 * Heuristic: check if the student wrote anything for a given question number.
 * Looks for patterns like "Q1", "Q 1", "1.", "Question 1", "1)" in the extracted text.
 */
function checkStudentWroteForQuestion(extractedText, qNum, totalQuestions) {
    if (!extractedText || extractedText.trim().length < 20) return false;
    if (extractedText.includes('[BLANK SUBMISSION]')) return false;

    // If total text is substantial and we can't split, assume student wrote something
    if (totalQuestions === 1) return extractedText.trim().length > 30;

    const patterns = [
        new RegExp(`Q\\s*${qNum}[:\\s.)]`, 'i'),
        new RegExp(`Question\\s*${qNum}[:\\s.)]`, 'i'),
        new RegExp(`^\\s*${qNum}[.)]\\s`, 'm'),
        new RegExp(`\\b${qNum}\\s*\\)`, 'i'),
    ];

    // Check if the question is mentioned anywhere in extracted text
    const found = patterns.some(p => p.test(extractedText));

    // If no explicit label found but text is long enough, give benefit of doubt
    // (student may not have labeled their answers clearly)
    if (!found && extractedText.trim().length > 30) { // Reduced threshold for generosity
        // For multi-question sheets, assume content spread across questions
        const avgCharsPerQ = extractedText.trim().length / totalQuestions;
        return avgCharsPerQ > 15; // at least 15 chars per question on average to count as attempt
    }

    return found;
}

module.exports = {
    extractTextFromVision,
    evaluateExtractedText,
    structureAnswerKey
};
