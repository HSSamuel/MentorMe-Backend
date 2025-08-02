"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
console.log(`[CLEANUP] Connecting to DB: ${process.env.MONGODB_URI}`);
const prisma = new client_1.PrismaClient();
async function findAndRemoveOrphanedParticipants() {
    console.log("--- Searching for orphaned SessionParticipant records ---");
    try {
        const participants = await prisma.sessionParticipant.findMany({
            include: {
                session: true,
            },
        });
        const orphanedParticipants = participants.filter((p) => !p.session);
        if (orphanedParticipants.length === 0) {
            console.log("✅ No orphaned participants found. Your data is clean.");
            return;
        }
        console.log(`🚨 Found ${orphanedParticipants.length} orphaned participant(s).`);
        console.log(orphanedParticipants.map((p) => ({
            id: p.id,
            sessionId: p.sessionId,
            menteeId: p.menteeId,
        })));
        const orphanedIds = orphanedParticipants.map((p) => p.id);
        const deleteResult = await prisma.sessionParticipant.deleteMany({
            where: {
                id: {
                    in: orphanedIds,
                },
            },
        });
        console.log(`✅ Successfully deleted ${deleteResult.count} orphaned participant record(s).`);
    }
    catch (error) {
        console.error("❌ An error occurred during cleanup:", error);
    }
    finally {
        await prisma.$disconnect();
        console.log("--- Cleanup script finished ---");
    }
}
findAndRemoveOrphanedParticipants();
