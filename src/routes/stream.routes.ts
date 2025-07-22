import { Router } from "express";
import { createStreamToken } from "../controllers/stream.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

// A protected route to get a Stream token for the authenticated user
router.post("/token", authMiddleware, createStreamToken);

export default router;
