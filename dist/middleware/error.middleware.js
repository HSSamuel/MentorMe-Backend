"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jsonErrorHandler = void 0;
const jsonErrorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        message: err.message || "An unexpected error occurred.",
        error: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
};
exports.jsonErrorHandler = jsonErrorHandler;
