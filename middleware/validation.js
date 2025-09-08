const { sendError } = require('../helper/response');

// Request validation middleware
const validateRequest = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.body);

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path[0],
                message: detail.message
            }));

            return sendError(res, 'Validation error', 400, errors);
        }

        next();
    };
};

// Rate limiting middleware
const rateLimit = (windowMs = 15 * 60 * 1000, max = 100) => {
    const requests = new Map();

    return (req, res, next) => {
        const ip = req.ip;
        const now = Date.now();
        const windowStart = now - windowMs;

        if (!requests.has(ip)) {
            requests.set(ip, []);
        }

        const userRequests = requests.get(ip);
        const recentRequests = userRequests.filter(time => time > windowStart);

        if (recentRequests.length >= max) {
            return sendError(res, 'Too many requests', 429);
        }

        recentRequests.push(now);
        requests.set(ip, recentRequests);

        // Clean up old entries
        if (Math.random() < 0.1) { // Clean up 10% of the time
            for (const [key, times] of requests.entries()) {
                const filtered = times.filter(time => time > windowStart);
                if (filtered.length === 0) {
                    requests.delete(key);
                } else {
                    requests.set(key, filtered);
                }
            }
        }

        next();
    };
};

// Request logging middleware
const requestLogger = (req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
    });

    next();
};

module.exports = {
    validateRequest,
    rateLimit,
    requestLogger
};
