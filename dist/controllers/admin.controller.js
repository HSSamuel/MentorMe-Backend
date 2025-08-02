"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUser = exports.getDashboardData = exports.updateRequestStatus = exports.deleteRequest = exports.updateUserRole = exports.getStats = exports.assignMentor = exports.deleteSession = exports.getAllSessions = exports.getAllUsers = exports.getAllMatches = void 0;
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
                mentor: { select: { id: true, profile: true } },
                mentee: { select: { id: true, profile: true } },
                participants: { include: { mentee: { include: { profile: true } } } },
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
// --- [FIXED] Function to delete a session based on the correct schema ---
const deleteSession = async (req, res) => {
    const { sessionId } = req.params;
    try {
        // According to schema.prisma, we must delete related SessionInsight and SessionParticipant records first.
        // 1. Delete associated SessionInsights
        await client_1.default.sessionInsight.deleteMany({
            where: { sessionId: sessionId },
        });
        // 2. Delete associated SessionParticipants
        await client_1.default.sessionParticipant.deleteMany({
            where: { sessionId: sessionId },
        });
        // 3. Now it's safe to delete the session itself
        await client_1.default.session.delete({
            where: { id: sessionId },
        });
        res.status(204).send(); // Success, no content to return.
    }
    catch (error) {
        console.error(`Error deleting session ${sessionId}:`, error);
        res.status(500).json({ message: "Failed to delete session." });
    }
};
exports.deleteSession = deleteSession;
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
                message: "This mentorship was manually created by an administrator.",
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
            include: {
                profile: true,
            },
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
// --- Helper function to process data for charts ---
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
// --- Function to get all data for the admin dashboard ---
const getDashboardData = async (req, res) => {
    try {
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
        const [statsData, usersForChart, sessionsForChart, recentUsers, recentMatches,] = await Promise.all([
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
const deleteUser = async (req, res) => {
    const { userId } = req.params;
    try {
        // Use a transaction to ensure all or no operations are completed
        await client_1.default.$transaction(async (tx) => {
            // 1. Find all mentorship requests involving the user to get their IDs
            const requests = await tx.mentorshipRequest.findMany({
                where: { OR: [{ menteeId: userId }, { mentorId: userId }] },
                select: { id: true },
            });
            const requestIds = requests.map((r) => r.id);
            // 2. Delete nested relations of MentorshipRequest (Reviews and Goals)
            if (requestIds.length > 0) {
                await tx.review.deleteMany({
                    where: { mentorshipRequestId: { in: requestIds } },
                });
                await tx.goal.deleteMany({
                    where: { mentorshipRequestId: { in: requestIds } },
                });
            }
            // 3. Now delete the MentorshipRequests themselves
            await tx.mentorshipRequest.deleteMany({
                where: { id: { in: requestIds } },
            });
            // 4. Delete direct one-to-many relations
            await tx.notification.deleteMany({ where: { userId } });
            await tx.availability.deleteMany({ where: { mentorId: userId } });
            await tx.aIConversation.deleteMany({ where: { userId } });
            await tx.forumPost.deleteMany({ where: { authorId: userId } });
            await tx.forumComment.deleteMany({ where: { authorId: userId } });
            // 5. Handle Sessions and their children (Insights, Participants)
            const sessions = await tx.session.findMany({
                where: { OR: [{ menteeId: userId }, { mentorId: userId }] },
                select: { id: true },
            });
            const sessionIds = sessions.map((s) => s.id);
            if (sessionIds.length > 0) {
                await tx.sessionInsight.deleteMany({
                    where: { sessionId: { in: sessionIds } },
                });
                await tx.sessionParticipant.deleteMany({
                    where: { sessionId: { in: sessionIds } },
                });
                await tx.session.deleteMany({ where: { id: { in: sessionIds } } });
            }
            // 6. Handle many-to-many relations by fetching, filtering, and updating
            // For Conversations
            const conversationsToUpdate = await tx.conversation.findMany({
                where: { participantIDs: { has: userId } },
            });
            for (const conv of conversationsToUpdate) {
                await tx.conversation.update({
                    where: { id: conv.id },
                    data: {
                        participantIDs: {
                            set: conv.participantIDs.filter((id) => id !== userId),
                        },
                    },
                });
            }
            // For Messages (readBy)
            const messagesToUpdate = await tx.message.findMany({
                where: { readByIds: { has: userId } },
            });
            for (const msg of messagesToUpdate) {
                await tx.message.update({
                    where: { id: msg.id },
                    data: {
                        readByIds: {
                            set: msg.readByIds.filter((id) => id !== userId),
                        },
                    },
                });
            }
            // 7. Delete messages sent by the user
            await tx.message.deleteMany({ where: { senderId: userId } });
            // 8. Delete the user's profile (onDelete: Cascade in schema will handle this, but explicit deletion is safer)
            await tx.profile.deleteMany({ where: { userId } });
            // 9. Finally, delete the user
            await tx.user.delete({ where: { id: userId } });
        });
        res.status(200).json({ message: "User deleted successfully." });
    }
    catch (error) {
        console.error(`Error deleting user ${userId}:`, error);
        res.status(500).json({ message: "Failed to delete user." });
    }
};
exports.deleteUser = deleteUser;
