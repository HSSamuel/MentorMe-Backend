import { Router } from "express";
import {
  googleAuth,
  googleAuthCallback,
} from "../controllers/calendar.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

// Redirects user to Google to grant calendar access
router.get("/google", authMiddleware, googleAuth);

// The callback URL that Google will redirect to
router.get("/google/callback", googleAuthCallback);

export default router;
