import { Router } from "express";
import {
  getYouTubeVideos,
  getGoogleBooks,
} from "../controllers/discover.controller"; // --- 1. IMPORT NEW FUNCTION ---
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

// Route to search for YouTube videos
// GET /api/discover/youtube?query=your-search-term
router.get("/youtube", authMiddleware, getYouTubeVideos);

// --- 2. ADD NEW ROUTE FOR GOOGLE BOOKS ---
// GET /api/discover/books?query=your-search-term
router.get("/books", authMiddleware, getGoogleBooks);

export default router;
