const fs = require('fs');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');
const db = require('../db');

// Initialize the Google Gen AI Client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Service to evaluate a student's submission PDF against the teacher's rubric.
 * 
 * @param {string|number} submissionId - The ID of the submission to evaluate.
 * @returns {object} The structured JSON result containing scores and feedback.
 */
async function evaluateSubmission(submissionId) {
    try {
        // 1. Fetch the submission details
        const submissionQuery = `
            SELECT s.id, s.file_path, s.exam_id 
            FROM submissions s 
            WHERE s.id = $1
        `;
        const submissionResult = await db.query(submissionQuery, [submissionId]);
        
        if (submissionResult.rows.length === 0) {
            throw new Error('Submission not found in the database.');
        }
        const submission = submissionResult.rows[0];

        // 2. Fetch the corresponding exam's grading rubric
        const questionsQuery = `
            SELECT rq.question_number, rq.max_marks, rq.model_answer_text, rq.mandatory_keywords
            FROM rubric_questions rq
            JOIN rubrics r ON r.id = rq.rubric_id
            WHERE r.exam_id = $1
            ORDER BY rq.question_number ASC
        `;
        const questionsResult = await db.query(questionsQuery, [submission.exam_id]);
        
        if (questionsResult.rows.length === 0) {
            throw new Error('No grading rubric found for this exam. The teacher must configure the rubric first.');
        }
        const questions = questionsResult.rows;

        // 3. Read the PDF file from the local filesystem
        // Resolve path securely assuming it's stored relative to project root
        const fullPath = path.resolve(__dirname, '../', submission.file_path);
        if (!fs.existsSync(fullPath)) {
            throw new Error('The submitted PDF file could not be found on the server.');
        }
        const pdfBuffer = fs.readFileSync(fullPath);
        const base64Pdf = pdfBuffer.toString('base64');

        // 4. Construct the prompt
        const promptText = `
You are a rigorous, academic evaluator for an engineering college exam.
Your task is to grade the provided student's handwritten answer script (attached as a PDF) against the teacher's model rubric below.

CRITICAL INSTRUCTIONS:
1. Do NOT hallucinate answers, words, or intent not explicitly present in the student's submission.
2. If an answer to a question in the rubric is entirely missing from the PDF, award 0 marks for it.
3. Compare the handwriting conceptually and technically against the "model_answer_text" and "mandatory_keywords" (if any).
4. Be fair but strict. Justify the marks awarded clearly.

Model Rubric:
${JSON.stringify(questions, null, 2)}

Return your evaluation as a JSON object strictly conforming to the schema requested.
The "needsReview" flag should be true ONLY if you are highly unsure about the handwriting or if the answer is highly ambiguous such that human intervention is required.
`;

        // 5. Call the Gemini API
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: promptText },
                        {
                            inlineData: {
                                data: base64Pdf,
                                mimeType: 'application/pdf'
                            }
                        }
                    ]
                }
            ],
            config: {
                // Enforce JSON structured output natively using GenAI features
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT",
                    properties: {
                        totalScore: { type: "NUMBER", description: "The total aggregated score awarded for all questions" },
                        needsReview: { type: "BOOLEAN", description: "Flag to true if human review is needed due to ambiguous handwriting" },
                        questionBreakdown: {
                            type: "ARRAY",
                            items: {
                                type: "OBJECT",
                                properties: {
                                    questionNumber: { type: "NUMBER" },
                                    awardedMarks: { type: "NUMBER" },
                                    justification: { type: "STRING", description: "A brief justification of why marks were given or deducted" }
                                },
                                required: ["questionNumber", "awardedMarks", "justification"]
                            }
                        }
                    },
                    required: ["totalScore", "needsReview", "questionBreakdown"]
                }
            }
        });

        // Parse and return the structured JSON output
        const jsonOutput = JSON.parse(response.text);
        return jsonOutput;

    } catch (error) {
        console.error('AI Evaluation Service Error:', error);
        throw error;
    }
}

module.exports = {
    evaluateSubmission
};
