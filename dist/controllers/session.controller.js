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
exports.submitFeedback = exports.getMenteeSessions = exports.getMentorSessions = exports.createSession = exports.setAvailability = exports.getMentorAvailability = exports.getAvailability = void 0;
const client_1 = require("@prisma/client");
const calendar_service_1 = require("../services/calendar.service");
const getUserId_1 = require("../utils/getUserId");
const gamification_service_1 = require("../services/gamification.service");
const prisma = new client_1.PrismaClient();
const getUserRole = (req) => {
    if (!req.user)
        return null;
    return req.user.role;
};
// NEW: Get the logged-in mentor's own availability
const getAvailability = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const mentorId = (0, getUserId_1.getUserId)(req);
    if (!mentorId) {
        res.status(401).json({ message: "Authentication error" });
        return;
    }
    try {
        const availability = yield prisma.availability.findMany({
            where: { mentorId },
        });
        res.status(200).json(availability);
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching availability." });
    }
});
exports.getAvailability = getAvailability;
// NEW: Get a specific mentor's availability and generate slots for the next 4 weeks
const getMentorAvailability = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { mentorId } = req.params;
    try {
        const weeklyAvailability = yield prisma.availability.findMany({
            where: { mentorId },
        });
        const bookedSessions = yield prisma.session.findMany({
            where: {
                mentorId,
                date: { gte: new Date() },
            },
            select: { date: true },
        });
        const bookedSlots = new Set(bookedSessions.map((s) => s.date.toISOString()));
        const dayMap = {
            Sunday: 0,
            Monday: 1,
            Tuesday: 2,
            Wednesday: 3,
            Thursday: 4,
            Friday: 5,
            Saturday: 6,
        };
        const availableSlots = [];
        const today = new Date();
        for (let i = 0; i < 28; i++) {
            // Generate slots for the next 4 weeks
            const currentDate = new Date(today);
            currentDate.setDate(today.getDate() + i);
            const dayOfWeek = currentDate.getDay();
            for (const slot of weeklyAvailability) {
                if (dayMap[slot.day] === dayOfWeek) {
                    const [startHour, startMinute] = slot.startTime
                        .split(":")
                        .map(Number);
                    const [endHour, endMinute] = slot.endTime.split(":").map(Number);
                    let currentHour = startHour;
                    let currentMinute = startMinute;
                    while (currentHour < endHour ||
                        (currentHour === endHour && currentMinute < endMinute)) {
                        const slotTime = new Date(currentDate);
                        slotTime.setHours(currentHour, currentMinute, 0, 0);
                        if (!bookedSlots.has(slotTime.toISOString())) {
                            availableSlots.push({
                                id: `${mentorId}-${slotTime.toISOString()}`,
                                time: slotTime.toISOString(),
                            });
                        }
                        // Assuming 1-hour slots, adjust if necessary
                        currentHour += 1;
                    }
                }
            }
        }
        res.status(200).json(availableSlots);
    }
    catch (error) {
        console.error("Error fetching mentor availability slots:", error);
        res.status(500).json({ message: "Error fetching availability slots." });
    }
});
exports.getMentorAvailability = getMentorAvailability;
const setAvailability = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const mentorId = (0, getUserId_1.getUserId)(req);
    const io = req.app.locals.io;
    if (!mentorId) {
        res.status(401).json({ message: "Authentication error" });
        return;
    }
    const { availability } = req.body;
    try {
        yield prisma.availability.deleteMany({ where: { mentorId } });
        const availabilityData = availability.map((slot) => ({
            mentorId,
            day: slot.day,
            startTime: slot.startTime,
            endTime: slot.endTime,
        }));
        if (availabilityData.length > 0) {
            yield prisma.availability.createMany({ data: availabilityData });
        }
        io.emit("availabilityUpdated", { mentorId });
        res.status(200).json({ message: "Availability updated successfully." });
    }
    catch (error) {
        console.error("Error setting availability:", error);
        res.status(500).json({ message: "Error setting availability." });
    }
});
exports.setAvailability = setAvailability;
const createSession = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const menteeId = (0, getUserId_1.getUserId)(req);
    if (!menteeId) {
        res.status(401).json({ message: "Authentication error" });
        return;
    }
    const { mentorId, sessionTime } = req.body;
    try {
        const match = yield prisma.mentorshipRequest.findFirst({
            where: { menteeId, mentorId, status: "ACCEPTED" },
        });
        if (!match) {
            res
                .status(403)
                .json({ message: "You are not matched with this mentor." });
            return;
        }
        const newSession = yield prisma.session.create({
            data: { menteeId, mentorId, date: new Date(sessionTime) },
        });
        const mentee = yield prisma.user.findUnique({
            where: { id: menteeId },
            include: { profile: true },
        });
        yield prisma.notification.create({
            data: {
                userId: mentorId,
                type: "SESSION_BOOKED",
                message: `${((_a = mentee === null || mentee === void 0 ? void 0 : mentee.profile) === null || _a === void 0 ? void 0 : _a.name) || "A mentee"} has booked a session with you.`,
                link: "/my-sessions",
            },
        });
        try {
            const mentor = yield prisma.user.findUnique({ where: { id: mentorId } });
            if (mentor && mentee) {
                const eventDetails = {
                    summary: `Mentorship Session: ${mentor.email} & ${mentee.email}`,
                    description: "Your mentorship session booked via the MentorMe Platform.",
                    start: new Date(sessionTime),
                    end: new Date(new Date(sessionTime).getTime() + 60 * 60 * 1000),
                    attendees: [mentor.email, mentee.email],
                };
                if (mentor.googleRefreshToken)
                    yield (0, calendar_service_1.createCalendarEvent)(mentor.id, eventDetails);
                if (mentee.googleRefreshToken)
                    yield (0, calendar_service_1.createCalendarEvent)(mentee.id, eventDetails);
            }
        }
        catch (calendarError) {
            console.error("Could not create calendar event:", calendarError);
        }
        res.status(201).json(newSession);
    }
    catch (error) {
        res.status(500).json({ message: "Error booking session." });
    }
});
exports.createSession = createSession;
const getMentorSessions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const mentorId = (0, getUserId_1.getUserId)(req);
    if (!mentorId) {
        res.status(401).json({ message: "Authentication error" });
        return;
    }
    try {
        const sessions = yield prisma.session.findMany({
            where: { mentorId },
            include: { mentee: { include: { profile: true } } },
            orderBy: { date: "asc" },
        });
        res.status(200).json(sessions);
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching sessions." });
    }
});
exports.getMentorSessions = getMentorSessions;
const getMenteeSessions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const menteeId = (0, getUserId_1.getUserId)(req);
    if (!menteeId) {
        res.status(401).json({ message: "Authentication error" });
        return;
    }
    try {
        const sessions = yield prisma.session.findMany({
            where: { menteeId },
            include: { mentor: { include: { profile: true } } },
            orderBy: { date: "asc" },
        });
        res.status(200).json(sessions);
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching sessions." });
    }
});
exports.getMenteeSessions = getMenteeSessions;
const submitFeedback = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { rating, comment } = req.body;
    const userId = (0, getUserId_1.getUserId)(req);
    const role = getUserRole(req);
    if (!userId || !role) {
        res.status(401).json({ message: "Authentication error" });
        return;
    }
    try {
        const session = yield prisma.session.findUnique({ where: { id } });
        if (!session ||
            (session.mentorId !== userId && session.menteeId !== userId)) {
            res
                .status(403)
                .json({ message: "You did not participate in this session." });
            return;
        }
        const dataToUpdate = {};
        if (role === "MENTEE")
            dataToUpdate.rating = rating;
        if (comment)
            dataToUpdate.feedback = comment;
        const updatedSession = yield prisma.session.update({
            where: { id },
            data: dataToUpdate,
        });
        // Award points for submitting feedback
        yield (0, gamification_service_1.awardPoints)(userId, 15);
        res.status(200).json(updatedSession);
    }
    catch (error) {
        res.status(500).json({ message: "Error submitting feedback." });
    }
});
exports.submitFeedback = submitFeedback;
