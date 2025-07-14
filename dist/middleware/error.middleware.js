"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jsonErrorHandler = void 0;
const client_1 = require("@prisma/client");
const jsonErrorHandler = (err, req, res, next) => {
    var _a, _b, _c;
    let statusCode = err.statusCode || 500;
    let message = err.message || "An unexpected server error occurred.";
    console.error("--- GLOBAL ERROR HANDLER CAUGHT AN ERROR ---");
    console.error(err);
    if (err instanceof client_1.Prisma.PrismaClientKnownRequestError) {
        switch (err.code) {
            case "P2002":
                // Unique constraint violation
                statusCode = 409; // 409 Conflict is a more appropriate status code here
                // Check which unique field caused the error
                if (((_a = err.meta) === null || _a === void 0 ? void 0 : _a.target) === "User_googleId_key" ||
                    ((_b = err.meta) === null || _b === void 0 ? void 0 : _b.target) === "User_facebookId_key") {
                    message =
                        "This social account is already linked to a user. Please try logging in.";
                }
                else if (((_c = err.meta) === null || _c === void 0 ? void 0 : _c.target) === "User_email_key") {
                    message = "A user with this email address already exists.";
                }
                else {
                    message = "A record with this value already exists.";
                }
                break;
            case "P2025":
                // Record to update or delete not found
                statusCode = 404;
                message = "The requested record was not found.";
                break;
            default:
                message = "A database error occurred.";
                break;
        }
    }
    res.status(statusCode).json({
        message: message,
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
};
exports.jsonErrorHandler = jsonErrorHandler;
