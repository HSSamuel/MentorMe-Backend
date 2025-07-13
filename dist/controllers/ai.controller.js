"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAIConversation = exports.handleFileAnalysis = exports.handleCohereChat = exports.handleAIChat = exports.getAIMessages = exports.getAIConversations = void 0;
const generative_ai_1 = require("@google/generative-ai");
const client_1 = require("@prisma/client");
const cohere_ai_1 = require("cohere-ai");
const getUserId_1 = require("../utils/getUserId");
// --- Initialization ---
if (!process.env.GEMINI_API_KEY || !process.env.COHERE_API_KEY) {
    console.error("🔴 AI API keys are not set in environment variables.");
    throw new Error("AI API keys are not set.");
}
const prisma = new client_1.PrismaClient();
const genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const cohere = new cohere_ai_1.CohereClient({
    token: process.env.COHERE_API_KEY,
});
// --- Route Handlers (getAIConversations, getAIMessages, etc. remain unchanged) ---
const getAIConversations = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = (0, getUserId_1.getUserId)(req);
    if (!userId) {
        res.status(401).json({
            message: "Authentication error: User ID could not be determined.",
        });
        return;
    }
    try {
        const conversations = yield prisma.aIConversation.findMany({
            where: { userId },
            orderBy: { updatedAt: "desc" },
            include: { _count: { select: { messages: true } } },
        });
        res.status(200).json(conversations);
    }
    catch (error) {
        console.error("Error in getAIConversations:", error);
        res
            .status(500)
            .json({ message: "Server error while fetching conversations." });
    }
});
exports.getAIConversations = getAIConversations;
const getAIMessages = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = (0, getUserId_1.getUserId)(req);
    const { conversationId } = req.params;
    if (!userId) {
        res.status(401).json({
            message: "Authentication error: User ID could not be determined.",
        });
        return;
    }
    if (!conversationId) {
        res.status(400).json({ message: "Conversation ID is required." });
        return;
    }
    try {
        const messages = yield prisma.aIMessage.findMany({
            where: {
                conversationId: conversationId,
                conversation: { userId },
            },
            orderBy: { createdAt: "asc" },
        });
        res.status(200).json(messages);
    }
    catch (error) {
        console.error(`Error in getAIMessages for conversation ${conversationId}:`, error);
        res.status(500).json({ message: "Server error while fetching messages." });
    }
});
exports.getAIMessages = getAIMessages;
const chatWithAI = (req, res, aiProvider) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = (0, getUserId_1.getUserId)(req);
    let { conversationId, message } = req.body;
    const systemPrompt = "You are a helpful and friendly assistant for a mentorship platform called MentorMe. Your role is to be an encouraging coach. When a user expresses a desire to set a goal (e.g., 'I want to learn a new skill', 'help me set a goal'), you must guide them by asking questions for each S.M.A.R.T. component (Specific, Measurable, Achievable, Relevant, Time-bound) one by one. Once you have gathered all five components, respond by formatting the goal clearly and instruct the user to add it to their mentorship goals page by linking them to it with this markdown [View Goals](#/goals).";
    if (!userId || !message) {
        res
            .status(400)
            .json({ message: "User ID and message content are required." });
        return;
    }
    try {
        let currentConversationId = conversationId;
        let isNewConversation = false;
        if (!currentConversationId) {
            isNewConversation = true;
            const newConversation = yield prisma.aIConversation.create({
                data: { userId, title: message.substring(0, 40) },
            });
            currentConversationId = newConversation.id;
        }
        yield prisma.aIMessage.create({
            data: {
                conversationId: currentConversationId,
                content: message,
                sender: "USER",
            },
        });
        const pastMessages = yield prisma.aIMessage.findMany({
            where: { conversationId: currentConversationId },
            orderBy: { createdAt: "asc" },
        });
        let aiResponseText;
        if (aiProvider === "gemini") {
            const model = genAI.getGenerativeModel({
                model: "gemini-1.5-flash",
                systemInstruction: systemPrompt,
            });
            const chat = model.startChat({
                history: pastMessages
                    .map((msg) => ({
                    parts: [{ text: msg.content }],
                    role: msg.sender === "USER" ? "user" : "model",
                }))
                    .slice(0, -1),
            });
            const result = yield chat.sendMessage(message);
            aiResponseText = result.response.text();
        }
        else {
            const chatHistory = pastMessages.map((msg) => ({
                role: msg.sender === "USER" ? "USER" : "CHATBOT",
                message: msg.content,
            }));
            const response = yield cohere.chat({
                preamble: systemPrompt,
                message,
                chatHistory: chatHistory.slice(0, -1),
            });
            aiResponseText = response.text;
        }
        const aiMessage = yield prisma.aIMessage.create({
            data: {
                conversationId: currentConversationId,
                content: aiResponseText,
                sender: "AI",
            },
        });
        res
            .status(isNewConversation ? 201 : 200)
            .json({ conversationId: currentConversationId, reply: aiMessage });
    }
    catch (error) {
        console.error(`--- ${aiProvider.toUpperCase()} AI CHAT ERROR ---`, error);
        res.status(500).json({
            message: `Error communicating with the ${aiProvider} service.`,
            error: error.message || "An unknown error occurred.",
        });
    }
});
const handleAIChat = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield chatWithAI(req, res, "gemini");
});
exports.handleAIChat = handleAIChat;
const handleCohereChat = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield chatWithAI(req, res, "cohere");
});
exports.handleCohereChat = handleCohereChat;
const handleFileAnalysis = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = (0, getUserId_1.getUserId)(req);
    let { conversationId, prompt } = req.body;
    if (!userId) {
        res.status(401).json({ message: "Authentication error." });
        return;
    }
    if (!req.file) {
        res.status(400).json({ message: "No file uploaded." });
        return;
    }
    try {
        let currentConversationId = conversationId;
        if (!currentConversationId) {
            const newConversation = yield prisma.aIConversation.create({
                data: { userId, title: `File Analysis: ${req.file.originalname}` },
            });
            currentConversationId = newConversation.id;
        }
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const filePart = {
            inlineData: {
                data: req.file.buffer.toString("base64"),
                mimeType: req.file.mimetype,
            },
        };
        let finalPrompt = prompt || "Analyze this file and provide a summary.";
        if (req.file.mimetype.startsWith("image/")) {
            finalPrompt = prompt || "Describe this image in detail.";
        }
        else if (req.file.mimetype === "application/pdf") {
            finalPrompt = prompt || "Summarize the key points of this PDF document.";
        }
        else if (req.file.mimetype.includes("document") ||
            req.file.mimetype.includes("presentation")) {
            finalPrompt = prompt || "Summarize the key points of this document.";
        }
        const result = yield model.generateContent([finalPrompt, filePart]);
        const aiResponseText = result.response.text();
        const aiMessage = yield prisma.aIMessage.create({
            data: {
                conversationId: currentConversationId,
                content: aiResponseText,
                sender: "AI",
            },
        });
        res
            .status(200)
            .json({ conversationId: currentConversationId, reply: aiMessage });
    }
    catch (error) {
        console.error("--- FILE ANALYSIS ERROR ---", error);
        res.status(500).json({
            message: "Error analyzing the file.",
            error: error.message || "An unknown error occurred.",
        });
    }
});
exports.handleFileAnalysis = handleFileAnalysis;
const deleteAIConversation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = (0, getUserId_1.getUserId)(req);
    const { conversationId } = req.params;
    if (!userId) {
        res.status(401).json({ message: "Authentication error." });
        return;
    }
    try {
        // FIX: Simplified the deletion process to be more resilient.
        // We first ensure the conversation belongs to the user before attempting deletion.
        const conversation = yield prisma.aIConversation.findFirst({
            where: { id: conversationId, userId: userId },
        });
        // If the conversation doesn't exist or doesn't belong to the user, throw an error.
        if (!conversation) {
            res
                .status(404)
                .json({
                message: "Conversation not found or you are not authorized to delete it.",
            });
            return;
        }
        // Now, perform the deletion in a transaction.
        // This is more robust than the previous check-then-delete pattern inside the transaction.
        yield prisma.$transaction([
            // Delete all messages associated with the conversation
            prisma.aIMessage.deleteMany({
                where: { conversationId: conversationId },
            }),
            // Delete the conversation itself
            prisma.aIConversation.delete({
                where: { id: conversationId },
            }),
        ]);
        res.status(204).send(); // No Content, successful deletion
    }
    catch (error) {
        console.error("Error deleting conversation:", error);
        // Handle case where the record to delete is not found (e.g., already deleted)
        if (error.code === "P2025") {
            res.status(404).json({ message: "Conversation not found." });
            return;
        }
        // Handle other potential errors
        res.status(500).json({
            message: "Server error while deleting conversation.",
            error: error.message,
        });
    }
});
exports.deleteAIConversation = deleteAIConversation;
