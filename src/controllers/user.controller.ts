import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { getUserId } from "../utils/getUserId"; // This line was missing

const prisma = new PrismaClient();

// GET a single mentor's public profile
export const getMentorPublicProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const mentor = await prisma.user.findUnique({
      where: { id, role: "MENTOR" },
      select: {
        id: true,
        profile: {
          select: {
            name: true,
            bio: true,
            skills: true,
            goals: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!mentor) {
      res.status(404).json({ message: "Mentor not found." });
      return;
    }
    res.status(200).json(mentor);
  } catch (error) {
    res.status(500).json({ message: "Error fetching mentor profile." });
  }
};

// GET all mentors with pagination
export const getAllMentors = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const mentors = await prisma.user.findMany({
      where: { role: "MENTOR" },
      skip: skip,
      take: limit,
      select: {
        id: true,
        email: true,
        profile: true,
      },
    });

    const totalMentors = await prisma.user.count({ where: { role: "MENTOR" } });

    res.status(200).json({
      mentors,
      totalPages: Math.ceil(totalMentors / limit),
      currentPage: page,
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching mentors." });
  }
};

// GET available skills
export const getAvailableSkills = async (
  req: Request,
  res: Response
): Promise<void> => {
  const skills = [
    "Virtual Assistant",
    "UI/UX Designer",
    "Software Development",
    "Video Editing",
    "Cybersecurity",
    "DevOps & Automation",
    "AI/ML",
    "Data Science",
    "Digital Marketing",
    "Graphic Design",
    "Project Management",
    "Content Creation",
    "Internet of Things (IoT)",
    "Cloud Computing",
    "Quantum Computing",
  ];
  res.status(200).json(skills);
};

// GET statistics for a mentor (Optimized Version)
export const getMentorStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  // Use the ID from the URL parameters
  const { id } = req.params;

  try {
    // A single transaction to run all queries concurrently on the database
    const [
      menteeCount,
      pendingRequests,
      upcomingSessions,
      completedSessions,
      reviewAggregation,
    ] = await prisma.$transaction([
      prisma.mentorshipRequest.count({
        where: { mentorId: id, status: "ACCEPTED" },
      }),
      prisma.mentorshipRequest.count({
        where: { mentorId: id, status: "PENDING" },
      }),
      prisma.session.count({
        where: { mentorId: id, date: { gte: new Date() } },
      }),
      prisma.session.count({
        where: { mentorId: id, date: { lt: new Date() } },
      }),
      prisma.review.aggregate({
        where: { mentorshipRequest: { mentorId: id } },
        _avg: { rating: true },
      }),
    ]);

    const averageRating = reviewAggregation._avg.rating || 0;

    res.status(200).json({
      menteeCount,
      pendingRequests,
      upcomingSessions,
      completedSessions,
      averageRating,
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching mentor stats." });
  }
};

// GET statistics for a mentee
export const getMenteeStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ message: "Authentication error" });
    return;
  }
  try {
    const [mentorCount, pendingRequests, upcomingSessions, completedSessions] =
      await prisma.$transaction([
        prisma.mentorshipRequest.count({
          where: { menteeId: userId, status: "ACCEPTED" },
        }),
        prisma.mentorshipRequest.count({
          where: { menteeId: userId, status: "PENDING" },
        }),
        prisma.session.count({
          where: { menteeId: userId, date: { gte: new Date() } },
        }),
        prisma.session.count({
          where: { menteeId: userId, date: { lt: new Date() } },
        }),
      ]);

    res.status(200).json({
      mentorCount,
      pendingRequests,
      upcomingSessions,
      completedSessions,
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching mentee stats." });
  }
};

export const updateMyProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ message: "Authentication error" });
    return;
  }

  const { name, bio, skills, goals } = req.body;
  let avatarUrl: string | undefined = undefined;

  // Get the file path from Cloudinary's response if it exists
  if (req.file) {
    avatarUrl = req.file.path;
  }

  try {
    const profile = await prisma.profile.upsert({
      where: { userId },
      update: {
        name,
        bio,
        skills: skills || [],
        goals,
        ...(avatarUrl && { avatarUrl }),
      },
      create: {
        userId,
        name,
        bio,
        skills: skills || [],
        goals,
        ...(avatarUrl && { avatarUrl }),
      },
    });

    // Emit a socket event if the avatar was updated
    if (avatarUrl) {
      const io = req.app.locals.io;
      io.emit("avatarUpdated", { userId, avatarUrl });
    }

    res.status(200).json(profile);
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Error updating profile" });
  }
};

// GET recommended mentors for the current mentee
export const getRecommendedMentors = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ message: "Authentication error" });
    return;
  }

  try {
    const menteeProfile = await prisma.profile.findUnique({
      where: { userId },
      select: { skills: true, goals: true },
    });

    if (!menteeProfile || menteeProfile.skills.length === 0) {
      // Return an empty array if the mentee has no skills listed
      res.status(200).json([]);
      return;
    }

    // Find mentors who have at least one skill that matches the mentee's skills
    const recommendedMentors = await prisma.user.findMany({
      where: {
        role: "MENTOR",
        id: { not: userId }, // Ensure users don't see themselves
        profile: {
          skills: {
            hasSome: menteeProfile.skills,
          },
        },
      },
      take: 3, // Limit to 3 recommendations for the dashboard
      select: {
        id: true,
        profile: true,
      },
    });

    res.status(200).json(recommendedMentors);
  } catch (error) {
    res.status(500).json({ message: "Error fetching recommended mentors." });
  }
};
