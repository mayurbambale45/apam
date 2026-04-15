const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

// POST /api/notifications - Exam cell creates a new notification
router.post('/', authenticateToken, authorizeRoles('Exam Cell'), async (req, res) => {
    const { title, message, target_role } = req.body;

    // Validate
    if (!title || !message || !target_role) {
        return res.status(400).json({ error: 'Title, message, and target role are required.' });
    }

    try {
        const result = await db.query(
            'INSERT INTO notifications (title, message, target_role) VALUES ($1, $2, $3) RETURNING *',
            [title, message, target_role]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error creating notification:', err);
        res.status(500).json({ error: 'Server error creating notification' });
    }
});

// GET /api/notifications - Get notifications for current user's role
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userRole = req.user.role; // e.g., 'student', 'faculty', 'exam_cell'
        
        let query;
        let params = [];
        
        if (userRole === 'Exam Cell') {
            // Exam cell sees all notifications they created
            query = 'SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50';
        } else {
            // Student or faculty only sees ones targeted to them or 'all'
            // Roles in the rest of the application are 'Student', 'Faculty', etc but usually lowercased by standard. Let's use ILIKE for safety.
            query = 'SELECT * FROM notifications WHERE LOWER(target_role) = LOWER($1) OR LOWER(target_role) = $2 ORDER BY created_at DESC LIMIT 50';
            params = [userRole, 'all'];
        }

        const result = await db.query(query, params);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Error fetching notifications:', err);
        res.status(500).json({ error: 'Server error fetching notifications' });
    }
});

module.exports = router;
