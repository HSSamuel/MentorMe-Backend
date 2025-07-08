import { Request, Response } from "express";
import {
  GoogleGenerativeAI,
  Part,
  Content,
  GenerationConfig,
  SafetySetting,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";
import { PrismaClient } from "@prisma/client";
import { CohereClient, Cohere } from "cohere-ai";

// API Key Check
if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is not set in the environment variables.");
}
if (!process.env.COHERE_API_KEY) {
  throw new Error("COHERE_API_KEY is not set in the environment variables.");
}

const prisma = new PrismaClient();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY as string,
});

const getUserId = (req: Request): string | null => {
  if (req.user) return (req.user as any).userId;
  return null;
};

// Get all past AI conversations for the logged-in user
export const getAIConversations = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ message: "Authentication error" });
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
    res.status(500).json({ message: "Error fetching conversations." });
  }
};

// Get all messages for a specific AI conversation
export const getAIMessages = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = getUserId(req);
  const { conversationId } = req.params;
  if (!userId) {
    res.status(401).json({ message: "Authentication error" });
    return;
  }
  try {
    const messages = await prisma.aIMessage.findMany({
      where: { conversationId: conversationId, conversation: { userId } },
      orderBy: { createdAt: "asc" },
    });
    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ message: "Error fetching messages." });
  }
};

// --- Generic Chat Handler ---
const chatWithAI = async (
  req: Request,
  res: Response,
  aiProvider: "gemini" | "cohere"
) => {
  const userId = getUserId(req);
  let { conversationId, message } = req.body;

  const systemPrompt =
    "You are a helpful assistant for a mentorship platform called MentorMe. Be friendly, encouraging, and provide general guidance. Do not ask for personal information unless absolutely necessary for the user's query.";

  if (!userId || !message) {
    return res
      .status(400)
      .json({ message: "User ID and message are required." });
  }

  try {
    let currentConversationId = conversationId;

    if (!currentConversationId) {
      const newConversation = await prisma.aIConversation.create({
        data: {
          userId,
          title: `${
            aiProvider.charAt(0).toUpperCase() + aiProvider.slice(1)
          }: ${message.substring(0, 30)}...`,
        },
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
      const history: Content[] = pastMessages.map((msg) => ({
        parts: [{ text: msg.content }],
        role: msg.sender === "USER" ? "user" : "model",
      }));
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        systemInstruction: systemPrompt,
      });
      const chat = model.startChat({ history: history.slice(0, -1) });
      const result = await chat.sendMessage(message);
      aiResponseText = result.response.text();
    } else {
      // Cohere
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
      .status(200)
      .json({ conversationId: currentConversationId, reply: aiMessage });
  } catch (error: any) {
    console.error(`--- ${aiProvider.toUpperCase()} AI CHAT ERROR ---`);
    console.error(error);
    res.status(500).json({
      message: `Error communicating with ${aiProvider} service.`,
      error: error.message || JSON.stringify(error),
    });
  }
};

export const handleAIChat = async (req: Request, res: Response) => {
  await chatWithAI(req, res, "gemini");
};

export const handleCohereChat = async (req: Request, res: Response) => {
  await chatWithAI(req, res, "cohere");
};
