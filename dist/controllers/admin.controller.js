"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardData = exports.updateRequestStatus = exports.deleteRequest = exports.updateUserRole = exports.getStats = exports.assignMentor = exports.getAllSessions = exports.getAllUsers = exports.getAllMatches = void 0;
const client_1 = __importDefault(require("../client"));
// Ensure this function is exported
const getAllMatches = async (req, res) => {
    try {
        const matches = await client_1.default.mentorshipRequest.findMany({
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
    }
    catch (error) {
        console.error("Error fetching matches:", error);
        res.status(500).json({ message: "Error fetching matches." });
    }
};
exports.getAllMatches = getAllMatches;
const getAllUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20; // Default to 20 per page
        const skip = (page - 1) * limit;
        const role = req.query.role;
        const whereClause = role ? { role } : {};
        const users = await client_1.default.user.findMany({
            where: whereClause,
            skip: skip,
            take: limit,
            include: { profile: true },
        });
        const totalUsers = await client_1.default.user.count({ where: whereClause });
        res.status(200).json({
            users,
            totalPages: Math.ceil(totalUsers / limit),
            currentPage: page,
        });
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching users." });
    }
};
exports.getAllUsers = getAllUsers;
// GET /admin/sessions
const getAllSessions = async (req, res) => {
    try {
        const sessions = await client_1.default.session.findMany({
            include: {
                mentor: { select: { profile: true } },
                mentee: { select: { profile: true } },
            },
            orderBy: { date: "desc" },
        });
        const totalCount = await client_1.default.session.count();
        res.status(200).json({ totalCount, sessions });
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching sessions." });
    }
};
exports.getAllSessions = getAllSessions;
// POST /admin/matches
const assignMentor = async (req, res) => {
    const { menteeId, mentorId } = req.body;
    if (!menteeId || !mentorId) {
        res.status(400).json({ message: "Mentee ID and Mentor ID are required" });
        return;
    }
    try {
        const existingRequest = await client_1.default.mentorshipRequest.findFirst({
            where: { menteeId, mentorId },
        });
        if (existingRequest) {
            // --- [FIX 1] ---
            // Removed the `return` keyword to match the 'void' return type.
            res.status(409).json({
                message: "A mentorship request between these users already exists.",
            });
            return;
        }
        const newRequest = await client_1.default.mentorshipRequest.create({
            data: {
                menteeId,
                mentorId,
                status: "ACCEPTED",
                // --- [FIX 2] ---
                // Removed the 'message' field as it does not exist in your Prisma schema.
            },
        });
        res.status(201).json(newRequest);
    }
    catch (error) {
        res.status(500).json({ message: "Server error while creating request" });
    }
};
exports.assignMentor = assignMentor;
// GET /admin/stats
const getStats = async (req, res) => {
    try {
        const totalUsers = await client_1.default.user.count();
        const totalMentors = await client_1.default.user.count({ where: { role: "MENTOR" } });
        const totalMentees = await client_1.default.user.count({ where: { role: "MENTEE" } });
        const totalMatches = await client_1.default.mentorshipRequest.count({
            where: { status: "ACCEPTED" },
        });
        const totalSessions = await client_1.default.session.count();
        const pendingRequests = await client_1.default.mentorshipRequest.count({
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
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching admin stats." });
    }
};
exports.getStats = getStats;
const updateUserRole = async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;
    try {
        const updatedUser = await client_1.default.user.update({
            where: { id },
            data: { role: role },
        });
        const { password, ...userWithoutPassword } = updatedUser;
        res.status(200).json(userWithoutPassword);
    }
    catch (error) {
        res.status(500).json({ message: "Error updating user role." });
    }
};
exports.updateUserRole = updateUserRole;
// --- Function to delete a mentorship request ---
const deleteRequest = async (req, res) => {
    const { id } = req.params;
    try {
        const request = await client_1.default.mentorshipRequest.findUnique({
            where: { id },
        });
        if (!request) {
            res.status(404).json({ message: "Mentorship request not found." });
            return;
        }
        await client_1.default.mentorshipRequest.delete({ where: { id } });
        res.status(200).json({ message: "Request deleted successfully." });
    }
    catch (error) {
        console.error("Error deleting request:", error);
        res.status(500).json({ message: "Server error while deleting request." });
    }
};
exports.deleteRequest = deleteRequest;
// --- Function to update the status of a mentorship request ---
const updateRequestStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // Expecting "ACCEPTED" or "REJECTED"
    if (!status || !["ACCEPTED", "REJECTED", "PENDING"].includes(status)) {
        res.status(400).json({ message: "Invalid status provided." });
        return;
    }
    try {
        const request = await client_1.default.mentorshipRequest.findUnique({
            where: { id },
        });
        if (!request) {
            res.status(404).json({ message: "Mentorship request not found." });
            return;
        }
        const updatedRequest = await client_1.default.mentorshipRequest.update({
            where: { id },
            data: { status },
        });
        res.status(200).json(updatedRequest);
    }
    catch (error) {
        console.error("Error updating request status:", error);
        res.status(500).json({ message: "Server error while updating status." });
    }
};
exports.updateRequestStatus = updateRequestStatus;
// --- [NEW] Helper function to process data for charts ---
const processDataForChart = (data, dateField) => {
    const monthlyCounts = Array(12).fill(0);
    const monthLabels = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        monthLabels.push(d.toLocaleString("default", { month: "short" }));
    }
    data.forEach((item) => {
        const itemDate = new Date(item[dateField]);
        const monthDiff = (now.getFullYear() - itemDate.getFullYear()) * 12 +
            (now.getMonth() - itemDate.getMonth());
        if (monthDiff >= 0 && monthDiff < 12) {
            monthlyCounts[11 - monthDiff]++;
        }
    });
    return { labels: monthLabels, data: monthlyCounts };
};
// --- [NEW] Function to get all data for the admin dashboard ---
const getDashboardData = async (req, res) => {
    try {
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
        const [statsData, usersForChart, sessionsForChart, recentUsers, recentMatches,] = await Promise.all([
            // Re-use the stat logic directly
            (async () => {
                const totalUsers = await client_1.default.user.count();
                const totalMentors = await client_1.default.user.count({
                    where: { role: "MENTOR" },
                });
                const totalMentees = await client_1.default.user.count({
                    where: { role: "MENTEE" },
                });
                const totalMatches = await client_1.default.mentorshipRequest.count({
                    where: { status: "ACCEPTED" },
                });
                const totalSessions = await client_1.default.session.count();
                const pendingRequests = await client_1.default.mentorshipRequest.count({
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
            client_1.default.user.findMany({
                where: { createdAt: { gte: twelveMonthsAgo } },
                select: { createdAt: true },
            }),
            client_1.default.session.findMany({
                where: { date: { gte: twelveMonthsAgo } },
                select: { date: true },
            }),
            client_1.default.user.findMany({
                orderBy: { createdAt: "desc" },
                take: 5,
                include: { profile: true },
            }),
            client_1.default.mentorshipRequest.findMany({
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
    }
    catch (error) {
        console.error("Error fetching admin dashboard data:", error);
        res.status(500).json({ message: "Error fetching admin dashboard data." });
    }
};
exports.getDashboardData = getDashboardData;
