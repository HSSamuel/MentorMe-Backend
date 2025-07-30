"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGoogleBooks = exports.getYouTubeVideos = void 0;
const youtube_service_1 = require("../services/youtube.service");
const axios_1 = __importDefault(require("axios")); // --- 1. IMPORT AXIOS ---
// Existing function for YouTube
const getYouTubeVideos = async (req, res) => {
    const { query } = req.query;
    if (!query || typeof query !== "string") {
        return res.status(400).json({ message: "A search query is required." });
    }
    try {
        const videos = await (0, youtube_service_1.searchYouTube)(query);
        res.status(200).json(videos);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to fetch videos." });
    }
};
exports.getYouTubeVideos = getYouTubeVideos;
// --- 2. ADD NEW FUNCTION FOR GOOGLE BOOKS ---
const getGoogleBooks = async (req, res) => {
    const { query } = req.query;
    const GOOGLE_BOOKS_API_KEY = process.env.GOOGLE_BOOKS_API_KEY;
    if (!query || typeof query !== "string") {
        return res.status(400).json({ message: "A search query is required." });
    }
    if (!GOOGLE_BOOKS_API_KEY) {
        return res
            .status(500)
            .json({ message: "Google Books API key is not configured." });
    }
    try {
        const response = await axios_1.default.get("https://www.googleapis.com/books/v1/volumes", {
            params: {
                q: query,
                key: GOOGLE_BOOKS_API_KEY,
                maxResults: 9,
                orderBy: "relevance",
            },
        });
        const books = response.data.items || [];
        const formattedResources = books.map((book) => ({
            id: book.id,
            title: book.volumeInfo.title,
            description: book.volumeInfo.description || "No description available.",
            link: book.volumeInfo.previewLink,
            type: "BOOK",
            tags: book.volumeInfo.categories || [],
            imageUrl: book.volumeInfo.imageLinks?.thumbnail,
        }));
        res.status(200).json(formattedResources);
    }
    catch (error) {
        console.error("Error fetching from Google Books API:", error.response?.data?.error || error.message);
        res.status(500).json({ message: "Failed to fetch books." });
    }
};
exports.getGoogleBooks = getGoogleBooks;
