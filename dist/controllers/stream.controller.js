"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStreamToken = exports.streamClient = void 0;
const stream_chat_1 = require("stream-chat");
const getUserId_1 = require("../utils/getUserId");
// Initialize the Stream client and export it for use in other services
exports.streamClient = stream_chat_1.StreamChat.getInstance(process.env.STREAM_API_KEY, process.env.STREAM_API_SECRET, 
// This option increases the timeout to 8 seconds (8000ms),
// which prevents the "timeout exceeded" error during slow network conditions.
{ timeout: 8000 });
const createStreamToken = async (req, res) => {
    const userId = (0, getUserId_1.getUserId)(req);
    if (!userId) {
        res.status(401).json({ message: "Authentication error" });
        return;
    }
    try {
        // Generate a token for the user. This token is used by the frontend
        // to authenticate with Stream's servers.
        const token = exports.streamClient.createToken(userId);
        res.status(200).json({ token });
    }
    catch (error) {
        console.error("Error creating Stream token:", error);
        res.status(500).json({ message: "Could not create Stream token" });
    }
};
exports.createStreamToken = createStreamToken;
