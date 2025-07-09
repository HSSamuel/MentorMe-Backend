"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserId = void 0;
/**
 * Safely extracts the user ID from the request object, which might be populated
 * by either the JWT middleware or Passport's session management.
 * @param {Request} req The Express request object.
 * @returns {string | null} The user ID if found, otherwise null.
 */
const getUserId = (req) => {
    if (!req.user)
        return null;
    // Check for JWT payload structure from our authMiddleware
    if ("userId" in req.user && req.user.userId) {
        return req.user.userId;
    }
    // Check for Passport user object structure (often has an 'id' property)
    if ("id" in req.user && req.user.id) {
        return req.user.id;
    }
    return null;
};
exports.getUserId = getUserId;
