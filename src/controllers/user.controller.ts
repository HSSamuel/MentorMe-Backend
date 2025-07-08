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

// GET all mentors
export const getAllMentors = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const mentors = await prisma.user.findMany({
      where: { role: "MENTOR" },
      select: {
        id: true,
        email: true,
        profile: true,
      },
    });
    res.status(200).json(mentors);
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

// PUT (update or create) the user's own profile, including avatar
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
    avatarUrl = `/uploads/${req.file.filename}`;
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
    res.status(200).json(profile);
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Error updating profile" });
  }
};

// GET statistics for a mentor
export const getMentorStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ message: "Authentication error" });
    return;
  }
  try {
    const menteeCount = await prisma.mentorshipRequest.count({
      where: { mentorId: userId, status: "ACCEPTED" },
    });
    const pendingRequests = await prisma.mentorshipRequest.count({
      where: { mentorId: userId, status: "PENDING" },
    });
    const upcomingSessions = await prisma.session.count({
      where: { mentorId: userId, date: { gte: new Date() } },
    });
    const completedSessions = await prisma.session.count({
      where: { mentorId: userId, date: { lt: new Date() } },
    });
    const reviews = await prisma.review.findMany({
      where: { mentorshipRequest: { mentorId: userId } },
      select: { rating: true },
    });
    const averageRating =
      reviews.length > 0
        ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
        : 0;

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
    const mentorCount = await prisma.mentorshipRequest.count({
      where: { menteeId: userId, status: "ACCEPTED" },
    });
    const pendingRequests = await prisma.mentorshipRequest.count({
      where: { menteeId: userId, status: "PENDING" },
    });
    const upcomingSessions = await prisma.session.count({
      where: { menteeId: userId, date: { gte: new Date() } },
    });
    const completedSessions = await prisma.session.count({
      where: { menteeId: userId, date: { lt: new Date() } },
    });
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
