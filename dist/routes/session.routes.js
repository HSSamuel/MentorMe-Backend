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
// Mentee calls this endpoint to notify the mentor they are in the video call
router.post("/:sessionId/notify-call", auth_middleware_1.authMiddleware, auth_middleware_1.menteeMiddleware, // Ensures only the mentee can trigger this
[(0, express_validator_1.param)("sessionId").isMongoId().withMessage("Invalid session ID")], validateRequest_1.validateRequest, session_controller_1.notifyMentorOfCall);
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
// GET: Any authenticated participant can retrieve the insights for a session
router.get("/:sessionId/insights", auth_middleware_1.authMiddleware, [(0, express_validator_1.param)("sessionId").isMongoId().withMessage("Invalid session ID")], validateRequest_1.validateRequest, session_controller_1.getSessionInsights);
exports.default = router;
