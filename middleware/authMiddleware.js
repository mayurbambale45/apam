const jwt = require('jsonwebtoken');

/**
 * Middleware to authenticate requests using JWT.
 * Validates the Authorization header and attaches the decoded user payload to req.user.
 */
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Format is "Bearer <token>"

    if (!token) {
        return res.status(401).json({ error: 'Access token is missing or invalid' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Token is invalid or has expired' });
    }
};

/**
 * Middleware factory to restrict access to specific roles.
 * Must be used AFTER `authenticateToken`.
 * 
 * @param {...string} allowedRoles - A list of allowed roles (e.g., 'administrator', 'teacher')
 */
const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.status(401).json({ error: 'User role not found in token' });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: 'You do not have permission to perform this action' });
        }

        next();
    };
};

module.exports = {
    authenticateToken,
    authorizeRoles
};
