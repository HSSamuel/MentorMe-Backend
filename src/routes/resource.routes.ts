import { Router } from "express";
import {
  createResource,
  getAllResources,
  updateResource,
  deleteResource,
  getRecommendedResources,
} from "../controllers/resource.controller";
import { authMiddleware, adminMiddleware } from "../middleware/auth.middleware";
import { body, param } from "express-validator";
import { validateRequest } from "../middleware/validateRequest";

const router = Router();

// --- Public Routes ---
router.get("/", getAllResources);

// --- Authenticated User Routes ---
router.get("/recommended", authMiddleware, getRecommendedResources);

// --- Admin-Only Routes ---
router.post(
  "/",
  authMiddleware,
  adminMiddleware,
  [
    body("title").notEmpty().withMessage("Title is required"),
    body("description").notEmpty().withMessage("Description is required"),
    body("link").isURL().withMessage("A valid link is required"),
    body("type").isIn([
      "ARTICLE",
      "VIDEO",
      "COURSE",
      "BOOK",
      "PODCAST",
      "OTHER",
    ]),
  ],
  validateRequest,
  createResource
);

router.put(
  "/:id",
  authMiddleware,
  adminMiddleware,
  [param("id").isMongoId().withMessage("Invalid resource ID")],
  validateRequest,
  updateResource
);

router.delete(
  "/:id",
  authMiddleware,
  adminMiddleware,
  [param("id").isMongoId().withMessage("Invalid resource ID")],
  validateRequest,
  deleteResource
);

export default router;
