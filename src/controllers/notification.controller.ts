import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
