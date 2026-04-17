const express = require('express');
const db = require('../db');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

// ==========================================
// TEACHER DASHBOARD API
// ==========================================

/**
 * GET /api/dashboard/teacher/stats
 * Returns metrics specific to the logged-in teacher: their exams, submission counts, grading progress.
 * Restricted to 'teacher'.
 */
router.get('/teacher/stats', authenticateToken, authorizeRoles('Faculty'), async (req, res) => {
    const teacher_id = req.user.id;

    try {
        const statsQuery = `
            SELECT
                (SELECT COUNT(*) FROM exams WHERE created_by = $1) AS "myExams",
                (SELECT COUNT(*) FROM submissions s JOIN exams e ON s.exam_id = e.id WHERE e.created_by = $1) AS "totalSubmissions",
                (SELECT COUNT(*) FROM submissions s JOIN exams e ON s.exam_id = e.id WHERE e.created_by = $1 AND s.status = 'graded') AS "gradedSubmissions",
                (SELECT COUNT(*) FROM submissions s JOIN exams e ON s.exam_id = e.id WHERE e.created_by = $1 AND s.status = 'uploaded') AS "pendingSubmissions",
                (SELECT COUNT(*) FROM rubrics WHERE teacher_id = $1) AS "myRubrics",
                (SELECT COUNT(*) FROM evaluations ev JOIN submissions s ON ev.submission_id = s.id JOIN exams e ON s.exam_id = e.id WHERE e.created_by = $1 AND ev.confidence_flag = true) AS "flaggedReviews"
        `;
        const result = await db.query(statsQuery, [teacher_id]);

        // Get recent evaluations for the teacher's exams
        const recentQuery = `
            SELECT ev.id, ev.total_score, ev.confidence_flag, ev.created_at,
                   u.full_name AS student_name, ex.exam_name, ex.course_code
            FROM evaluations ev
            JOIN submissions s ON ev.submission_id = s.id
            JOIN users u ON s.student_id = u.id
            JOIN exams ex ON s.exam_id = ex.id
            WHERE ex.created_by = $1
            ORDER BY ev.created_at DESC
            LIMIT 5
        `;
        const recentResult = await db.query(recentQuery, [teacher_id]);

        res.status(200).json({
            ...result.rows[0],
            recentEvaluations: recentResult.rows
        });
    } catch (error) {
        console.error('Teacher Stats Error:', error);
        res.status(500).json({ error: 'Internal server error while fetching teacher stats.' });
    }
});

/**
 * GET /api/dashboard/teacher/my-exams
 * Fetches a summary list of all exams assigned to the logged-in teacher.
 * Restricted to 'Faculty'.
 */
router.get('/teacher/my-exams', authenticateToken, authorizeRoles('Faculty'), async (req, res) => {
    const teacher_id = req.user.id;

    try {
        const query = `
            SELECT 
                id, 
                course_code, 
                exam_name, 
                created_at,
                model_answer_path
            FROM exams
            WHERE created_by = $1
            ORDER BY created_at DESC
        `;

        const result = await db.query(query, [teacher_id]);
        res.status(200).json(result.rows);

    } catch (error) {
        console.error('Teacher My Exams Fetch Error:', error);
        res.status(500).json({ error: 'Internal server error while fetching teacher exams.' });
    }
});

/**
 * GET /api/dashboard/teacher/exam/:exam_id
 * Fetches a summary list of all students who took a specific exam and their AI evaluation results.
 * Restricted to 'teacher' or 'administrator'.
 */
router.get('/teacher/exam/:exam_id', authenticateToken, authorizeRoles('Faculty', 'administrator'), async (req, res) => {
    const { exam_id } = req.params;

    try {
        // Security Check: Faculty can only see their own exams
        if (req.user.role === 'Faculty') {
            const ownershipCheck = await db.query('SELECT id FROM exams WHERE id = $1 AND created_by = $2', [exam_id, req.user.id]);
            if (ownershipCheck.rows.length === 0) {
                return res.status(403).json({ error: 'Access denied: You are not authorized to view results for this subject.' });
            }
        }

        const query = `
            SELECT 
                u.full_name AS "studentName", 
                sp.roll_number AS "rollNumber", 
                sp.prn_number AS "prnNumber",
                sp.department AS "department",
                s.status AS "submissionStatus", 
                e.total_score AS "totalScore", 
                e.confidence_flag AS "needsReview", 
                e.id AS "evaluationId"
            FROM submissions s
            JOIN users u ON s.student_id = u.id
            LEFT JOIN students_profile sp ON u.id = sp.user_id
            LEFT JOIN evaluations e ON s.id = e.submission_id 
            WHERE s.exam_id = $1
            ORDER BY e.confidence_flag DESC NULLS LAST, u.full_name ASC
        `;

        const result = await db.query(query, [exam_id]);
        res.status(200).json(result.rows);

    } catch (error) {
        console.error('Teacher Dashboard Fetch Error:', error);
        res.status(500).json({ error: 'Internal server error while fetching the dashboard data.' });
    }
});

/**
 * PUT /api/dashboard/teacher/override/:evaluation_id
 * Allows a teacher to override the AI's grading for a specific evaluation.
 * Restricted to 'teacher'.
 */
router.put('/teacher/override/:evaluation_id', authenticateToken, authorizeRoles('Faculty'), async (req, res) => {
    const { evaluation_id } = req.params;
    const { totalScore, detailedFeedback } = req.body;

    if (totalScore === undefined) {
        return res.status(400).json({ error: 'totalScore is required to override the grade.' });
    }

    try {
        // Prepare dynamic update: detailedFeedback is optional during override
        let updateQuery;
        let queryParams;

        if (detailedFeedback) {
            updateQuery = `
                UPDATE evaluations 
                SET total_score = $1, detailed_feedback = $2, confidence_flag = false 
                WHERE id = $3 
                RETURNING id, total_score, detailed_feedback, confidence_flag
            `;
            queryParams = [totalScore, JSON.stringify(detailedFeedback), evaluation_id];
        } else {
            updateQuery = `
                UPDATE evaluations 
                SET total_score = $1, confidence_flag = false 
                WHERE id = $2 
                RETURNING id, total_score, detailed_feedback, confidence_flag
            `;
            queryParams = [totalScore, evaluation_id];
        }

        const result = await db.query(updateQuery, queryParams);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Evaluation not found.' });
        }

        res.status(200).json({
            message: 'Evaluation overridden successfully. needsReview flag cleared.',
            evaluation: result.rows[0]
        });

    } catch (error) {
        console.error('Teacher Override Error:', error);
        res.status(500).json({ error: 'Internal server error while overriding evaluation.' });
    }
});

/**
 * GET /api/dashboard/teacher/grievances
 * Returns all pending/resolved grievances for the logged-in teacher's exams.
 * Restricted to 'Faculty'.
 */
router.get('/teacher/grievances', authenticateToken, authorizeRoles('Faculty'), async (req, res) => {
    const teacher_id = req.user.id;
    try {
        const query = `
            SELECT
                g.id AS "grievanceId",
                g.evaluation_id AS "evaluationId",
                g.message,
                g.status,
                g.teacher_marks AS "teacherMarks",
                g.teacher_note AS "teacherNote",
                g.created_at AS "raisedAt",
                g.resolved_at AS "resolvedAt",
                u.full_name AS "studentName",
                sp.prn_number AS "prnNumber",
                sp.roll_number AS "rollNumber",
                ex.exam_name AS "examName",
                ex.course_code AS "courseCode",
                ev.total_score AS "currentScore"
            FROM grievances g
            JOIN users u ON g.student_id = u.id
            LEFT JOIN students_profile sp ON u.id = sp.user_id
            JOIN evaluations ev ON g.evaluation_id = ev.id
            JOIN submissions s ON ev.submission_id = s.id
            JOIN exams ex ON s.exam_id = ex.id
            WHERE ex.created_by = $1
            ORDER BY g.created_at DESC
        `;
        const result = await db.query(query, [teacher_id]);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Teacher Grievances Fetch Error:', error);
        res.status(500).json({ error: 'Internal server error while fetching grievances.' });
    }
});

/**
 * PUT /api/dashboard/teacher/grievance/:grievance_id/resolve
 * Allows a teacher to resolve a grievance by updating marks on the evaluation.
 * Restricted to 'Faculty'.
 */
router.put('/teacher/grievance/:grievance_id/resolve', authenticateToken, authorizeRoles('Faculty'), async (req, res) => {
    const { grievance_id } = req.params;
    const { newScore, teacherNote } = req.body;
    const teacher_id = req.user.id;

    if (newScore === undefined || newScore === null) {
        return res.status(400).json({ error: 'newScore is required to resolve a grievance.' });
    }

    try {
        // Fetch the grievance and verify it belongs to this teacher's exam
        const grievanceCheck = await db.query(`
            SELECT g.id, g.evaluation_id, g.status
            FROM grievances g
            JOIN evaluations ev ON g.evaluation_id = ev.id
            JOIN submissions s ON ev.submission_id = s.id
            JOIN exams ex ON s.exam_id = ex.id
            WHERE g.id = $1 AND ex.created_by = $2
        `, [grievance_id, teacher_id]);

        if (grievanceCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Grievance not found or you are not authorized to resolve it.' });
        }

        const grievance = grievanceCheck.rows[0];
        if (grievance.status === 'resolved') {
            return res.status(409).json({ error: 'This grievance has already been resolved.' });
        }

        const evaluation_id = grievance.evaluation_id;
        const scoreDiff = parseFloat(newScore);

        // Update evaluation total_score
        await db.query(`
            UPDATE evaluations
            SET total_score = $1, confidence_flag = false
            WHERE id = $2
        `, [scoreDiff, evaluation_id]);

        // Update the grievance record
        const updatedGrievance = await db.query(`
            UPDATE grievances
            SET status = 'resolved',
                teacher_marks = $1,
                teacher_note = $2,
                resolved_at = NOW()
            WHERE id = $3
            RETURNING *
        `, [scoreDiff, teacherNote || null, grievance_id]);

        res.status(200).json({
            message: 'Grievance resolved. Student marks updated successfully.',
            grievance: updatedGrievance.rows[0]
        });
    } catch (error) {
        console.error('Grievance Resolve Error:', error);
        res.status(500).json({ error: 'Internal server error while resolving grievance.' });
    }
});

// ==========================================
// STUDENT DASHBOARD API
// ==========================================

/**
 * GET /api/dashboard/student/profile
 * Returns the student's complete profile including PRN, Roll Number, Department, and Year.
 * PRN is the primary unique identifier at Walchand College of Engineering, Sangli.
 * Restricted to 'student'.
 */
router.get('/student/profile', authenticateToken, authorizeRoles('student'), async (req, res) => {
    const student_id = req.user.id;

    try {
        const query = `
            SELECT
                u.id, u.full_name, u.email, u.role, u.created_at,
                sp.prn_number, sp.roll_number, sp.department, sp.year
            FROM users u
            LEFT JOIN students_profile sp ON u.id = sp.user_id
            WHERE u.id = $1
        `;
        const result = await db.query(query, [student_id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Student not found.' });
        }
        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Student Profile Fetch Error:', error);
        res.status(500).json({ error: 'Internal server error while fetching student profile.' });
    }
});

/**
 * GET /api/dashboard/student/stats
 * Returns stats for the logged-in student: exam counts, grading progress, average score.
 * Restricted to 'student'.
 */
router.get('/student/stats', authenticateToken, authorizeRoles('student'), async (req, res) => {
    const student_id = req.user.id;

    try {
        const statsQuery = `
            SELECT
                (SELECT COUNT(*) FROM submissions WHERE student_id = $1) AS "totalSubmissions",
                (SELECT COUNT(*) FROM submissions WHERE student_id = $1 AND status = 'graded') AS "gradedSubmissions",
                (SELECT COUNT(*) FROM submissions WHERE student_id = $1 AND status = 'uploaded') AS "pendingSubmissions",
                (SELECT COALESCE(ROUND(AVG(ev.total_score)::numeric, 1), 0)
                 FROM evaluations ev JOIN submissions s ON ev.submission_id = s.id
                 WHERE s.student_id = $1) AS "averageScore"
        `;
        const result = await db.query(statsQuery, [student_id]);
        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Student Stats Fetch Error:', error);
        res.status(500).json({ error: 'Internal server error while fetching student stats.' });
    }
});

/**
 * GET /api/dashboard/student/my-exams
 * Fetches a summary list of all exams the logged-in student has submitted.
 * Restricted to 'student'.
 */
router.get('/student/my-exams', authenticateToken, authorizeRoles('student'), async (req, res) => {
    const student_id = req.user.id; // Extracted securely from JWT

    try {
        const query = `
            SELECT 
                ex.exam_name AS "examName", 
                ex.course_code AS "courseCode", 
                s.status AS "status", 
                e.total_score AS "totalScore",
                e.id AS "evaluationId",
                CASE WHEN g.id IS NOT NULL THEN true ELSE false END AS "hasRaisedGrievance",
                g.teacher_marks AS "grievanceMarks",
                g.status AS "grievanceStatus"
            FROM submissions s
            JOIN exams ex ON s.exam_id = ex.id
            LEFT JOIN evaluations e ON s.id = e.submission_id
            LEFT JOIN grievances g ON e.id = g.evaluation_id
            WHERE s.student_id = $1
            ORDER BY s.upload_timestamp DESC
        `;

        const result = await db.query(query, [student_id]);

        res.status(200).json(result.rows);

    } catch (error) {
        console.error('Student Exams Fetch Error:', error);
        res.status(500).json({ error: 'Internal server error while fetching student exams.' });
    }
});

/**
 * POST /api/dashboard/student/grievance
 * Allows a student to raise a grievance for a specific evaluation (one per evaluation).
 * Student must include a message explaining the issue.
 */
router.post('/student/grievance', authenticateToken, authorizeRoles('student'), async (req, res) => {
    const student_id = req.user.id;
    const { evaluation_id, message } = req.body;

    if (!evaluation_id) {
        return res.status(400).json({ error: 'evaluation_id is required.' });
    }
    if (!message || message.trim().length < 10) {
        return res.status(400).json({ error: 'Please provide a message (at least 10 characters) explaining your grievance.' });
    }

    try {
        // Verify the evaluation belongs to this student
        const ownershipCheck = await db.query(`
            SELECT e.id FROM evaluations e
            JOIN submissions s ON e.submission_id = s.id
            WHERE e.id = $1 AND s.student_id = $2
        `, [evaluation_id, student_id]);

        if (ownershipCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Forbidden: This evaluation does not belong to you.' });
        }

        // Check if grievance already exists for this evaluation
        const existing = await db.query(
            'SELECT id FROM grievances WHERE evaluation_id = $1',
            [evaluation_id]
        );
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'A grievance has already been raised for this evaluation. You can only raise one grievance per evaluation.' });
        }

        // Insert grievance - with full error tracing
        const result = await db.query(`
            INSERT INTO grievances (evaluation_id, student_id, message, status)
            VALUES ($1, $2, $3, 'pending')
            RETURNING id, evaluation_id, message, status, created_at
        `, [parseInt(evaluation_id), parseInt(student_id), message.trim()]);

        res.status(201).json({
            message: 'Grievance raised successfully. Your teacher will review it shortly.',
            grievance: result.rows[0]
        });
    } catch (error) {
        console.error('Grievance Submission Error:', error.message);
        // Handle duplicate grievance at DB level (unique constraint on evaluation_id)
        if (error.code === '23505') {
            return res.status(409).json({ error: 'A grievance has already been raised for this evaluation.' });
        }
        // Return the actual DB error message so it's visible in the UI for debugging
        res.status(500).json({ error: 'Grievance error: ' + error.message });
    }
});

/**
 * GET /api/dashboard/student/feedback/:evaluation_id
 * Fetches the detailed AI question-by-question breakdown for a specific evaluation.
 * Restricted to 'student'. Secures against cross-student peeking.
 */
router.get('/student/feedback/:evaluation_id', authenticateToken, authorizeRoles('student'), async (req, res) => {
    const { evaluation_id } = req.params;
    const student_id = req.user.id; // JWT user ID

    try {
        const query = `
            SELECT 
                e.detailed_feedback, 
                e.total_score,
                s.student_id
            FROM evaluations e
            JOIN submissions s ON e.submission_id = s.id
            WHERE e.id = $1
        `;

        const result = await db.query(query, [evaluation_id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Evaluation not found.' });
        }

        const evaluation = result.rows[0];

        // CRUCIAL SECURITY CHECK: Ensure the evaluation belongs to the requesting student
        if (evaluation.student_id !== student_id) {
            return res.status(403).json({ error: 'Forbidden: You do not have permission to view another student\'s feedback.' });
        }

        res.status(200).json({
            totalScore: evaluation.total_score,
            detailedFeedback: evaluation.detailed_feedback
        });

    } catch (error) {
        console.error('Student Feedback Fetch Error:', error);
        res.status(500).json({ error: 'Internal server error while fetching detailed feedback.' });
    }
});

// ==========================================
// ADMIN / COORDINATOR DASHBOARD API
// ==========================================

/**
 * GET /api/dashboard/admin/stats
 * Returns system-wide aggregate metrics.
 * Restricted to 'administrator' and 'examination_system'.
 */
router.get('/admin/stats', authenticateToken, authorizeRoles('administrator', 'Exam Cell'), async (req, res) => {
    try {
        const statsQuery = `
            SELECT
                (SELECT COUNT(*) FROM exams) AS "totalExams",
                (SELECT COUNT(*) FROM submissions) AS "totalSubmissions",
                (SELECT COUNT(*) FROM users WHERE role = 'student') AS "totalStudents",
                (SELECT COUNT(*) FROM evaluations) AS "totalEvaluations",
                (SELECT COUNT(*) FROM submissions WHERE status = 'uploaded') AS "pendingEvaluations",
                (SELECT COUNT(*) FROM users WHERE role = 'Faculty') AS "totalInstructors"
        `;
        const result = await db.query(statsQuery);
        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Admin Stats Error:', error);
        res.status(500).json({ error: 'Internal server error while fetching admin stats.' });
    }
});

/**
 * GET /api/dashboard/teacher/feedback/:evaluation_id
 * Fetches the detailed AI question-by-question breakdown for a specific evaluation.
 * Accessible by 'teacher' and 'administrator' (no student ownership check).
 */
router.get('/teacher/feedback/:evaluation_id', authenticateToken, authorizeRoles('Faculty', 'administrator', 'Exam Cell'), async (req, res) => {
    const { evaluation_id } = req.params;

    try {
        const query = `
            SELECT 
                e.detailed_feedback, 
                e.total_score,
                e.confidence_flag
            FROM evaluations e
            WHERE e.id = $1
        `;
        const result = await db.query(query, [evaluation_id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Evaluation not found.' });
        }

        const evaluation = result.rows[0];
        res.status(200).json({
            totalScore: evaluation.total_score,
            detailedFeedback: evaluation.detailed_feedback,
            confidenceFlag: evaluation.confidence_flag
        });
    } catch (error) {
        console.error('Teacher Feedback Fetch Error:', error);
        res.status(500).json({ error: 'Internal server error while fetching evaluation feedback.' });
    }
});

/**
 * GET /api/dashboard/coordinator/exams
 * Returns all exams with aggregated submission counts, graded counts, and instructor names.
 * Restricted to 'examination_system' and 'administrator'.
 */
router.get('/coordinator/exams', authenticateToken, authorizeRoles('Exam Cell', 'administrator'), async (req, res) => {
    try {
        const query = `
            SELECT 
                ex.id,
                ex.course_code AS "courseCode",
                ex.exam_name AS "examName",
                u.full_name AS "instructorName",
                ex.created_at AS "createdAt",
                COUNT(s.id) AS "totalSubmissions",
                COUNT(CASE WHEN s.status = 'graded' THEN 1 END) AS "gradedCount",
                COUNT(CASE WHEN s.status = 'uploaded' THEN 1 END) AS "pendingCount"
            FROM exams ex
            JOIN users u ON ex.created_by = u.id
            LEFT JOIN submissions s ON ex.id = s.exam_id
            GROUP BY ex.id, ex.course_code, ex.exam_name, u.full_name, ex.created_at
            ORDER BY ex.created_at DESC
        `;
        const result = await db.query(query);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Coordinator Exams Fetch Error:', error);
        res.status(500).json({ error: 'Internal server error while fetching coordinator exam data.' });
    }
});

// ==========================================
// TEACHER ANALYTICS API
// ==========================================

/**
 * GET /api/dashboard/teacher/analytics/:exam_id
 * Returns in-depth analytics for a single exam:
 *   - count, avg, high, low scores
 *   - top 5 performers
 *   - per-question average performance
 *   - flagged paper count
 *   - grievance count
 * Restricted to 'teacher' and 'administrator'.
 */
router.get('/teacher/analytics/:exam_id', authenticateToken, authorizeRoles('Faculty', 'administrator'), async (req, res) => {
    const { exam_id } = req.params;

    try {
        // Ownership check
        if (req.user.role === 'Faculty') {
            const check = await db.query('SELECT id FROM exams WHERE id = $1 AND created_by = $2', [exam_id, req.user.id]);
            if (check.rows.length === 0) return res.status(403).json({ error: 'Unauthorized subject analytics access.' });
        }

        // 1. Summary stats
        const summaryQuery = `
            SELECT
                COUNT(DISTINCT s.id) AS "totalStudents",
                COALESCE(ROUND(AVG(ev.total_score)::numeric, 1), 0) AS "avgScore",
                COALESCE(MAX(ev.total_score), 0) AS "highScore",
                COALESCE(MIN(ev.total_score), 0) AS "lowScore",
                COUNT(CASE WHEN ev.confidence_flag = true THEN 1 END) AS "flaggedCount"
            FROM submissions s
            LEFT JOIN evaluations ev ON s.id = ev.submission_id
            WHERE s.exam_id = $1
        `;
        const summaryResult = await db.query(summaryQuery, [exam_id]);

        // 2. All evaluations (for histogram on frontend)
        const evalsQuery = `
            SELECT ev.total_score
            FROM evaluations ev
            JOIN submissions s ON ev.submission_id = s.id
            WHERE s.exam_id = $1
        `;
        const evalsResult = await db.query(evalsQuery, [exam_id]);

        // 3. Top 5 performers
        const topQuery = `
            SELECT u.full_name AS student_name, sp.prn_number, sp.department, ev.total_score
            FROM evaluations ev
            JOIN submissions s ON ev.submission_id = s.id
            JOIN users u ON s.student_id = u.id
            LEFT JOIN students_profile sp ON u.id = sp.user_id
            WHERE s.exam_id = $1
            ORDER BY ev.total_score DESC
            LIMIT 5
        `;
        const topResult = await db.query(topQuery, [exam_id]);

        // 4. Per-question average scores (from JSONB detailed_feedback)
        const rubricQuery = `
            SELECT rq.question_number, rq.max_marks
            FROM rubrics r
            JOIN rubric_questions rq ON r.id = rq.rubric_id
            WHERE r.exam_id = $1
            ORDER BY rq.question_number ASC
        `;
        const rubricResult = await db.query(rubricQuery, [exam_id]);

        // Extract per-question scores from JSONB - each row's detailed_feedback is an array
        const feedbackQuery = `
            SELECT ev.detailed_feedback
            FROM evaluations ev
            JOIN submissions s ON ev.submission_id = s.id
            WHERE s.exam_id = $1
        `;
        const feedbackResult = await db.query(feedbackQuery, [exam_id]);

        // Compute avg score per question number across all evaluations
        const questionAccum = {};  // { question_number: { total: X, count: Y } }
        for (const row of feedbackResult.rows) {
            const feedback = row.detailed_feedback;
            const items = Array.isArray(feedback) ? feedback : (feedback?.questions || feedback?.breakdown || []);
            for (const item of items) {
                const qn = item.questionNumber || item.question_number;
                const score = parseFloat(item.score || item.awarded_marks || 0);
                if (qn) {
                    if (!questionAccum[qn]) questionAccum[qn] = { total: 0, count: 0 };
                    questionAccum[qn].total += score;
                    questionAccum[qn].count += 1;
                }
            }
        }

        const questionStats = rubricResult.rows.map(rq => ({
            question_number: rq.question_number,
            max_marks: rq.max_marks,
            avg_score: questionAccum[rq.question_number]
                ? (questionAccum[rq.question_number].total / questionAccum[rq.question_number].count).toFixed(2)
                : '0.00'
        }));

        // 5. Grievance count - skip if grievances table doesn't exist
        let grievanceCount = 0;
        try {
            const grievanceQuery = `
                SELECT COUNT(g.id) AS grievance_count
                FROM grievances g
                JOIN evaluations ev ON g.evaluation_id = ev.id
                JOIN submissions s ON ev.submission_id = s.id
                WHERE s.exam_id = $1
            `;
            const grievanceResult = await db.query(grievanceQuery, [exam_id]);
            grievanceCount = parseInt(grievanceResult.rows[0].grievance_count);
        } catch (e) {
            // Grievances table may not exist — fallback to 0
            console.warn('Grievances table not available, defaulting to 0.');
        }

        res.status(200).json({
            ...summaryResult.rows[0],
            evaluations: evalsResult.rows,
            topPerformers: topResult.rows,
            questionStats,
            grievanceSummary: grievanceCount
        });

    } catch (error) {
        console.error('Teacher Analytics Error:', error);
        res.status(500).json({ error: 'Internal server error while fetching analytics.' });
    }
});

module.exports = router;
