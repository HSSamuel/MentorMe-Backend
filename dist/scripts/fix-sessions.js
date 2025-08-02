"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log("Finding sessions with missing createdAt date...");
    // Use a raw query to find documents where the 'createdAt' field does not exist
    const rawData = await prisma.session.findRaw({
        filter: {
            createdAt: { $exists: false },
        },
    });
    if (!Array.isArray(rawData)) {
        console.error("Error: Expected an array of sessions but received something else.");
        return;
    }
    const sessionsToUpdate = rawData;
    if (sessionsToUpdate.length === 0) {
        console.log("✅ No sessions needed updating. Your data is clean!");
        return;
    }
    console.log(`Found ${sessionsToUpdate.length} session(s) to update.`);
    for (const session of sessionsToUpdate) {
        // The ID from a raw query is an object, so we get the string via ._id.$oid
        const sessionId = session._id.$oid;
        await prisma.session.update({
            where: { id: sessionId },
            data: {
                // Use the session's scheduled date as a sensible default
                createdAt: new Date(session.date.$date),
            },
        });
        console.log(`Updated session ${sessionId}`);
    }
    console.log("✅ Successfully fixed all old session records.");
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
