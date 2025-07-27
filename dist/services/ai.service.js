"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findTopMentorMatches = exports.generateEmbedding = void 0;
const generative_ai_1 = require("@google/generative-ai");
const client_1 = __importDefault(require("../client")); // Your Prisma client instance
// It's best practice to use an environment variable for your API key
const genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY);
/**
 * @param vecA - The first vector.
 * @param vecB - The second vector.
 * @returns The cosine similarity score (from -1 to 1).
 */
const cosineSimilarity = (vecA, vecB) => {
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    if (magnitudeA === 0 || magnitudeB === 0) {
        return 0; // Avoid division by zero
    }
    return dotProduct / (magnitudeA * magnitudeB);
};
/**
 * Generates a vector embedding for a given text using the embedding-001 model.
 * @param {string} text - The input text to be converted into an embedding.
 * @returns {Promise<number[]>} - A promise that resolves to an array of numbers representing the embedding.
 */
const generateEmbedding = async (text) => {
    try {
        const model = genAI.getGenerativeModel({ model: "embedding-001" });
        const result = await model.embedContent(text);
        const embedding = result.embedding;
        return embedding.values;
    }
    catch (error) {
        console.error("Error generating embedding:", error);
        throw new Error("Failed to generate text embedding.");
    }
};
exports.generateEmbedding = generateEmbedding;
/**
 * Finds the top N mentor matches for a user based on profile embedding similarity.
 * @param userId - The ID of the user seeking mentors.
 * @param topN - The number of top matches to return.
 * @returns A list of the top N mentor users, including their profiles.
 */
const findTopMentorMatches = async (userId, topN = 5) => {
    // 1. Get the current user's profile embedding
    const currentUser = await client_1.default.user.findUnique({
        where: { id: userId },
        select: { profileEmbedding: true },
    });
    if (!currentUser ||
        !currentUser.profileEmbedding ||
        currentUser.profileEmbedding.length === 0) {
        throw new Error("Current user's profile embedding is not available.");
    }
    const currentUserVector = currentUser.profileEmbedding;
    // 2. Get all potential mentors
    const mentors = await client_1.default.user.findMany({
        where: {
            id: { not: userId },
            role: "MENTOR", // It's good practice to ensure we only match with mentors
            profileEmbedding: { isEmpty: false },
        },
        // --- THIS IS THE FIX ---
        // We must explicitly include the related profile data for each mentor.
        include: {
            profile: true,
        },
    });
    // 3. Calculate similarity score for each mentor
    const mentorScores = mentors.map((mentor) => {
        const similarity = cosineSimilarity(currentUserVector, mentor.profileEmbedding);
        return { mentor, similarity };
    });
    // 4. Sort mentors by similarity score in descending order
    mentorScores.sort((a, b) => b.similarity - a.similarity);
    // 5. Return the top N mentors
    return mentorScores.slice(0, topN).map((score) => score.mentor);
};
exports.findTopMentorMatches = findTopMentorMatches;
