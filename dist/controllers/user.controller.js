"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserConnections = exports.getRecommendedMentors = exports.updateMyProfile = exports.getMenteeStats = exports.getMentorStats = exports.getAvailableSkills = exports.getAllMentors = exports.getUserPublicProfile = exports.getMyProfile = void 0;
const client_1 = __importDefault(require("../client"));
const getUserId_1 = require("../utils/getUserId");
const ai_service_1 = require("../services/ai.service");
const cosineSimilarity_1 = require("../utils/cosineSimilarity");
const getMyProfile = async (req, res, next) => {
    const userId = (0, getUserId_1.getUserId)(req);
    if (!userId) {
        res.status(401).json({ message: "Authentication required" });
        return;
    }
    try {
        const userProfile = await client_1.default.user.findUnique({
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
};
exports.getMyProfile = getMyProfile;
const getUserPublicProfile = async (req, res, next) => {
    try {
        const { id } = req.params;
        console.log(`Attempting to fetch public profile for user with ID: ${id}`);
        const userPublicProfile = await client_1.default.user.findUnique({
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
        console.log(`Successfully fetched public profile for: ${userPublicProfile.profile
            ? userPublicProfile.profile.name
            : "Unknown Name"}`);
        res.status(200).json(userPublicProfile);
    }
    catch (error) {
        console.error("Error in getUserPublicProfile:", error);
        next(error);
    }
};
exports.getUserPublicProfile = getUserPublicProfile;
const getAllMentors = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const mentors = await client_1.default.user.findMany({
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
        const totalMentors = await client_1.default.user.count({ where: { role: "MENTOR" } });
        res.status(200).json({
            mentors,
            totalPages: Math.ceil(totalMentors / limit),
            currentPage: page,
        });
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching mentors." });
    }
};
exports.getAllMentors = getAllMentors;
const getAvailableSkills = async (req, res) => {
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
};
exports.getAvailableSkills = getAvailableSkills;
const getMentorStats = async (req, res) => {
    const { id } = req.params;
    try {
        const [menteeCount, pendingRequests, upcomingSessions, completedSessions, reviewAggregation,] = await client_1.default.$transaction([
            client_1.default.mentorshipRequest.count({
                where: { mentorId: id, status: "ACCEPTED" },
            }),
            client_1.default.mentorshipRequest.count({
                where: { mentorId: id, status: "PENDING" },
            }),
            client_1.default.session.count({
                where: { mentorId: id, date: { gte: new Date() } },
            }),
            client_1.default.session.count({
                where: { mentorId: id, date: { lt: new Date() } },
            }),
            client_1.default.review.aggregate({
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
};
exports.getMentorStats = getMentorStats;
const getMenteeStats = async (req, res) => {
    const userId = (0, getUserId_1.getUserId)(req);
    if (!userId) {
        res.status(401).json({ message: "Authentication error" });
        return;
    }
    try {
        const [mentorCount, pendingRequests, upcomingSessions, completedSessions] = await client_1.default.$transaction([
            client_1.default.mentorshipRequest.count({
                where: { menteeId: userId, status: "ACCEPTED" },
            }),
            client_1.default.mentorshipRequest.count({
                where: { menteeId: userId, status: "PENDING" },
            }),
            client_1.default.session.count({
                where: { menteeId: userId, date: { gte: new Date() } },
            }),
            client_1.default.session.count({
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
};
exports.getMenteeStats = getMenteeStats;
const updateMyProfile = async (req, res) => {
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
        const profile = await client_1.default.profile.upsert({
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
        // --- 2. START OF NEW AI EMBEDDING LOGIC ---
        // Combine the most important profile fields into a single string
        const profileText = `
      Skills: ${(skills || []).join(", ")}.
      Interests and Goals: ${goals}.
      Bio: ${bio}.
    `;
        // Generate the embedding from the text
        const embedding = await (0, ai_service_1.generateEmbedding)(profileText);
        // Save the generated embedding to the User model
        await client_1.default.user.update({
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
};
exports.updateMyProfile = updateMyProfile;
const getRecommendedMentors = async (req, res) => {
    const userId = (0, getUserId_1.getUserId)(req);
    if (!userId) {
        res.status(401).json({ message: "Authentication error" });
        return;
    }
    try {
        // 1. Get the current mentee's profile and vector
        const mentee = await client_1.default.user.findUnique({
            where: { id: userId },
            include: { profile: true },
        });
        // Check if the mentee has a profile and a generated vector
        if (!mentee?.profile?.vector || mentee.profile.vector.length === 0) {
            res.status(200).json([]);
            return;
        }
        // 2. Get all mentors who have a profile
        const mentors = await client_1.default.user.findMany({
            where: {
                role: "MENTOR",
                id: { not: userId },
                profile: {
                    isNot: null, // We only need to check that they have a profile
                },
            },
            include: { profile: true }, // This ensures profile data is included
        });
        // 3. Calculate the similarity score for each mentor
        const recommendations = mentors
            // --- THIS IS THE FIX ---
            // Filter out mentors who don't have a vector and calculate the score
            .map((mentor) => {
            if (!mentor.profile?.vector || mentor.profile.vector.length === 0) {
                return null; // This mentor will be filtered out
            }
            const score = (0, cosineSimilarity_1.cosineSimilarity)(mentee.profile.vector, mentor.profile.vector // Correctly access the vector
            );
            return { ...mentor, matchScore: score };
        })
            .filter(Boolean) // Remove any null entries
            // --------------------
            .sort((a, b) => b.matchScore - a.matchScore)
            .slice(0, 3);
        res.status(200).json(recommendations);
    }
    catch (error) {
        console.error("Error fetching recommended mentors:", error);
        res.status(500).json({ message: "Error fetching recommended mentors." });
    }
};
exports.getRecommendedMentors = getRecommendedMentors;
// --- [NEW] FUNCTION TO GET USER CONNECTIONS ---
const getUserConnections = async (req, res, next) => {
    const userId = (0, getUserId_1.getUserId)(req);
    if (!userId) {
        res.status(401).json({ message: "Authentication required" });
        return;
    }
    try {
        const mentorships = await client_1.default.mentorshipRequest.findMany({
            where: {
                status: "ACCEPTED",
                OR: [{ mentorId: userId }, { menteeId: userId }],
            },
            include: {
                mentor: {
                    include: {
                        profile: true,
                    },
                },
                mentee: {
                    include: {
                        profile: true,
                    },
                },
            },
        });
        const connections = mentorships.map((ship) => {
            // If the current user is the mentor, the connection is the mentee, and vice versa.
            const otherUser = ship.mentorId === userId ? ship.mentee : ship.mentor;
            return {
                id: otherUser.id,
                email: otherUser.email,
                role: otherUser.role,
                name: otherUser.profile?.name || "User", // Provide a fallback name
                avatarUrl: otherUser.profile?.avatarUrl, // Match the schema field
            };
        });
        // Ensure connections are unique by user ID
        const uniqueConnections = Array.from(new Map(connections.map((item) => [item.id, item])).values());
        res.status(200).json(uniqueConnections);
    }
    catch (error) {
        console.error("Error fetching user connections:", error);
        next(error); // Pass error to the global error handler
    }
};
exports.getUserConnections = getUserConnections;
// --- END OF NEW FUNCTION ---
