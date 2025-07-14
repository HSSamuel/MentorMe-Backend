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
exports.updateRequestStatus = exports.getReceivedRequests = exports.getSentRequests = exports.createRequest = void 0;
const client_1 = require("@prisma/client");
const gamification_service_1 = require("../services/gamification.service");
const prisma = new client_1.PrismaClient();
const getUserIdForRequest = (req) => {
    if (!req.user)
        return null;
    if ("userId" in req.user)
        return req.user.userId;
    if ("id" in req.user)
        return req.user.id;
    return null;
};
const createRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { mentorId } = req.body;
    const menteeId = getUserIdForRequest(req);
    if (!menteeId) {
        res.status(401).json({ message: "Authentication error" });
        return;
    }
    if (!mentorId) {
        res.status(400).json({ message: "Mentor ID is required" });
        return;
    }
    try {
        // --- FIX: Check for an existing request ---
        const existingRequest = yield prisma.mentorshipRequest.findFirst({
            where: {
                menteeId,
                mentorId,
            },
        });
        if (existingRequest) {
            res
                .status(409) // 409 Conflict
                .json({ message: "You have already sent a request to this mentor." });
            return;
        }
        const newRequest = yield prisma.mentorshipRequest.create({
            data: { menteeId, mentorId, status: "PENDING" },
            include: { mentee: { include: { profile: true } } },
        });
        // --- Create Notification for Mentor ---
        yield prisma.notification.create({
            data: {
                userId: mentorId,
                type: "NEW_MENTORSHIP_REQUEST",
                message: `You have a new mentorship request from ${((_a = newRequest.mentee.profile) === null || _a === void 0 ? void 0 : _a.name) || "a new mentee"}.`,
                link: `/requests`,
            },
        });
        res.status(201).json(newRequest);
    }
    catch (error) {
        res.status(500).json({ message: "Server error while creating request" });
    }
});
exports.createRequest = createRequest;
const getSentRequests = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const menteeId = getUserIdForRequest(req);
    if (!menteeId) {
        res.status(401).json({ message: "Authentication error" });
        return;
    }
    try {
        const requests = yield prisma.mentorshipRequest.findMany({
            where: { menteeId },
            include: { mentor: { select: { id: true, profile: true } } }, // included mentorId
            orderBy: { createdAt: "desc" },
        });
        res.status(200).json(requests);
    }
    catch (error) {
        res.status(500).json({ message: "Server error fetching sent requests" });
    }
});
exports.getSentRequests = getSentRequests;
const getReceivedRequests = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const mentorId = getUserIdForRequest(req);
    if (!mentorId) {
        res.status(401).json({ message: "Authentication error" });
        return;
    }
    try {
        const requests = yield prisma.mentorshipRequest.findMany({
            where: { mentorId },
            include: { mentee: { select: { profile: true } } },
            orderBy: { createdAt: "desc" },
        });
        res.status(200).json(requests);
    }
    catch (error) {
        res
            .status(500)
            .json({ message: "Server error fetching received requests" });
    }
});
exports.getReceivedRequests = getReceivedRequests;
const updateRequestStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { id } = req.params;
    const { status } = req.body;
    const mentorId = getUserIdForRequest(req);
    if (!mentorId) {
        res.status(401).json({ message: "Authentication error" });
        return;
    }
    if (!["ACCEPTED", "REJECTED"].includes(status)) {
        res.status(400).json({ message: "Invalid status" });
        return;
    }
    try {
        const request = yield prisma.mentorshipRequest.findUnique({
            where: { id },
            include: { mentor: { include: { profile: true } } },
        });
        if (!request || request.mentorId !== mentorId) {
            res.status(404).json({ message: "Request not found or access denied" });
            return;
        }
        const updatedRequest = yield prisma.mentorshipRequest.update({
            where: { id },
            data: { status: status },
        });
        // If the request was accepted, create a conversation and award points
        if (status === "ACCEPTED") {
            yield prisma.conversation.create({
                data: {
                    participantIDs: [request.mentorId, request.menteeId],
                },
            });
            // --- Award points for accepting a mentorship ---
            yield (0, gamification_service_1.awardPoints)(request.mentorId, 25); // Mentor gets 25 points
            yield (0, gamification_service_1.awardPoints)(request.menteeId, 10); // Mentee gets 10 points
            // --- Create Notification for Mentee ---
            yield prisma.notification.create({
                data: {
                    userId: request.menteeId,
                    type: "MENTORSHIP_REQUEST_ACCEPTED",
                    message: `Your request with ${(_a = request.mentor.profile) === null || _a === void 0 ? void 0 : _a.name} has been accepted!`,
                    link: "/my-mentors",
                },
            });
        }
        else if (status === "REJECTED") {
            // --- Create Notification for Mentee ---
            yield prisma.notification.create({
                data: {
                    userId: request.menteeId,
                    type: "MENTORSHIP_REQUEST_REJECTED",
                    message: `Your request with ${(_b = request.mentor.profile) === null || _b === void 0 ? void 0 : _b.name} was declined.`,
                    link: "/my-requests",
                },
            });
        }
        res.status(200).json(updatedRequest);
    }
    catch (error) {
        console.error("Error updating request status:", error);
        res.status(500).json({ message: "Server error while updating request" });
    }
});
exports.updateRequestStatus = updateRequestStatus;
