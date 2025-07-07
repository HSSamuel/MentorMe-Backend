import { Router } from "express";
import {
  updateMyProfile,
  getMentorStats,
  getMenteeStats,
  getAllMentors,
  getAvailableSkills,
  getMentorPublicProfile,
} from "../controllers/user.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { body, param } from "express-validator";
import { validateRequest } from "../middleware/validateRequest";
import { upload } from "../middleware/fileUpload.middleware"; // Import the upload middleware

const router = Router();

// This is now the single endpoint for all profile updates, including the avatar.
router.put(
  "/me/profile",
  authMiddleware,
  upload.single("avatar"), // Use multer middleware here
  [
    body("name").notEmpty().withMessage("Name is required"),
    body("bio").notEmpty().withMessage("Bio is required"),
    // Skills are now optional in the validation
    body("skills").optional().isArray().withMessage("Skills must be an array"),
    body("goals").notEmpty().withMessage("Goals are required"),
  ],
  validateRequest,
  updateMyProfile
);

// --- All other routes remain the same ---
router.get(
  "/mentor/:id",
  [param("id").isMongoId().withMessage("Invalid mentor ID")],
  validateRequest,
  getMentorPublicProfile
);
router.get("/mentor/:id/stats", authMiddleware, getMentorStats);
router.get("/mentee/stats", authMiddleware, getMenteeStats);
router.get("/mentors", authMiddleware, getAllMentors);
router.get("/skills", authMiddleware, getAvailableSkills);

export default router;
