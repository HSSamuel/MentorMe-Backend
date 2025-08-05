"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const ai_controller_1 = require("../controllers/ai.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validateRequest_1 = require("../middleware/validateRequest");
const fileUpload_middleware_1 = require("../middleware/fileUpload.middleware");
const router = (0, express_1.Router)();
// Middleware to protect all routes defined below it
router.use(auth_middleware_1.authMiddleware);
// --- [NEW] AI-Powered S.M.A.R.T. Goal Assistant Route ---
router.post("/refine-goal", [(0, express_validator_1.body)("goal").notEmpty().withMessage("A goal is required to refine.")], validateRequest_1.validateRequest, ai_controller_1.refineGoalWithAI);
// --- AI-Powered Mentor Matching Route ---
router.get("/matches", ai_controller_1.getAiMentorMatches);
// --- AI-Powered Session Analysis Route ---
router.post("/summarize", [
    (0, express_validator_1.body)("sessionId")
        .isMongoId()
        .withMessage("A valid session ID is required."),
    (0, express_validator_1.body)("transcript")
        .notEmpty()
        .withMessage("Transcript content cannot be empty."),
], validateRequest_1.validateRequest, ai_controller_1.summarizeTranscript);
// --- AI-Powered Icebreakers Route ---
router.get("/icebreakers/:mentorshipId", [(0, express_validator_1.param)("mentorshipId").isMongoId().withMessage("Invalid mentorship ID.")], validateRequest_1.validateRequest, ai_controller_1.getIcebreakers);
// --- AI Chat Assistant Routes ---
// Get all conversations for the logged-in user
router.get("/conversations", ai_controller_1.getAIConversations);
// Get all messages for a specific conversation
router.get("/messages/:conversationId", [(0, express_validator_1.param)("conversationId").isMongoId().withMessage("Invalid conversation ID.")], validateRequest_1.validateRequest, ai_controller_1.getAIMessages);
// Main chat handlers
router.post("/chat", ai_controller_1.handleAIChat);
router.post("/chat/cohere", ai_controller_1.handleCohereChat);
// File analysis route
router.post("/analyze-file", fileUpload_middleware_1.memoryUpload.single("file"), ai_controller_1.handleFileAnalysis);
// Delete a conversation and its messages
router.delete("/conversations/:conversationId", [(0, express_validator_1.param)("conversationId").isMongoId().withMessage("Invalid conversation ID.")], validateRequest_1.validateRequest, ai_controller_1.deleteAIConversation);
exports.default = router;
