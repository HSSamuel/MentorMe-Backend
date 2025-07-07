import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { createCalendarEvent } from "../services/calendar.service";

const prisma = new PrismaClient();

const getUserIdForSession = (req: Request): string | null => {
  if (!req.user) return null;
  if ("userId" in req.user) return req.user.userId as string;
  if ("id" in req.user) return req.user.id as string;
  return null;
};

const getUserRole = (req: Request): string | null => {
  if (!req.user) return null;
  return (req.user as any).role as string;
};

export const setAvailability = async (
  req: Request,
  res: Response
): Promise<void> => {
  const mentorId = getUserIdForSession(req);
  if (!mentorId) {
    res.status(401).json({ message: "Authentication error" });
    return;
  }
  const { availability } = req.body;
  try {
    await prisma.availability.deleteMany({ where: { mentorId } });
    const availabilityData = availability.map((slot: any) => ({
      ...slot,
      mentorId,
    }));
    await prisma.availability.createMany({ data: availabilityData });
    res.status(200).json({ message: "Availability updated successfully." });
  } catch (error) {
    res.status(500).json({ message: "Error setting availability." });
  }
};

export const createSession = async (
  req: Request,
  res: Response
): Promise<void> => {
  const menteeId = getUserIdForSession(req);
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

    // --- Create Notification for Mentor ---
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

    // Google Calendar Event Creation
    try {
      const mentor = await prisma.user.findUnique({ where: { id: mentorId } });
      if (mentor && mentee) {
        const eventDetails = {
          summary: `Mentorship Session: ${mentor.email} & ${mentee.email}`,
          description:
            "Your mentorship session booked via the MentorMe Platform.",
          start: new Date(sessionTime),
          end: new Date(new Date(sessionTime).getTime() + 60 * 60 * 1000), // Assume 1-hour session
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
  const mentorId = getUserIdForSession(req);
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
  const menteeId = getUserIdForSession(req);
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
  const userId = getUserIdForSession(req);
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
    res.status(200).json(updatedSession);
  } catch (error) {
    res.status(500).json({ message: "Error submitting feedback." });
  }
};
