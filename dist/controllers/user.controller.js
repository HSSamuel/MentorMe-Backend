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
exports.getRecommendedMentors = exports.updateMyProfile = exports.getMenteeStats = exports.getMentorStats = exports.getAvailableSkills = exports.getAllMentors = exports.getUserPublicProfile = exports.getMyProfile = void 0;
const client_1 = require("@prisma/client");
const getUserId_1 = require("../utils/getUserId");
const ai_service_1 = require("../services/ai.service");
const prisma = new client_1.PrismaClient();
const getMyProfile = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = (0, getUserId_1.getUserId)(req);
    if (!userId) {
        res.status(401).json({ message: "Authentication required" });
        return;
    }
    try {
        const userProfile = yield prisma.user.findUnique({
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
    }
    catch (error) {
        console.error("Error fetching my profile:", error);
        next(error);
    }
});
exports.getMyProfile = getMyProfile;
const getUserPublicProfile = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        console.log(`Attempting to fetch public profile for user with ID: ${id}`);
        const userPublicProfile = yield prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                email: true,
                role: true,
                lastSeen: true,
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
        if (!userPublicProfile) {
            console.log(`User with ID ${id} not found.`);
            res.status(404).json({ message: "User profile not found." });
            return;
        }
        console.log(`Successfully fetched public profile for: ${userPublicProfile.profile ? userPublicProfile.profile.name : "Unknown Name"}`);
        res.status(200).json(userPublicProfile);
    }
    catch (error) {
        console.error("Error in getUserPublicProfile:", error);
        next(error);
    }
});
exports.getUserPublicProfile = getUserPublicProfile;
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
                lastSeen: true,
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
        "Mobile App Development",
        "Game Development",
        "Web Development",
        "Full Stack Development",
        "Augmented Reality (AR)",
        "Virtual Reality (VR)",
        "Blockchain Development",
        "Product Management",
        "Business Analysis",
        "Technical Writing",
        "SEO & SEM",
        "Social Media Management",
        "Copywriting",
        "Data Analysis",
        "UI Engineering",
        "IT Support & Helpdesk",
        "Financial Technology (FinTech)",
        "Computer Vision",
        "Natural Language Processing (NLP)",
        "Penetration Testing",
        "3D Animation & Modelling",
        "Robotic Process Automation (RPA)",
        "Low-Code/No-Code Development",
        "Cloud Security",
        "CRM Management (e.g., Salesforce, HubSpot)",
    ];
    res.status(200).json(skills);
});
exports.getAvailableSkills = getAvailableSkills;
const getMentorStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
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
    }
    catch (error) {
        console.error(`Error fetching mentor stats for mentor ID ${id}:`, error);
        res.status(500).json({ message: "Error fetching mentor stats." });
    }
});
exports.getMentorStats = getMentorStats;
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
    if (req.file) {
        avatarUrl = req.file.path;
    }
    try {
        // Your existing profile update logic is preserved
        const profile = yield prisma.profile.upsert({
            where: { userId },
            update: Object.assign({ name,
                bio, skills: skills || [], goals }, (avatarUrl && { avatarUrl })),
            create: Object.assign({ userId,
                name,
                bio, skills: skills || [], goals }, (avatarUrl && { avatarUrl })),
        });
        // --- 2. START OF NEW AI EMBEDDING LOGIC ---
        // Combine the most important profile fields into a single string
        const profileText = `
      Skills: ${(skills || []).join(", ")}.
      Interests and Goals: ${goals}.
      Bio: ${bio}.
    `;
        // Generate the embedding from the text
        const embedding = yield (0, ai_service_1.generateEmbedding)(profileText);
        // Save the generated embedding to the User model
        yield prisma.user.update({
            where: { id: userId },
            data: {
                profileEmbedding: embedding,
            },
        });
        // --- END OF NEW AI EMBEDDING LOGIC ---
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
            res.status(200).json([]);
            return;
        }
        const recommendedMentors = yield prisma.user.findMany({
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
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching recommended mentors." });
    }
});
exports.getRecommendedMentors = getRecommendedMentors;
