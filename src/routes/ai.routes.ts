import { Router } from "express";
import {
  handleAIChat,
  getAIConversations,
  getAIMessages,
  handleCohereChat,
} from "../controllers/ai.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { param } from "express-validator";
import { validateRequest } from "../middleware/validateRequest";

const router = Router();
router.use(authMiddleware);

router.post("/chat", handleAIChat);
router.post("/chat/cohere", handleCohereChat);
router.get("/conversations", getAIConversations);
router.get(
  "/conversations/:conversationId",
  [param("conversationId").isMongoId()],
  validateRequest,
  getAIMessages
);

export default router;
