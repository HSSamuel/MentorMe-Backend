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
// Standard email/password registration
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
    failureRedirect: `${(process.env.FRONTEND_URL || "").replace(/\/$/, "")}/login`,
    session: false,
}), (req, res) => {
    const user = req.user;
    const token = jsonwebtoken_1.default.sign({ userId: user.id, role: user.role }, JWT_SECRET, {
        expiresIn: "1d",
    });
    const frontendUrl = (process.env.FRONTEND_URL || "").replace(/\/$/, "");
    res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
});
// GitHub Auth
router.get("/github", (req, res) => {
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&scope=user:email`;
    res.redirect(githubAuthUrl);
});
router.get("/github/callback", auth_controller_1.handleGitHubCallback);
// Forgot/Reset Password Routes
router.post("/forgot-password", [(0, express_validator_1.body)("email").isEmail().withMessage("Please enter a valid email")], validateRequest_1.validateRequest, auth_controller_1.forgotPassword);
router.post("/reset-password", [
    (0, express_validator_1.body)("token").notEmpty().withMessage("Token is required"),
    (0, express_validator_1.body)("password")
        .isLength({ min: 6 })
        .withMessage("Password must be at least 6 characters long"),
], validateRequest_1.validateRequest, auth_controller_1.resetPassword);
exports.default = router;
