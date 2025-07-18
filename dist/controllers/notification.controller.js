"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAllNotifications = exports.deleteNotification = exports.markAllAsRead = exports.markAsRead = exports.getNotifications = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const getUserId = (req) => {
    if (!req.user || !("userId" in req.user))
        return null;
    return req.user.userId;
};
// GET /notifications
const getNotifications = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = getUserId(req);
    if (!userId) {
        // Corrected: Removed 'return' and added an explicit 'return' to exit
        res.status(401).json({ message: "Authentication error" });
        return;
    }
    try {
        const notifications = yield prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
        });
        res.status(200).json(notifications);
    }
    catch (error) {
        res.status(500).json({ message: "Server error fetching notifications." });
    }
});
exports.getNotifications = getNotifications;
// PUT /notifications/:id/read
const markAsRead = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = getUserId(req);
    const { id } = req.params;
    if (!userId) {
        // Corrected: Removed 'return' and added an explicit 'return' to exit
        res.status(401).json({ message: "Authentication error" });
        return;
    }
    try {
        yield prisma.notification.updateMany({
            where: { id, userId }, // Ensure user can only update their own notifications
            data: { isRead: true },
        });
        res.status(204).send(); // Success, no content to return
    }
    catch (error) {
        res
            .status(500)
            .json({ message: "Server error marking notification as read." });
    }
});
exports.markAsRead = markAsRead;
// PUT /notifications/read-all
const markAllAsRead = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = getUserId(req);
    if (!userId) {
        // Corrected: Removed 'return' and added an explicit 'return' to exit
        res.status(401).json({ message: "Authentication error" });
        return;
    }
    try {
        yield prisma.notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true },
        });
        res.status(204).send();
    }
    catch (error) {
        res
            .status(500)
            .json({ message: "Server error marking all notifications as read." });
    }
});
exports.markAllAsRead = markAllAsRead;
const deleteNotification = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = getUserId(req);
    const { notificationId } = req.params;
    if (!userId) {
        res.status(401).json({ message: "Authentication error" });
        return;
    }
    try {
        const notification = yield prisma.notification.findUnique({
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
        yield prisma.notification.delete({ where: { id: notificationId } });
        res.status(200).json({ message: "Notification deleted successfully." });
    }
    catch (error) {
        res.status(500).json({ message: "Error deleting notification." });
    }
});
exports.deleteNotification = deleteNotification;
// --- THIS IS THE CORRECTED FUNCTION ---
const deleteAllNotifications = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = getUserId(req);
    // This check ensures that the function stops if the user is not authenticated.
    if (!userId) {
        res.status(401).json({ message: "Authentication error" });
        return;
    }
    try {
        // The TypeScript compiler now knows for certain that 'userId' is a string here.
        yield prisma.notification.deleteMany({
            where: { userId: userId },
        });
        res.status(200).json({ message: "All notifications deleted successfully." });
    }
    catch (error) {
        res.status(500).json({ message: "Error deleting all notifications." });
    }
});
exports.deleteAllNotifications = deleteAllNotifications;
