const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

// Normalized Roles mapping for backward and forward compatibility
// DB user_role ENUM: 'administrator', 'Exam Cell', 'Faculty', 'student'
const roleMapping = {
    'administrator': 'administrator',
    'admin': 'administrator',
    'faculty': 'Faculty',
    'Faculty': 'Faculty',
    'teacher': 'Faculty',
    'Teacher': 'Faculty',
    'student': 'student',
    'Student': 'student',
    'exam cell': 'Exam Cell',
    'Exam Cell': 'Exam Cell',
    'exam_cell': 'Exam Cell',
    'examcell': 'Exam Cell'
};

const validRoles = ['administrator', 'Exam Cell', 'Faculty', 'student'];
const selfRegisterRoles = ['Faculty', 'student'];

/**
 * POST /api/auth/register
 * Registers a new user (only Faculty and Student roles are allowed to self-register).
 */
router.post('/register', async (req, res) => {
    let { email, password, name, role, prn, branch, year } = req.body;
    
    // Sanitize and normalize inputs
    email = email ? email.trim() : null;
    prn = prn ? (prn.trim() || email) : email;
    name = name ? name.trim() : null;

    try {
        // Validate input
        if (!email || !password || !name || !role) {
            return res.status(400).json({ error: 'Name, ID/PRN, password, and role are required' });
        }

        if (!password || password.length < 1) {
            return res.status(400).json({ error: 'Password is required' });
        }

        // Normalize the role using roleMapping
        const normalizedRole = roleMapping[role] || roleMapping[role.toLowerCase()] || role;

        // Only Faculty and Student can self-register
        if (!selfRegisterRoles.includes(normalizedRole)) {
            return res.status(403).json({ error: 'This role cannot be self-registered. Contact the administrator.' });
        }

        // Check if the user already exists in users table
        const userExists = await db.query('SELECT id FROM users WHERE email = $1', [email]);
        if (userExists.rows.length > 0) {
            return res.status(409).json({ error: 'Identification Number (PRN/Username) is already registered.' });
        }

        // Additional check for students: PRN/Roll Number uniqueness in students_profile
        if (normalizedRole.toLowerCase() === 'student') {
            const profileExists = await db.query(
                'SELECT id FROM students_profile WHERE prn_number = $1 OR roll_number = $1', 
                [prn]
            );
            if (profileExists.rows.length > 0) {
                return res.status(409).json({ error: 'This PRN Number (User ID) is already associated with another student profile.' });
            }
        }

        // Hash the password
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Transactional insert to ensure consistency
        const client = await db.getClient();
        try {
            await client.query('BEGIN');
            
            const insertUserQuery = `
                INSERT INTO users (email, password_hash, full_name, role)
                VALUES ($1, $2, $3, $4)
                RETURNING id, email, full_name, role, created_at
            `;

            let userRes;
            try {
                // Try with normalized role first (preferred case)
                userRes = await client.query(insertUserQuery, [email, passwordHash, name, normalizedRole]);
            } catch (err) {
                // If specific enum case fails, try common fallbacks
                const commonFallbacks = [normalizedRole.toLowerCase(), normalizedRole.charAt(0).toUpperCase() + normalizedRole.slice(1).toLowerCase()];
                let success = false;
                
                for (const fallback of commonFallbacks) {
                    if (fallback === normalizedRole) continue;
                    try {
                        userRes = await client.query(insertUserQuery, [email, passwordHash, name, fallback]);
                        success = true;
                        break;
                    } catch (innerErr) { continue; }
                }
                
                if (!success) throw err; // Re-throw if all attempts fail
            }

            const newUser = userRes.rows[0];

            // If Student, store details in students_profile
            if (normalizedRole === 'student') {
                const insertProfileQuery = `
                    INSERT INTO students_profile (user_id, roll_number, prn_number, department, year)
                    VALUES ($1, $2, $3, $4, $5)
                `;
                await client.query(insertProfileQuery, [
                    newUser.id, 
                    prn, 
                    prn, 
                    branch || 'General', 
                    year || 'FY'
                ]);
            }

            await client.query('COMMIT');

            res.status(201).json({
                message: 'Identity provisioned successfully',
                user: newUser
            });
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Registration Error Details:', error);
        
        // Handle specific DB errors for better UX
        if (error.code === '23505') {
            return res.status(409).json({ error: 'Conflict: Identifier (Email/PRN) already exists in the system.' });
        }

        res.status(500).json({ 
            error: 'Internal system error during provisioning',
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});


/**
 * POST /api/auth/login
 * Authenticates a user and returns a JWT.
 */
router.post('/login', async (req, res) => {
    let { email, password } = req.body;
    
    // Sanitize input to prevent whitespace-related lookup failures
    email = email ? email.trim() : null;

    try {
        // Validate input
        if (!email || !password) {
            return res.status(400).json({ error: 'Identification Number (PRN/Email) and password are required' });
        }

        // Fetch user from the database
        const userResult = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = userResult.rows[0];

        if (!user) {
            // Use generic error messages to prevent user enumeration
            return res.status(401).json({ error: 'Invalid identifier or password mismatch' });
        }

        // Compare the provided password with the stored hash
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid identifier or password mismatch' });
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
 * Restricted to 'Faculty', 'Exam Cell', and 'administrator'.
 */
router.get('/users', authenticateToken, authorizeRoles('Faculty', 'Exam Cell', 'administrator'), async (req, res) => {
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

/**
 * POST /api/auth/change-password
 * Allows a user to change their password using their old password (unauthenticated).
 */
router.post('/change-password', async (req, res) => {
    const { userId, oldPassword, newPassword } = req.body;

    try {
        if (!userId || !oldPassword || !newPassword) {
            return res.status(400).json({ error: 'User ID, old and new passwords are required' });
        }

        if (!newPassword || newPassword.length < 1) {
            return res.status(400).json({ error: 'New password is required' });
        }

        // Fetch user context by identifier (email/username)
        const userResult = await db.query('SELECT id, password_hash FROM users WHERE email = $1', [userId]);
        const user = userResult.rows[0];

        if (!user) {
            return res.status(404).json({ error: 'User credentials not found' });
        }

        // Verify old password
        const isMatch = await bcrypt.compare(oldPassword, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Identity verification failed: Current password incorrect' });
        }

        // Hash new password
        const saltRounds = 12;
        const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

        // Update database
        await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newPasswordHash, user.id]);

        res.status(200).json({ message: 'Cryptographic credentials updated successfully' });

    } catch (error) {
        console.error('Change Password Error:', error);
        res.status(500).json({ error: 'Internal server error during credential rotation' });
    }
});

module.exports = router;
