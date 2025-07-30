import { Request, Response } from "express";
import { searchYouTube } from "../services/youtube.service";
import axios from "axios"; // --- 1. IMPORT AXIOS ---

// Existing function for YouTube
export const getYouTubeVideos = async (req: Request, res: Response) => {
  const { query } = req.query;

  if (!query || typeof query !== "string") {
    return res.status(400).json({ message: "A search query is required." });
  }

  try {
    const videos = await searchYouTube(query);
    res.status(200).json(videos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch videos." });
  }
};

// --- 2. ADD NEW FUNCTION FOR GOOGLE BOOKS ---
export const getGoogleBooks = async (req: Request, res: Response) => {
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
    const response = await axios.get(
      "https://www.googleapis.com/books/v1/volumes",
      {
        params: {
          q: query,
          key: GOOGLE_BOOKS_API_KEY,
          maxResults: 9,
          orderBy: "relevance",
        },
      }
    );

    const books = response.data.items || [];

    const formattedResources = books.map((book: any) => ({
      id: book.id,
      title: book.volumeInfo.title,
      description: book.volumeInfo.description || "No description available.",
      link: book.volumeInfo.previewLink,
      type: "BOOK",
      tags: book.volumeInfo.categories || [],
      imageUrl: book.volumeInfo.imageLinks?.thumbnail,
    }));

    res.status(200).json(formattedResources);
  } catch (error: any) {
    console.error(
      "Error fetching from Google Books API:",
      error.response?.data?.error || error.message
    );
    res.status(500).json({ message: "Failed to fetch books." });
  }
};
