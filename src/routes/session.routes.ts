import { Router } from "express";
import {
  setAvailability,
  getAvailability,
  getMentorAvailability,
  createSession,
  getMentorSessions,
  getMenteeSessions,
  submitFeedback,
  generateVideoCallToken,
  notifyParticipantsOfCall, // <-- FIX: Renamed from notifyMentorOfCall
  createSessionInsights,
  getSessionInsights,
  getSessionDetails,
  getGroupSessions,
  joinGroupSession,
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

// --- NEW ROUTES FOR GROUP SESSIONS (MENTORING CIRCLES) ---

// Mentor: Create a new group session
router.post(
  "/group",
  authMiddleware,
  mentorMiddleware,
  [
    body("sessionTime").isISO8601().withMessage("Invalid session time"),
    body("topic").isString().notEmpty().withMessage("Topic is required"),
    body("maxParticipants")
      .isInt({ min: 2, max: 10 })
      .withMessage("Max participants must be between 2 and 10"),
    body("isGroupSession").custom((value) => {
      if (value !== true) {
        throw new Error("isGroupSession must be true for this route");
      }
      return true;
    }),
  ],
  validateRequest,
  createSession // The same controller function handles this logic
);

// GET: All available group sessions for mentees to browse
router.get("/group", authMiddleware, getGroupSessions);

// POST: Mentee joins a specific group session
router.post(
  "/:sessionId/join",
  authMiddleware,
  menteeMiddleware,
  [param("sessionId").isMongoId().withMessage("Invalid session ID")],
  validateRequest,
  joinGroupSession
);

// --- END OF GROUP SESSION ROUTES ---

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

router.post(
  "/:sessionId/call-token",
  authMiddleware,
  [param("sessionId").isMongoId().withMessage("Invalid session ID")],
  validateRequest,
  generateVideoCallToken
);

// --- FIX: Allow any authenticated user to notify, not just mentees ---
router.post(
  "/:sessionId/notify-call",
  authMiddleware, // Removed menteeMiddleware
  [param("sessionId").isMongoId().withMessage("Invalid session ID")],
  validateRequest,
  notifyParticipantsOfCall // <-- FIX: Use the new function name
);

// --- ROUTES FOR SESSION INSIGHTS ---

// POST: Any authenticated user (mentor or mentee) can create insights after a call
router.post(
  "/:sessionId/insights",
  authMiddleware,
  [
    param("sessionId").isMongoId().withMessage("Invalid session ID"),
    body("transcript")
      .isString()
      .withMessage("Transcript must be a string.")
      .isLength({ min: 50 })
      .withMessage("Transcript must be at least 50 characters long."),
  ],
  validateRequest,
  createSessionInsights
);

// GET: This is the primary route for the SessionInsightsPage.
// It fetches the full session details AND the nested AI insights.
router.get(
  "/:sessionId/insights",
  authMiddleware,
  [param("sessionId").isMongoId().withMessage("Invalid session ID")],
  validateRequest,
  getSessionInsights
);

// --- Route to get details of a single session ---
// This is a general-purpose route to get session info without the insights.
router.get(
  "/:sessionId",
  authMiddleware,
  [param("sessionId").isMongoId().withMessage("Invalid session ID")],
  validateRequest,
  getSessionDetails
);

export default router;
