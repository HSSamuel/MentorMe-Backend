"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const fastembed_1 = require("fastembed");
const prisma = new client_1.PrismaClient();
// This function combines a user's profile data into a single string for embedding
const createEmbeddingText = (profile, user) => {
    const skills = profile.skills.join(", ");
    return `Role: ${user.role}. Skills: ${skills}. Bio: ${profile.bio}. Goals: ${profile.goals}`;
};
const generateEmbeddings = async () => {
    console.log("Initializing embedding model...");
    const embeddingModel = await fastembed_1.FlagEmbedding.init();
    console.log("Model initialized. Starting embedding generation...");
    const usersWithProfiles = await prisma.user.findMany({
        where: {
            profile: {
                isNot: null,
            },
        },
        include: {
            profile: true,
        },
    });
    for (const user of usersWithProfiles) {
        if (user.profile) {
            const textToEmbed = createEmbeddingText(user.profile, user);
            // --- THIS IS THE FIX ---
            // 1. Pass the text as an array of strings.
            // 2. The result is a generator, so we iterate over it to get the embeddings.
            const embeddingGenerator = embeddingModel.embed([textToEmbed]);
            // Get the first (and only) batch from the generator
            const result = await embeddingGenerator.next();
            if (!result.done) {
                // The batch itself is an array of embeddings. Get the first one.
                const embedding = result.value[0];
                await prisma.profile.update({
                    where: { id: user.profile.id },
                    // The embedding is already a Float32Array, which can be saved directly.
                    data: { vector: Array.from(embedding) },
                });
                console.log(`Generated and saved embedding for ${user.email}`);
            }
            // --------------------
        }
    }
    console.log("Embedding generation complete.");
};
generateEmbeddings()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
