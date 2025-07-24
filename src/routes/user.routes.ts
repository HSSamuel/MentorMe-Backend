import { Router } from "express";
import {
  updateMyProfile,
  getMentorStats,
  getMenteeStats,
  getAllMentors, // We will use this for the new route
  getAvailableSkills,
  getUserPublicProfile,
  getRecommendedMentors,
  getMyProfile,
  getUserConnections,
} from "../controllers/user.controller";
import {
  authMiddleware,
  mentorMiddleware,
} from "../middleware/auth.middleware";
import { body, param } from "express-validator";
import { validateRequest } from "../middleware/validateRequest";
import { upload } from "../middleware/fileUpload.middleware";

const router = Router();

// --- [THE FIX] ---
// Added a route for the base path ('/') to handle GET requests to /api/users
router.get("/", authMiddleware, getAllMentors);
// --- END OF FIX ---

// All PUT and specific GET routes should come first.
router.put(
  "/me/profile",
  authMiddleware,
  upload.single("avatar"),
  [
    body("name").notEmpty().withMessage("Name is required").trim().escape(),
    body("bio").notEmpty().withMessage("Bio is required").trim().escape(),
    body("skills").optional().isArray().withMessage("Skills must be an array"),
    body("goals").notEmpty().withMessage("Goals are required").trim().escape(),
  ],
  validateRequest,
  updateMyProfile
);

router.get("/me/profile", authMiddleware, getMyProfile);
router.get("/connections", authMiddleware, getUserConnections);

// --- ROUTES FOR DASHBOARD STATISTICS ---
router.get(
  "/mentor/:id/stats",
  authMiddleware,
  [param("id").isMongoId().withMessage("Invalid mentor ID")],
  validateRequest,
  getMentorStats
);

router.get("/mentee/stats", authMiddleware, getMenteeStats);
// --- END OF ROUTES ---

router.get("/mentors", authMiddleware, getAllMentors);
router.get("/skills", authMiddleware, getAvailableSkills);
router.get("/mentors/recommended", authMiddleware, getRecommendedMentors);

// The generic '/:id' route is moved to the end.
router.get(
  "/:id",
  [param("id").isMongoId().withMessage("Invalid user ID")],
  validateRequest,
  getUserPublicProfile
);

export default router;
