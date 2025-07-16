import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { getUserId } from "../utils/getUserId";

const prisma = new PrismaClient();

export const getMyProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }
  try {
    const userProfile = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        lastSeen: true,
        profile: true,
      },
    });

    if (!userProfile) {
      res.status(404).json({ message: "User profile not found." });
      return;
    }
    res.status(200).json(userProfile);
  } catch (error) {
    console.error("Error fetching my profile:", error);
    next(error);
  }
};

// [MODIFIED START]: Generalized from getMentorPublicProfile to getUserPublicProfile
export const getUserPublicProfile = async (
  req: Request,
  res: Response,
  next: NextFunction // [ADD] Add NextFunction for consistent error handling
): Promise<void> => {
  try {
    const { id } = req.params;
    console.log(`Attempting to fetch public profile for user with ID: ${id}`);
    const userPublicProfile = await prisma.user.findUnique({
      where: { id }, // [MODIFIED]: Removed role: "MENTOR" filter
      select: {
        id: true,
        email: true, // [MODIFIED]: Including email (consider if this should be public)
        role: true, // [ADD]: Include role so frontend can differentiate (e.g., if mentee/mentor)
        lastSeen: true,
        profile: {
          select: {
            name: true,
            bio: true,
            skills: true,
            goals: true,
            avatarUrl: true,
            // Add other public profile fields as needed
          },
        },
      },
    });

    if (!userPublicProfile) {
      console.log(`User with ID ${id} not found.`);
      res.status(404).json({ message: "User profile not found." });
      return;
    }
    console.log(
      `Successfully fetched public profile for: ${userPublicProfile.profile ? userPublicProfile.profile.name : "Unknown Name"}`
    );
    res.status(200).json(userPublicProfile);
  } catch (error) {
    console.error("Error in getUserPublicProfile:", error);
    next(error); // [ADD] Pass to error middleware
  }
};
// [MODIFIED END]

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
        lastSeen: true,
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
  const { id } = req.params;

  try {
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
      // FIX: The nested 'where' clause for the review aggregation is corrected
      // to properly filter reviews based on the mentorId from the related mentorship request.
      prisma.review.aggregate({
        where: {
          mentorshipRequest: {
            mentorId: id,
          },
        },
        _avg: {
          rating: true,
        },
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
    // FIX: Added detailed error logging for easier debugging in the future.
    console.error(`Error fetching mentor stats for mentor ID ${id}:`, error);
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
      res.status(200).json([]);
      return;
    }

    const recommendedMentors = await prisma.user.findMany({
      where: {
        role: "MENTOR",
        id: { not: userId },
        profile: {
          skills: {
            hasSome: menteeProfile.skills,
          },
        },
      },
      take: 3,
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
