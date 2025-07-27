"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.menteeMiddleware = exports.mentorMiddleware = exports.adminMiddleware = exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-key";
// No custom interface needed here anymore. We use the globally extended Request type.
const authMiddleware = (req, res, next) => {
    let token;
    const authHeader = req.headers.authorization;
    // First, check for the token in the Authorization header
    if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
    }
    // If not found, check for it in the query parameters
    else if (req.query && req.query.token) {
        token = req.query.token;
    }
    // If no token is found in either place, send an error
    if (!token) {
        res.status(401).json({ message: "Authentication token required" });
        return;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.user = decoded; // This now matches our global type definition
        next();
    }
    catch (error) {
        res.status(403).json({ message: "Invalid or expired token" });
    }
};
exports.authMiddleware = authMiddleware;
const adminMiddleware = (req, res, next) => {
    if (!req.user || !("role" in req.user) || req.user.role !== "ADMIN") {
        res
            .status(403)
            .json({ message: "Access denied. Admin privileges required." });
        return;
    }
    next();
};
exports.adminMiddleware = adminMiddleware;
const mentorMiddleware = (req, res, next) => {
    if (!req.user || !("role" in req.user) || req.user.role !== "MENTOR") {
        res
            .status(403)
            .json({ message: "Access denied. Mentor privileges required." });
        return;
    }
    next();
};
exports.mentorMiddleware = mentorMiddleware;
const menteeMiddleware = (req, res, next) => {
    if (!req.user || !("role" in req.user) || req.user.role !== "MENTEE") {
        res
            .status(403)
            .json({ message: "Access denied. Mentee privileges required." });
        return;
    }
    next();
};
exports.menteeMiddleware = menteeMiddleware;
