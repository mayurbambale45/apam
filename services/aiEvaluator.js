const fs           = require('fs');
const path         = require('path');
// We dynamically detect the pdf-parse version below inside extractTextFromVision
const pdfParseLib = require('pdf-parse');
const Groq     = require('groq-sdk');

// ─────────────────────────────────────────────────────────────────────────────
//  Startup validation
// ─────────────────────────────────────────────────────────────────────────────
if (!process.env.GROQ_API_KEY) {
    console.error('[aiEvaluator] CRITICAL: GROQ_API_KEY is not set in .env');
}

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Model selection
//  • Vision model  → image OCR (supports JPG/PNG inline as base64)
//  • Text model    → evaluation / JSON generation
const VISION_MODEL = 'llama-3.2-90b-vision-preview';
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

            // Respect Groq's Retry-After header if available
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
//
//  • Images (JPG / PNG)  → Groq vision API (llama-3.2-90b-vision-preview)
//  • PDFs (digital text) → pdf-parse library (fast, accurate)
//  • PDFs (scanned/hand) → Convert first page to a fallback notice
//    (pure-Node PDF→image is complex; instruct uploader to use image format)
// ─────────────────────────────────────────────────────────────────────────────
async function extractTextFromVision(filePath) {
    const fullPath = path.resolve(__dirname, '../', filePath);

    if (!fs.existsSync(fullPath)) {
        throw new Error(`Answer sheet file not found: ${filePath}`);
    }

    const ext = path.extname(fullPath).toLowerCase();

    // ── PDF path: use pdf-parse to extract digital text ──────────────────────
    if (ext === '.pdf') {
        try {
            const buffer = fs.readFileSync(fullPath);
            let text = '';

            // Handle both legacy "pdf-parse" v1 functions AND new "pdf-parse" v2 PDFParse class
            if (pdfParseLib.PDFParse) {
                // Modern pdf-parse ^2.4.x
                const parser = new pdfParseLib.PDFParse({ data: buffer });
                const parseResult = await parser.getText();
                text = (parseResult.text || '').trim();
                await parser.destroy();
            } else {
                // Legacy v1.x (function or default wrapper)
                const legacyParse = typeof pdfParseLib === 'function' ? pdfParseLib : (pdfParseLib.default || pdfParseLib);
                const parseResult = await legacyParse(buffer);
                text = (parseResult.text || '').trim();
            }

            if (text.length > 50) {
                // Digital PDF — text extracted successfully
                console.log(`[aiEvaluator] PDF text extracted via pdf-parse (${text.length} chars)`);
                return text;
            }

            // Scanned / image-only PDF — very little text found
            // Log and fall through to the vision API with a guidance message
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
- Separate each answer with a clear label.
- Mark any illegible or unclear words as [unclear].
- Return plain text only — no markdown, no commentary.`;

    let response;
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
                temperature: 0.1  // low temperature for accurate transcription
            })
        );
    } catch (apiErr) {
        const msg = apiErr.message || String(apiErr);
        console.error('[aiEvaluator] Groq vision API error:', msg);
        throw new Error(`Groq vision API failed: ${msg}`);
    }

    const text = response.choices?.[0]?.message?.content?.trim();
    if (!text) {
        throw new Error('Groq returned an empty OCR response. The image may be blank or too low-resolution.');
    }

    return text;
}

// ─────────────────────────────────────────────────────────────────────────────
//  STEP 2 — Structure a raw answer key into JSON (helper for rubric import)
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
        // Handle both {items: [...]} and direct array responses
        return Array.isArray(parsed) ? parsed : (parsed.items || parsed.questions || parsed);
    } catch (e) {
        throw new Error('Failed to parse Groq JSON response during key structuring.');
    }
}

// ─────────────────────────────────────────────────────────────────────────────
//  STEP 3 — Evaluate extracted student text against the rubric
// ─────────────────────────────────────────────────────────────────────────────
async function evaluateExtractedText(extractedText, rubricData) {
    const prompt = `You are an expert university examiner grading a student answer sheet.

Evaluate the student's answers against the model answers and rubric provided.
Be fair and focus heavily on conceptual accuracy. Even if the student uses different phrasing or synonyms, if the core idea or approach matches the model answer, award them Marks proportionally. 
Do not penalize solely for missing exact keywords if the semantic meaning is correct. Ensure partial marks are given for partially correct concepts.

IMPORTANT: Return ONLY a valid JSON object — no markdown code blocks, no extra text.

Required JSON format:
{
  "total_score": <number>,
  "question_wise": [
    {
      "question": "<question number or text>",
      "score": <number awarded>,
      "max_marks": <number>,
      "feedback": "<brief feedback for this question>",
      "missing_points": ["<point missed>", ...]
    }
  ],
  "strengths": ["<strength 1>", ...],
  "weaknesses": ["<weakness 1>", ...],
  "suggestions": ["<suggestion 1>", ...]
}

═══════════════════════════════════
RUBRIC / MODEL ANSWERS:
${JSON.stringify(rubricData, null, 2)}

═══════════════════════════════════
STUDENT'S EXTRACTED ANSWERS:
${extractedText}
═══════════════════════════════════

Now return the evaluation JSON:`;

    let response;
    try {
        response = await withRetry(() =>
            groq.chat.completions.create({
                model: TEXT_MODEL,
                messages: [{ role: 'user', content: prompt }],
                response_format: { type: 'json_object' },
                max_tokens: 4096,
                temperature: 0.2
            })
        );
    } catch (apiErr) {
        const msg = apiErr.message || String(apiErr);
        console.error('[aiEvaluator] Groq evaluation error:', msg);
        throw new Error(`Groq API failed during evaluation: ${msg}`);
    }

    const content = response.choices?.[0]?.message?.content;
    if (!content) throw new Error('Groq returned empty response during evaluation.');

    try {
        return JSON.parse(content);
    } catch (parseErr) {
        console.error('[aiEvaluator] JSON parse error. Raw snippet:', content?.slice(0, 300));
        throw new Error('Groq evaluation response was not valid JSON.');
    }
}

module.exports = {
    extractTextFromVision,
    evaluateExtractedText,
    structureAnswerKey
};
