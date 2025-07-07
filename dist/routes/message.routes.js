"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const message_controller_1 = require("../controllers/message.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const express_validator_1 = require("express-validator");
const validateRequest_1 = require("../middleware/validateRequest");
const router = (0, express_1.Router)();
// Route to get all conversations for the logged-in user
router.get("/", auth_middleware_1.authMiddleware, message_controller_1.getConversations);
// Route to get all messages for a specific conversation
router.get("/:conversationId", auth_middleware_1.authMiddleware, [
    // Validate that the conversationId is a valid MongoDB ObjectId
    (0, express_validator_1.param)("conversationId").isMongoId().withMessage("Invalid conversation ID"),
], validateRequest_1.validateRequest, message_controller_1.getMessages);
exports.default = router;
