"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_cron_1 = __importDefault(require("node-cron"));
const email_service_1 = require("../services/email.service");
const client_1 = __importDefault(require("../client"));
// This cron job runs every hour to check for sessions starting in the next 24 hours.
node_cron_1.default.schedule("0 * * * *", async () => {
    console.log("Running hourly check for session reminders...");
    const now = new Date();
    const reminderWindow = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
    try {
        const upcomingSessions = await client_1.default.session.findMany({
            where: {
                date: {
                    gte: now,
                    lte: reminderWindow,
                },
                // Optional: Add a flag to sessions to prevent sending multiple reminders
                // reminderSent: false,
            },
            include: {
                mentor: true,
                mentee: true, // For 1-on-1 sessions
                participants: {
                    // For group sessions
                    include: {
                        mentee: true,
                    },
                },
            },
        });
        for (const session of upcomingSessions) {
            // --- UPDATE: Handle both 1-on-1 and group session reminders ---
            if (session.isGroupSession) {
                // Handle Group Session ("Mentoring Circle")
                if (session.mentor) {
                    console.log(`Sending group session reminder to mentor ${session.mentor.email}`);
                    await (0, email_service_1.sendReminderEmail)(session.mentor.email, session.date);
                }
                for (const participant of session.participants) {
                    if (participant.mentee) {
                        console.log(`Sending group session reminder to mentee ${participant.mentee.email}`);
                        await (0, email_service_1.sendReminderEmail)(participant.mentee.email, session.date);
                    }
                }
            }
            else {
                // Handle 1-on-1 Session
                if (session.mentor && session.mentee) {
                    console.log(`Sending 1-on-1 session reminder to ${session.mentor.email} and ${session.mentee.email}`);
                    await (0, email_service_1.sendReminderEmail)(session.mentor.email, session.date);
                    await (0, email_service_1.sendReminderEmail)(session.mentee.email, session.date);
                }
            }
            // Optional: Mark session as reminder-sent to avoid duplicates
            // await prisma.session.update({ where: { id: session.id }, data: { reminderSent: true } });
        }
    }
    catch (error) {
        console.error("Error sending session reminders:", error);
    }
});
