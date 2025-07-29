import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { getUserId } from "../utils/getUserId";

const prisma = new PrismaClient();

// Get all forum posts
export const getPosts = async (req: Request, res: Response): Promise<void> => {
  try {
    const posts = await prisma.forumPost.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: { profile: true } },
        _count: { select: { comments: true } },
      },
    });
    res.status(200).json(posts);
  } catch (error) {
    res.status(500).json({ message: "Error fetching posts." });
  }
};

// Get a single post with its comments
export const getPostById = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { postId } = req.params;
  try {
    const post = await prisma.forumPost.findUnique({
      where: { id: postId },
      include: {
        author: { select: { profile: true } },
        comments: {
          include: { author: { select: { profile: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!post) {
      res.status(404).json({ message: "Post not found." });
      return;
    }
    res.status(200).json(post);
  } catch (error) {
    res.status(500).json({ message: "Error fetching post." });
  }
};

// Create a new forum post
export const createPost = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { title, content } = req.body;
  const authorId = getUserId(req);

  if (!authorId) {
    res.status(401).json({ message: "Authentication error." });
    return;
  }

  try {
    const newPost = await prisma.forumPost.create({
      data: { title, content, authorId },
    });
    res.status(201).json(newPost);
  } catch (error) {
    res.status(500).json({ message: "Error creating post." });
  }
};

// Add a comment to a post
export const addComment = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { postId } = req.params;
  const { content } = req.body;
  const authorId = getUserId(req);

  if (!authorId) {
    res.status(401).json({ message: "Authentication error." });
    return;
  }

  try {
    const newComment = await prisma.forumComment.create({
      data: {
        content,
        postId,
        authorId,
      },
      include: {
        author: { select: { profile: true } }, // Include author profile in response
      },
    });
    res.status(201).json(newComment);
  } catch (error) {
    res.status(500).json({ message: "Error adding comment." });
  }
};
