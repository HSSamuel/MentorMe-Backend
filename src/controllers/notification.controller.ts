import { Request, Response } from "express";
import prisma from "../client";

const getUserId = (req: Request): string | null => {
  if (!req.user || !("userId" in req.user)) return null;
  return req.user.userId as string;
};

// GET /notifications
export const getNotifications = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    // Corrected: Removed 'return' and added an explicit 'return' to exit
    res.status(401).json({ message: "Authentication error" });
    return;
  }

  try {
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ message: "Server error fetching notifications." });
  }
};

// PUT /notifications/:id/read
export const markAsRead = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = getUserId(req);
  const { id } = req.params;

  if (!userId) {
    // Corrected: Removed 'return' and added an explicit 'return' to exit
    res.status(401).json({ message: "Authentication error" });
    return;
  }

  try {
    await prisma.notification.updateMany({
      where: { id, userId }, // Ensure user can only update their own notifications
      data: { isRead: true },
    });
    res.status(204).send(); // Success, no content to return
  } catch (error) {
    res
      .status(500)
      .json({ message: "Server error marking notification as read." });
  }
};

// PUT /notifications/read-all
export const markAllAsRead = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    // Corrected: Removed 'return' and added an explicit 'return' to exit
    res.status(401).json({ message: "Authentication error" });
    return;
  }

  try {
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    res.status(204).send();
  } catch (error) {
    res
      .status(500)
      .json({ message: "Server error marking all notifications as read." });
  }
};

export const deleteNotification = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = getUserId(req);
  const { notificationId } = req.params;

  if (!userId) {
    res.status(401).json({ message: "Authentication error" });
    return;
  }

  try {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.userId !== userId) {
      res
        .status(403)
        .json({
          message: "You are not authorized to delete this notification.",
        });
      return;
    }

    await prisma.notification.delete({ where: { id: notificationId } });
    res.status(200).json({ message: "Notification deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: "Error deleting notification." });
  }
};


// --- THIS IS THE CORRECTED FUNCTION ---
export const deleteAllNotifications = async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(req);

  // This check ensures that the function stops if the user is not authenticated.
  if (!userId) {
    res.status(401).json({ message: "Authentication error" });
    return;
  }

  try {
    // The TypeScript compiler now knows for certain that 'userId' is a string here.
    await prisma.notification.deleteMany({
      where: { userId: userId },
    });
    res.status(200).json({ message: "All notifications deleted successfully." });

  } catch (error) {
    res.status(500).json({ message: "Error deleting all notifications." });
  }
};