// models/Notification.js
const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
    // Recipient
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    userRole: {
        type: String,
        enum: ["student", "departmentadmin", "admin", "superadmin"],
        required: true
    },

    // Notification content
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: [
            "COMPLAINT_CREATED",
            "COMPLAINT_STATUS_CHANGE",
            "COMPLAINT_ENABLED",
            "COMPLAINT_DISABLED",
            "COMMENT_ADDED",
            "VOTE_ADDED",
            "VOTE_MILESTONE",
            "USER_ENABLED",
            "USER_DISABLED",
            "COMMENT_ENABLED",
            "COMMENT_DISABLED"
        ],
        required: true
    },
    priority: {
        type: String,
        enum: ["low", "medium", "high", "urgent"],
        default: "medium"
    },

    // Related entity
    relatedId: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: "relatedModel"
    },
    relatedModel: {
        type: String,
        enum: ["Complaint", "User", "Comment"]
    },
    relatedTitle: {
        type: String
    },

    // Additional metadata
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },

    // Status tracking
    isRead: {
        type: Boolean,
        default: false
    },
    readAt: {
        type: Date,
        default: null
    },

    // For browser notifications
    isDelivered: {
        type: Boolean,
        default: false
    },
    deliveredAt: {
        type: Date,
        default: null
    },

    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Indexes for efficient queries
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ type: 1, createdAt: -1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 }); // Auto-delete after 30 days

module.exports = mongoose.model("Notification", notificationSchema);