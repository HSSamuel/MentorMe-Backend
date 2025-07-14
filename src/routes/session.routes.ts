// Mentor/Backend/src/routes/session.routes.ts

import { Router } from "express";
import {
  setAvailability,
  getAvailability, // Import new function
  getMentorAvailability, // Import new function
  createSession,
  getMentorSessions,
  getMenteeSessions,
  submitFeedback,
} from "../controllers/session.controller";
import {
  authMiddleware,
  mentorMiddleware,
  menteeMiddleware,
} from "../middleware/auth.middleware";
import { body, param } from "express-validator";
import { validateRequest } from "../middleware/validateRequest";

const router = Router();

// NEW: Mentor gets their own availability
router.get(
  "/availability/me",
  authMiddleware,
  mentorMiddleware,
  getAvailability
);

// NEW: User gets a specific mentor's availability for booking
router.get(
  "/availability/:mentorId",
  authMiddleware,
  [param("mentorId").isMongoId().withMessage("Invalid mentor ID")],
  validateRequest,
  getMentorAvailability
);

// Mentor: Set weekly availability
router.post(
  "/availability",
  authMiddleware,
  mentorMiddleware,
  [body("availability").isArray().withMessage("Availability must be an array")],
  validateRequest,
  setAvailability
);

// Mentee: Book a new session
router.post(
  "/",
  authMiddleware,
  menteeMiddleware,
  [
    body("mentorId").isMongoId().withMessage("Invalid mentor ID"),
    body("sessionTime").isISO8601().withMessage("Invalid session time"),
  ],
  validateRequest,
  createSession
);

// Get all sessions where the current user is the mentor
router.get("/mentor", authMiddleware, mentorMiddleware, getMentorSessions);

// Get all sessions where the current user is the mentee
router.get("/mentee", authMiddleware, menteeMiddleware, getMenteeSessions);

// User: Submit feedback for a session
router.put(
  "/:id/feedback",
  authMiddleware,
  [
    param("id").isMongoId().withMessage("Invalid session ID"),
    body("rating")
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage("Rating must be between 1 and 5"),
    body("comment")
      .optional()
      .isString()
      .withMessage("Comment must be a string"),
  ],
  validateRequest,
  submitFeedback
);

export default router;
