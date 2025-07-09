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
exports.getMessages = exports.getConversations = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Helper to get user ID from the authenticated request
const getUserId = (req) => {
    if (!req.user || !("userId" in req.user))
        return null;
    return req.user.userId;
};
/**
 * Get all conversations for the logged-in user.
 * Includes the participants and the last message for a preview.
 */
const getConversations = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = getUserId(req);
    if (!userId) {
        // Corrected: Removed 'return' and added an explicit 'return' to exit
        res.status(401).json({ message: "Authentication error" });
        return;
    }
    try {
        const conversations = yield prisma.conversation.findMany({
            where: {
                participantIDs: {
                    has: userId,
                },
            },
            include: {
                participants: {
                    select: {
                        id: true,
                        profile: {
                            select: {
                                name: true,
                            },
                        },
                    },
                },
                messages: {
                    orderBy: {
                        createdAt: "desc",
                    },
                    take: 1, // Get only the last message for the preview
                },
            },
            orderBy: {
                updatedAt: "desc",
            },
        });
        res.status(200).json(conversations);
    }
    catch (error) {
        console.error("Error fetching conversations:", error);
        res
            .status(500)
            .json({ message: "Server error while fetching conversations." });
    }
});
exports.getConversations = getConversations;
/**
 * Get all messages for a specific conversation.
 * Ensures the logged-in user is a participant of the conversation before returning messages.
 */
const getMessages = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = getUserId(req);
    const { conversationId } = req.params;
    if (!userId) {
        // Corrected: Removed 'return' and added an explicit 'return' to exit
        res.status(401).json({ message: "Authentication error" });
        return;
    }
    try {
        // First, verify the user is actually part of the conversation
        const conversation = yield prisma.conversation.findFirst({
            where: {
                id: conversationId,
                participantIDs: {
                    has: userId,
                },
            },
        });
        if (!conversation) {
            // Corrected: Removed 'return' and added an explicit 'return' to exit
            res.status(403).json({
                message: "Access denied. You are not a participant in this conversation.",
            });
            return;
        }
        // If they are a participant, fetch all messages for that conversation
        const messages = yield prisma.message.findMany({
            where: {
                conversationId,
            },
            include: {
                sender: {
                    select: {
                        id: true,
                        profile: {
                            select: {
                                name: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                createdAt: "asc",
            },
        });
        res.status(200).json(messages);
    }
    catch (error) {
        console.error("Error fetching messages:", error);
        res.status(500).json({ message: "Server error while fetching messages." });
    }
});
exports.getMessages = getMessages;
