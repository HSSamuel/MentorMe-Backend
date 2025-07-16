import { Router } from "express";
import {
  getConversations,
  // FIX: Corrected the function name from getMessages to getMessagesForConversation
  getMessagesForConversation,
  createMessage,
} from "../controllers/message.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { body, param } from "express-validator";
import { validateRequest } from "../middleware/validateRequest";

const router = Router();

// This route gets all conversations for the logged-in user
router.get("/", authMiddleware, getConversations);

// This route gets all messages for a specific conversation
router.get(
  "/:conversationId",
  authMiddleware,
  [param("conversationId").isMongoId().withMessage("Invalid conversation ID")],
  validateRequest,
  // FIX: Use the correctly imported function here as well
  getMessagesForConversation
);

// This route creates a new message in a conversation
router.post(
  "/",
  authMiddleware,
  [
    body("conversationId")
      .isMongoId()
      .withMessage("Conversation ID is required"),
    body("content").notEmpty().withMessage("Message content cannot be empty"),
  ],
  validateRequest,
  createMessage
);

export default router;
