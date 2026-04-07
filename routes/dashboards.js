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
router.get('/teacher/stats', authenticateToken, authorizeRoles('teacher'), async (req, res) => {
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
 * GET /api/dashboard/teacher/exam/:exam_id
 * Fetches a summary list of all students who took a specific exam and their AI evaluation results.
 * Restricted to 'teacher' or 'administrator'.
 */
router.get('/teacher/exam/:exam_id', authenticateToken, authorizeRoles('teacher', 'administrator'), async (req, res) => {
    const { exam_id } = req.params;

    try {
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
            -- LEFT JOIN in case a submission hasn't been evaluated yet
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
router.put('/teacher/override/:evaluation_id', authenticateToken, authorizeRoles('teacher'), async (req, res) => {
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
                e.id AS "evaluationId"
            FROM submissions s
            JOIN exams ex ON s.exam_id = ex.id
            LEFT JOIN evaluations e ON s.id = e.submission_id
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
router.get('/admin/stats', authenticateToken, authorizeRoles('administrator', 'examination_system'), async (req, res) => {
    try {
        const statsQuery = `
            SELECT
                (SELECT COUNT(*) FROM exams) AS "totalExams",
                (SELECT COUNT(*) FROM submissions) AS "totalSubmissions",
                (SELECT COUNT(*) FROM users WHERE role = 'student') AS "totalStudents",
                (SELECT COUNT(*) FROM evaluations) AS "totalEvaluations",
                (SELECT COUNT(*) FROM submissions WHERE status = 'uploaded') AS "pendingEvaluations",
                (SELECT COUNT(*) FROM users WHERE role = 'teacher') AS "totalInstructors"
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
router.get('/teacher/feedback/:evaluation_id', authenticateToken, authorizeRoles('teacher', 'administrator', 'examination_system'), async (req, res) => {
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
router.get('/coordinator/exams', authenticateToken, authorizeRoles('examination_system', 'administrator'), async (req, res) => {
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

module.exports = router;
