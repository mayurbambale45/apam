const express = require('express');
const db = require('../db');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const { extractTextFromVision, evaluateExtractedText } = require('../services/aiEvaluator');

const router = express.Router();

// Helper function to extract and evaluate synchronously
async function runSingleEvaluation(submission_id) {
    // 1. Fetch submission details
    const subRes = await db.query('SELECT s.file_path, s.exam_id, s.extracted_text FROM submissions s WHERE s.id = $1', [submission_id]);
    if (subRes.rows.length === 0) throw new Error('Submission deleted.');
    const submission = subRes.rows[0];

    // 2. Fetch rubric
    const rubricRes = await db.query(`
        SELECT rq.question_number, rq.max_marks, rq.model_answer_text, rq.mandatory_keywords
        FROM rubric_questions rq
        JOIN rubrics r ON r.id = rq.rubric_id
        WHERE r.exam_id = $1 ORDER BY rq.question_number ASC
    `, [submission.exam_id]);

    if (rubricRes.rows.length === 0) throw new Error('No rubric found for exam.');
    const rubric = rubricRes.rows;

    let extractedText = submission.extracted_text;

    // 3. Extract Text if missing
    if (!extractedText) {
        extractedText = await extractTextFromVision(submission.file_path);
        await db.query(`UPDATE submissions SET extracted_text = $1 WHERE id = $2`, [extractedText, submission_id]);
    }

    // 4. Evaluate Text
    const aiResult = await evaluateExtractedText(extractedText, rubric);
    const { total_score, question_wise, strengths, weaknesses, suggestions } = aiResult;

    const structuredBreakdown = question_wise.map((qw, idx) => ({
        questionNumber: idx + 1,
        awardedMarks: qw.score,
        max_marks: qw.max_marks,
        justification: qw.feedback,
        missing_points: qw.missing_points
    }));

    const detailedFeedback = {
        breakdown: structuredBreakdown,
        strengths,
        weaknesses,
        suggestions
    };

    return { totalScore: total_score, needsReview: false, questionBreakdown: detailedFeedback };
}

/**
 * POST /api/evaluate/:submission_id
 * Evaluates a specified student submission using the core AI engine.
 * Restricted to 'examination_system' or 'teacher' roles.
 */
router.post('/:submission_id', authenticateToken, authorizeRoles('Exam Cell', 'Faculty'), async (req, res) => {
    const { submission_id } = req.params;

    try {
        const existingEval = await db.query('SELECT id FROM evaluations WHERE submission_id = $1', [submission_id]);
        if (existingEval.rows.length > 0) {
            return res.status(409).json({ error: 'This submission has already been evaluated.' });
        }

        const aiEvaluationResult = await runSingleEvaluation(submission_id);
        const { totalScore, needsReview, questionBreakdown } = aiEvaluationResult;

        const insertEvalQuery = `
            INSERT INTO evaluations (submission_id, total_score, detailed_feedback, confidence_flag)
            VALUES ($1, $2, $3, $4)
            RETURNING id, submission_id, total_score, confidence_flag, created_at
        `;

        const newEvaluation = await db.query(insertEvalQuery, [
            submission_id,
            totalScore,
            JSON.stringify(questionBreakdown),
            needsReview === true ? true : false
        ]);

        await db.query(`UPDATE submissions SET status = 'graded', pipeline_status = 'completed' WHERE id = $1`, [submission_id]);

        res.status(201).json({
            message: 'Evaluation processed successfully',
            evaluation: newEvaluation.rows[0]
        });

    } catch (error) {
        console.error('API Evaluation Controller Error:', error);
        
        if (error.message && (error.message.includes('not found') || error.message.includes('rubric'))) {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: 'An unexpected error occurred during AI evaluation. The status remains unchanged.' });
    }
});

/**
 * POST /api/evaluate/exam/:exam_id
 * Directs to the pipeline module
 */
router.post('/exam/:exam_id', authenticateToken, authorizeRoles('Exam Cell', 'Faculty'), async (req, res) => {
    // Deprecated in favor of /api/pipeline/run/:exam_id - redirecting call for backward compatibility
    res.redirect(307, `/api/pipeline/run/${req.params.exam_id}`);
});

/**
 * POST /api/evaluate/re-evaluate/:submission_id
 * Deletes existing evaluation for a submission and re-runs the AI engine.
 */
router.post('/re-evaluate/:submission_id', authenticateToken, authorizeRoles('Faculty'), async (req, res) => {
    const { submission_id } = req.params;

    try {
        const deleted = await db.query(
            'DELETE FROM evaluations WHERE submission_id = $1 RETURNING id',
            [submission_id]
        );

        if (deleted.rowCount > 0) {
            await db.query(`UPDATE submissions SET status = 'uploaded', pipeline_status = 'evaluating' WHERE id = $1`, [submission_id]);
        }

        const aiEvaluationResult = await runSingleEvaluation(submission_id);
        const { totalScore, needsReview, questionBreakdown } = aiEvaluationResult;

        const insertEvalQuery = `
            INSERT INTO evaluations (submission_id, total_score, detailed_feedback, confidence_flag)
            VALUES ($1, $2, $3, $4)
            RETURNING id, submission_id, total_score, confidence_flag, created_at
        `;
        const newEvaluation = await db.query(insertEvalQuery, [
            submission_id,
            totalScore,
            JSON.stringify(questionBreakdown),
            needsReview === true
        ]);

        await db.query(`UPDATE submissions SET status = 'graded', pipeline_status = 'completed' WHERE id = $1`, [submission_id]);

        res.status(201).json({
            message: 'Re-evaluation completed successfully.',
            evaluation: newEvaluation.rows[0]
        });

    } catch (error) {
        console.error('Re-Evaluation Error:', error);
        if (error.message?.includes('not found') || error.message?.includes('rubric')) {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: 'An unexpected error occurred during re-evaluation.' });
    }
});

module.exports = router;
