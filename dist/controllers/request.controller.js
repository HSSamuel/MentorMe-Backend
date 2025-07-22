"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateRequestStatus = exports.getReceivedRequests = exports.getSentRequests = exports.createRequest = exports.getRequestStatusWithMentor = void 0;
const gamification_service_1 = require("../services/gamification.service");
const client_1 = __importDefault(require("../client"));
const stream_chat_1 = require("stream-chat");
// --- [FIX 3] Initialize the Stream Chat server client ---
// Ensure your .env file has STREAM_API_KEY and STREAM_API_SECRET
const streamClient = stream_chat_1.StreamChat.getInstance(process.env.STREAM_API_KEY, process.env.STREAM_API_SECRET);
const getUserIdForRequest = (req) => {
    if (!req.user)
        return null;
    if ("userId" in req.user)
        return req.user.userId;
    if ("id" in req.user)
        return req.user.id;
    return null;
};
const getRequestStatusWithMentor = async (req, res) => {
    const menteeId = getUserIdForRequest(req);
    const { mentorId } = req.params;
    if (!menteeId) {
        res.status(401).json({ message: "Authentication error" });
        return;
    }
    try {
        const request = await client_1.default.mentorshipRequest.findFirst({
            where: {
                menteeId,
                mentorId,
            },
            select: {
                status: true,
            },
        });
        if (request) {
            res.status(200).json({ status: request.status });
        }
        else {
            res.status(200).json({ status: null });
        }
    }
    catch (error) {
        console.error("Error fetching request status:", error);
        res.status(500).json({ message: "Server error checking request status" });
    }
};
exports.getRequestStatusWithMentor = getRequestStatusWithMentor;
const createRequest = async (req, res) => {
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
        const existingRequest = await client_1.default.mentorshipRequest.findFirst({
            where: {
                menteeId,
                mentorId,
            },
        });
        if (existingRequest) {
            res
                .status(409)
                .json({ message: "You have already sent a request to this mentor." });
            return;
        }
        const newRequest = await client_1.default.mentorshipRequest.create({
            data: { menteeId, mentorId, status: "PENDING" },
            include: { mentee: { include: { profile: true } } },
        });
        await client_1.default.notification.create({
            data: {
                userId: mentorId,
                type: "NEW_MENTORSHIP_REQUEST",
                message: `You have a new mentorship request from ${newRequest.mentee.profile?.name || "a new mentee"}.`,
                link: `/requests`,
            },
        });
        res.status(201).json(newRequest);
    }
    catch (error) {
        res.status(500).json({ message: "Server error while creating request" });
    }
};
exports.createRequest = createRequest;
const getSentRequests = async (req, res) => {
    const menteeId = getUserIdForRequest(req);
    if (!menteeId) {
        res.status(401).json({ message: "Authentication error" });
        return;
    }
    try {
        const requests = await client_1.default.mentorshipRequest.findMany({
            where: { menteeId },
            include: {
                mentor: {
                    include: {
                        profile: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });
        res.status(200).json(requests);
    }
    catch (error) {
        res.status(500).json({ message: "Server error fetching sent requests" });
    }
};
exports.getSentRequests = getSentRequests;
const getReceivedRequests = async (req, res) => {
    const mentorId = getUserIdForRequest(req);
    if (!mentorId) {
        res.status(401).json({ message: "Authentication error" });
        return;
    }
    try {
        const requests = await client_1.default.mentorshipRequest.findMany({
            where: { mentorId },
            include: {
                mentee: {
                    include: {
                        profile: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });
        res.status(200).json(requests);
    }
    catch (error) {
        res
            .status(500)
            .json({ message: "Server error fetching received requests" });
    }
};
exports.getReceivedRequests = getReceivedRequests;
const updateRequestStatus = async (req, res) => {
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
        const request = await client_1.default.mentorshipRequest.findUnique({
            where: { id },
            include: {
                mentor: { include: { profile: true } },
                mentee: { include: { profile: true } },
            },
        });
        if (!request || request.mentorId !== mentorId) {
            res.status(404).json({ message: "Request not found or access denied" });
            return;
        }
        const updatedRequest = await client_1.default.mentorshipRequest.update({
            where: { id },
            data: { status: status },
        });
        if (status === "ACCEPTED") {
            try {
                const channelId = `mentorship-${request.mentorId}-${request.menteeId}`;
                // --- [FIX] Create the data object first to bypass TypeScript's strict literal check ---
                const channelData = {
                    name: `Mentorship: ${request.mentor.profile?.name} & ${request.mentee.profile?.name}`,
                    created_by_id: mentorId,
                    members: [request.mentorId, request.menteeId],
                };
                const channel = streamClient.channel("messaging", channelId, channelData);
                await channel.create();
                console.log(`Stream channel created: ${channelId}`);
            }
            catch (chatError) {
                console.error("Error creating Stream chat channel:", chatError);
            }
            await client_1.default.conversation.create({
                data: {
                    participants: {
                        connect: [{ id: request.mentorId }, { id: request.menteeId }],
                    },
                },
            });
            await (0, gamification_service_1.awardPoints)(request.mentorId, 25);
            await (0, gamification_service_1.awardPoints)(request.menteeId, 10);
            await client_1.default.notification.create({
                data: {
                    userId: request.menteeId,
                    type: "MENTORSHIP_REQUEST_ACCEPTED",
                    message: `Your request with ${request.mentor.profile?.name} has been accepted!`,
                    link: "/my-mentors",
                },
            });
        }
        else if (status === "REJECTED") {
            await client_1.default.notification.create({
                data: {
                    userId: request.menteeId,
                    type: "MENTORSHIP_REQUEST_REJECTED",
                    message: `Your request with ${request.mentor.profile?.name} was declined.`,
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
};
exports.updateRequestStatus = updateRequestStatus;
