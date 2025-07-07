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
exports.getMenteeStats = exports.getMentorStats = exports.updateMyProfile = exports.getAvailableSkills = exports.getAllMentors = exports.getMentorPublicProfile = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Corrected helper function with a type assertion to resolve the error.
const getUserIdFromRequest = (req) => {
    // We use a type assertion here to tell TypeScript the exact shape of our user object.
    if (req.user && "userId" in req.user) {
        return req.user.userId;
    }
    return null;
};
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
// GET all mentors
const getAllMentors = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const mentors = yield prisma.user.findMany({
            where: { role: "MENTOR" },
            select: {
                id: true,
                email: true,
                profile: true,
            },
        });
        res.status(200).json(mentors);
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
// PUT (update or create) the user's own profile, including avatar
const updateMyProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
        res.status(401).json({ message: "Authentication error" });
        return;
    }
    const { name, bio, skills, goals } = req.body;
    let avatarUrl = undefined;
    if (req.file) {
        avatarUrl = `/uploads/${req.file.filename}`;
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
        res.status(200).json(profile);
    }
    catch (error) {
        console.error("Error updating profile:", error);
        res.status(500).json({ message: "Error updating profile" });
    }
});
exports.updateMyProfile = updateMyProfile;
// GET statistics for a mentor
const getMentorStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
        res.status(401).json({ message: "Authentication error" });
        return;
    }
    try {
        const menteeCount = yield prisma.mentorshipRequest.count({
            where: { mentorId: userId, status: "ACCEPTED" },
        });
        const pendingRequests = yield prisma.mentorshipRequest.count({
            where: { mentorId: userId, status: "PENDING" },
        });
        const upcomingSessions = yield prisma.session.count({
            where: { mentorId: userId, date: { gte: new Date() } },
        });
        res.status(200).json({ menteeCount, pendingRequests, upcomingSessions });
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching mentor stats." });
    }
});
exports.getMentorStats = getMentorStats;
// GET statistics for a mentee
const getMenteeStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
        res.status(401).json({ message: "Authentication error" });
        return;
    }
    try {
        const mentorCount = yield prisma.mentorshipRequest.count({
            where: { menteeId: userId, status: "ACCEPTED" },
        });
        const pendingRequests = yield prisma.mentorshipRequest.count({
            where: { menteeId: userId, status: "PENDING" },
        });
        const upcomingSessions = yield prisma.session.count({
            where: { menteeId: userId, date: { gte: new Date() } },
        });
        res.status(200).json({ mentorCount, pendingRequests, upcomingSessions });
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching mentee stats." });
    }
});
exports.getMenteeStats = getMenteeStats;
