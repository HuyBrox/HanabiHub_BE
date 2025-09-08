const { sendUnauthorized } = require('../helper/response');

// Authentication middleware
const authenticate = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1]; // Bearer token

        if (!token) {
            return sendUnauthorized(res, 'Access token required');
        }

        // TODO: Implement JWT token verification
        // For now, just pass through
        req.user = { id: 'user123', username: 'testuser' };

        next();
    } catch (error) {
        console.error('Authentication error:', error);
        return sendUnauthorized(res, 'Invalid token');
    }
};

// Optional authentication middleware (for routes that work with or without auth)
const optionalAuth = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (token) {
            // TODO: Implement JWT token verification
            req.user = { id: 'user123', username: 'testuser' };
        }

        next();
    } catch (error) {
        // If auth fails, just continue without user
        next();
    }
};

module.exports = {
    authenticate,
    optionalAuth
};
