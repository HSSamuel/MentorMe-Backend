"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log("Finding mentorship requests with missing createdAt date...");
    // Use a raw query to find documents where the 'createdAt' field does not exist
    const rawData = await prisma.mentorshipRequest.findRaw({
        filter: {
            createdAt: { $exists: false },
        },
    });
    if (!Array.isArray(rawData)) {
        console.error("Error: Expected an array of requests but received something else.");
        return;
    }
    const requestsToUpdate = rawData;
    if (requestsToUpdate.length === 0) {
        console.log("✅ No mentorship requests needed updating. Your data is clean!");
        return;
    }
    console.log(`Found ${requestsToUpdate.length} request(s) to update.`);
    for (const request of requestsToUpdate) {
        // The ID from a raw query is an object, so we get the string via ._id.$oid
        const requestId = request._id.$oid;
        await prisma.mentorshipRequest.update({
            where: { id: requestId },
            data: {
                // Set a default date (the current time)
                createdAt: new Date(),
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
