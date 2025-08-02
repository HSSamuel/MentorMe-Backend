"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const fixMissingUpdatedAt = async () => {
    console.log("Searching for mentorship requests with missing 'updatedAt' fields...");
    // This query will now work because the schema is temporarily relaxed.
    const requestsToFix = await prisma.mentorshipRequest.findMany({
        where: {
            updatedAt: null,
        },
    });
    if (requestsToFix.length === 0) {
        console.log("No records need fixing. Your database is up to date.");
        return;
    }
    console.log(`Found ${requestsToFix.length} records to update.`);
    for (const request of requestsToFix) {
        await prisma.mentorshipRequest.update({
            where: { id: request.id },
            // Set 'updatedAt' to the 'createdAt' value as a safe default.
            data: { updatedAt: request.createdAt },
        });
        console.log(`Fixed record with ID: ${request.id}`);
    }
    console.log("Database cleanup complete.");
};
fixMissingUpdatedAt()
    .catch((e) => {
    console.error("An error occurred during the database cleanup:", e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
