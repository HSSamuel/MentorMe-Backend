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

    const role = req.query.role as Role | undefined;
    const whereClause = role ? { role } : {};

    const users = await prisma.user.findMany({
      where: whereClause,
      skip: skip,
      take: limit,
      include: { profile: true },
    });

    const totalUsers = await prisma.user.count({ where: whereClause });

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
        participants: { include: { mentee: { include: { profile: true } } } },
      },
      orderBy: { date: "desc" },
    });
    const totalCount = await prisma.session.count();
    res.status(200).json({ totalCount, sessions });
  } catch (error) {
    res.status(500).json({ message: "Error fetching sessions." });
  }
};

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
    const existingRequest = await prisma.mentorshipRequest.findFirst({
      where: { menteeId, mentorId },
    });

    if (existingRequest) {
      res.status(409).json({
        message: "A mentorship request between these users already exists.",
      });
      return;
    }

    const newRequest = await prisma.mentorshipRequest.create({
      data: {
        menteeId,
        mentorId,
        status: "ACCEPTED",
        message: "This mentorship was manually created by an administrator.",
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
      // --- FIX: Include the user's profile in the response ---
      include: {
        profile: true,
      },
    });
    const { password, ...userWithoutPassword } = updatedUser;
    res.status(200).json(userWithoutPassword);
  } catch (error) {
    res.status(500).json({ message: "Error updating user role." });
  }
};

// --- Function to delete a mentorship request ---
export const deleteRequest = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  try {
    const request = await prisma.mentorshipRequest.findUnique({
      where: { id },
    });

    if (!request) {
      res.status(404).json({ message: "Mentorship request not found." });
      return;
    }

    await prisma.mentorshipRequest.delete({ where: { id } });
    res.status(200).json({ message: "Request deleted successfully." });
  } catch (error) {
    console.error("Error deleting request:", error);
    res.status(500).json({ message: "Server error while deleting request." });
  }
};

// --- Function to update the status of a mentorship request ---
export const updateRequestStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const { status } = req.body; // Expecting "ACCEPTED" or "REJECTED"

  if (!status || !["ACCEPTED", "REJECTED", "PENDING"].includes(status)) {
    res.status(400).json({ message: "Invalid status provided." });
    return;
  }

  try {
    const request = await prisma.mentorshipRequest.findUnique({
      where: { id },
    });

    if (!request) {
      res.status(404).json({ message: "Mentorship request not found." });
      return;
    }

    const updatedRequest = await prisma.mentorshipRequest.update({
      where: { id },
      data: { status },
    });

    res.status(200).json(updatedRequest);
  } catch (error) {
    console.error("Error updating request status:", error);
    res.status(500).json({ message: "Server error while updating status." });
  }
};

// --- Helper function to process data for charts ---
const processDataForChart = (
  data: { createdAt?: Date; date?: Date }[],
  dateField: "createdAt" | "date"
) => {
  const monthlyCounts = Array(12).fill(0);
  const monthLabels: string[] = [];
  const now = new Date();

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthLabels.push(d.toLocaleString("default", { month: "short" }));
  }

  data.forEach((item) => {
    const itemDate = new Date(item[dateField]!);
    const monthDiff =
      (now.getFullYear() - itemDate.getFullYear()) * 12 +
      (now.getMonth() - itemDate.getMonth());
    if (monthDiff >= 0 && monthDiff < 12) {
      monthlyCounts[11 - monthDiff]++;
    }
  });

  return { labels: monthLabels, data: monthlyCounts };
};

// --- Function to get all data for the admin dashboard ---
export const getDashboardData = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const [
      statsData,
      usersForChart,
      sessionsForChart,
      recentUsers,
      recentMatches,
    ] = await Promise.all([
      (async () => {
        const totalUsers = await prisma.user.count();
        const totalMentors = await prisma.user.count({
          where: { role: "MENTOR" },
        });
        const totalMentees = await prisma.user.count({
          where: { role: "MENTEE" },
        });
        const totalMatches = await prisma.mentorshipRequest.count({
          where: { status: "ACCEPTED" },
        });
        const totalSessions = await prisma.session.count();
        const pendingRequests = await prisma.mentorshipRequest.count({
          where: { status: "PENDING" },
        });
        return {
          totalUsers,
          totalMentors,
          totalMentees,
          totalMatches,
          totalSessions,
          pendingRequests,
        };
      })(),
      prisma.user.findMany({
        where: { createdAt: { gte: twelveMonthsAgo } },
        select: { createdAt: true },
      }),
      prisma.session.findMany({
        where: { date: { gte: twelveMonthsAgo } },
        select: { date: true },
      }),
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { profile: true },
      }),
      prisma.mentorshipRequest.findMany({
        where: { status: "ACCEPTED" },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          mentor: { include: { profile: true } },
          mentee: { include: { profile: true } },
        },
      }),
    ]);

    const userChartData = processDataForChart(usersForChart, "createdAt");
    const sessionChartData = processDataForChart(sessionsForChart, "date");

    const recentActivity = [
      ...recentUsers.map((u) => ({
        type: "NEW_USER",
        data: u,
        date: u.createdAt,
      })),
      ...recentMatches.map((m) => ({
        type: "NEW_MATCH",
        data: m,
        date: m.createdAt,
      })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);

    res.status(200).json({
      stats: statsData,
      charts: {
        users: userChartData,
        sessions: sessionChartData,
      },
      recentActivity,
    });
  } catch (error) {
    console.error("Error fetching admin dashboard data:", error);
    res.status(500).json({ message: "Error fetching admin dashboard data." });
  }
};
