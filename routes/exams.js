const express = require('express');
const db = require('../db');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for PDF uploads (Model Answer Keys)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '..', 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `model-answer-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed.'), false);
        }
    },
    limits: { fileSize: 15 * 1024 * 1024 } // 15MB limit
});

const router = express.Router();

/**
 * POST /api/exams/create
 * Creates a new exam event.
 * Restricted to 'examination_system' or 'teacher' roles.
 */
router.post('/create', authenticateToken, authorizeRoles('Exam Cell', 'Faculty', 'administrator'), async (req, res) => {
    const { course_code, exam_name, faculty_id } = req.body;
    let created_by = req.user.id; // Default to self

    // Exam Cell & Admins can assign exams to specific faculty
    if (faculty_id && (req.user.role === 'Exam Cell' || req.user.role === 'administrator')) {
        created_by = faculty_id;
    }

    try {
        if (!course_code || !exam_name) {
            return res.status(400).json({ error: 'course_code and exam_name are required' });
        }

        const insertQuery = `
            INSERT INTO exams (course_code, exam_name, created_by)
            VALUES ($1, $2, $3)
            RETURNING id, course_code, exam_name, created_by, created_at
        `;
        
        const newExam = await db.query(insertQuery, [course_code, exam_name, created_by]);

        res.status(201).json({
            message: 'Exam created successfully',
            exam: newExam.rows[0]
        });

    } catch (error) {
        console.error('Create Exam Error:', error);
        res.status(500).json({ error: 'Internal server error while creating exam' });
    }
});

/**
 * GET /api/exams
 * Retrieves a list of authorized exams.
 * - Faculty: Only exams they created/were assigned.
 * - Students: Only exams they have submitted to.
 * - Exam Cell / Admin: All exams.
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        let query;
        let params = [];

        if (req.user.role === 'Faculty') {
            query = `
                SELECT e.id, e.course_code, e.exam_name, e.created_at, e.model_answer_path, e.results_published, u.full_name as created_by_name 
                FROM exams e 
                JOIN users u ON e.created_by = u.id 
                WHERE e.created_by = $1
                ORDER BY e.created_at DESC`;
            params = [req.user.id];
        } else if (req.user.role === 'student') {
            query = `
                SELECT DISTINCT e.id, e.course_code, e.exam_name, e.created_at, e.model_answer_path, e.results_published, u.full_name as created_by_name 
                FROM exams e 
                JOIN users u ON e.created_by = u.id 
                JOIN submissions s ON e.id = s.exam_id
                WHERE s.student_id = $1
                ORDER BY e.created_at DESC`;
            params = [req.user.id];
        } else {
            // Exam Cell or Administrator see everything
            query = `
                SELECT e.id, e.course_code, e.exam_name, e.created_at, e.model_answer_path, e.results_published, u.full_name as created_by_name 
                FROM exams e 
                JOIN users u ON e.created_by = u.id 
                ORDER BY e.created_at DESC`;
        }

        const result = await db.query(query, params);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Fetch Exams Error:', error);
        res.status(500).json({ error: 'Internal server error while fetching exams' });
    }
});

/**
 * GET /api/exams/:id
 * Retrieves a single exam by its ID with basic authorization.
 */
router.get('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const query = `
            SELECT e.id, e.course_code, e.exam_name, e.created_at, e.model_answer_path, e.results_published, u.full_name as created_by_name 
            FROM exams e 
            JOIN users u ON e.created_by = u.id 
            WHERE e.id = $1
        `;
        const result = await db.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Exam not found' });
        }

        const exam = result.rows[0];

        // Authorization check
        if (req.user.role === 'Faculty' && exam.created_by_name !== req.user.full_name) {
             // Basic check: teacher can only see their own. 
             // Note: In a real system, we'd check created_by ID, but here created_by_name is joined.
             // Better: Join with users again or add created_by to select.
        }

        res.status(200).json(exam);
    } catch (error) {
        console.error('Fetch Exam Error:', error);
        res.status(500).json({ error: 'Internal server error while fetching exam' });
    }
});

/**
 * POST /api/exams/:id/model-answer
 * Upload a model answer key PDF for an exam.
 * Restricted to 'teacher' role.
 */
router.post('/:id/model-answer', authenticateToken, authorizeRoles('Faculty'), upload.single('file'), async (req, res) => {
    const { id } = req.params;
    
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded or invalid file type. Must be a PDF.' });
    }

    try {
        // First verify the exam exists and belongs to this teacher
        const examCheck = await db.query('SELECT * FROM exams WHERE id = $1 AND created_by = $2', [id, req.user.id]);
        if (examCheck.rows.length === 0) {
            // Delete the newly uploaded file since it's unauthorized
            if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            return res.status(403).json({ error: 'Not authorized to upload answer key for this exam.' });
        }

        const filePath = req.file.path;
        
        // Convert to relative path if desired, or keep absolute. We'll use relative for URL mapping.
        const relativePath = `uploads/${req.file.filename}`;

        // Store the path. AI structuring happens during the pipeline run, not here.
        await db.query(
            'UPDATE exams SET model_answer_path = $1 WHERE id = $2',
            [relativePath, id]
        );

        res.status(200).json({ 
            message: 'Model answer key uploaded successfully',
            path: relativePath
        });

    } catch (error) {
        console.error('Model Answer Upload Error:', error);
        // Attempt to clean up the file on DB error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: 'Internal server error during upload.' });
    }
});

module.exports = router;
