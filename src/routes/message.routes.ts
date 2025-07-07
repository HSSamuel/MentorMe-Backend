import { Router } from "express";
import {
  getConversations,
  getMessages,
} from "../controllers/message.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { param } from "express-validator";
import { validateRequest } from "../middleware/validateRequest";

const router = Router();

// Route to get all conversations for the logged-in user
router.get("/", authMiddleware, getConversations);

// Route to get all messages for a specific conversation
router.get(
  "/:conversationId",
  authMiddleware,
  [
    // Validate that the conversationId is a valid MongoDB ObjectId
    param("conversationId").isMongoId().withMessage("Invalid conversation ID"),
  ],
  validateRequest,
  getMessages
);

export default router;
