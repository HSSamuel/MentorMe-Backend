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
// --- ROUTE FOR MENTOR MATCHING ---
router.get("/matches", ai_controller_1.getAiMentorMatches);
// --- Route for summarizing session transcripts ---
router.post("/summarize", [
    (0, express_validator_1.body)("sessionId")
        .isMongoId()
        .withMessage("A valid session ID is required."),
    (0, express_validator_1.body)("transcript")
        .notEmpty()
        .withMessage("Transcript content cannot be empty."),
], validateRequest_1.validateRequest, ai_controller_1.summarizeTranscript);
// --- Chat Routes ---
router.get("/conversations", ai_controller_1.getAIConversations);
router.get("/messages/:conversationId", [(0, express_validator_1.param)("conversationId").isMongoId().withMessage("Invalid conversation ID.")], validateRequest_1.validateRequest, ai_controller_1.getAIMessages);
router.post("/chat", ai_controller_1.handleAIChat);
router.post("/chat/cohere", ai_controller_1.handleCohereChat);
router.post("/analyze-file", fileUpload_middleware_1.memoryUpload.single("file"), ai_controller_1.handleFileAnalysis);
router.delete("/conversations/:conversationId", [(0, express_validator_1.param)("conversationId").isMongoId().withMessage("Invalid conversation ID.")], validateRequest_1.validateRequest, ai_controller_1.deleteAIConversation);
exports.default = router;
