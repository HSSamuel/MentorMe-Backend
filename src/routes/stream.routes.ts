import { Router } from "express";
import { createStreamToken } from "../controllers/stream.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

// --- [NEW TEST] ---
// A simple route to check if this file is being loaded by the server.
router.get("/health-check", (req, res) => {
  res.status(200).send("Stream routes are working!");
});
// --- END OF TEST ---

// A protected route to get a Stream token for the authenticated user
router.post("/token", authMiddleware, createStreamToken);

export default router;
