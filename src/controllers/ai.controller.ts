import { Request, Response } from "express";
import { GoogleGenerativeAI, Part } from "@google/generative-ai";
import { PrismaClient } from "@prisma/client";
import { CohereClient, Cohere } from "cohere-ai";
import { getUserId } from "../utils/getUserId";
import axios from "axios";

// --- Initialization ---
if (!process.env.GEMINI_API_KEY || !process.env.COHERE_API_KEY) {
  console.error("🔴 AI API keys are not set in environment variables.");
  throw new Error("AI API keys are not set.");
}
const prisma = new PrismaClient();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY as string,
});

// --- Route Handlers (getAIConversations, getAIMessages, etc. remain unchanged) ---

export const getAIConversations = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({
      message: "Authentication error: User ID could not be determined.",
    });
    return;
  }
  try {
    const conversations = await prisma.aIConversation.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { messages: true } } },
    });
    res.status(200).json(conversations);
  } catch (error) {
    console.error("Error in getAIConversations:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching conversations." });
  }
};

export const getAIMessages = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = getUserId(req);
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
    const messages = await prisma.aIMessage.findMany({
      where: {
        conversationId: conversationId,
        conversation: { userId },
      },
      orderBy: { createdAt: "asc" },
    });
    res.status(200).json(messages);
  } catch (error) {
    console.error(
      `Error in getAIMessages for conversation ${conversationId}:`,
      error
    );
    res.status(500).json({ message: "Server error while fetching messages." });
  }
};

const chatWithAI = async (
  req: Request,
  res: Response,
  aiProvider: "gemini" | "cohere"
): Promise<void> => {
  const userId = getUserId(req);
  let { conversationId, message } = req.body;

  const systemPrompt =
    "You are a helpful and friendly assistant for a mentorship platform called MentorMe. Your role is to be an encouraging coach. When a user expresses a desire to set a goal (e.g., 'I want to learn a new skill', 'help me set a goal'), you must guide them by asking questions for each S.M.A.R.T. component (Specific, Measurable, Achievable, Relevant, Time-bound) one by one. Once you have gathered all five components, respond by formatting the goal clearly and instruct the user to add it to their mentorship goals page by linking them to it with this markdown [View Goals](#/goals).";

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
      const newConversation = await prisma.aIConversation.create({
        data: { userId, title: message.substring(0, 40) },
      });
      currentConversationId = newConversation.id;
    }

    await prisma.aIMessage.create({
      data: {
        conversationId: currentConversationId,
        content: message,
        sender: "USER",
      },
    });

    const pastMessages = await prisma.aIMessage.findMany({
      where: { conversationId: currentConversationId },
      orderBy: { createdAt: "asc" },
    });

    let aiResponseText: string;

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
      const result = await chat.sendMessage(message);
      aiResponseText = result.response.text();
    } else {
      const chatHistory: Cohere.Message[] = pastMessages.map((msg) => ({
        role: msg.sender === "USER" ? "USER" : "CHATBOT",
        message: msg.content,
      }));
      const response = await cohere.chat({
        preamble: systemPrompt,
        message,
        chatHistory: chatHistory.slice(0, -1),
      });
      aiResponseText = response.text;
    }

    const aiMessage = await prisma.aIMessage.create({
      data: {
        conversationId: currentConversationId,
        content: aiResponseText,
        sender: "AI",
      },
    });

    res
      .status(isNewConversation ? 201 : 200)
      .json({ conversationId: currentConversationId, reply: aiMessage });
  } catch (error: any) {
    console.error(`--- ${aiProvider.toUpperCase()} AI CHAT ERROR ---`, error);
    res.status(500).json({
      message: `Error communicating with the ${aiProvider} service.`,
      error: error.message || "An unknown error occurred.",
    });
  }
};

export const handleAIChat = async (
  req: Request,
  res: Response
): Promise<void> => {
  await chatWithAI(req, res, "gemini");
};

export const handleCohereChat = async (
  req: Request,
  res: Response
): Promise<void> => {
  await chatWithAI(req, res, "cohere");
};

export const handleFileAnalysis = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = getUserId(req);
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
      const newConversation = await prisma.aIConversation.create({
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
    } else if (req.file.mimetype === "application/pdf") {
      finalPrompt = prompt || "Summarize the key points of this PDF document.";
    } else if (
      req.file.mimetype.includes("document") ||
      req.file.mimetype.includes("presentation")
    ) {
      finalPrompt = prompt || "Summarize the key points of this document.";
    }

    const result = await model.generateContent([finalPrompt, filePart]);
    const aiResponseText = result.response.text();

    const aiMessage = await prisma.aIMessage.create({
      data: {
        conversationId: currentConversationId,
        content: aiResponseText,
        sender: "AI",
      },
    });

    res
      .status(200)
      .json({ conversationId: currentConversationId, reply: aiMessage });
  } catch (error: any) {
    console.error("--- FILE ANALYSIS ERROR ---", error);
    res.status(500).json({
      message: "Error analyzing the file.",
      error: error.message || "An unknown error occurred.",
    });
  }
};

export const deleteAIConversation = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = getUserId(req);
  const { conversationId } = req.params;

  if (!userId) {
    res.status(401).json({ message: "Authentication error." });
    return;
  }

  try {
    // FIX: Simplified the deletion process to be more resilient.
    // We first ensure the conversation belongs to the user before attempting deletion.
    const conversation = await prisma.aIConversation.findFirst({
      where: { id: conversationId, userId: userId },
    });

    // If the conversation doesn't exist or doesn't belong to the user, throw an error.
    if (!conversation) {
      res
        .status(404)
        .json({
          message:
            "Conversation not found or you are not authorized to delete it.",
        });
      return;
    }

    // Now, perform the deletion in a transaction.
    // This is more robust than the previous check-then-delete pattern inside the transaction.
    await prisma.$transaction([
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
  } catch (error: any) {
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
};
