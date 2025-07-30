"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const discover_controller_1 = require("../controllers/discover.controller"); // --- 1. IMPORT NEW FUNCTION ---
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Route to search for YouTube videos
// GET /api/discover/youtube?query=your-search-term
router.get("/youtube", auth_middleware_1.authMiddleware, discover_controller_1.getYouTubeVideos);
// --- 2. ADD NEW ROUTE FOR GOOGLE BOOKS ---
// GET /api/discover/books?query=your-search-term
router.get("/books", auth_middleware_1.authMiddleware, discover_controller_1.getGoogleBooks);
exports.default = router;
