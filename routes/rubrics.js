const express = require('express');
const db = require('../db');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * POST /api/rubrics/create
 * Creates a new rubric along with its associated questions.
 * Restricted to the 'teacher' role.
 * Uses a PostgreSQL transaction to ensure data integrity.
 */
router.post('/create', authenticateToken, authorizeRoles('Faculty'), async (req, res) => {
    const { exam_id, questions } = req.body;
    const teacher_id = req.user.id;

    if (!exam_id || !questions || !Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ error: 'exam_id and a non-empty array of questions are required' });
    }

    // Get a dedicated client from the pool to manage the transaction
    const client = await db.pool.connect();

    try {
        await client.query('BEGIN'); // Start transaction

        // 1. Check if the exam exists and belongs to this teacher
        const examCheck = await client.query('SELECT id, created_by FROM exams WHERE id = $1', [exam_id]);
        if (examCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Exam not found' });
        }
        
        if (examCheck.rows[0].created_by !== teacher_id) {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'Unauthorized: You can only create rubrics for your own assigned subjects.' });
        }

        // 2. Insert the main rubric record
        const insertRubricQuery = `
            INSERT INTO rubrics (exam_id, teacher_id)
            VALUES ($1, $2)
            RETURNING id, exam_id, teacher_id, created_at
        `;
        const rubricResult = await client.query(insertRubricQuery, [exam_id, teacher_id]);
        const newRubric = rubricResult.rows[0];

        // 3. Loop through and insert each question into rubric_questions
        const insertQuestionQuery = `
            INSERT INTO rubric_questions (rubric_id, question_number, max_marks, model_answer_text, mandatory_keywords)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, question_number, max_marks, model_answer_text, mandatory_keywords
        `;

        const insertedQuestions = [];
        for (const question of questions) {
            const { question_number, max_marks, model_answer_text, mandatory_keywords } = question;
            
            // Basic validation for each question
            if (!question_number || !max_marks || !model_answer_text) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'Each question must have question_number, max_marks, and model_answer_text' });
            }

            const keywordsJson = mandatory_keywords ? JSON.stringify(mandatory_keywords) : null;

            const qResult = await client.query(insertQuestionQuery, [
                newRubric.id,
                question_number,
                max_marks,
                model_answer_text,
                keywordsJson
            ]);
            insertedQuestions.push(qResult.rows[0]);
        }

        await client.query('COMMIT'); // Commit transaction if all succeeded

        res.status(201).json({
            message: 'Rubric and questions created successfully',
            rubric: newRubric,
            questions: insertedQuestions
        });

    } catch (error) {
        await client.query('ROLLBACK'); // Rollback transaction on any error
        console.error('Create Rubric Error:', error);
        
        // Handle specific unique constraint violation for exam_id on rubrics
        if (error.code === '23505') {
            return res.status(409).json({ error: 'A rubric already exists for this exam' });
        }
        
        res.status(500).json({ error: 'Internal server error while creating rubric' });
    } finally {
        // Always release the client back to the pool
        client.release();
    }
});

/**
 * GET /api/rubrics/:exam_id
 * Fetches the rubric and all its associated questions for a specific exam.
 * Accessible to authenticated users (Teacher or Admin roles should typically be used, but keeping broad as requested by logic: Teacher or Admin).
 */
router.get('/:exam_id', authenticateToken, authorizeRoles('Faculty', 'administrator'), async (req, res) => {
    const { exam_id } = req.params;

    try {
        // Query to get the rubric details
        const rubricQuery = `
            SELECT id, exam_id, teacher_id, created_at 
            FROM rubrics 
            WHERE exam_id = $1
        `;
        const rubricResult = await db.query(rubricQuery, [exam_id]);

        if (rubricResult.rows.length === 0) {
            return res.status(404).json({ error: 'Rubric not found for this exam' });
        }

        const rubric = rubricResult.rows[0];

        // Security Check: Faculty can only see rubrics for their own exams
        if (req.user.role === 'Faculty' && rubric.teacher_id !== req.user.id) {
            return res.status(403).json({ error: 'Access denied: Unauthorized subject rubric access.' });
        }

        // Query to get all associated questions for this rubric
        const questionsQuery = `
            SELECT id, question_number, max_marks, model_answer_text, mandatory_keywords
            FROM rubric_questions
            WHERE rubric_id = $1
            ORDER BY question_number ASC
        `;
        const questionsResult = await db.query(questionsQuery, [rubric.id]);

        // Combine and return the structured JSON object
        res.status(200).json({
            rubric: rubric,
            questions: questionsResult.rows
        });

    } catch (error) {
        console.error('Fetch Rubric Error:', error);
        res.status(500).json({ error: 'Internal server error while fetching rubric' });
    }
});

const { structureAnswerKey } = require('../services/aiEvaluator');

/**
 * POST /api/rubrics/generate-auto/:exam_id
 * Uses Gemini to automatically build a rubric from the uploaded model answer PDF.
 */
router.post('/generate-auto/:exam_id', authenticateToken, authorizeRoles('Faculty'), async (req, res) => {
    const { exam_id } = req.params;

    try {
        const examRes = await db.query('SELECT model_answer_path FROM exams WHERE id = $1', [exam_id]);
        if (examRes.rows.length === 0) return res.status(404).json({ error: 'Exam not found' });
        
        const { model_answer_path } = examRes.rows[0];
        if (!model_answer_path) {
            return res.status(400).json({ error: 'No model answer key uploaded for this exam. Upload one first.' });
        }

        const structuredRubric = await structureAnswerKey(model_answer_path);
        
        // Map common Gemini output names to our schema names if needed
        const formatted = structuredRubric.map((q, idx) => ({
            question_number: idx + 1,
            question_text: q.question || '',
            max_marks: 5, // Default, teacher can adjust
            model_answer_text: q.model_answer || '',
            mandatory_keywords: (q.keywords || []).join(', ')
        }));

        res.status(200).json(formatted);

    } catch (error) {
        console.error('Auto-Rubric Error:', error);
        res.status(500).json({ error: 'AI failed to generate rubric. Ensure the PDF is clear or enter manually.' });
    }
});

module.exports = router;
