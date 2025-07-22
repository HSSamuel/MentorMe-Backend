"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkUpcomingSessions = void 0;
const email_service_1 = require("../services/email.service");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const checkUpcomingSessions = async () => {
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60000);
    const sessions = await prisma.session.findMany({
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
