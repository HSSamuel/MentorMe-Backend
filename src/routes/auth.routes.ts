import { Router } from "express";
import passport from "passport";
import jwt from "jsonwebtoken";
import {
  register,
  login,
  getMe,
  forgotPassword,
  resetPassword,
  handleGitHubCallback,
} from "../controllers/auth.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { body } from "express-validator";
import { validateRequest } from "../middleware/validateRequest";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-key";

// Standard email/password registration
router.post(
  "/register",
  [
    body("email").isEmail().withMessage("Please enter a valid email"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long"),
    body("role")
      .isIn(["ADMIN", "MENTOR", "MENTEE"])
      .withMessage("Invalid role"),
  ],
  validateRequest,
  register
);

// Standard email/password login
router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Please enter a valid email"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  validateRequest,
  login
);

router.get("/me", authMiddleware, getMe);

// --- Social Login Routes ---

// Google Auth
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${(process.env.FRONTEND_URL || "").replace(
      /\/$/,
      ""
    )}/login`,
    session: false,
  }),
  (req, res) => {
    const user = req.user as any;
    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, {
      expiresIn: "1d",
    });
    const frontendUrl = (process.env.FRONTEND_URL || "").replace(/\/$/, "");
    res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
  }
);

// GitHub Auth
router.get("/github", (req, res) => {
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&scope=user:email`;
    res.redirect(githubAuthUrl);
});

router.get("/github/callback", handleGitHubCallback);

// Forgot/Reset Password Routes
router.post(
  "/forgot-password",
  [body("email").isEmail().withMessage("Please enter a valid email")],
  validateRequest,
  forgotPassword
);

router.post(
  "/reset-password",
  [
    body("token").notEmpty().withMessage("Token is required"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long"),
  ],
  validateRequest,
  resetPassword
);

export default router;
