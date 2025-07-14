import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { createCalendarEvent } from "../services/calendar.service";
import { getUserId } from "../utils/getUserId";
import { awardPoints } from "../services/gamification.service";

const prisma = new PrismaClient();

const getUserRole = (req: Request): string | null => {
  if (!req.user) return null;
  return (req.user as any).role as string;
};

// NEW: Get the logged-in mentor's own availability
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

// NEW: Get a specific mentor's availability and generate slots for the next 4 weeks
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
      // Generate slots for the next 4 weeks
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
            // Assuming 1-hour slots, adjust if necessary
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

    io.emit("availabilityUpdated", { mentorId });

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

    // Award points for submitting feedback
    await awardPoints(userId, 15);

    res.status(200).json(updatedSession);
  } catch (error) {
    res.status(500).json({ message: "Error submitting feedback." });
  }
};
