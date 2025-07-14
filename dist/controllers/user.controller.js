"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecommendedMentors = exports.updateMyProfile = exports.getMenteeStats = exports.getMentorStats = exports.getAvailableSkills = exports.getAllMentors = exports.getMentorPublicProfile = void 0;
const client_1 = require("@prisma/client");
const getUserId_1 = require("../utils/getUserId"); // This line was missing
const prisma = new client_1.PrismaClient();
// GET a single mentor's public profile
const getMentorPublicProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const mentor = yield prisma.user.findUnique({
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
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching mentor profile." });
    }
});
exports.getMentorPublicProfile = getMentorPublicProfile;
// GET all mentors with pagination
const getAllMentors = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const mentors = yield prisma.user.findMany({
            where: { role: "MENTOR" },
            skip: skip,
            take: limit,
            select: {
                id: true,
                email: true,
                profile: true,
            },
        });
        const totalMentors = yield prisma.user.count({ where: { role: "MENTOR" } });
        res.status(200).json({
            mentors,
            totalPages: Math.ceil(totalMentors / limit),
            currentPage: page,
        });
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching mentors." });
    }
});
exports.getAllMentors = getAllMentors;
// GET available skills
const getAvailableSkills = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
});
exports.getAvailableSkills = getAvailableSkills;
// GET statistics for a mentor (Optimized Version)
const getMentorStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // Use the ID from the URL parameters
    const { id } = req.params;
    try {
        // A single transaction to run all queries concurrently on the database
        const [menteeCount, pendingRequests, upcomingSessions, completedSessions, reviewAggregation,] = yield prisma.$transaction([
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
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching mentor stats." });
    }
});
exports.getMentorStats = getMentorStats;
// GET statistics for a mentee
const getMenteeStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = (0, getUserId_1.getUserId)(req);
    if (!userId) {
        res.status(401).json({ message: "Authentication error" });
        return;
    }
    try {
        const [mentorCount, pendingRequests, upcomingSessions, completedSessions] = yield prisma.$transaction([
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
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching mentee stats." });
    }
});
exports.getMenteeStats = getMenteeStats;
const updateMyProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = (0, getUserId_1.getUserId)(req);
    if (!userId) {
        res.status(401).json({ message: "Authentication error" });
        return;
    }
    const { name, bio, skills, goals } = req.body;
    let avatarUrl = undefined;
    // Get the file path from Cloudinary's response if it exists
    if (req.file) {
        avatarUrl = req.file.path;
    }
    try {
        const profile = yield prisma.profile.upsert({
            where: { userId },
            update: Object.assign({ name,
                bio, skills: skills || [], goals }, (avatarUrl && { avatarUrl })),
            create: Object.assign({ userId,
                name,
                bio, skills: skills || [], goals }, (avatarUrl && { avatarUrl })),
        });
        // Emit a socket event if the avatar was updated
        if (avatarUrl) {
            const io = req.app.locals.io;
            io.emit("avatarUpdated", { userId, avatarUrl });
        }
        res.status(200).json(profile);
    }
    catch (error) {
        console.error("Error updating profile:", error);
        res.status(500).json({ message: "Error updating profile" });
    }
});
exports.updateMyProfile = updateMyProfile;
// GET recommended mentors for the current mentee
const getRecommendedMentors = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = (0, getUserId_1.getUserId)(req);
    if (!userId) {
        res.status(401).json({ message: "Authentication error" });
        return;
    }
    try {
        const menteeProfile = yield prisma.profile.findUnique({
            where: { userId },
            select: { skills: true, goals: true },
        });
        if (!menteeProfile || menteeProfile.skills.length === 0) {
            // Return an empty array if the mentee has no skills listed
            res.status(200).json([]);
            return;
        }
        // Find mentors who have at least one skill that matches the mentee's skills
        const recommendedMentors = yield prisma.user.findMany({
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
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching recommended mentors." });
    }
});
exports.getRecommendedMentors = getRecommendedMentors;
