"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserRole = exports.getStats = exports.assignMentor = exports.getAllSessions = exports.getAllUsers = exports.getAllMatches = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Ensure this function is exported
const getAllMatches = async (req, res) => {
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
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching users." });
    }
};
exports.getAllUsers = getAllUsers;
// GET /admin/sessions
const getAllSessions = async (req, res) => {
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
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching sessions." });
    }
};
exports.getAllSessions = getAllSessions;
// POST /admin/assign
const assignMentor = async (req, res) => {
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
    }
    catch (error) {
        res.status(500).json({ message: "Server error while creating request" });
    }
};
exports.assignMentor = assignMentor;
// GET /admin/stats
const getStats = async (req, res) => {
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
        const updatedUser = await prisma.user.update({
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
