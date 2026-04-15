const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const { evaluateSubmission } = require('../services/aiEvaluator');

const router = express.Router();

// ─── Multer Config ──────────────────────────────────────────────────────────
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
        if (allowed.includes(file.mimetype)) cb(null, true);
        else cb(new Error('Only PDF / JPG / PNG files are allowed.'), false);
    },
    limits: { fileSize: 20 * 1024 * 1024 } // 20 MB
});

// ─── Helper: log pipeline event ─────────────────────────────────────────────
async function logPipeline(submission_id, stage, status, message = null) {
    try {
        await db.query(
            `INSERT INTO pipeline_logs (submission_id, stage, status, message) VALUES ($1, $2, $3, $4)`,
            [submission_id, stage, status, message]
        );
    } catch (e) {
        console.error('Pipeline log error:', e.message);
    }
}

// ─── Helper: extract PRN from filename ──────────────────────────────────────
function extractPrnFromFilename(filename) {
    // Matches patterns like: 2022027001_John.pdf  OR  PRN2022027001.pdf  OR  2022027001.pdf
    const match = filename.match(/(?:PRN)?(\d{10})/i);
    return match ? match[1] : null;
}

// ────────────────────────────────────────────────────────────────────────────
//  POST /api/pipeline/bulk-upload
//  Accepts multiple PDFs/images, auto-maps students via PRN in filename.
//  Falls back to manual student_id mapping per file (JSON field).
// ────────────────────────────────────────────────────────────────────────────
router.post('/bulk-upload', authenticateToken, authorizeRoles('Exam Cell', 'Faculty'), upload.array('files', 50), async (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded.' });
    }

    const { exam_id } = req.body;
    if (!exam_id) {
        req.files.forEach(f => fs.existsSync(f.path) && fs.unlinkSync(f.path));
        return res.status(400).json({ error: 'exam_id is required.' });
    }

    // Primary: manual mapping from UI { "originalFilename": "student_id" }
    let manualMapping = {};
    try {
        if (req.body.student_id_map) manualMapping = JSON.parse(req.body.student_id_map);
        // Legacy support
        else if (req.body.mapping) manualMapping = JSON.parse(req.body.mapping);
    } catch (_) {}

    const results = [];

    for (const file of req.files) {
        const originalName = file.originalname;
        const relativePath = `uploads/${file.filename}`;

        // 1. Use manual mapping first (selected from UI)
        let student_id = manualMapping[originalName] || null;

        // 2. Fallback: try PRN extraction from filename
        if (!student_id) {
            const prn = extractPrnFromFilename(originalName);
            if (prn) {
                const studentRes = await db.query(
                    `SELECT u.id FROM users u JOIN students_profile sp ON u.id = sp.user_id WHERE sp.prn_number = $1`,
                    [prn]
                );
                if (studentRes.rows.length > 0) {
                    student_id = studentRes.rows[0].id;
                }
            }
        }

        if (!student_id) {
            results.push({
                filename: originalName,
                status: 'failed',
                reason: 'No student assigned. Please select a student from the dropdown before uploading.',
                savedAs: file.filename
            });
            continue;
        }

        try {
            // Check if a submission already exists for this student+exam
            const existing = await db.query(
                `SELECT id FROM submissions WHERE exam_id = $1 AND student_id = $2`,
                [exam_id, student_id]
            );

            let submission_id;
            if (existing.rows.length > 0) {
                // Update existing submission with the new file
                submission_id = existing.rows[0].id;
                await db.query(
                    `UPDATE submissions SET file_path = $1, status = 'uploaded', pipeline_status = 'uploaded', extracted_text = NULL, error_message = NULL WHERE id = $2`,
                    [relativePath, submission_id]
                );
                await logPipeline(submission_id, 'upload', 'completed', `Re-uploaded: ${originalName}`);
            } else {
                const insertRes = await db.query(
                    `INSERT INTO submissions (exam_id, student_id, file_path, status, pipeline_status)
                     VALUES ($1, $2, $3, 'uploaded', 'uploaded') RETURNING id`,
                    [exam_id, student_id, relativePath]
                );
                submission_id = insertRes.rows[0].id;
                await logPipeline(submission_id, 'upload', 'completed', `File: ${originalName}`);
            }

            results.push({ filename: originalName, status: 'uploaded', submission_id, student_id });
        } catch (dbErr) {
            console.error('DB insert error:', dbErr.message);
            results.push({ filename: originalName, status: 'failed', reason: dbErr.message });
        }
    }

    const uploaded = results.filter(r => r.status === 'uploaded').length;
    const failed   = results.filter(r => r.status === 'failed').length;

    res.status(200).json({
        message: `Upload complete. ${uploaded} uploaded, ${failed} failed.`,
        total: req.files.length,
        uploaded,
        failed,
        results
    });
});

// ────────────────────────────────────────────────────────────────────────────
//  GET /api/pipeline/status/:exam_id
//  Returns per-submission pipeline status for an exam.
// ────────────────────────────────────────────────────────────────────────────
router.get('/status/:exam_id', authenticateToken, authorizeRoles('Exam Cell', 'Faculty', 'administrator'), async (req, res) => {
    const { exam_id } = req.params;

    try {
        const query = `
            SELECT
                s.id AS submission_id,
                s.student_id,
                u.full_name AS student_name,
                sp.prn_number,
                sp.department,
                s.file_path,
                s.status,
                s.pipeline_status,
                s.error_message,
                s.upload_timestamp,
                e.total_score,
                e.confidence_flag
            FROM submissions s
            JOIN users u ON s.student_id = u.id
            LEFT JOIN students_profile sp ON u.id = sp.user_id
            LEFT JOIN evaluations e ON s.id = e.submission_id
            WHERE s.exam_id = $1
            ORDER BY s.upload_timestamp DESC
        `;
        const result = await db.query(query, [exam_id]);

        // Aggregate counts
        const rows = result.rows;
        const stats = {
            total: rows.length,
            uploaded: rows.filter(r => r.pipeline_status === 'uploaded').length,
            evaluating: rows.filter(r => r.pipeline_status === 'evaluating').length,
            completed: rows.filter(r => r.pipeline_status === 'completed').length,
            failed: rows.filter(r => r.pipeline_status === 'failed').length,
        };

        res.status(200).json({ stats, submissions: rows });
    } catch (error) {
        console.error('Pipeline Status Error:', error);
        res.status(500).json({ error: 'Failed to fetch pipeline status.' });
    }
});

// ────────────────────────────────────────────────────────────────────────────
//  POST /api/pipeline/run/:exam_id
//  Runs the full evaluation pipeline for all uploaded (pending) submissions.
//  Queues jobs in evaluation_jobs table and processes them in background.
// ────────────────────────────────────────────────────────────────────────────
const { extractTextFromVision, evaluateExtractedText } = require('../services/aiEvaluator');

router.post('/run/:exam_id', authenticateToken, authorizeRoles('Exam Cell', 'Faculty'), async (req, res) => {
    const { exam_id } = req.params;

    try {
        // ✅ FIXED: proper parentheses so exam_id filter applies to ALL conditions
        const pendingRes = await db.query(
            `SELECT id FROM submissions
             WHERE exam_id = $1
               AND pipeline_status IN ('uploaded', 'failed', 'evaluating')`,
            [exam_id]
        );

        if (pendingRes.rows.length === 0) {
            return res.status(200).json({ message: 'No pending submissions to evaluate.' });
        }

        // Insert jobs into queue if no active job exists for that submission
        for (const sub of pendingRes.rows) {
            await db.query(`
                INSERT INTO evaluation_jobs (submission_id, task_type, status)
                SELECT $1, 'extract_and_evaluate', 'pending'
                WHERE NOT EXISTS (
                    SELECT 1 FROM evaluation_jobs
                    WHERE submission_id = $1 AND status IN ('pending', 'processing')
                )
            `, [sub.id]);
        }

        res.status(202).json({
            message: `Pipeline started for ${pendingRes.rows.length} submissions. Check /api/pipeline/status/${exam_id} for progress.`,
            queued: pendingRes.rows.length
        });

        // Start background processor (no-op if already running)
        processQueue();
    } catch (err) {
        console.error('Pipeline run error:', err.message);
        res.status(500).json({ error: 'Failed to start pipeline.', detail: err.message });
    }
});

// A simple in-memory flag to prevent concurrent overlapping worker loops in same thread
let isQueueProcessing = false;

async function processQueue() {
    if (isQueueProcessing) return;
    isQueueProcessing = true;

    try {
        while (true) {
            // Find next pending job
            const jobRes = await db.query(`
                UPDATE evaluation_jobs 
                SET status = 'processing', attempts = attempts + 1, updated_at = CURRENT_TIMESTAMP
                WHERE id = (
                    SELECT id FROM evaluation_jobs 
                    WHERE status = 'pending' 
                    ORDER BY id ASC LIMIT 1 
                    FOR UPDATE SKIP LOCKED
                )
                RETURNING *
            `);

            if (jobRes.rows.length === 0) {
                break; // Queue is empty
            }

            const job = jobRes.rows[0];
            const sid = job.submission_id;

            try {
                // Fetch submission details
                const subRes = await db.query('SELECT s.file_path, s.exam_id, s.extracted_text FROM submissions s WHERE s.id = $1', [sid]);
                if (subRes.rows.length === 0) throw new Error('Submission deleted.');
                const submission = subRes.rows[0];

                // Fetch rubric
                const rubricRes = await db.query(`
                    SELECT rq.question_number, rq.max_marks, rq.model_answer_text, rq.mandatory_keywords
                    FROM rubric_questions rq
                    JOIN rubrics r ON r.id = rq.rubric_id
                    WHERE r.exam_id = $1 ORDER BY rq.question_number ASC
                `, [submission.exam_id]);

                if (rubricRes.rows.length === 0) throw new Error('No rubric found for exam.');
                const rubric = rubricRes.rows;

                await db.query(`UPDATE submissions SET pipeline_status = 'extracting', error_message = NULL WHERE id = $1`, [sid]);
                await logPipeline(sid, 'extract', 'started');

                let extractedText = submission.extracted_text;

                // Step 1: Extract Text if missing
                if (!extractedText) {
                    extractedText = await extractTextFromVision(submission.file_path);
                    await db.query(`UPDATE submissions SET extracted_text = $1 WHERE id = $2`, [extractedText, sid]);
                    await logPipeline(sid, 'extract', 'completed');
                }

                await db.query(`UPDATE submissions SET pipeline_status = 'evaluating' WHERE id = $1`, [sid]);
                await logPipeline(sid, 'evaluate', 'started');

                // Step 2: Evaluate Text
                // Check if existing evaluation
                await db.query(`DELETE FROM evaluations WHERE submission_id = $1`, [sid]);
                
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

                await db.query(
                    `INSERT INTO evaluations (submission_id, total_score, detailed_feedback, confidence_flag)
                     VALUES ($1, $2, $3, $4)`,
                    [sid, total_score, JSON.stringify(detailedFeedback), false]
                );

                await db.query(`UPDATE submissions SET status = 'graded', pipeline_status = 'completed' WHERE id = $1`, [sid]);
                await db.query(`UPDATE evaluation_jobs SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [job.id]);
                await logPipeline(sid, 'evaluate', 'completed', `Score: ${total_score}`);

            } catch (err) {
                // Surface the REAL error message (not a generic one)
                const realError = err.message || String(err);
                console.error(`[Pipeline] Job ${job.id} | Submission ${sid} FAILED:`, realError);

                const failStatus = job.attempts >= job.max_attempts ? 'failed' : 'pending';
                await db.query(
                    `UPDATE evaluation_jobs SET status = $1, error_log = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
                    [failStatus, realError, job.id]
                );

                if (failStatus === 'failed') {
                    await db.query(
                        `UPDATE submissions SET pipeline_status = 'failed', error_message = $1 WHERE id = $2`,
                        [realError, sid]
                    );
                    await logPipeline(sid, 'pipeline', 'failed', realError);
                } else {
                    // Retry: reset submission status back to extracting so it can be picked up again
                    await db.query(
                        `UPDATE submissions SET pipeline_status = 'uploaded' WHERE id = $1`,
                        [sid]
                    );
                    await logPipeline(sid, 'pipeline', 'retrying', `Attempt ${job.attempts}/${job.max_attempts}: ${realError}`);
                }
            }
        }
    } finally {
        isQueueProcessing = false;
    }
}

// ────────────────────────────────────────────────────────────────────────────
//  POST /api/pipeline/publish/:exam_id
//  Toggles results_published for an exam to make them visible to students.
// ────────────────────────────────────────────────────────────────────────────
router.post('/publish/:exam_id', authenticateToken, authorizeRoles('Exam Cell', 'Faculty', 'administrator'), async (req, res) => {
    const { exam_id } = req.params;
    const { publish } = req.body;

    try {
        // Faculty can only publish results for their own subjects
        if (req.user.role === 'Faculty') {
            const ownerCheck = await db.query('SELECT id FROM exams WHERE id = $1 AND created_by = $2', [exam_id, req.user.id]);
            if (ownerCheck.rows.length === 0) {
                return res.status(403).json({ error: 'Access denied: You can only publish results for your own subjects.' });
            }
        }

        await db.query(`UPDATE exams SET results_published = $1 WHERE id = $2`, [publish !== false, exam_id]);
        res.status(200).json({
            message: publish !== false ? 'Results published to students.' : 'Results unpublished.',
            results_published: publish !== false
        });
    } catch (error) {
        console.error('Publish Error:', error);
        res.status(500).json({ error: 'Failed to update publish status.' });
    }
});

// ────────────────────────────────────────────────────────────────────────────
//  GET /api/pipeline/logs/:submission_id
//  Fetch pipeline event logs for a specific submission.
// ────────────────────────────────────────────────────────────────────────────
router.get('/logs/:submission_id', authenticateToken, authorizeRoles('Exam Cell', 'Faculty', 'administrator'), async (req, res) => {
    const { submission_id } = req.params;
    try {
        const result = await db.query(
            `SELECT * FROM pipeline_logs WHERE submission_id = $1 ORDER BY created_at DESC LIMIT 20`,
            [submission_id]
        );
        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch pipeline logs.' });
    }
});

// ────────────────────────────────────────────────────────────────────────────
//  GET /api/pipeline/all-students
//  Returns ALL students with year+branch info for the upload selector UI.
//  Optional query params: ?year=TE&branch=CSE
// ────────────────────────────────────────────────────────────────────────────
router.get('/all-students', authenticateToken, authorizeRoles('Exam Cell', 'Faculty'), async (req, res) => {
    const { year, branch } = req.query;
    try {
        let queryText = `
            SELECT u.id, u.full_name, sp.prn_number, sp.roll_number, sp.department, sp.year
            FROM users u
            JOIN students_profile sp ON u.id = sp.user_id
            WHERE u.role = 'student'
        `;
        const params = [];
        if (year) {
            params.push(year);
            queryText += ` AND sp.year = $${params.length}`;
        }
        if (branch) {
            params.push(branch);
            queryText += ` AND sp.department = $${params.length}`;
        }
        queryText += ` ORDER BY sp.roll_number ASC`;

        const result = await db.query(queryText, params);
        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch students.' });
    }
});

// ────────────────────────────────────────────────────────────────────────────
//  GET /api/pipeline/students/:exam_id
//  Returns list of ALL students (with year+department) for an exam context.
// ────────────────────────────────────────────────────────────────────────────
router.get('/students/:exam_id', authenticateToken, authorizeRoles('Exam Cell', 'Faculty'), async (req, res) => {
    const { exam_id } = req.params;
    try {
        const query = `
            SELECT u.id, u.full_name, sp.prn_number, sp.roll_number, sp.department, sp.year
            FROM users u
            JOIN students_profile sp ON u.id = sp.user_id
            WHERE u.role = 'student'
            ORDER BY sp.year ASC, sp.department ASC, sp.roll_number ASC
        `;
        const result = await db.query(query, [exam_id]);
        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch unmapped students.' });
    }
});

// ────────────────────────────────────────────────────────────────────────────
//  GET /api/pipeline/health
//  Tests the Groq API connection and DB — useful for diagnosing issues.
// ────────────────────────────────────────────────────────────────────────────
router.get('/health', authenticateToken, authorizeRoles('Exam Cell', 'administrator'), async (req, res) => {
    const results = {
        groq:           'unknown',
        database:       'unknown',
        key_configured: !!process.env.GROQ_API_KEY
    };

    // Test DB
    try {
        await db.query('SELECT 1');
        results.database = 'ok';
    } catch (e) {
        results.database = 'error: ' + e.message;
    }

    // Test Groq API with a trivial prompt
    if (!process.env.GROQ_API_KEY) {
        results.groq = 'error: GROQ_API_KEY not configured in .env';
        results.groq_hint = 'Add GROQ_API_KEY=gsk_... to your .env file and restart the server.';
    } else {
        try {
            const Groq = require('groq-sdk');
            const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
            const r = await groq.chat.completions.create({
                model: 'llama-3.3-70b-versatile',
                messages: [{ role: 'user', content: 'Reply with the single word: OK' }],
                max_tokens: 5
            });
            const text = (r.choices?.[0]?.message?.content || '').trim();
            results.groq = text ? 'ok' : 'warning: empty response';
        } catch (e) {
            const status = e.status || e.statusCode || '?';
            results.groq = `error ${status}: ${(e.message || '').slice(0, 200)}`;
            if (status === 429) {
                results.groq_hint = 'API quota exceeded. Your free tier credits may be exhausted. Check https://console.groq.com';
                results.quota_exceeded = true;
            } else if (status === 401 || status === 403) {
                results.groq_hint = 'Invalid or expired API key. Generate a new key at https://console.groq.com/keys';
                results.invalid_key = true;
            }
        }
    }

    const allOk = results.groq === 'ok' && results.database === 'ok';
    res.status(allOk ? 200 : 503).json(results);
});

// ────────────────────────────────────────────────────────────────────────────
//  POST /api/pipeline/reset-failed/:exam_id
//  Resets all 'failed' submissions back to 'uploaded' so they can be retried.
// ────────────────────────────────────────────────────────────────────────────
router.post('/reset-failed/:exam_id', authenticateToken, authorizeRoles('Exam Cell', 'Faculty'), async (req, res) => {
    const { exam_id } = req.params;
    try {
        // Reset submission statuses
        const subReset = await db.query(
            `UPDATE submissions SET pipeline_status = 'uploaded', error_message = NULL, extracted_text = NULL
             WHERE exam_id = $1 AND pipeline_status = 'failed'
             RETURNING id`,
            [exam_id]
        );

        const ids = subReset.rows.map(r => r.id);

        // Cancel any stuck evaluation jobs for these submissions
        if (ids.length > 0) {
            await db.query(
                `UPDATE evaluation_jobs SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
                 WHERE submission_id = ANY($1) AND status IN ('pending', 'processing', 'failed')`,
                [ids]
            );
        }

        res.status(200).json({
            message: `Reset ${ids.length} failed submission(s) to 'uploaded'. You can now re-run the pipeline.`,
            reset_count: ids.length,
            submission_ids: ids
        });
    } catch (err) {
        console.error('Reset-failed error:', err.message);
        res.status(500).json({ error: 'Failed to reset submissions.', detail: err.message });
    }
});

module.exports = router;
