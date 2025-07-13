"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const ai_controller_1 = require("../controllers/ai.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validateRequest_1 = require("../middleware/validateRequest");
// FIX: Import the new memory uploader
const fileUpload_middleware_1 = require("../middleware/fileUpload.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authMiddleware);
router.get("/conversations", ai_controller_1.getAIConversations);
router.get("/messages/:conversationId", [(0, express_validator_1.param)("conversationId").isMongoId().withMessage("Invalid conversation ID.")], validateRequest_1.validateRequest, ai_controller_1.getAIMessages);
router.post("/chat", ai_controller_1.handleAIChat);
router.post("/chat/cohere", ai_controller_1.handleCohereChat);
// FIX: Use the memoryUpload middleware for this route
router.post("/analyze-file", fileUpload_middleware_1.memoryUpload.single("file"), ai_controller_1.handleFileAnalysis);
router.delete("/conversations/:conversationId", [(0, express_validator_1.param)("conversationId").isMongoId().withMessage("Invalid conversation ID.")], validateRequest_1.validateRequest, ai_controller_1.deleteAIConversation);
exports.default = router;
