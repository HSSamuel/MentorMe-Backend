import { Router } from "express";
import {
  updateMyProfile,
  getMentorStats,
  getMenteeStats,
  getAllMentors,
  getAvailableSkills,
  getMentorPublicProfile,
  getRecommendedMentors,
} from "../controllers/user.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { body, param } from "express-validator";
import { validateRequest } from "../middleware/validateRequest";
import { upload } from "../middleware/fileUpload.middleware";

const router = Router();

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

router.get(
  "/mentor/:id",
  [param("id").isMongoId().withMessage("Invalid mentor ID")],
  validateRequest,
  getMentorPublicProfile
);

// Corrected route for mentor stats
router.get("/mentor/:id/stats", authMiddleware, getMentorStats);

// Corrected route for mentee stats
router.get("/mentee/stats", authMiddleware, getMenteeStats);

router.get("/mentors", authMiddleware, getAllMentors);
router.get("/skills", authMiddleware, getAvailableSkills);
router.get("/mentors/recommended", authMiddleware, getRecommendedMentors);

export default router;
