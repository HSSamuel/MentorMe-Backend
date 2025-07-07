import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Helper to get user ID from the authenticated request
const getUserId = (req: Request): string | null => {
  if (!req.user || !("userId" in req.user)) return null;
  return req.user.userId as string;
};

/**
 * Get all conversations for the logged-in user.
 * Includes the participants and the last message for a preview.
 */
export const getConversations = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    // Corrected: Removed 'return' and added an explicit 'return' to exit
    res.status(401).json({ message: "Authentication error" });
    return;
  }

  try {
    const conversations = await prisma.conversation.findMany({
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
  } catch (error) {
    console.error("Error fetching conversations:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching conversations." });
  }
};

/**
 * Get all messages for a specific conversation.
 * Ensures the logged-in user is a participant of the conversation before returning messages.
 */
export const getMessages = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = getUserId(req);
  const { conversationId } = req.params;

  if (!userId) {
    // Corrected: Removed 'return' and added an explicit 'return' to exit
    res.status(401).json({ message: "Authentication error" });
    return;
  }

  try {
    // First, verify the user is actually part of the conversation
    const conversation = await prisma.conversation.findFirst({
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
        message:
          "Access denied. You are not a participant in this conversation.",
      });
      return;
    }

    // If they are a participant, fetch all messages for that conversation
    const messages = await prisma.message.findMany({
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
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ message: "Server error while fetching messages." });
  }
};
