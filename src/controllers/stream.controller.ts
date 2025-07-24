import { Request, Response } from "express";
import { StreamChat } from "stream-chat";
import { getUserId } from "../utils/getUserId";

// Initialize the Stream client and export it for use in other services
export const streamClient = StreamChat.getInstance(
  process.env.STREAM_API_KEY!,
  process.env.STREAM_API_SECRET!,

  // This option increases the timeout to 8 seconds (8000ms),
  // which prevents the "timeout exceeded" error during slow network conditions.
  { timeout: 8000 }
);

export const createStreamToken = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
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
