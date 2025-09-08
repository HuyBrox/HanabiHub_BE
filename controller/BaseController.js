// Base controller class with common methods
class BaseController {
    // Success response
    success(res, data = null, message = 'Success', statusCode = 200) {
        return res.status(statusCode).json({
            success: true,
            message,
            data
        });
    }

    // Error response
    error(res, message = 'Error', statusCode = 400, errors = null) {
        return res.status(statusCode).json({
            success: false,
            message,
            errors
        });
    }

    // Created response
    created(res, data = null, message = 'Created successfully') {
        return this.success(res, data, message, 201);
    }

    // Not found response
    notFound(res, message = 'Resource not found') {
        return this.error(res, message, 404);
    }

    // Unauthorized response
    unauthorized(res, message = 'Unauthorized') {
        return this.error(res, message, 401);
    }

    // Server error response
    serverError(res, message = 'Internal server error') {
        return this.error(res, message, 500);
    }
}

module.exports = BaseController;
