"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log("Finding mentorship requests with a missing message...");
    // --- [THE FIX] ---
    // We receive the data as 'any' first, then check if it's an array.
    const rawData = await prisma.mentorshipRequest.findRaw({
        filter: {
            message: { $exists: false },
        },
    });
    if (!Array.isArray(rawData)) {
        console.error("Error: Expected an array of requests but received something else.");
        return;
    }
    const requestsToUpdate = rawData;
    if (requestsToUpdate.length === 0) {
        console.log("✅ No requests needed updating. Your data is clean!");
        return;
    }
    console.log(`Found ${requestsToUpdate.length} request(s) to update.`);
    for (const request of requestsToUpdate) {
        const requestId = request._id.$oid;
        await prisma.mentorshipRequest.update({
            where: { id: requestId },
            data: {
                message: "No message was provided for this legacy request.", // Set a default message
            },
        });
        console.log(`Updated request ${requestId}`);
    }
    console.log("✅ Successfully fixed all old mentorship request records.");
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
