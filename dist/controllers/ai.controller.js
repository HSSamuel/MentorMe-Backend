"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIcebreakers = exports.summarizeTranscript = exports.getAiMentorMatches = exports.deleteAIConversation = exports.handleFileAnalysis = exports.handleCohereChat = exports.handleAIChat = exports.getAIMessages = exports.getAIConversations = exports.refineGoalWithAI = void 0;
const generative_ai_1 = require("@google/generative-ai");
const client_1 = __importDefault(require("../client"));
const cohere_ai_1 = require("cohere-ai");
const getUserId_1 = require("../utils/getUserId");
const ai_service_1 = require("../services/ai.service");
// --- Initialization ---
if (!process.env.GEMINI_API_KEY || !process.env.COHERE_API_KEY) {
    console.error("🔴 AI API keys are not set in environment variables.");
    throw new Error("AI API keys are not set.");
}
const genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const cohere = new cohere_ai_1.CohereClient({
    token: process.env.COHERE_API_KEY,
});
// --- [UPDATED] AI-POWERED S.M.A.R.T. GOAL ASSISTANT ---
const refineGoalWithAI = async (req, res) => {
    const { goal } = req.body;
    if (!goal) {
        res.status(400).json({ message: "A goal is required to refine." });
        return;
    }
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        // --- START OF PROMPT IMPROVEMENT ---
        const prompt = `
      You are a friendly and practical mentor on the MentorMe platform. Your tone should be encouraging, authentic, and realistic, not like a robot or a textbook.
      A user has shared a goal. Your task is to rephrase it into a S.M.A.R.T. goal framework and return it as a clean JSON object with no extra text or markdown formatting.

      The JSON object must have these keys: "title", "specific", "measurable", "achievable", "relevant", and "timeBound".

      - "title": Create a short, motivating title for the goal.
      - "specific": Describe a clear and focused first step. What is one concrete action they can take? Avoid jargon.
      - "measurable": Suggest a simple, tangible way to see progress. Think of it as a small win, for example, "Read one chapter" or "Complete one tutorial".
      - "achievable": Briefly explain why this is a manageable step. Frame it as something within their control.
      - "relevant": Connect this smaller goal to their bigger ambition. How does this step help them in the long run?
      - "timeBound": Suggest a relaxed, low-pressure timeframe. Use phrases like "Over the next few weeks" or "By the end of next month".

      User's Goal: "${goal}"

      Now, generate the JSON object.
    `;
        // --- END OF PROMPT IMPROVEMENT ---
        const result = await model.generateContent(prompt);
        const aiResponseText = result.response.text();
        const cleanedJsonString = aiResponseText.replace(/```json|```/g, "").trim();
        const refinedGoal = JSON.parse(cleanedJsonString);
        res.status(200).json(refinedGoal);
    }
    catch (error) {
        console.error("--- AI GOAL REFINEMENT ERROR ---", error);
        res.status(500).json({
            message: "Error refining the goal with AI.",
            error: error.message || "An unknown error occurred.",
        });
    }
};
exports.refineGoalWithAI = refineGoalWithAI;
// --- HELPER FUNCTION TO GET USER CONTEXT ---
const getUserContext = async (userId) => {
    try {
        const [mentorships, sessions] = await client_1.default.$transaction([
            client_1.default.mentorshipRequest.findMany({
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
            client_1.default.session.findMany({
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
            const goalStrings = allGoals.map((g) => `- ${g.title} (Due: ${g.dueDate?.toLocaleDateString() || "N/A"}): ${g.description}`);
            context += "CURRENT GOALS:\n" + goalStrings.join("\n") + "\n\n";
        }
        if (sessions.length > 0) {
            const sessionStrings = sessions.map((s) => {
                const otherPersonName = s.mentor?.id === userId
                    ? s.mentee?.profile?.name
                    : s.mentor?.profile?.name;
                return `- Session with ${otherPersonName || "your counterpart"} on ${s.date.toLocaleString()}`;
            });
            context += "UPCOMING SESSIONS:\n" + sessionStrings.join("\n") + "\n\n";
        }
        return context;
    }
    catch (error) {
        console.error(`Failed to fetch context for user ${userId}:`, error);
        return "";
    }
};
// --- EXISTING ROUTE HANDLERS ---
const getAIConversations = async (req, res) => {
    const userId = (0, getUserId_1.getUserId)(req);
    if (!userId) {
        res.status(401).json({
            message: "Authentication error: User ID could not be determined.",
        });
        return;
    }
    try {
        const conversations = await client_1.default.aIConversation.findMany({
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
};
exports.getAIConversations = getAIConversations;
const getAIMessages = async (req, res) => {
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
        const messages = await client_1.default.aIMessage.findMany({
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
};
exports.getAIMessages = getAIMessages;
const chatWithAI = async (req, res, aiProvider) => {
    const userId = (0, getUserId_1.getUserId)(req);
    let { conversationId, message } = req.body;
    if (!userId || !message) {
        res
            .status(400)
            .json({ message: "User ID and message content are required." });
        return;
    }
    try {
        const contextKeywords = [
            "goal",
            "session",
            "prepare",
            "advice",
            "next step",
            "remind me",
            "career",
        ];
        const messageIncludesKeyword = contextKeywords.some((keyword) => message.toLowerCase().includes(keyword));
        let userContext = "";
        if (messageIncludesKeyword) {
            console.log("Context keyword detected. Fetching user data...");
            userContext = await getUserContext(userId);
        }
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
            const newConversation = await client_1.default.aIConversation.create({
                data: { userId, title: message.substring(0, 40) },
            });
            currentConversationId = newConversation.id;
        }
        await client_1.default.aIMessage.create({
            data: {
                conversationId: currentConversationId,
                content: message,
                sender: "USER",
            },
        });
        const pastMessages = await client_1.default.aIMessage.findMany({
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
            const result = await chat.sendMessage(message);
            aiResponseText = result.response.text();
        }
        else {
            const chatHistory = pastMessages.map((msg) => ({
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
        const aiMessage = await client_1.default.aIMessage.create({
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
};
const handleAIChat = async (req, res) => {
    await chatWithAI(req, res, "gemini");
};
exports.handleAIChat = handleAIChat;
const handleCohereChat = async (req, res) => {
    await chatWithAI(req, res, "cohere");
};
exports.handleCohereChat = handleCohereChat;
const handleFileAnalysis = async (req, res) => {
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
            const newConversation = await client_1.default.aIConversation.create({
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
        const result = await model.generateContent([finalPrompt, filePart]);
        const aiResponseText = result.response.text();
        const aiMessage = await client_1.default.aIMessage.create({
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
};
exports.handleFileAnalysis = handleFileAnalysis;
const deleteAIConversation = async (req, res) => {
    const userId = (0, getUserId_1.getUserId)(req);
    const { conversationId } = req.params;
    if (!userId) {
        res.status(401).json({ message: "Authentication error." });
        return;
    }
    try {
        const conversation = await client_1.default.aIConversation.findFirst({
            where: { id: conversationId, userId: userId },
        });
        if (!conversation) {
            res.status(404).json({
                message: "Conversation not found or you are not authorized to delete it.",
            });
            return;
        }
        await client_1.default.$transaction([
            client_1.default.aIMessage.deleteMany({
                where: { conversationId: conversationId },
            }),
            client_1.default.aIConversation.delete({
                where: { id: conversationId },
            }),
        ]);
        res.status(204).send();
    }
    catch (error) {
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
exports.deleteAIConversation = deleteAIConversation;
const getAiMentorMatches = async (req, res) => {
    try {
        const userId = (0, getUserId_1.getUserId)(req);
        if (!userId) {
            res.status(401).json({ message: "User not authenticated." });
            return;
        }
        const topMentors = await (0, ai_service_1.findTopMentorMatches)(userId);
        res.status(200).json(topMentors);
    }
    catch (error) {
        res.status(500).json({ message: "Failed to retrieve mentor matches." });
    }
};
exports.getAiMentorMatches = getAiMentorMatches;
const summarizeTranscript = async (req, res) => {
    const userId = (0, getUserId_1.getUserId)(req);
    const { sessionId, transcript } = req.body;
    if (!userId) {
        res.status(401).json({ message: "Authentication error." });
        return;
    }
    if (!sessionId || !transcript) {
        res
            .status(400)
            .json({ message: "Session ID and transcript are required." });
        return;
    }
    try {
        const session = await client_1.default.session.findFirst({
            where: {
                id: sessionId,
                OR: [{ menteeId: userId }, { mentorId: userId }],
            },
        });
        if (!session) {
            res
                .status(403)
                .json({ message: "You are not authorized to access this session." });
            return;
        }
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `
      You are an AI assistant for a mentorship platform. Analyze the following transcript and provide a structured summary in a clean JSON format.
      The JSON object must have three keys: "summary", "keyTopics", and "actionItems".
      - "summary": A concise, 2-3 sentence professional summary of the session.
      - "keyTopics": An array of the 3-5 most important topics discussed.
      - "actionItems": An array of clear, actionable steps for the mentee.

      Transcript:
      ---
      ${transcript}
      ---
    `;
        const result = await model.generateContent(prompt);
        const aiResponseText = result.response.text();
        const insights = JSON.parse(aiResponseText);
        const savedInsight = await client_1.default.sessionInsight.upsert({
            where: { sessionId },
            update: {
                summary: insights.summary,
                keyTopics: insights.keyTopics,
                actionItems: insights.actionItems,
            },
            create: {
                sessionId,
                summary: insights.summary,
                keyTopics: insights.keyTopics,
                actionItems: insights.actionItems,
            },
        });
        res.status(200).json(savedInsight);
    }
    catch (error) {
        console.error("Error summarizing transcript:", error);
        res.status(500).json({
            message: "Server error while summarizing transcript.",
            error: error.message || "An unknown error occurred.",
        });
    }
};
exports.summarizeTranscript = summarizeTranscript;
const getIcebreakers = async (req, res) => {
    const { mentorshipId } = req.params;
    try {
        const mentorship = await client_1.default.mentorshipRequest.findUnique({
            where: { id: mentorshipId },
            include: {
                mentee: { include: { profile: true } },
            },
        });
        if (!mentorship?.mentee?.profile) {
            res.status(404).json({ message: "Mentee profile not found." });
            return;
        }
        const menteeProfile = mentorship.mentee.profile;
        const prompt = `
      Based on the following mentee profile, generate a JSON object with a single key: "icebreakers".
      "icebreakers" should be an array of 3-4 open-ended, encouraging questions that a mentor could ask to start a conversation.
      The questions should be directly related to the mentee's stated goals and skills.

      Mentee Profile:
      - Skills: ${menteeProfile.skills.join(", ")}
      - Goals: ${menteeProfile.goals}
    `;
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        const suggestions = JSON.parse(result.response.text() || "{}");
        res.status(200).json(suggestions);
    }
    catch (error) {
        console.error("Error generating icebreakers:", error);
        res.status(500).json({ message: "Error generating icebreakers." });
    }
};
exports.getIcebreakers = getIcebreakers;
