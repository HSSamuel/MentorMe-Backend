"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSessionDetails = exports.getSessionInsights = exports.createSessionInsights = exports.notifyMentorOfCall = exports.generateVideoCallToken = exports.submitFeedback = exports.getMenteeSessions = exports.getMentorSessions = exports.createSession = exports.setAvailability = exports.getMentorAvailability = exports.getAvailability = void 0;
const calendar_service_1 = require("../services/calendar.service");
const getUserId_1 = require("../utils/getUserId");
const gamification_service_1 = require("../services/gamification.service");
const twilio_1 = __importDefault(require("twilio"));
const client_1 = __importDefault(require("../client"));
// --- AI Client Imports and Initialization ---
const generative_ai_1 = require("@google/generative-ai");
const cohere_ai_1 = require("cohere-ai");
// --- Twilio Initialization ---
const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
const twilioApiKeySid = process.env.TWILIO_API_KEY_SID;
const twilioApiKeySecret = process.env.TWILIO_API_KEY_SECRET;
// Check for Twilio config
if (!twilioAccountSid || !twilioApiKeySid || !twilioApiKeySecret) {
    console.error("🔴 Twilio environment variables are not fully configured.");
}
// Initialize AI clients only if the keys exist
let genAI = null;
if (process.env.GEMINI_API_KEY) {
    genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}
let cohere = null;
if (process.env.COHERE_API_KEY) {
    cohere = new cohere_ai_1.CohereClient({
        token: process.env.COHERE_API_KEY,
    });
}
// --- End of AI Initialization ---
const getUserRole = (req) => {
    if (!req.user)
        return null;
    return req.user.role;
};
const getAvailability = async (req, res) => {
    const mentorId = (0, getUserId_1.getUserId)(req);
    if (!mentorId) {
        res.status(401).json({ message: "Authentication error" });
        return;
    }
    try {
        const availability = await client_1.default.availability.findMany({
            where: { mentorId },
        });
        res.status(200).json(availability);
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching availability." });
    }
};
exports.getAvailability = getAvailability;
const getMentorAvailability = async (req, res) => {
    const { mentorId } = req.params;
    try {
        const weeklyAvailability = await client_1.default.availability.findMany({
            where: { mentorId },
        });
        const bookedSessions = await client_1.default.session.findMany({
            where: {
                mentorId,
                date: { gte: new Date() },
            },
            select: { date: true },
        });
        const bookedSlots = new Set(bookedSessions.map((s) => s.date.toISOString()));
        const dayMap = {
            Sunday: 0,
            Monday: 1,
            Tuesday: 2,
            Wednesday: 3,
            Thursday: 4,
            Friday: 5,
            Saturday: 6,
        };
        const availableSlots = [];
        const today = new Date();
        for (let i = 0; i < 28; i++) {
            const currentDate = new Date(today);
            currentDate.setDate(today.getDate() + i);
            const dayOfWeek = currentDate.getDay();
            for (const slot of weeklyAvailability) {
                if (dayMap[slot.day] === dayOfWeek) {
                    const [startHour, startMinute] = slot.startTime
                        .split(":")
                        .map(Number);
                    const [endHour, endMinute] = slot.endTime.split(":").map(Number);
                    let currentHour = startHour;
                    let currentMinute = startMinute;
                    while (currentHour < endHour ||
                        (currentHour === endHour && currentMinute < endMinute)) {
                        const slotTime = new Date(currentDate);
                        slotTime.setHours(currentHour, currentMinute, 0, 0);
                        if (!bookedSlots.has(slotTime.toISOString())) {
                            availableSlots.push({
                                id: `${mentorId}-${slotTime.toISOString()}`,
                                time: slotTime.toISOString(),
                            });
                        }
                        currentHour += 1;
                    }
                }
            }
        }
        res.status(200).json(availableSlots);
    }
    catch (error) {
        console.error("Error fetching mentor availability slots:", error);
        res.status(500).json({ message: "Error fetching availability slots." });
    }
};
exports.getMentorAvailability = getMentorAvailability;
const setAvailability = async (req, res) => {
    const mentorId = (0, getUserId_1.getUserId)(req);
    // This line retrieves the Socket.IO instance that was attached to the app in `index.ts`.
    const io = req.app.locals.io;
    if (!mentorId) {
        res.status(401).json({ message: "Authentication error" });
        return;
    }
    const { availability } = req.body;
    try {
        await client_1.default.availability.deleteMany({ where: { mentorId } });
        const availabilityData = availability.map((slot) => ({
            mentorId,
            day: slot.day,
            startTime: slot.startTime,
            endTime: slot.endTime,
        }));
        if (availabilityData.length > 0) {
            await client_1.default.availability.createMany({ data: availabilityData });
        }
        // --- [ADDED] Safety check to prevent crashing if the io object is not available ---
        if (io) {
            // This emits a real-time event to all connected clients.
            io.emit("availabilityUpdated", { mentorId });
        }
        else {
            console.warn("Socket.IO not initialized, skipping emit event.");
        }
        res.status(200).json({ message: "Availability updated successfully." });
    }
    catch (error) {
        console.error("Error setting availability:", error);
        res.status(500).json({ message: "Error setting availability." });
    }
};
exports.setAvailability = setAvailability;
const createSession = async (req, res) => {
    const menteeId = (0, getUserId_1.getUserId)(req);
    if (!menteeId) {
        res.status(401).json({ message: "Authentication error" });
        return;
    }
    const { mentorId, sessionTime } = req.body;
    try {
        const match = await client_1.default.mentorshipRequest.findFirst({
            where: { menteeId, mentorId, status: "ACCEPTED" },
        });
        if (!match) {
            res
                .status(403)
                .json({ message: "You are not matched with this mentor." });
            return;
        }
        const newSession = await client_1.default.session.create({
            data: { menteeId, mentorId, date: new Date(sessionTime) },
        });
        const mentee = await client_1.default.user.findUnique({
            where: { id: menteeId },
            include: { profile: true },
        });
        await client_1.default.notification.create({
            data: {
                userId: mentorId,
                type: "SESSION_BOOKED",
                message: `${mentee?.profile?.name || "A mentee"} has booked a session with you.`,
                link: "/my-sessions",
            },
        });
        try {
            const mentor = await client_1.default.user.findUnique({ where: { id: mentorId } });
            if (mentor && mentee) {
                const eventDetails = {
                    summary: `Mentorship Session: ${mentor.email} & ${mentee.email}`,
                    description: "Your mentorship session booked via the MentorMe Platform.",
                    start: new Date(sessionTime),
                    end: new Date(new Date(sessionTime).getTime() + 60 * 60 * 1000),
                    attendees: [mentor.email, mentee.email],
                };
                if (mentor.googleRefreshToken)
                    await (0, calendar_service_1.createCalendarEvent)(mentor.id, eventDetails);
                if (mentee.googleRefreshToken)
                    await (0, calendar_service_1.createCalendarEvent)(mentee.id, eventDetails);
            }
        }
        catch (calendarError) {
            console.error("Could not create calendar event:", calendarError);
        }
        res.status(201).json(newSession);
    }
    catch (error) {
        res.status(500).json({ message: "Error booking session." });
    }
};
exports.createSession = createSession;
const getMentorSessions = async (req, res) => {
    const mentorId = (0, getUserId_1.getUserId)(req);
    if (!mentorId) {
        res.status(401).json({ message: "Authentication error" });
        return;
    }
    try {
        const sessions = await client_1.default.session.findMany({
            where: { mentorId },
            include: { mentee: { include: { profile: true } } },
            orderBy: { date: "asc" },
        });
        res.status(200).json(sessions);
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching sessions." });
    }
};
exports.getMentorSessions = getMentorSessions;
const getMenteeSessions = async (req, res) => {
    const menteeId = (0, getUserId_1.getUserId)(req);
    if (!menteeId) {
        res.status(401).json({ message: "Authentication error" });
        return;
    }
    try {
        const sessions = await client_1.default.session.findMany({
            where: { menteeId },
            include: { mentor: { include: { profile: true } } },
            orderBy: { date: "asc" },
        });
        res.status(200).json(sessions);
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching sessions." });
    }
};
exports.getMenteeSessions = getMenteeSessions;
const submitFeedback = async (req, res) => {
    const { id } = req.params;
    const { rating, comment } = req.body;
    const userId = (0, getUserId_1.getUserId)(req);
    const role = getUserRole(req);
    if (!userId || !role) {
        res.status(401).json({ message: "Authentication error" });
        return;
    }
    try {
        const session = await client_1.default.session.findUnique({ where: { id } });
        if (!session ||
            (session.mentorId !== userId && session.menteeId !== userId)) {
            res
                .status(403)
                .json({ message: "You did not participate in this session." });
            return;
        }
        const dataToUpdate = {};
        if (role === "MENTEE")
            dataToUpdate.rating = rating;
        if (comment)
            dataToUpdate.feedback = comment;
        const updatedSession = await client_1.default.session.update({
            where: { id },
            data: dataToUpdate,
        });
        await (0, gamification_service_1.awardPoints)(userId, 15);
        res.status(200).json(updatedSession);
    }
    catch (error) {
        res.status(500).json({ message: "Error submitting feedback." });
    }
};
exports.submitFeedback = submitFeedback;
const generateVideoCallToken = async (req, res) => {
    const userId = (0, getUserId_1.getUserId)(req);
    const { sessionId } = req.params;
    if (!userId) {
        res.status(401).json({ message: "Authentication required." });
        return;
    }
    if (!twilioAccountSid || !twilioApiKeySid || !twilioApiKeySecret) {
        res.status(500).json({ message: "Video service is not configured." });
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
                .json({ message: "You are not a participant of this session." });
            return;
        }
        const AccessToken = twilio_1.default.jwt.AccessToken;
        const VideoGrant = AccessToken.VideoGrant;
        const accessToken = new AccessToken(twilioAccountSid, twilioApiKeySid, twilioApiKeySecret, { identity: userId });
        const videoGrant = new VideoGrant({
            room: sessionId,
        });
        accessToken.addGrant(videoGrant);
        res.status(200).json({ videoToken: accessToken.toJwt() });
    }
    catch (error) {
        console.error("Error generating Twilio video call token:", error);
        res.status(500).json({ message: "Server error while generating token." });
    }
};
exports.generateVideoCallToken = generateVideoCallToken;
const notifyMentorOfCall = async (req, res) => {
    const menteeId = (0, getUserId_1.getUserId)(req);
    const { sessionId } = req.params;
    if (!menteeId) {
        res.status(401).json({ message: "Authentication error" });
        return;
    }
    try {
        const session = await client_1.default.session.findUnique({
            where: { id: sessionId },
            include: {
                mentee: { include: { profile: true } },
            },
        });
        if (!session || session.menteeId !== menteeId) {
            res
                .status(403)
                .json({ message: "You are not the mentee for this session." });
            return;
        }
        const { mentorId } = session;
        const menteeName = session.mentee.profile?.name || "Your mentee";
        const notification = await client_1.default.notification.create({
            data: {
                userId: mentorId,
                type: "VIDEO_CALL_INITIATED",
                message: `${menteeName} is calling you for your session.`,
                link: `/session/${sessionId}/call`,
                isRead: false,
            },
        });
        const io = req.app.locals.io;
        // --- [ADDED] Safety check for the io object ---
        if (io) {
            io.to(mentorId).emit("newNotification", notification);
        }
        else {
            console.warn("Socket.IO not initialized, skipping notification emit.");
        }
        console.log(`Notification sent to mentor ${mentorId} for video call.`);
        res.status(200).json({ message: "Notification sent successfully." });
    }
    catch (error) {
        console.error("Error sending call notification:", error);
        res.status(500).json({ message: "Failed to send notification." });
    }
};
exports.notifyMentorOfCall = notifyMentorOfCall;
const createSessionInsights = async (req, res) => {
    if (!genAI || !cohere) {
        res.status(500).json({ message: "AI services are not configured." });
        return;
    }
    const userId = (0, getUserId_1.getUserId)(req);
    const { sessionId } = req.params;
    const { transcript } = req.body;
    if (!userId) {
        res.status(401).json({ message: "Authentication required." });
        return;
    }
    if (!transcript || typeof transcript !== "string" || transcript.length < 50) {
        res.status(400).json({ message: "A substantial transcript is required." });
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
                .json({ message: "You are not a participant of this session." });
            return;
        }
        const summaryPrompt = `Based on the following transcript...`;
        const actionItemsPrompt = `Analyze the following transcript...`;
        const geminiModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const [summaryResponse, actionItemsResponse] = await Promise.all([
            geminiModel.generateContent(summaryPrompt),
            cohere.chat({
                message: actionItemsPrompt,
            }),
        ]);
        const summary = summaryResponse.response.text();
        const actionItemsText = actionItemsResponse.text;
        const actionItems = actionItemsText.toLowerCase().trim() === "none"
            ? []
            : actionItemsText
                .split(/\d+\.\s+/)
                .map((item) => item.trim())
                .filter((item) => item.length > 0);
        const savedInsight = await client_1.default.sessionInsight.upsert({
            where: { sessionId },
            update: { summary, actionItems },
            create: { sessionId, summary, actionItems },
        });
        res.status(201).json(savedInsight);
    }
    catch (error) {
        console.error("Error creating session insights:", error);
        res.status(500).json({ message: "Failed to generate session insights." });
    }
};
exports.createSessionInsights = createSessionInsights;
const getSessionInsights = async (req, res) => {
    const userId = (0, getUserId_1.getUserId)(req);
    const { sessionId } = req.params;
    if (!userId) {
        res.status(401).json({ message: "Authentication required." });
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
                .json({ message: "You are not authorized to view these insights." });
            return;
        }
        const insights = await client_1.default.sessionInsight.findUnique({
            where: { sessionId },
        });
        if (!insights) {
            res.status(404).json({
                message: "No insights have been generated for this session yet.",
            });
            return;
        }
        res.status(200).json(insights);
    }
    catch (error) {
        console.error("Error fetching session insights:", error);
        res.status(500).json({ message: "Failed to fetch session insights." });
    }
};
exports.getSessionInsights = getSessionInsights;
const getSessionDetails = async (req, res) => {
    const { sessionId } = req.params;
    const userId = (0, getUserId_1.getUserId)(req);
    try {
        const session = await client_1.default.session.findUnique({
            where: { id: sessionId },
            include: {
                mentor: { include: { profile: true } },
                mentee: { include: { profile: true } },
            },
        });
        if (!session ||
            (session.mentorId !== userId && session.menteeId !== userId)) {
            res.status(404).json({ message: "Session not found or access denied." });
            return;
        }
        res.status(200).json(session);
    }
    catch (error) {
        console.error("Error fetching session details:", error);
        res.status(500).json({ message: "Error fetching session details." });
    }
};
exports.getSessionDetails = getSessionDetails;
