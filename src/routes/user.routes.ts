import { Router } from "express";
import {
  updateMyProfile,
  getMentorStats,
  getMenteeStats,
  getAllMentors,
  getAvailableSkills,
  getUserPublicProfile,
  getRecommendedMentors,
  getMyProfile,
} from "../controllers/user.controller";
import {
  authMiddleware,
  mentorMiddleware,
} from "../middleware/auth.middleware";
import { body, param } from "express-validator";
import { validateRequest } from "../middleware/validateRequest";
import { upload } from "../middleware/fileUpload.middleware";

const router = Router();

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

// --- [NEW] ROUTES FOR DASHBOARD STATISTICS ---
router.get(
  "/mentor/:id/stats",
  authMiddleware,
  [param("id").isMongoId().withMessage("Invalid mentor ID")],
  validateRequest,
  getMentorStats
);

router.get("/mentee/stats", authMiddleware, getMenteeStats);
// --- END OF NEW ROUTES ---

router.get("/mentors", authMiddleware, getAllMentors);
router.get("/skills", authMiddleware, getAvailableSkills);
router.get("/mentors/recommended", authMiddleware, getRecommendedMentors);

// [FIX]: The generic '/:id' route is moved to the end.
router.get(
  "/:id",
  [param("id").isMongoId().withMessage("Invalid user ID")],
  validateRequest,
  getUserPublicProfile
);

export default router;
