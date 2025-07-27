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
  getIcebreakers,
} from "../controllers/ai.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { validateRequest } from "../middleware/validateRequest";
import { memoryUpload } from "../middleware/fileUpload.middleware";

const router = Router();

// Middleware to protect all routes defined below it
router.use(authMiddleware);

// --- AI-Powered Mentor Matching Route ---
router.get("/matches", getAiMentorMatches);

// --- AI-Powered Session Analysis Route ---
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

// --- AI-Powered Icebreakers Route ---
router.get(
  "/icebreakers/:mentorshipId",
  [param("mentorshipId").isMongoId().withMessage("Invalid mentorship ID.")],
  validateRequest,
  getIcebreakers
);

// --- AI Chat Assistant Routes ---

// Get all conversations for the logged-in user
router.get("/conversations", getAIConversations);

// Get all messages for a specific conversation
router.get(
  "/messages/:conversationId",
  [param("conversationId").isMongoId().withMessage("Invalid conversation ID.")],
  validateRequest,
  getAIMessages
);

// Main chat handlers
router.post("/chat", handleAIChat);
router.post("/chat/cohere", handleCohereChat);

// File analysis route
router.post("/analyze-file", memoryUpload.single("file"), handleFileAnalysis);

// Delete a conversation and its messages
router.delete(
  "/conversations/:conversationId",
  [param("conversationId").isMongoId().withMessage("Invalid conversation ID.")],
  validateRequest,
  deleteAIConversation
);

export default router;
