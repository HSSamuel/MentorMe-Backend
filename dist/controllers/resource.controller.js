"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecommendedResources = exports.deleteResource = exports.updateResource = exports.getAllResources = exports.createResource = void 0;
const client_1 = __importDefault(require("../client"));
const getUserId_1 = require("../utils/getUserId");
const ai_service_1 = require("../services/ai.service");
const cosineSimilarity_1 = require("../utils/cosineSimilarity");
// --- For Admins: Create a new resource ---
const createResource = async (req, res) => {
    const { title, description, link, type, tags, imageUrl } = req.body;
    if (!title || !description || !link || !type) {
        return res.status(400).json({ message: "Missing required fields." });
    }
    try {
        // Generate AI embedding for recommendation matching
        const embeddingText = `${title} ${description} ${tags.join(" ")}`;
        const embedding = await (0, ai_service_1.generateEmbedding)(embeddingText);
        const newResource = await client_1.default.resource.create({
            data: {
                title,
                description,
                link,
                type,
                tags: tags || [],
                imageUrl,
                embedding,
            },
        });
        res.status(201).json(newResource);
    }
    catch (error) {
        console.error("Error creating resource:", error);
        res.status(500).json({ message: "Failed to create resource." });
    }
};
exports.createResource = createResource;
// --- For All Users: Get all resources ---
const getAllResources = async (req, res) => {
    try {
        const resources = await client_1.default.resource.findMany({
            orderBy: {
                createdAt: "desc",
            },
        });
        res.status(200).json(resources);
    }
    catch (error) {
        console.error("Error fetching resources:", error);
        res.status(500).json({ message: "Failed to fetch resources." });
    }
};
exports.getAllResources = getAllResources;
// --- For Admins: Update a resource ---
const updateResource = async (req, res) => {
    const { id } = req.params;
    const { title, description, link, type, tags, imageUrl } = req.body;
    try {
        const dataToUpdate = {
            title,
            description,
            link,
            type,
            tags,
            imageUrl,
        };
        // If core text fields change, regenerate the embedding
        if (title || description || tags) {
            const currentResource = await client_1.default.resource.findUnique({
                where: { id },
            });
            const embeddingText = `${title || currentResource?.title} ${description || currentResource?.description} ${(tags || currentResource?.tags).join(" ")}`;
            dataToUpdate.embedding = await (0, ai_service_1.generateEmbedding)(embeddingText);
        }
        const updatedResource = await client_1.default.resource.update({
            where: { id },
            data: dataToUpdate,
        });
        res.status(200).json(updatedResource);
    }
    catch (error) {
        console.error("Error updating resource:", error);
        res.status(500).json({ message: "Failed to update resource." });
    }
};
exports.updateResource = updateResource;
// --- For Admins: Delete a resource ---
const deleteResource = async (req, res) => {
    const { id } = req.params;
    try {
        await client_1.default.resource.delete({
            where: { id },
        });
        res.status(204).send();
    }
    catch (error) {
        console.error("Error deleting resource:", error);
        res.status(500).json({ message: "Failed to delete resource." });
    }
};
exports.deleteResource = deleteResource;
// --- For Logged-in Users: Get AI-powered recommendations ---
const getRecommendedResources = async (req, res) => {
    const userId = (0, getUserId_1.getUserId)(req);
    if (!userId) {
        return res.status(401).json({ message: "Authentication required." });
    }
    try {
        const user = await client_1.default.user.findUnique({
            where: { id: userId },
            select: { profileEmbedding: true },
        });
        if (!user?.profileEmbedding || user.profileEmbedding.length === 0) {
            // If user has no embedding, return the 5 most recent resources as a fallback
            const recentResources = await client_1.default.resource.findMany({
                orderBy: { createdAt: "desc" },
                take: 5,
            });
            return res.status(200).json(recentResources);
        }
        const resources = await client_1.default.resource.findMany({
            where: {
                embedding: {
                    isEmpty: false,
                },
            },
        });
        const recommendations = resources
            .map((resource) => {
            const score = (0, cosineSimilarity_1.cosineSimilarity)(user.profileEmbedding, resource.embedding);
            return { ...resource, matchScore: score };
        })
            .sort((a, b) => b.matchScore - a.matchScore)
            .slice(0, 5); // Return the top 5 matches
        res.status(200).json(recommendations);
    }
    catch (error) {
        console.error("Error fetching recommended resources:", error);
        res.status(500).json({ message: "Failed to fetch recommendations." });
    }
};
exports.getRecommendedResources = getRecommendedResources;
