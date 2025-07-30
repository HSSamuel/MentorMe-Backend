"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchYouTube = void 0;
const axios_1 = __importDefault(require("axios"));
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_URL = "https://www.googleapis.com/youtube/v3/search";
// This function searches YouTube and formats the results into our Resource structure
const searchYouTube = async (query, maxResults = 9) => {
    if (!YOUTUBE_API_KEY) {
        throw new Error("YouTube API key is not configured.");
    }
    try {
        const response = await axios_1.default.get(YOUTUBE_API_URL, {
            params: {
                key: YOUTUBE_API_KEY,
                q: query,
                part: "snippet",
                type: "video",
                maxResults: maxResults,
                videoEmbeddable: "true",
            },
        });
        const videos = response.data.items;
        // Transform the raw YouTube data into our desired Resource format
        const formattedResources = videos.map((video) => ({
            id: video.id.videoId,
            title: video.snippet.title,
            description: video.snippet.description,
            link: `https://www.youtube.com/watch?v=${video.id.videoId}`,
            type: "VIDEO",
            tags: [query, video.snippet.channelTitle], // Simple tags for now
            imageUrl: video.snippet.thumbnails.high.url,
        }));
        return formattedResources;
    }
    catch (error) {
        console.error("Error fetching from YouTube API:", error.response?.data?.error || error.message);
        throw new Error("Failed to fetch videos from YouTube.");
    }
};
exports.searchYouTube = searchYouTube;
