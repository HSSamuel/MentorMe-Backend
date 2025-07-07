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
exports.checkUpcomingSessions = void 0;
const email_service_1 = require("../services/email.service");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const checkUpcomingSessions = () => __awaiter(void 0, void 0, void 0, function* () {
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60000);
    const sessions = yield prisma.session.findMany({
        where: {
            date: {
                gte: now,
                lte: oneHourLater,
            },
        },
        include: { mentor: true, mentee: true },
    });
    for (const session of sessions) {
        yield (0, email_service_1.sendReminderEmail)(session.mentor.email, session.date);
        yield (0, email_service_1.sendReminderEmail)(session.mentee.email, session.date);
    }
});
exports.checkUpcomingSessions = checkUpcomingSessions;
setInterval(exports.checkUpcomingSessions, 5 * 60 * 1000);
