"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const session_controller_1 = require("../controllers/session.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const express_validator_1 = require("express-validator");
const validateRequest_1 = require("../middleware/validateRequest");
const router = (0, express_1.Router)();
// NEW: Mentor gets their own availability
router.get("/availability/me", auth_middleware_1.authMiddleware, auth_middleware_1.mentorMiddleware, session_controller_1.getAvailability);
// NEW: User gets a specific mentor's availability for booking
router.get("/availability/:mentorId", auth_middleware_1.authMiddleware, [(0, express_validator_1.param)("mentorId").isMongoId().withMessage("Invalid mentor ID")], validateRequest_1.validateRequest, session_controller_1.getMentorAvailability);
// Mentor: Set weekly availability
router.post("/availability", auth_middleware_1.authMiddleware, auth_middleware_1.mentorMiddleware, [(0, express_validator_1.body)("availability").isArray().withMessage("Availability must be an array")], validateRequest_1.validateRequest, session_controller_1.setAvailability);
// Mentee: Book a new session
router.post("/", auth_middleware_1.authMiddleware, auth_middleware_1.menteeMiddleware, [
    (0, express_validator_1.body)("mentorId").isMongoId().withMessage("Invalid mentor ID"),
    (0, express_validator_1.body)("sessionTime").isISO8601().withMessage("Invalid session time"),
], validateRequest_1.validateRequest, session_controller_1.createSession);
// --- NEW ROUTES FOR GROUP SESSIONS (MENTORING CIRCLES) ---
// Mentor: Create a new group session
router.post("/group", auth_middleware_1.authMiddleware, auth_middleware_1.mentorMiddleware, [
    (0, express_validator_1.body)("sessionTime").isISO8601().withMessage("Invalid session time"),
    (0, express_validator_1.body)("topic").isString().notEmpty().withMessage("Topic is required"),
    (0, express_validator_1.body)("maxParticipants")
        .isInt({ min: 2, max: 10 })
        .withMessage("Max participants must be between 2 and 10"),
    (0, express_validator_1.body)("isGroupSession").custom((value) => {
        if (value !== true) {
            throw new Error("isGroupSession must be true for this route");
        }
        return true;
    }),
], validateRequest_1.validateRequest, session_controller_1.createSession // The same controller function handles this logic
);
// GET: All available group sessions for mentees to browse
router.get("/group", auth_middleware_1.authMiddleware, session_controller_1.getGroupSessions);
// POST: Mentee joins a specific group session
router.post("/:sessionId/join", auth_middleware_1.authMiddleware, auth_middleware_1.menteeMiddleware, [(0, express_validator_1.param)("sessionId").isMongoId().withMessage("Invalid session ID")], validateRequest_1.validateRequest, session_controller_1.joinGroupSession);
// --- END OF GROUP SESSION ROUTES ---
// Get all sessions where the current user is the mentor
router.get("/mentor", auth_middleware_1.authMiddleware, auth_middleware_1.mentorMiddleware, session_controller_1.getMentorSessions);
// Get all sessions where the current user is the mentee
router.get("/mentee", auth_middleware_1.authMiddleware, auth_middleware_1.menteeMiddleware, session_controller_1.getMenteeSessions);
// User: Submit feedback for a session
router.put("/:id/feedback", auth_middleware_1.authMiddleware, [
    (0, express_validator_1.param)("id").isMongoId().withMessage("Invalid session ID"),
    (0, express_validator_1.body)("rating")
        .optional()
        .isInt({ min: 1, max: 5 })
        .withMessage("Rating must be between 1 and 5"),
    (0, express_validator_1.body)("comment")
        .optional()
        .isString()
        .withMessage("Comment must be a string"),
], validateRequest_1.validateRequest, session_controller_1.submitFeedback);
router.post("/:sessionId/call-token", auth_middleware_1.authMiddleware, [(0, express_validator_1.param)("sessionId").isMongoId().withMessage("Invalid session ID")], validateRequest_1.validateRequest, session_controller_1.generateVideoCallToken);
// --- FIX: Allow any authenticated user to notify, not just mentees ---
router.post("/:sessionId/notify-call", auth_middleware_1.authMiddleware, // Removed menteeMiddleware
[(0, express_validator_1.param)("sessionId").isMongoId().withMessage("Invalid session ID")], validateRequest_1.validateRequest, session_controller_1.notifyParticipantsOfCall // <-- FIX: Use the new function name
);
// --- ROUTES FOR SESSION INSIGHTS ---
// POST: Any authenticated user (mentor or mentee) can create insights after a call
router.post("/:sessionId/insights", auth_middleware_1.authMiddleware, [
    (0, express_validator_1.param)("sessionId").isMongoId().withMessage("Invalid session ID"),
    (0, express_validator_1.body)("transcript")
        .isString()
        .withMessage("Transcript must be a string.")
        .isLength({ min: 50 })
        .withMessage("Transcript must be at least 50 characters long."),
], validateRequest_1.validateRequest, session_controller_1.createSessionInsights);
// GET: This is the primary route for the SessionInsightsPage.
// It fetches the full session details AND the nested AI insights.
router.get("/:sessionId/insights", auth_middleware_1.authMiddleware, [(0, express_validator_1.param)("sessionId").isMongoId().withMessage("Invalid session ID")], validateRequest_1.validateRequest, session_controller_1.getSessionInsights);
// --- Route to get details of a single session ---
// This is a general-purpose route to get session info without the insights.
router.get("/:sessionId", auth_middleware_1.authMiddleware, [(0, express_validator_1.param)("sessionId").isMongoId().withMessage("Invalid session ID")], validateRequest_1.validateRequest, session_controller_1.getSessionDetails);
exports.default = router;
