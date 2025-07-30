import { Request, Response } from "express";
import prisma from "../client";
import { getUserId } from "../utils/getUserId";
import { generateEmbedding } from "../services/ai.service";
import { cosineSimilarity } from "../utils/cosineSimilarity";

// --- For Admins: Create a new resource ---
export const createResource = async (req: Request, res: Response) => {
  const { title, description, link, type, tags, imageUrl } = req.body;

  if (!title || !description || !link || !type) {
    return res.status(400).json({ message: "Missing required fields." });
  }

  try {
    // Generate AI embedding for recommendation matching
    const embeddingText = `${title} ${description} ${tags.join(" ")}`;
    const embedding = await generateEmbedding(embeddingText);

    const newResource = await prisma.resource.create({
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
  } catch (error) {
    console.error("Error creating resource:", error);
    res.status(500).json({ message: "Failed to create resource." });
  }
};

// --- For All Users: Get all resources ---
export const getAllResources = async (req: Request, res: Response) => {
  try {
    const resources = await prisma.resource.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
    res.status(200).json(resources);
  } catch (error) {
    console.error("Error fetching resources:", error);
    res.status(500).json({ message: "Failed to fetch resources." });
  }
};

// --- For Admins: Update a resource ---
export const updateResource = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, description, link, type, tags, imageUrl } = req.body;

  try {
    const dataToUpdate: any = {
      title,
      description,
      link,
      type,
      tags,
      imageUrl,
    };

    // If core text fields change, regenerate the embedding
    if (title || description || tags) {
      const currentResource = await prisma.resource.findUnique({
        where: { id },
      });
      const embeddingText = `${title || currentResource?.title} ${description || currentResource?.description} ${(tags || currentResource?.tags).join(" ")}`;
      dataToUpdate.embedding = await generateEmbedding(embeddingText);
    }

    const updatedResource = await prisma.resource.update({
      where: { id },
      data: dataToUpdate,
    });
    res.status(200).json(updatedResource);
  } catch (error) {
    console.error("Error updating resource:", error);
    res.status(500).json({ message: "Failed to update resource." });
  }
};

// --- For Admins: Delete a resource ---
export const deleteResource = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.resource.delete({
      where: { id },
    });
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting resource:", error);
    res.status(500).json({ message: "Failed to delete resource." });
  }
};

// --- For Logged-in Users: Get AI-powered recommendations ---
export const getRecommendedResources = async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({ message: "Authentication required." });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { profileEmbedding: true },
    });

    if (!user?.profileEmbedding || user.profileEmbedding.length === 0) {
      // If user has no embedding, return the 5 most recent resources as a fallback
      const recentResources = await prisma.resource.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
      });
      return res.status(200).json(recentResources);
    }

    const resources = await prisma.resource.findMany({
      where: {
        embedding: {
          isEmpty: false,
        },
      },
    });

    const recommendations = resources
      .map((resource) => {
        const score = cosineSimilarity(
          user.profileEmbedding,
          resource.embedding
        );
        return { ...resource, matchScore: score };
      })
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 5); // Return the top 5 matches

    res.status(200).json(recommendations);
  } catch (error) {
    console.error("Error fetching recommended resources:", error);
    res.status(500).json({ message: "Failed to fetch recommendations." });
  }
};
