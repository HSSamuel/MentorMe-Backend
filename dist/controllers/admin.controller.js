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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStats = exports.assignMentor = exports.getAllSessions = exports.updateUserRole = exports.getAllUsers = exports.getAllMatches = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// GET /admin/matches
const getAllMatches = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Corrected: Removed the invalid 'where' clause to fix the compilation error.
        const matches = yield prisma.mentorshipRequest.findMany({
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
});
exports.getAllMatches = getAllMatches;
// GET /admin/users
const getAllUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const users = yield prisma.user.findMany({
            include: { profile: true },
        });
        res.status(200).json(users);
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching users." });
    }
});
exports.getAllUsers = getAllUsers;
// PUT /admin/users/:id/role
const updateUserRole = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { role } = req.body;
    try {
        const updatedUser = yield prisma.user.update({
            where: { id },
            data: { role: role },
        });
        const { password } = updatedUser, userWithoutPassword = __rest(updatedUser, ["password"]);
        res.status(200).json(userWithoutPassword);
    }
    catch (error) {
        res.status(500).json({ message: "Error updating user role." });
    }
});
exports.updateUserRole = updateUserRole;
// GET /admin/sessions
const getAllSessions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const sessions = yield prisma.session.findMany({
            include: {
                mentor: { select: { profile: true } },
                mentee: { select: { profile: true } },
            },
            orderBy: { date: "desc" },
        });
        const totalCount = yield prisma.session.count();
        res.status(200).json({ totalCount, sessions });
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching sessions." });
    }
});
exports.getAllSessions = getAllSessions;
// POST /admin/assign
const assignMentor = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { menteeId, mentorId } = req.body;
    if (!menteeId || !mentorId) {
        res.status(400).json({ message: "Mentee ID and Mentor ID are required" });
        return;
    }
    try {
        const newRequest = yield prisma.mentorshipRequest.create({
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
});
exports.assignMentor = assignMentor;
// GET /admin/stats
const getStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const totalUsers = yield prisma.user.count();
        const totalMentors = yield prisma.user.count({ where: { role: 'MENTOR' } });
        const totalMentees = yield prisma.user.count({ where: { role: 'MENTEE' } });
        const totalMatches = yield prisma.mentorshipRequest.count({
            where: { status: "ACCEPTED" },
        });
        const totalSessions = yield prisma.session.count();
        const pendingRequests = yield prisma.mentorshipRequest.count({
            where: { status: "PENDING" },
        });
        res.status(200).json({ totalUsers, totalMentors, totalMentees, totalMatches, totalSessions, pendingRequests });
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching admin stats." });
    }
});
exports.getStats = getStats;
