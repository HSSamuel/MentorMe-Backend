import { Router } from "express";
import { param } from "express-validator";
import {
  getAIConversations,
  getAIMessages,
  handleAIChat,
  handleCohereChat,
  handleFileAnalysis,
  deleteAIConversation,
  getAiMentorMatches, // Added this import
} from "../controllers/ai.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { validateRequest } from "../middleware/validateRequest";
import { memoryUpload } from "../middleware/fileUpload.middleware";

const router = Router();

// This middleware will protect all routes defined below it
router.use(authMiddleware);

// --- NEW ROUTE FOR MENTOR MATCHING ---
// When a GET request is made to /api/ai/matches, it will be handled by getAiMentorMatches
router.get("/matches", getAiMentorMatches);

// --- Existing Chat Routes ---

router.get("/conversations", getAIConversations);

router.get(
  "/messages/:conversationId",
  [param("conversationId").isMongoId().withMessage("Invalid conversation ID.")],
  validateRequest,
  getAIMessages
);

router.post("/chat", handleAIChat);
router.post("/chat/cohere", handleCohereChat);

router.post("/analyze-file", memoryUpload.single("file"), handleFileAnalysis);

router.delete(
  "/conversations/:conversationId",
  [param("conversationId").isMongoId().withMessage("Invalid conversation ID.")],
  validateRequest,
  deleteAIConversation
);

export default router;
