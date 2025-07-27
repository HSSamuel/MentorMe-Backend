"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkUpcomingSessions = void 0;
const email_service_1 = require("../services/email.service");
const client_1 = __importDefault(require("../client"));
const checkUpcomingSessions = async () => {
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60000);
    const sessions = await client_1.default.session.findMany({
        where: {
            date: {
                gte: now,
                lte: oneHourLater,
            },
        },
        include: { mentor: true, mentee: true },
    });
    for (const session of sessions) {
        await (0, email_service_1.sendReminderEmail)(session.mentor.email, session.date);
        await (0, email_service_1.sendReminderEmail)(session.mentee.email, session.date);
    }
};
exports.checkUpcomingSessions = checkUpcomingSessions;
setInterval(exports.checkUpcomingSessions, 5 * 60 * 1000);
