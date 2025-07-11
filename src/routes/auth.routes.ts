import { Router } from "express";
import passport from "passport";
import jwt from "jsonwebtoken";
import { register, login, getMe } from "../controllers/auth.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { body } from "express-validator";
import { validateRequest } from "../middleware/validateRequest";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-key";

// Standard email/password registration (now public)
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

// Facebook Auth
router.get(
  "/facebook",
  passport.authenticate("facebook", { scope: ["email"] })
);

router.get(
  "/facebook/callback",
  passport.authenticate("facebook", {
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

export default router;
