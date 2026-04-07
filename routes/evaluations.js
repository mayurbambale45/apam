const express = require('express');
const db = require('../db');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const { evaluateSubmission } = require('../services/aiEvaluator');

const router = express.Router();

/**
 * POST /api/evaluate/:submission_id
 * Evaluates a specified student submission using the core AI engine.
 * Restricted to 'examination_system' or 'teacher' roles.
 */
router.post('/:submission_id', authenticateToken, authorizeRoles('examination_system', 'teacher'), async (req, res) => {
    const { submission_id } = req.params;

    try {
        // 1. Initial check - verify it hasn't been graded yet
        const existingEval = await db.query('SELECT id FROM evaluations WHERE submission_id = $1', [submission_id]);
        if (existingEval.rows.length > 0) {
            return res.status(409).json({ error: 'This submission has already been evaluated.' });
        }

        // 2. Call the AI Evaluation Core Engine
        const aiEvaluationResult = await evaluateSubmission(submission_id);

        const { totalScore, needsReview, questionBreakdown } = aiEvaluationResult;

        // 3. Insert the new evaluation record into the database
        const insertEvalQuery = `
            INSERT INTO evaluations (submission_id, total_score, detailed_feedback, confidence_flag)
            VALUES ($1, $2, $3, $4)
            RETURNING id, submission_id, total_score, confidence_flag, created_at
        `;

        const newEvaluation = await db.query(insertEvalQuery, [
            submission_id,
            totalScore,
            JSON.stringify(questionBreakdown),
            needsReview === true ? true : false // Enforce strict boolean mappings
        ]);

        // 4. Update the submission's status to 'graded'
        await db.query(`UPDATE submissions SET status = 'graded' WHERE id = $1`, [submission_id]);

        res.status(201).json({
            message: 'Evaluation processed successfully',
            evaluation: newEvaluation.rows[0]
        });

    } catch (error) {
        console.error('API Evaluation Controller Error:', error);
        
        // Handle predictable service errors distinctly
        if (error.message && (error.message.includes('not found') || error.message.includes('rubric'))) {
            return res.status(404).json({ error: error.message });
        }

        // Fallback 500 error handles timeouts/AI SDK crashes 
        // without altering the underlying submission status (remains default 'uploaded').
        res.status(500).json({ error: 'An unexpected error occurred during AI evaluation. The status remains unchanged.' });
    }
});

/**
 * POST /api/evaluate/exam/:exam_id
 * Bulk-evaluates all pending student submissions for a specific exam using the core AI engine.
 * Restricted to 'examination_system' or 'teacher' roles.
 */
router.post('/exam/:exam_id', authenticateToken, authorizeRoles('examination_system', 'teacher'), async (req, res) => {
    const { exam_id } = req.params;

    try {
        // 1. Find all submissions for this exam that are uploaded but NOT yet evaluated
        const pendingQuery = `
            SELECT id 
            FROM submissions 
            WHERE exam_id = $1 AND status = 'uploaded'
        `;
        const pendingSubmissions = await db.query(pendingQuery, [exam_id]);

        if (pendingSubmissions.rows.length === 0) {
            return res.status(200).json({ message: 'No pending submissions found to evaluate for this exam.' });
        }

        const evaluatedResults = [];
        const errors = [];

        // 2. Loop through each submission and evaluate
        // Using a sequential loop instead of Promise.all to avoid hitting generative AI API rate limits
        for (const sub of pendingSubmissions.rows) {
            try {
                const submission_id = sub.id;
                
                // Double check it hasn't somehow been graded while waiting in queue
                const existingEval = await db.query('SELECT id FROM evaluations WHERE submission_id = $1', [submission_id]);
                if (existingEval.rows.length > 0) continue;

                // Call the AI Evaluation Core Engine
                const aiEvaluationResult = await evaluateSubmission(submission_id);
                const { totalScore, needsReview, questionBreakdown } = aiEvaluationResult;

                // Insert the new evaluation record
                const insertEvalQuery = `
                    INSERT INTO evaluations (submission_id, total_score, detailed_feedback, confidence_flag)
                    VALUES ($1, $2, $3, $4)
                    RETURNING id, submission_id, total_score, confidence_flag
                `;

                const newEvaluation = await db.query(insertEvalQuery, [
                    submission_id,
                    totalScore,
                    JSON.stringify(questionBreakdown),
                    needsReview === true
                ]);

                // Update the submission's status to 'graded'
                await db.query(`UPDATE submissions SET status = 'graded' WHERE id = $1`, [submission_id]);
                
                evaluatedResults.push(newEvaluation.rows[0]);

            } catch (err) {
                console.error(`Evaluation failed for submission ${sub.id}:`, err.message);
                errors.push({ submission_id: sub.id, error: err.message });
            }
        }

        res.status(200).json({
            message: `Bulk evaluation completed. Evaluated ${evaluatedResults.length} / ${pendingSubmissions.rows.length} pending submissions.`,
            successes: evaluatedResults.length,
            failures: errors.length,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error) {
        console.error('API Bulk Evaluation Controller Error:', error);
        res.status(500).json({ error: 'An unexpected error occurred during bulk AI evaluation.' });
    }
});

module.exports = router;
