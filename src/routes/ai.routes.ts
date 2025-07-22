import { Router } from "express";
import { param, body } from "express-validator";
import {
  getAIConversations,
  getAIMessages,
  handleAIChat,
  handleCohereChat,
  handleFileAnalysis,
  deleteAIConversation,
  getAiMentorMatches,
  summarizeTranscript,
} from "../controllers/ai.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { validateRequest } from "../middleware/validateRequest";
import { memoryUpload } from "../middleware/fileUpload.middleware";

const router = Router();

// Middleware to protect all routes defined below it
router.use(authMiddleware);

// --- ROUTE FOR MENTOR MATCHING ---
router.get("/matches", getAiMentorMatches);

// --- Route for summarizing session transcripts ---
router.post(
  "/summarize",
  [
    body("sessionId")
      .isMongoId()
      .withMessage("A valid session ID is required."),
    body("transcript")
      .notEmpty()
      .withMessage("Transcript content cannot be empty."),
  ],
  validateRequest,
  summarizeTranscript
);

// --- Chat Routes ---

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
