// routes/notificationRoutes.js
const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const User = require("../models/User");
const {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification
} = require("../controllers/notificationController");

// Setup web-push for push notifications (if VAPID keys are configured)
let webpush = null;
try {
    webpush = require('web-push');
    // Check if VAPID keys are configured
    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
        webpush.setVapidDetails(
            'mailto:support@unigrievance.com',
            process.env.VAPID_PUBLIC_KEY,
            process.env.VAPID_PRIVATE_KEY
        );
        console.log("Web Push configured successfully");
    } else {
        console.log("VAPID keys not configured, push notifications disabled");
        webpush = null;
    }
} catch (error) {
    console.log("web-push module not installed, push notifications disabled");
    webpush = null;
}

// GET routes
router.get("/", protect, getNotifications);
router.get("/unread-count", protect, getUnreadCount);

// PUT routes
router.put("/:id/read", protect, markAsRead);
router.put("/read-all", protect, markAllAsRead);

// DELETE routes
router.delete("/:id", protect, deleteNotification);

// Push notification subscription endpoint
router.post("/subscribe", protect, async (req, res) => {
    try {
        const subscription = req.body;

        if (!subscription || !subscription.endpoint) {
            return res.status(400).json({ message: "Invalid subscription data" });
        }

        // Save subscription to user document
        await User.findByIdAndUpdate(req.user.id, {
            pushSubscription: subscription
        });

        console.log(`User ${req.user.id} subscribed to push notifications`);
        res.json({ message: "Subscribed successfully" });
    } catch (error) {
        console.error("Subscribe error:", error);
        res.status(500).json({ message: "Subscription failed" });
    }
});

// Unsubscribe from push notifications
router.delete("/unsubscribe", protect, async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.user.id, {
            pushSubscription: null
        });
        res.json({ message: "Unsubscribed successfully" });
    } catch (error) {
        console.error("Unsubscribe error:", error);
        res.status(500).json({ message: "Unsubscribe failed" });
    }
});

// Test push notification endpoint (for development)
router.post("/test-push", protect, async (req, res) => {
    try {
        if (!webpush) {
            return res.status(501).json({ message: "Push notifications not configured" });
        }

        const user = await User.findById(req.user.id);
        if (!user.pushSubscription) {
            return res.status(400).json({ message: "No push subscription found" });
        }

        const payload = JSON.stringify({
            title: "Test Notification",
            body: "This is a test notification from UniGrievance",
            icon: "/logo192.png",
            badge: "/badge.png",
            tag: "test-notification"
        });

        await webpush.sendNotification(user.pushSubscription, payload);
        res.json({ message: "Test notification sent" });
    } catch (error) {
        console.error("Test push error:", error);
        res.status(500).json({ message: "Failed to send test notification" });
    }
});

module.exports = router;