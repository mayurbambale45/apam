const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes in this file are restricted to administrator only
router.use(authenticateToken, authorizeRoles('administrator'));

// ==========================================
// USER MANAGEMENT
// ==========================================

/**
 * POST /api/admin/users
 * Create a new user (any role). If role is 'student', also creates student profile.
 */
router.post('/users', async (req, res) => {
    const { email, password, full_name, role, roll_number, prn_number, department, year } = req.body;

    if (!email || !password || !full_name || !role) {
        return res.status(400).json({ error: 'email, password, full_name, and role are required.' });
    }

    const validRoles = ['administrator', 'Exam Cell', 'Faculty', 'student'];
    if (!validRoles.includes(role)) {
        return res.status(400).json({ error: 'Invalid role. Must be one of: ' + validRoles.join(', ') });
    }

    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        // Check for duplicate email
        const exists = await client.query('SELECT id FROM users WHERE email = $1', [email]);
        if (exists.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: 'A user with this email already exists.' });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const userResult = await client.query(
            `INSERT INTO users (email, password_hash, full_name, role)
             VALUES ($1, $2, $3, $4)
             RETURNING id, email, full_name, role, created_at`,
            [email, passwordHash, full_name, role]
        );
        const newUser = userResult.rows[0];

        // If student, create the student profile
        if (role === 'student') {
            if (!roll_number || !prn_number || !department || !year) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'Student role requires roll_number, prn_number, department, and year.' });
            }
            await client.query(
                `INSERT INTO students_profile (user_id, roll_number, prn_number, department, year)
                 VALUES ($1, $2, $3, $4, $5)`,
                [newUser.id, roll_number, prn_number, department, year]
            );
        }

        await client.query('COMMIT');
        res.status(201).json({ message: 'User created successfully.', user: newUser });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Admin Create User Error:', error);
        if (error.code === '23505') {
            return res.status(409).json({ error: 'Duplicate value: email, PRN, or roll number already exists.' });
        }
        res.status(500).json({ error: 'Internal server error while creating user.' });
    } finally {
        client.release();
    }
});

/**
 * PUT /api/admin/users/:id
 * Update a user's details (name, email, role).
 */
router.put('/users/:id', async (req, res) => {
    const { id } = req.params;
    const { full_name, email, role } = req.body;

    if (!full_name && !email && !role) {
        return res.status(400).json({ error: 'At least one field (full_name, email, or role) must be provided.' });
    }

    try {
        // Build dynamic update query
        const updates = [];
        const values = [];
        let paramIndex = 1;

        if (full_name) { updates.push(`full_name = $${paramIndex++}`); values.push(full_name); }
        if (email) { updates.push(`email = $${paramIndex++}`); values.push(email); }
        if (role) { updates.push(`role = $${paramIndex++}`); values.push(role); }
        updates.push(`updated_at = CURRENT_TIMESTAMP`);

        values.push(id);

        const result = await db.query(
            `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING id, email, full_name, role, updated_at`,
            values
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }

        res.status(200).json({ message: 'User updated successfully.', user: result.rows[0] });
    } catch (error) {
        console.error('Admin Update User Error:', error);
        if (error.code === '23505') {
            return res.status(409).json({ error: 'This email is already in use by another user.' });
        }
        res.status(500).json({ error: 'Internal server error while updating user.' });
    }
});

/**
 * DELETE /api/admin/users/:id
 * Delete a user. Cascades to student_profile, submissions, evaluations.
 */
router.delete('/users/:id', async (req, res) => {
    const { id } = req.params;

    try {
        // Prevent self-deletion
        if (parseInt(id) === req.user.id) {
            return res.status(400).json({ error: 'You cannot delete your own administrator account.' });
        }

        const result = await db.query('DELETE FROM users WHERE id = $1 RETURNING id, full_name, role', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }

        res.status(200).json({ message: `User "${result.rows[0].full_name}" deleted successfully.` });
    } catch (error) {
        console.error('Admin Delete User Error:', error);
        // Handle foreign key constraint: user has created exams with ON DELETE RESTRICT
        if (error.code === '23503') {
            return res.status(409).json({ error: 'Cannot delete this user because they own exams or rubrics. Reassign or delete those first.' });
        }
        res.status(500).json({ error: 'Internal server error while deleting user.' });
    }
});

/**
 * PUT /api/admin/users/:id/reset-password
 * Reset a user's password to a new value.
 */
router.put('/users/:id/reset-password', async (req, res) => {
    const { id } = req.params;
    const { new_password } = req.body;

    if (!new_password || new_password.length < 8) {
        return res.status(400).json({ error: 'new_password is required and must be at least 8 characters.' });
    }

    try {
        const passwordHash = await bcrypt.hash(new_password, 12);
        const result = await db.query(
            'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, full_name',
            [passwordHash, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }

        res.status(200).json({ message: `Password for "${result.rows[0].full_name}" has been reset successfully.` });
    } catch (error) {
        console.error('Admin Reset Password Error:', error);
        res.status(500).json({ error: 'Internal server error while resetting password.' });
    }
});

// ==========================================
// EXAM MANAGEMENT
// ==========================================

/**
 * DELETE /api/admin/exams/:id
 * Delete an exam. Cascades to submissions, evaluations, rubrics.
 */
router.delete('/exams/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await db.query(
            'DELETE FROM exams WHERE id = $1 RETURNING id, course_code, exam_name',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Exam not found.' });
        }

        const deleted = result.rows[0];
        res.status(200).json({
            message: `Exam "${deleted.course_code} — ${deleted.exam_name}" and all associated data deleted successfully.`
        });
    } catch (error) {
        console.error('Admin Delete Exam Error:', error);
        res.status(500).json({ error: 'Internal server error while deleting exam.' });
    }
});

/**
 * GET /api/admin/activity
 * Returns recent system activity for the admin dashboard.
 */
router.get('/activity', async (req, res) => {
    try {
        const recentSubmissions = await db.query(`
            SELECT s.id, u.full_name AS student_name, e.exam_name, e.course_code, s.status, s.upload_timestamp
            FROM submissions s
            JOIN users u ON s.student_id = u.id
            JOIN exams e ON s.exam_id = e.id
            ORDER BY s.upload_timestamp DESC
            LIMIT 8
        `);

        const recentEvaluations = await db.query(`
            SELECT ev.id, ev.total_score, ev.confidence_flag, ev.created_at,
                   u.full_name AS student_name, ex.exam_name, ex.course_code
            FROM evaluations ev
            JOIN submissions s ON ev.submission_id = s.id
            JOIN users u ON s.student_id = u.id
            JOIN exams ex ON s.exam_id = ex.id
            ORDER BY ev.created_at DESC
            LIMIT 8
        `);

        res.status(200).json({
            recentSubmissions: recentSubmissions.rows,
            recentEvaluations: recentEvaluations.rows
        });
    } catch (error) {
        console.error('Admin Activity Fetch Error:', error);
        res.status(500).json({ error: 'Internal server error while fetching activity.' });
    }
});

module.exports = router;
