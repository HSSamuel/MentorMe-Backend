import { Request, Response } from "express";
import { createCalendarEvent } from "../services/calendar.service";
import { getUserId } from "../utils/getUserId";
import { awardPoints } from "../services/gamification.service";
import jwt from "jsonwebtoken";
import Twilio from "twilio";
import prisma from "../client";

// --- AI Client Imports and Initialization ---
import { GoogleGenerativeAI } from "@google/generative-ai";
import { CohereClient } from "cohere-ai";

// --- Twilio Initialization ---
const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
const twilioApiKeySid = process.env.TWILIO_API_KEY_SID;
const twilioApiKeySecret = process.env.TWILIO_API_KEY_SECRET;

// Check for Twilio config
if (!twilioAccountSid || !twilioApiKeySid || !twilioApiKeySecret) {
  console.error("🔴 Twilio environment variables are not fully configured.");
}

// Initialize AI clients only if the keys exist
let genAI: GoogleGenerativeAI | null = null;
if (process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

let cohere: CohereClient | null = null;
if (process.env.COHERE_API_KEY) {
  cohere = new CohereClient({
    token: process.env.COHERE_API_KEY,
  });
}
// --- End of AI Initialization ---

const getUserRole = (req: Request): string | null => {
  if (!req.user) return null;
  return (req.user as any).role as string;
};

export const getAvailability = async (
  req: Request,
  res: Response
): Promise<void> => {
  const mentorId = getUserId(req);
  if (!mentorId) {
    res.status(401).json({ message: "Authentication error" });
    return;
  }

  try {
    const availability = await prisma.availability.findMany({
      where: { mentorId },
    });
    res.status(200).json(availability);
  } catch (error) {
    res.status(500).json({ message: "Error fetching availability." });
  }
};

export const getMentorAvailability = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { mentorId } = req.params;
  try {
    const weeklyAvailability = await prisma.availability.findMany({
      where: { mentorId },
    });

    const bookedSessions = await prisma.session.findMany({
      where: {
        mentorId,
        date: { gte: new Date() },
      },
      select: { date: true },
    });
    const bookedSlots = new Set(
      bookedSessions.map((s) => s.date.toISOString())
    );

    const dayMap: { [key: string]: number } = {
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

          while (
            currentHour < endHour ||
            (currentHour === endHour && currentMinute < endMinute)
          ) {
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
  } catch (error) {
    console.error("Error fetching mentor availability slots:", error);
    res.status(500).json({ message: "Error fetching availability slots." });
  }
};

export const setAvailability = async (
  req: Request,
  res: Response
): Promise<void> => {
  const mentorId = getUserId(req);
  // This line retrieves the Socket.IO instance that was attached to the app in `index.ts`.
  const io = req.app.locals.io;

  if (!mentorId) {
    res.status(401).json({ message: "Authentication error" });
    return;
  }
  const { availability } = req.body;
  try {
    await prisma.availability.deleteMany({ where: { mentorId } });

    const availabilityData = availability.map((slot: any) => ({
      mentorId,
      day: slot.day,
      startTime: slot.startTime,
      endTime: slot.endTime,
    }));

    if (availabilityData.length > 0) {
      await prisma.availability.createMany({ data: availabilityData });
    }

    // --- [ADDED] Safety check to prevent crashing if the io object is not available ---
    if (io) {
      // This emits a real-time event to all connected clients.
      io.emit("availabilityUpdated", { mentorId });
    } else {
      console.warn("Socket.IO not initialized, skipping emit event.");
    }

    res.status(200).json({ message: "Availability updated successfully." });
  } catch (error) {
    console.error("Error setting availability:", error);
    res.status(500).json({ message: "Error setting availability." });
  }
};

export const createSession = async (
  req: Request,
  res: Response
): Promise<void> => {
  const menteeId = getUserId(req);
  if (!menteeId) {
    res.status(401).json({ message: "Authentication error" });
    return;
  }
  const { mentorId, sessionTime } = req.body;
  try {
    const match = await prisma.mentorshipRequest.findFirst({
      where: { menteeId, mentorId, status: "ACCEPTED" },
    });
    if (!match) {
      res
        .status(403)
        .json({ message: "You are not matched with this mentor." });
      return;
    }
    const newSession = await prisma.session.create({
      data: { menteeId, mentorId, date: new Date(sessionTime) },
    });

    const mentee = await prisma.user.findUnique({
      where: { id: menteeId },
      include: { profile: true },
    });

    await prisma.notification.create({
      data: {
        userId: mentorId,
        type: "SESSION_BOOKED",
        message: `${
          mentee?.profile?.name || "A mentee"
        } has booked a session with you.`,
        link: "/my-sessions",
      },
    });

    try {
      const mentor = await prisma.user.findUnique({ where: { id: mentorId } });
      if (mentor && mentee) {
        const eventDetails = {
          summary: `Mentorship Session: ${mentor.email} & ${mentee.email}`,
          description:
            "Your mentorship session booked via the MentorMe Platform.",
          start: new Date(sessionTime),
          end: new Date(new Date(sessionTime).getTime() + 60 * 60 * 1000),
          attendees: [mentor.email, mentee.email],
        };
        if (mentor.googleRefreshToken)
          await createCalendarEvent(mentor.id, eventDetails);
        if (mentee.googleRefreshToken)
          await createCalendarEvent(mentee.id, eventDetails);
      }
    } catch (calendarError) {
      console.error("Could not create calendar event:", calendarError);
    }

    res.status(201).json(newSession);
  } catch (error) {
    res.status(500).json({ message: "Error booking session." });
  }
};

export const getMentorSessions = async (
  req: Request,
  res: Response
): Promise<void> => {
  const mentorId = getUserId(req);
  if (!mentorId) {
    res.status(401).json({ message: "Authentication error" });
    return;
  }
  try {
    const sessions = await prisma.session.findMany({
      where: { mentorId },
      include: { mentee: { include: { profile: true } } },
      orderBy: { date: "asc" },
    });
    res.status(200).json(sessions);
  } catch (error) {
    res.status(500).json({ message: "Error fetching sessions." });
  }
};

export const getMenteeSessions = async (
  req: Request,
  res: Response
): Promise<void> => {
  const menteeId = getUserId(req);
  if (!menteeId) {
    res.status(401).json({ message: "Authentication error" });
    return;
  }
  try {
    const sessions = await prisma.session.findMany({
      where: { menteeId },
      include: { mentor: { include: { profile: true } } },
      orderBy: { date: "asc" },
    });
    res.status(200).json(sessions);
  } catch (error) {
    res.status(500).json({ message: "Error fetching sessions." });
  }
};

export const submitFeedback = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const { rating, comment } = req.body;
  const userId = getUserId(req);
  const role = getUserRole(req);

  if (!userId || !role) {
    res.status(401).json({ message: "Authentication error" });
    return;
  }

  try {
    const session = await prisma.session.findUnique({ where: { id } });
    if (
      !session ||
      (session.mentorId !== userId && session.menteeId !== userId)
    ) {
      res
        .status(403)
        .json({ message: "You did not participate in this session." });
      return;
    }
    const dataToUpdate: { rating?: number; feedback?: string } = {};
    if (role === "MENTEE") dataToUpdate.rating = rating;
    if (comment) dataToUpdate.feedback = comment;
    const updatedSession = await prisma.session.update({
      where: { id },
      data: dataToUpdate,
    });

    await awardPoints(userId, 15);

    res.status(200).json(updatedSession);
  } catch (error) {
    res.status(500).json({ message: "Error submitting feedback." });
  }
};

export const generateVideoCallToken = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = getUserId(req);
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
    const session = await prisma.session.findFirst({
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

    const AccessToken = Twilio.jwt.AccessToken;
    const VideoGrant = AccessToken.VideoGrant;

    const accessToken = new AccessToken(
      twilioAccountSid,
      twilioApiKeySid,
      twilioApiKeySecret,
      { identity: userId }
    );

    const videoGrant = new VideoGrant({
      room: sessionId,
    });
    accessToken.addGrant(videoGrant);

    res.status(200).json({ videoToken: accessToken.toJwt() });
  } catch (error) {
    console.error("Error generating Twilio video call token:", error);
    res.status(500).json({ message: "Server error while generating token." });
  }
};

export const notifyMentorOfCall = async (
  req: Request,
  res: Response
): Promise<void> => {
  const menteeId = getUserId(req);
  const { sessionId } = req.params;

  if (!menteeId) {
    res.status(401).json({ message: "Authentication error" });
    return;
  }

  try {
    const session = await prisma.session.findUnique({
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

    const notification = await prisma.notification.create({
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
    } else {
      console.warn("Socket.IO not initialized, skipping notification emit.");
    }

    console.log(`Notification sent to mentor ${mentorId} for video call.`);
    res.status(200).json({ message: "Notification sent successfully." });
  } catch (error) {
    console.error("Error sending call notification:", error);
    res.status(500).json({ message: "Failed to send notification." });
  }
};

export const createSessionInsights = async (
  req: Request,
  res: Response
): Promise<void> => {
  if (!genAI || !cohere) {
    res.status(500).json({ message: "AI services are not configured." });
    return;
  }

  const userId = getUserId(req);
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
    const session = await prisma.session.findFirst({
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

    const actionItems =
      actionItemsText.toLowerCase().trim() === "none"
        ? []
        : actionItemsText
            .split(/\d+\.\s+/)
            .map((item) => item.trim())
            .filter((item) => item.length > 0);

    const savedInsight = await prisma.sessionInsight.upsert({
      where: { sessionId },
      update: { summary, actionItems },
      create: { sessionId, summary, actionItems },
    });

    res.status(201).json(savedInsight);
  } catch (error) {
    console.error("Error creating session insights:", error);
    res.status(500).json({ message: "Failed to generate session insights." });
  }
};

export const getSessionInsights = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = getUserId(req);
  const { sessionId } = req.params;

  if (!userId) {
    res.status(401).json({ message: "Authentication required." });
    return;
  }

  try {
    const session = await prisma.session.findFirst({
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

    const insights = await prisma.sessionInsight.findUnique({
      where: { sessionId },
    });

    if (!insights) {
      res.status(404).json({
        message: "No insights have been generated for this session yet.",
      });
      return;
    }

    res.status(200).json(insights);
  } catch (error) {
    console.error("Error fetching session insights:", error);
    res.status(500).json({ message: "Failed to fetch session insights." });
  }
};

export const getSessionDetails = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { sessionId } = req.params;
  const userId = getUserId(req);

  try {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        mentor: { include: { profile: true } },
        mentee: { include: { profile: true } },
      },
    });

    if (
      !session ||
      (session.mentorId !== userId && session.menteeId !== userId)
    ) {
      res.status(404).json({ message: "Session not found or access denied." });
      return;
    }

    res.status(200).json(session);
  } catch (error) {
    console.error("Error fetching session details:", error);
    res.status(500).json({ message: "Error fetching session details." });
  }
};
