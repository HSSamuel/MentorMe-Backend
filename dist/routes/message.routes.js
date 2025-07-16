"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const message_controller_1 = require("../controllers/message.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const express_validator_1 = require("express-validator");
const validateRequest_1 = require("../middleware/validateRequest");
const router = (0, express_1.Router)();
// This route gets all conversations for the logged-in user
router.get("/", auth_middleware_1.authMiddleware, message_controller_1.getConversations);
// This route gets all messages for a specific conversation
router.get("/:conversationId", auth_middleware_1.authMiddleware, [(0, express_validator_1.param)("conversationId").isMongoId().withMessage("Invalid conversation ID")], validateRequest_1.validateRequest, 
// FIX: Use the correctly imported function here as well
message_controller_1.getMessagesForConversation);
// This route creates a new message in a conversation
router.post("/", auth_middleware_1.authMiddleware, [
    (0, express_validator_1.body)("conversationId")
        .isMongoId()
        .withMessage("Conversation ID is required"),
    (0, express_validator_1.body)("content").notEmpty().withMessage("Message content cannot be empty"),
], validateRequest_1.validateRequest, message_controller_1.createMessage);
exports.default = router;
