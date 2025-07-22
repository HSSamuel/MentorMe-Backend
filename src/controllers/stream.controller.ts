import { Request, Response } from "express";
import { StreamChat } from "stream-chat";
import { getUserId } from "../utils/getUserId";

// Initialize the Stream client with your API key and secret
const streamClient = StreamChat.getInstance(
  process.env.STREAM_API_KEY!,
  process.env.STREAM_API_SECRET!
);

// --- [FIXED] Added the explicit 'Promise<void>' return type to match Express's requirements ---
export const createStreamToken = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    // Use 'return' to ensure the function exits after sending the response
    res.status(401).json({ message: "Authentication error" });
    return;
  }

  try {
    // Generate a token for the user. This token is used by the frontend
    // to authenticate with Stream's servers.
    const token = streamClient.createToken(userId);
    res.status(200).json({ token });
  } catch (error) {
    console.error("Error creating Stream token:", error);
    res.status(500).json({ message: "Could not create Stream token" });
  }
};
