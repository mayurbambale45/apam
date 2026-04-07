const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

// Ensure uploads directory exists reliably regardless of OS
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Generate a unique filename: <timestamp>-<random>-<original-name>
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

// Configure multer filter for PDFs only
const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new Error('Only PDF files are allowed!'), false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 15 * 1024 * 1024 } // 15MB file size limit for answer scripts
});

/**
 * POST /api/submissions/upload
 * Handles student's PDF upload for an exam.
 * Requires JWT token, accessible by students or examination system staff.
 */
router.post('/upload', authenticateToken, authorizeRoles('student', 'examination_system', 'teacher'), (req, res) => {
    // Using multer middleware wrapped carefully to catch and respond to validation errors
    upload.single('file')(req, res, async (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ error: `Upload error: ${err.message}` });
        } else if (err) {
            return res.status(400).json({ error: `File type error: ${err.message}` });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'Please upload a valid PDF file. The field name must be "file".' });
        }

        const { exam_id, student_id } = req.body;

        if (!exam_id || !student_id) {
            // Cleanup file if inputs are missing
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: 'exam_id and student_id are required fields.' });
        }

        try {
            // Insert submission record into the database to link it to the user and exam
            const insertQuery = `
                INSERT INTO submissions (exam_id, student_id, file_path)
                VALUES ($1, $2, $3)
                RETURNING id, exam_id, student_id, file_path, status, upload_timestamp
            `;
            
            // Save the relative path in the database for consistency
            const relativePath = path.join('uploads', req.file.filename);

            const newSubmission = await db.query(insertQuery, [exam_id, student_id, relativePath]);

            res.status(201).json({
                message: 'Submission uploaded and linked successfully',
                submission: newSubmission.rows[0]
            });

        } catch (dbError) {
            console.error('Database Insertion Error:', dbError);
            
            // Clean up the orphaned file since DB linking failed
            if (fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            
            res.status(500).json({ error: 'Database error. File was removed. Please try again.' });
        }
    });
});

/**
 * GET /api/submissions/exam/:exam_id
 * Returns all submissions for a given exam with student details.
 * Restricted to 'teacher', 'examination_system', 'administrator'.
 */
router.get('/exam/:exam_id', authenticateToken, authorizeRoles('teacher', 'examination_system', 'administrator'), async (req, res) => {
    const { exam_id } = req.params;

    try {
        const query = `
            SELECT 
                s.id,
                s.exam_id,
                s.student_id,
                u.full_name AS "studentName",
                u.email AS "studentEmail",
                sp.prn_number AS "prnNumber",
                sp.roll_number AS "rollNumber",
                sp.department AS "department",
                s.file_path,
                s.status,
                s.upload_timestamp,
                e.total_score,
                e.confidence_flag AS "needsReview"
            FROM submissions s
            JOIN users u ON s.student_id = u.id
            LEFT JOIN students_profile sp ON u.id = sp.user_id
            LEFT JOIN evaluations e ON s.id = e.submission_id
            WHERE s.exam_id = $1
            ORDER BY s.upload_timestamp DESC
        `;
        const result = await db.query(query, [exam_id]);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Fetch Submissions Error:', error);
        res.status(500).json({ error: 'Internal server error while fetching submissions.' });
    }
});

module.exports = router;
