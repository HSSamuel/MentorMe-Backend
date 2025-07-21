import { Request, Response } from "express";
import { GoogleGenerativeAI, Part } from "@google/generative-ai";
import { Prisma, PrismaClient } from "@prisma/client";
import { CohereClient, Cohere } from "cohere-ai";
import { getUserId } from "../utils/getUserId";
import { findTopMentorMatches } from "../services/ai.service";
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

// --- HELPER FUNCTION TO GET USER CONTEXT ---
const getUserContext = async (userId: string): Promise<string> => {
  try {
    const [mentorships, sessions] = await prisma.$transaction([
      prisma.mentorshipRequest.findMany({
        where: {
          OR: [{ menteeId: userId }, { mentorId: userId }],
          status: "ACCEPTED",
        },
        include: {
          goals: {
            where: {
              status: { not: "COMPLETED" },
            },
            select: {
              title: true,
              description: true,
              dueDate: true,
            },
          },
        },
      }),
      prisma.session.findMany({
        where: {
          OR: [{ menteeId: userId }, { mentorId: userId }],
          date: { gte: new Date() },
        },
        include: {
          mentor: {
            include: {
              profile: {
                select: { name: true },
              },
            },
          },
          mentee: {
            include: {
              profile: {
                select: { name: true },
              },
            },
          },
        },
        orderBy: { date: "asc" },
        take: 3,
      }),
    ]);

    const allGoals = mentorships.flatMap((m) => m.goals);

    let context = "";
    if (allGoals.length > 0) {
      const goalStrings = allGoals.map(
        (g) =>
          `- ${g.title} (Due: ${
            g.dueDate?.toLocaleDateString() || "N/A"
          }): ${g.description}`
      );
      context += "CURRENT GOALS:\n" + goalStrings.join("\n") + "\n\n";
    }

    if (sessions.length > 0) {
      const sessionStrings = sessions.map((s) => {
        const otherPersonName =
          s.mentor.id === userId
            ? s.mentee.profile?.name
            : s.mentor.profile?.name;
        return `- Session with ${
          otherPersonName || "your counterpart"
        } on ${s.date.toLocaleString()}`;
      });
      context += "UPCOMING SESSIONS:\n" + sessionStrings.join("\n") + "\n\n";
    }

    return context;
  } catch (error) {
    console.error(`Failed to fetch context for user ${userId}:`, error);
    return "";
  }
};

// --- EXISTING ROUTE HANDLERS ---

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

// --- [OPTIMIZED] CHAT FUNCTION ---
const chatWithAI = async (
  req: Request,
  res: Response,
  aiProvider: "gemini" | "cohere"
): Promise<void> => {
  const userId = getUserId(req);
  let { conversationId, message } = req.body;

  if (!userId || !message) {
    res
      .status(400)
      .json({ message: "User ID and message content are required." });
    return;
  }

  try {
    // --- [NEW] Selective Context Fetching ---
    // Define keywords that trigger a context search.
    const contextKeywords = [
      "goal",
      "session",
      "prepare",
      "advice",
      "next step",
      "remind me",
      "career",
    ];
    const messageIncludesKeyword = contextKeywords.some((keyword) =>
      message.toLowerCase().includes(keyword)
    );

    let userContext = "";
    // Only fetch context from the database if a relevant keyword is found.
    if (messageIncludesKeyword) {
      console.log("Context keyword detected. Fetching user data...");
      userContext = await getUserContext(userId);
    }
    // --- End of Optimization ---

    const systemPrompt = `You are a helpful and friendly assistant for a mentorship platform called MentorMe. Your role is to be an encouraging coach.
Here is the user's current context. Use it to provide personalized advice and answers. If the context is empty, you can ignore it.
---
${userContext}
---
When a user asks for help preparing for a session, use the "UPCOMING SESSIONS" context to give specific advice.
When a user asks what they should work on or for career advice, use the "CURRENT GOALS" context to guide them.

Your original S.M.A.R.T. goal instruction remains: When a user expresses a desire to set a new goal (e.g., 'I want to learn a new skill', 'help me set a goal'), you must guide them by asking questions for each S.M.A.R.T. component (Specific, Measurable, Achievable, Relevant, Time-bound) one by one. Once you have gathered all five components, respond by formatting the goal clearly and instruct the user to add it to their mentorship goals page by linking them to it with this markdown [View Goals](#/goals).`;

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
    const conversation = await prisma.aIConversation.findFirst({
      where: { id: conversationId, userId: userId },
    });

    if (!conversation) {
      res.status(404).json({
        message:
          "Conversation not found or you are not authorized to delete it.",
      });
      return;
    }

    await prisma.$transaction([
      prisma.aIMessage.deleteMany({
        where: { conversationId: conversationId },
      }),
      prisma.aIConversation.delete({
        where: { id: conversationId },
      }),
    ]);

    res.status(204).send();
  } catch (error: any) {
    console.error("Error deleting conversation:", error);

    if (error.code === "P2025") {
      res.status(404).json({ message: "Conversation not found." });
      return;
    }

    res.status(500).json({
      message: "Server error while deleting conversation.",
      error: error.message,
    });
  }
};

export const getAiMentorMatches = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      res.status(401).json({ message: "User not authenticated." });
      return;
    }

    const topMentors = await findTopMentorMatches(userId);

    res.status(200).json(topMentors);
  } catch (error) {
    console.error("Error getting AI mentor matches:", error);
    res.status(500).json({ message: "Failed to retrieve mentor matches." });
  }
};
