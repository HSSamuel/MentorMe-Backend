"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addComment = exports.createPost = exports.getPostById = exports.getPosts = void 0;
const client_1 = require("@prisma/client");
const getUserId_1 = require("../utils/getUserId");
const prisma = new client_1.PrismaClient();
// Get all forum posts
const getPosts = async (req, res) => {
    try {
        const posts = await prisma.forumPost.findMany({
            orderBy: { createdAt: "desc" },
            include: {
                author: { select: { profile: true } },
                _count: { select: { comments: true } },
            },
        });
        res.status(200).json(posts);
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching posts." });
    }
};
exports.getPosts = getPosts;
// Get a single post with its comments
const getPostById = async (req, res) => {
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
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching post." });
    }
};
exports.getPostById = getPostById;
// Create a new forum post
const createPost = async (req, res) => {
    const { title, content } = req.body;
    const authorId = (0, getUserId_1.getUserId)(req);
    if (!authorId) {
        res.status(401).json({ message: "Authentication error." });
        return;
    }
    try {
        const newPost = await prisma.forumPost.create({
            data: { title, content, authorId },
        });
        res.status(201).json(newPost);
    }
    catch (error) {
        res.status(500).json({ message: "Error creating post." });
    }
};
exports.createPost = createPost;
// Add a comment to a post
const addComment = async (req, res) => {
    const { postId } = req.params;
    const { content } = req.body;
    const authorId = (0, getUserId_1.getUserId)(req);
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
    }
    catch (error) {
        res.status(500).json({ message: "Error adding comment." });
    }
};
exports.addComment = addComment;
