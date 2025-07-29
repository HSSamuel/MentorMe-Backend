// In Mentor/Backend/cleanup.ts
import dotenv from "dotenv";
dotenv.config(); // This line loads the .env file

import prisma from "./src/client";

console.log(
  `[CLEANUP] Attempting to connect to DB at: ${process.env.MONGODB_URI}`
);

async function cleanupOrphanedSessions() {
  console.log("--- Starting Final Cleanup ---");
  try {
    // Find and log the invalid documents
    console.log("Searching for sessions with null mentorId or menteeId...");
    const invalidSessions = await prisma.session.findMany({
      where: {
        OR: [{ menteeId: null }, { mentorId: null }],
      },
    });

    if (invalidSessions.length === 0) {
      console.log("✅ No invalid sessions found.");
    } else {
      console.log(
        `🚨 Found ${invalidSessions.length} invalid session(s). Deleting them now...`
      );
      const result = await prisma.session.deleteMany({
        where: {
          OR: [{ menteeId: null }, { mentorId: null }],
        },
      });
      console.log(
        `✅ Cleanup complete. Successfully deleted ${result.count} orphaned session(s).`
      );
    }
  } catch (error) {
    console.error("❌ Error during cleanup:", error);
  } finally {
    await prisma.$disconnect();
    console.log("--- Final Cleanup Finished ---");
  }
}

cleanupOrphanedSessions();
