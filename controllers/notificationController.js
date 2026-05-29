// controllers/notificationController.js
const NotificationService = require("../services/notificationService");
const Notification = require("../models/Notification");

let notificationService = null;

const getNotificationService = (io) => {
    if (!notificationService && io) {
        notificationService = new NotificationService(io);
    }
    return notificationService;
};

// Get user's notifications
const getNotifications = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

        const notifications = await Notification.find({ userId: req.user.id })
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        const total = await Notification.countDocuments({ userId: req.user.id });
        const unreadCount = await Notification.countDocuments({
            userId: req.user.id,
            isRead: false
        });

        res.json({
            data: notifications,
            total,
            page,
            limit,
            unreadCount,
            hasMore: (page - 1) * limit + notifications.length < total
        });
    } catch (error) {
        console.error("getNotifications error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Get unread count
const getUnreadCount = async (req, res) => {
    try {
        const count = await Notification.countDocuments({
            userId: req.user.id,
            isRead: false
        });
        res.json({ count });
    } catch (error) {
        console.error("getUnreadCount error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Mark notification as read
const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const notification = await Notification.findOneAndUpdate(
            { _id: id, userId: req.user.id },
            { isRead: true, readAt: new Date() },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ message: "Notification not found" });
        }

        res.json({ message: "Marked as read", notification });
    } catch (error) {
        console.error("markAsRead error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Mark all as read
const markAllAsRead = async (req, res) => {
    try {
        await Notification.updateMany(
            { userId: req.user.id, isRead: false },
            { isRead: true, readAt: new Date() }
        );
        res.json({ message: "All notifications marked as read" });
    } catch (error) {
        console.error("markAllAsRead error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Delete notification
const deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await Notification.findOneAndDelete({
            _id: id,
            userId: req.user.id
        });

        if (!result) {
            return res.status(404).json({ message: "Notification not found" });
        }

        res.json({ message: "Notification deleted" });
    } catch (error) {
        console.error("deleteNotification error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

module.exports = {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    getNotificationService
};