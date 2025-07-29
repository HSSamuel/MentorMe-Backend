import { Router } from "express";
import {
  getPosts,
  getPostById,
  createPost,
  addComment,
} from "../controllers/community.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { validateRequest } from "../middleware/validateRequest";
import { body, param } from "express-validator";

const router = Router();

router.use(authMiddleware);

router.get("/", getPosts);

router.get(
  "/:postId",
  [param("postId").isMongoId().withMessage("Invalid post ID.")],
  validateRequest,
  getPostById
);

router.post(
  "/",
  [
    body("title").notEmpty().withMessage("Title is required."),
    body("content").notEmpty().withMessage("Content is required."),
  ],
  validateRequest,
  createPost
);

router.post(
  "/:postId/comments",
  [
    param("postId").isMongoId().withMessage("Invalid post ID."),
    body("content").notEmpty().withMessage("Comment content is required."),
  ],
  validateRequest,
  addComment
);

export default router;
