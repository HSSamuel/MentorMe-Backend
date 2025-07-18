import { Router } from "express";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
} from "../controllers/notification.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { param } from "express-validator";
import { validateRequest } from "../middleware/validateRequest";

const router = Router();

// Get all notifications for the logged-in user
router.get("/", authMiddleware, getNotifications);

// Mark all notifications as read
router.put("/read-all", authMiddleware, markAllAsRead);

// Mark a single notification as read
router.put(
  "/:id/read",
  authMiddleware,
  [param("id").isMongoId().withMessage("Invalid notification ID")],
  validateRequest,
  markAsRead
);

// Delete a single notification
router.delete(
  "/:notificationId",
  authMiddleware,
  [param("notificationId").isMongoId().withMessage("Invalid notification ID")],
  validateRequest,
  deleteNotification
);

// Delete all notifications for the logged-in user
router.delete("/", authMiddleware, deleteAllNotifications);

export default router;
