import { Request, Response } from "express";
import { Role } from "@prisma/client";
import prisma from "../client";

// Ensure this function is exported
export const getAllMatches = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const matches = await prisma.mentorshipRequest.findMany({
      include: {
        mentor: {
          select: {
            id: true,
            email: true,
            profile: true,
          },
        },
        mentee: {
          select: {
            id: true,
            email: true,
            profile: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    res.status(200).json(matches);
  } catch (error) {
    console.error("Error fetching matches:", error);
    res.status(500).json({ message: "Error fetching matches." });
  }
};

export const getAllUsers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20; // Default to 20 per page
    const skip = (page - 1) * limit;

    const users = await prisma.user.findMany({
      skip: skip,
      take: limit,
      include: { profile: true },
    });

    const totalUsers = await prisma.user.count();

    res.status(200).json({
      users,
      totalPages: Math.ceil(totalUsers / limit),
      currentPage: page,
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching users." });
  }
};

// GET /admin/sessions
export const getAllSessions = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const sessions = await prisma.session.findMany({
      include: {
        mentor: { select: { profile: true } },
        mentee: { select: { profile: true } },
      },
      orderBy: { date: "desc" },
    });
    const totalCount = await prisma.session.count();
    res.status(200).json({ totalCount, sessions });
  } catch (error) {
    res.status(500).json({ message: "Error fetching sessions." });
  }
};

// POST /admin/assign
export const assignMentor = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { menteeId, mentorId } = req.body;

  if (!menteeId || !mentorId) {
    res.status(400).json({ message: "Mentee ID and Mentor ID are required" });
    return;
  }

  try {
    const newRequest = await prisma.mentorshipRequest.create({
      data: {
        menteeId,
        mentorId,
        status: "ACCEPTED",
      },
    });

    res.status(201).json(newRequest);
  } catch (error) {
    res.status(500).json({ message: "Server error while creating request" });
  }
};

// GET /admin/stats
export const getStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const totalUsers = await prisma.user.count();
    const totalMentors = await prisma.user.count({ where: { role: "MENTOR" } });
    const totalMentees = await prisma.user.count({ where: { role: "MENTEE" } });
    const totalMatches = await prisma.mentorshipRequest.count({
      where: { status: "ACCEPTED" },
    });
    const totalSessions = await prisma.session.count();
    const pendingRequests = await prisma.mentorshipRequest.count({
      where: { status: "PENDING" },
    });

    res.status(200).json({
      totalUsers,
      totalMentors,
      totalMentees,
      totalMatches,
      totalSessions,
      pendingRequests,
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching admin stats." });
  }
};

export const updateUserRole = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const { role } = req.body;
  try {
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role: role as Role },
    });
    const { password, ...userWithoutPassword } = updatedUser;
    res.status(200).json(userWithoutPassword);
  } catch (error) {
    res.status(500).json({ message: "Error updating user role." });
  }
};