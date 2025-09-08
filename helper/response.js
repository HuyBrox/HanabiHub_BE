// Response helper functions
const sendResponse = (res, statusCode, success, message, data = null) => {
    return res.status(statusCode).json({
        success,
        message,
        data,
        timestamp: new Date().toISOString()
    });
};

const sendSuccess = (res, data = null, message = 'Success', statusCode = 200) => {
    return sendResponse(res, statusCode, true, message, data);
};

const sendError = (res, message = 'Error', statusCode = 400, errors = null) => {
    return res.status(statusCode).json({
        success: false,
        message,
        errors,
        timestamp: new Date().toISOString()
    });
};

const sendCreated = (res, data = null, message = 'Created successfully') => {
    return sendSuccess(res, data, message, 201);
};

const sendNotFound = (res, message = 'Resource not found') => {
    return sendError(res, message, 404);
};

const sendUnauthorized = (res, message = 'Unauthorized') => {
    return sendError(res, message, 401);
};

const sendServerError = (res, message = 'Internal server error') => {
    return sendError(res, message, 500);
};

module.exports = {
    sendResponse,
    sendSuccess,
    sendError,
    sendCreated,
    sendNotFound,
    sendUnauthorized,
    sendServerError
};
