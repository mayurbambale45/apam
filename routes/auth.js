const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

// Helper to determine valid roles
const validRoles = ['administrator', 'examination_system', 'teacher', 'student'];

/**
 * POST /api/auth/register
 * Registers a new user.
 */
router.post('/register', async (req, res) => {
    const { email, password, name, role } = req.body;

    try {
        // Validate input
        if (!email || !password || !name || !role) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        if (!validRoles.includes(role)) {
            return res.status(400).json({ error: 'Invalid user role provided' });
        }

        // Check if the user already exists
        const userExists = await db.query('SELECT id FROM users WHERE email = $1', [email]);
        if (userExists.rows.length > 0) {
            return res.status(409).json({ error: 'User with this email already exists' });
        }

        // Hash the password
        const saltRounds = 12; // 12 is a secure and standard default for bcrypt
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Insert new user into the database
        const insertQuery = `
            INSERT INTO users (email, password_hash, full_name, role)
            VALUES ($1, $2, $3, $4)
            RETURNING id, email, full_name, role, created_at
        `;
        const newUser = await db.query(insertQuery, [email, passwordHash, name, role]);

        res.status(201).json({
            message: 'User registered successfully',
            user: newUser.rows[0]
        });

    } catch (error) {
        console.error('Registration Error:', error);
        res.status(500).json({ error: 'Internal server error during registration' });
    }
});

/**
 * POST /api/auth/login
 * Authenticates a user and returns a JWT.
 */
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Validate input
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Fetch user from the database
        const userResult = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = userResult.rows[0];

        if (!user) {
            // Use generic error messages to prevent user enumeration
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Compare the provided password with the stored hash
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Generate a JWT
        const payload = {
            id: user.id,
            role: user.role
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_IN || '24h'
        });

        res.status(200).json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ error: 'Internal server error during login' });
    }
});

/**
 * GET /api/auth/users
 * Returns a list of users, optionally filtered by role.
 * Restricted to 'teacher', 'examination_system', and 'administrator'.
 */
router.get('/users', authenticateToken, authorizeRoles('teacher', 'examination_system', 'administrator'), async (req, res) => {
    const { role } = req.query;

    try {
        let queryText = `
            SELECT u.id, u.email, u.full_name, u.role, u.created_at,
                   sp.prn_number, sp.roll_number, sp.department, sp.year
            FROM users u
            LEFT JOIN students_profile sp ON u.id = sp.user_id
        `;
        const queryParams = [];

        if (role && validRoles.includes(role)) {
            queryText += ' WHERE u.role = $1';
            queryParams.push(role);
        }

        queryText += ' ORDER BY u.full_name ASC';

        const result = await db.query(queryText, queryParams);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Fetch Users Error:', error);
        res.status(500).json({ error: 'Internal server error while fetching users.' });
    }
});

module.exports = router;
