import axios from "axios";

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_URL = "https://www.googleapis.com/youtube/v3/search";

interface YouTubeVideo {
  id: {
    videoId: string;
  };
  snippet: {
    title: string;
    description: string;
    thumbnails: {
      high: {
        url: string;
      };
    };
    channelTitle: string;
  };
}

// This function searches YouTube and formats the results into our Resource structure
export const searchYouTube = async (query: string, maxResults = 9) => {
  if (!YOUTUBE_API_KEY) {
    throw new Error("YouTube API key is not configured.");
  }

  try {
    const response = await axios.get(YOUTUBE_API_URL, {
      params: {
        key: YOUTUBE_API_KEY,
        q: query,
        part: "snippet",
        type: "video",
        maxResults: maxResults,
        videoEmbeddable: "true",
      },
    });

    const videos = response.data.items as YouTubeVideo[];

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
  } catch (error: any) {
    console.error(
      "Error fetching from YouTube API:",
      error.response?.data?.error || error.message
    );
    throw new Error("Failed to fetch videos from YouTube.");
  }
};
