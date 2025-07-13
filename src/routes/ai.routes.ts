import { Router } from "express";
import { param } from "express-validator";
import {
  getAIConversations,
  getAIMessages,
  handleAIChat,
  handleCohereChat,
  handleFileAnalysis,
  deleteAIConversation,
} from "../controllers/ai.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { validateRequest } from "../middleware/validateRequest";
// FIX: Import the new memory uploader
import { memoryUpload } from "../middleware/fileUpload.middleware";

const router = Router();

router.use(authMiddleware);

router.get("/conversations", getAIConversations);

router.get(
  "/messages/:conversationId",
  [param("conversationId").isMongoId().withMessage("Invalid conversation ID.")],
  validateRequest,
  getAIMessages
);

router.post("/chat", handleAIChat);
router.post("/chat/cohere", handleCohereChat);

// FIX: Use the memoryUpload middleware for this route
router.post("/analyze-file", memoryUpload.single("file"), handleFileAnalysis);

router.delete(
  "/conversations/:conversationId",
  [param("conversationId").isMongoId().withMessage("Invalid conversation ID.")],
  validateRequest,
  deleteAIConversation
);

export default router;
