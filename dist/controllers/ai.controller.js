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
exports.handleCohereChat = exports.handleAIChat = exports.getAIMessages = exports.getAIConversations = void 0;
const generative_ai_1 = require("@google/generative-ai");
const client_1 = require("@prisma/client");
const cohere_ai_1 = require("cohere-ai");
// API Key Check
if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set in the environment variables.");
}
if (!process.env.COHERE_API_KEY) {
    throw new Error("COHERE_API_KEY is not set in the environment variables.");
}
const prisma = new client_1.PrismaClient();
const genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const cohere = new cohere_ai_1.CohereClient({
    token: process.env.COHERE_API_KEY,
});
const getUserId = (req) => {
    if (req.user)
        return req.user.userId;
    return null;
};
// Get all past AI conversations for the logged-in user
const getAIConversations = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = getUserId(req);
    if (!userId) {
        res.status(401).json({ message: "Authentication error" });
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
        res.status(500).json({ message: "Error fetching conversations." });
    }
});
exports.getAIConversations = getAIConversations;
// Get all messages for a specific AI conversation
const getAIMessages = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = getUserId(req);
    const { conversationId } = req.params;
    if (!userId) {
        res.status(401).json({ message: "Authentication error" });
        return;
    }
    try {
        const messages = yield prisma.aIMessage.findMany({
            where: { conversationId: conversationId, conversation: { userId } },
            orderBy: { createdAt: "asc" },
        });
        res.status(200).json(messages);
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching messages." });
    }
});
exports.getAIMessages = getAIMessages;
// --- Generic Chat Handler ---
const chatWithAI = (req, res, aiProvider) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = getUserId(req);
    let { conversationId, message } = req.body;
    const systemPrompt = "You are a helpful assistant for a mentorship platform called MentorMe. Be friendly, encouraging, and provide general guidance. Do not ask for personal information unless absolutely necessary for the user's query.";
    if (!userId || !message) {
        return res
            .status(400)
            .json({ message: "User ID and message are required." });
    }
    try {
        let currentConversationId = conversationId;
        if (!currentConversationId) {
            const newConversation = yield prisma.aIConversation.create({
                data: {
                    userId,
                    title: `${aiProvider.charAt(0).toUpperCase() + aiProvider.slice(1)}: ${message.substring(0, 30)}...`,
                },
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
            const history = pastMessages.map((msg) => ({
                parts: [{ text: msg.content }],
                role: msg.sender === "USER" ? "user" : "model",
            }));
            const model = genAI.getGenerativeModel({
                model: "gemini-1.5-flash",
                systemInstruction: systemPrompt,
            });
            const chat = model.startChat({ history: history.slice(0, -1) });
            const result = yield chat.sendMessage(message);
            aiResponseText = result.response.text();
        }
        else {
            // Cohere
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
            .status(200)
            .json({ conversationId: currentConversationId, reply: aiMessage });
    }
    catch (error) {
        console.error(`--- ${aiProvider.toUpperCase()} AI CHAT ERROR ---`);
        console.error(error);
        res.status(500).json({
            message: `Error communicating with ${aiProvider} service.`,
            error: error.message || JSON.stringify(error),
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
