"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const passport_1 = __importDefault(require("passport"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const auth_controller_1 = require("../controllers/auth.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const express_validator_1 = require("express-validator");
const validateRequest_1 = require("../middleware/validateRequest");
const router = (0, express_1.Router)();
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-key";
// Standard email/password registration (now public)
router.post("/register", [
    (0, express_validator_1.body)("email").isEmail().withMessage("Please enter a valid email"),
    (0, express_validator_1.body)("password")
        .isLength({ min: 6 })
        .withMessage("Password must be at least 6 characters long"),
    (0, express_validator_1.body)("role")
        .isIn(["ADMIN", "MENTOR", "MENTEE"])
        .withMessage("Invalid role"),
], validateRequest_1.validateRequest, auth_controller_1.register);
// Standard email/password login
router.post("/login", [
    (0, express_validator_1.body)("email").isEmail().withMessage("Please enter a valid email"),
    (0, express_validator_1.body)("password").notEmpty().withMessage("Password is required"),
], validateRequest_1.validateRequest, auth_controller_1.login);
router.get("/me", auth_middleware_1.authMiddleware, auth_controller_1.getMe);
// --- Social Login Routes ---
// Google Auth
router.get("/google", passport_1.default.authenticate("google", { scope: ["profile", "email"] }));
router.get("/google/callback", passport_1.default.authenticate("google", {
    failureRedirect: `${process.env.FRONTEND_URL}/login`,
    session: false,
}), (req, res) => {
    const user = req.user;
    const token = jsonwebtoken_1.default.sign({ userId: user.id, role: user.role }, JWT_SECRET, {
        expiresIn: "1d",
    });
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
});
// Facebook Auth
router.get("/facebook", passport_1.default.authenticate("facebook", { scope: ["email"] }));
router.get("/facebook/callback", passport_1.default.authenticate("facebook", {
    failureRedirect: `${process.env.FRONTEND_URL}/login`,
    session: false,
}), (req, res) => {
    const user = req.user;
    const token = jsonwebtoken_1.default.sign({ userId: user.id, role: user.role }, JWT_SECRET, {
        expiresIn: "1d",
    });
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
});
exports.default = router;
