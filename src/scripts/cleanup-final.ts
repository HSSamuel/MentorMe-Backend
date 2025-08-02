import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
dotenv.config();

console.log(`[FINAL CLEANUP] Connecting to DB: ${process.env.MONGODB_URI}`);
const prisma = new PrismaClient();

async function findAndRemoveOrphanedParticipants() {
  console.log(
    "--- Starting final cleanup of orphaned SessionParticipant records ---"
  );
  try {
    // Step 1: Get all session participants WITHOUT including the session
    const allParticipants = await prisma.sessionParticipant.findMany({
      select: {
        id: true,
        sessionId: true,
      },
    });

    if (allParticipants.length === 0) {
      console.log("✅ No SessionParticipant records found. Nothing to do.");
      return;
    }

    // Step 2: Get all valid session IDs that actually exist
    const allSessions = await prisma.session.findMany({
      select: {
        id: true,
      },
    });
    const validSessionIds = new Set(allSessions.map((s) => s.id));
    console.log(
      `Found ${allParticipants.length} participant records and ${validSessionIds.size} valid sessions.`
    );

    // Step 3: Find the participants whose sessionId is NOT in the set of valid session IDs
    const orphanedParticipantIds = allParticipants
      .filter((p) => !validSessionIds.has(p.sessionId))
      .map((p) => p.id);

    if (orphanedParticipantIds.length === 0) {
      console.log("✅ No orphaned participants found. Your data is clean.");
      return;
    }

    console.log(
      `🚨 Found ${orphanedParticipantIds.length} orphaned participant(s) to delete.`
    );
    console.log("Orphaned IDs:", orphanedParticipantIds);

    // Step 4: Delete the orphaned participants by their own IDs
    const deleteResult = await prisma.sessionParticipant.deleteMany({
      where: {
        id: {
          in: orphanedParticipantIds,
        },
      },
    });

    console.log(
      `✅ Successfully deleted ${deleteResult.count} orphaned participant record(s).`
    );
  } catch (error) {
    console.error("❌ An error occurred during the final cleanup:", error);
  } finally {
    await prisma.$disconnect();
    console.log("--- Final cleanup script finished ---");
  }
}

findAndRemoveOrphanedParticipants();
