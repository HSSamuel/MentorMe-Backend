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
exports.createMessage = exports.getMessagesForConversation = exports.getConversations = void 0;
const client_1 = require("@prisma/client");
const getUserId_1 = require("../utils/getUserId");
const prisma = new client_1.PrismaClient();
// GET all conversations for the logged-in user
const getConversations = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = (0, getUserId_1.getUserId)(req);
    if (!userId) {
        res.status(401).json({ message: "Authentication error" });
        return;
    }
    try {
        const conversations = yield prisma.conversation.findMany({
            where: {
                participants: {
                    some: {
                        id: userId,
                    },
                },
            },
            include: {
                participants: {
                    select: {
                        id: true,
                        profile: {
                            select: {
                                name: true,
                                avatarUrl: true,
                            },
                        },
                    },
                },
                // FIX: This now correctly and efficiently includes the last message for each conversation.
                messages: {
                    orderBy: {
                        createdAt: "desc",
                    },
                    take: 1, // This is the key to fetching only the most recent message.
                },
            },
            orderBy: {
                updatedAt: "desc", // Sorts conversations by the most recently active.
            },
        });
        res.status(200).json(conversations);
    }
    catch (error) {
        console.error("Error fetching conversations:", error);
        res.status(500).json({ message: "Server error fetching conversations" });
    }
});
exports.getConversations = getConversations;
// GET all messages for a specific conversation
const getMessagesForConversation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = (0, getUserId_1.getUserId)(req);
    const { conversationId } = req.params;
    if (!userId) {
        res.status(401).json({ message: "Authentication error" });
        return;
    }
    try {
        // FIX: First, verify the user is actually part of the conversation.
        const conversation = yield prisma.conversation.findFirst({
            where: {
                id: conversationId,
                participants: {
                    some: {
                        id: userId,
                    },
                },
            },
        });
        if (!conversation) {
            res
                .status(404)
                .json({ message: "Conversation not found or access denied" });
            return;
        }
        // If authorized, fetch all messages.
        const messages = yield prisma.message.findMany({
            where: { conversationId },
            orderBy: { createdAt: "asc" },
            include: {
                sender: {
                    select: {
                        id: true,
                        profile: {
                            select: {
                                name: true,
                                avatarUrl: true,
                            },
                        },
                    },
                },
            },
        });
        res.status(200).json(messages);
    }
    catch (error) {
        console.error(`Error fetching messages for convo ${conversationId}:`, error);
        res.status(500).json({ message: "Server error fetching messages" });
    }
});
exports.getMessagesForConversation = getMessagesForConversation;
// POST a new message
const createMessage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = (0, getUserId_1.getUserId)(req);
    const { conversationId, content } = req.body;
    const io = req.app.locals.io;
    if (!userId) {
        res.status(401).json({ message: "Authentication error" });
        return;
    }
    try {
        // FIX: Use a database transaction to ensure creating the message and updating the
        // conversation timestamp happen together.
        const [newMessage, updatedConversation] = yield prisma.$transaction([
            prisma.message.create({
                data: {
                    content,
                    senderId: userId,
                    conversationId,
                },
                include: {
                    sender: {
                        select: {
                            id: true,
                            profile: { select: { name: true, avatarUrl: true } },
                        },
                    },
                },
            }),
            prisma.conversation.update({
                where: { id: conversationId },
                data: { updatedAt: new Date() },
                include: { participants: true },
            }),
        ]);
        // Emit the new message to all participants in the conversation.
        updatedConversation.participants.forEach((participant) => {
            io.to(participant.id).emit("receiveMessage", newMessage);
        });
        res.status(201).json(newMessage);
    }
    catch (error) {
        console.error("Error creating message:", error);
        res.status(500).json({ message: "Server error while sending message" });
    }
});
exports.createMessage = createMessage;
