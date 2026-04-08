const fs = require('fs');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * GEMINI PROMPT 1: TEXT EXTRACTION
 * Uses Gemini Vision API to convert image/PDF into structured text.
 */
async function extractTextFromVision(filePath) {
    try {
        const fullPath = path.resolve(__dirname, '../', filePath);
        if (!fs.existsSync(fullPath)) {
            throw new Error(`File not found: ${filePath}`);
        }

        const ext = path.extname(fullPath).toLowerCase();
        let mimeType = 'application/pdf';
        if (['.jpg', '.jpeg'].includes(ext)) mimeType = 'image/jpeg';
        else if (ext === '.png') mimeType = 'image/png';

        const fileBuffer = fs.readFileSync(fullPath);
        const base64Data = fileBuffer.toString('base64');

        const extractionPrompt = `You are an OCR and academic transcription system.

Extract all handwritten or printed text from the provided student answer sheet.

Do not summarize or correct anything.
Preserve structure (Q1, Q2, etc.).
Return clearly separated answers.
Mark unclear parts as [unclear].`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: extractionPrompt },
                        {
                            inlineData: {
                                data: base64Data,
                                mimeType: mimeType
                            }
                        }
                    ]
                }
            ]
        });

        if (!response.text) {
            throw new Error('Gemini API returned an empty extraction response.');
        }

        return response.text;
    } catch (error) {
        console.error('Gemini Extraction Error:', error.message);
        throw new Error('Failed to extract text using Gemini API.');
    }
}

/**
 * GEMINI PROMPT 2: ANSWER KEY STRUCTURING
 * Converts raw teacher answer key (PDF/text) into structured JSON.
 */
async function structureAnswerKey(rawTextOrFilePath) {
    try {
        // Implement logic depending on if it's a file or pure text, but typically it's an uploaded file.
        // For brevity and based on existing setup, let's assume raw text or just PDF upload parsing is needed
        // Here we just accept text for now, but you can pass base64 if it's a PDF.
        let parts = [];
        const structuringPrompt = `You are an academic assistant.

Convert the given answer key into structured JSON with:
question, model_answer, keywords.`;

        if (fs.existsSync(path.resolve(__dirname, '../', rawTextOrFilePath))) {
            const buffer = fs.readFileSync(path.resolve(__dirname, '../', rawTextOrFilePath));
            const base64Data = buffer.toString('base64');
            parts = [
                { text: structuringPrompt },
                {
                    inlineData: {
                        data: base64Data,
                        mimeType: 'application/pdf'
                    }
                }
            ];
        } else {
            parts = [{ text: `${structuringPrompt}\n\nAnswer Key:\n${rawTextOrFilePath}` }];
        }

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: parts }],
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "ARRAY",
                    items: {
                        type: "OBJECT",
                        properties: {
                            question: { type: "STRING" },
                            model_answer: { type: "STRING" },
                            keywords: { type: "ARRAY", items: { type: "STRING" } }
                        },
                        required: ["question", "model_answer", "keywords"]
                    }
                }
            }
        });

        return JSON.parse(response.text);
    } catch (error) {
        console.error('Gemini Key Structuring Error:', error.message);
        throw error;
    }
}


/**
 * GEMINI PROMPT 3: EVALUATION
 * Evaluates extracted text using model answer and rubric.
 */
async function evaluateExtractedText(extractedText, rubricData) {
    try {
        const evaluationPrompt = `You are an expert university examiner.

Evaluate the student answer using the model answer and rubric.

Return strict JSON:
{
total_score,
question_wise: [
{question, score, max_marks, feedback, missing_points}
],
strengths,
weaknesses,
suggestions
}

Rubric / Model Answers:
${JSON.stringify(rubricData, null, 2)}

Extracted Student Answers (Do NOT hallucinate information not present here):
${extractedText}`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                {
                    role: 'user',
                    parts: [{ text: evaluationPrompt }]
                }
            ],
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT",
                    properties: {
                        total_score: { type: "NUMBER" },
                        question_wise: {
                            type: "ARRAY",
                            items: {
                                type: "OBJECT",
                                properties: {
                                    question: { type: "STRING" },
                                    score: { type: "NUMBER" },
                                    max_marks: { type: "NUMBER" },
                                    feedback: { type: "STRING" },
                                    missing_points: { type: "ARRAY", items: { type: "STRING" } }
                                },
                                required: ["question", "score", "max_marks", "feedback", "missing_points"]
                            }
                        },
                        strengths: { type: "ARRAY", items: { type: "STRING" } },
                        weaknesses: { type: "ARRAY", items: { type: "STRING" } },
                        suggestions: { type: "ARRAY", items: { type: "STRING" } }
                    },
                    required: ["total_score", "question_wise", "strengths", "weaknesses", "suggestions"]
                }
            }
        });

        return JSON.parse(response.text);
    } catch (error) {
        console.error('Gemini Evaluation Engine Error:', error.message);
        throw new Error('AI evaluation failed during JSON parsing or generation.');
    }
}

module.exports = {
    extractTextFromVision,
    evaluateExtractedText,
    structureAnswerKey
};
