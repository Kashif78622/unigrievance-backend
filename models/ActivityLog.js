// models/ActivityLog.js
const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema({
    // Who performed the action
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    userName: {
        type: String,
        required: true
    },
    userRole: {
        type: String,
        enum: ["student", "departmentadmin", "admin", "superadmin"],
        required: true
    },
    userDepartment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Department"
    },

    // What action was performed
    action: {
        type: String,
        required: true,
        enum: [
            // Authentication
            "LOGIN", "LOGOUT", "PASSWORD_CHANGE", "PASSWORD_RESET",
            "PASSWORD_RESET_OTP_REQUEST", "PASSWORD_RESET_OTP_VERIFIED",

            // Profile
            "PROFILE_UPDATE", "PROFILE_IMAGE_UPDATE", "PROFILE_SETTINGS_UPDATE",
            "ACCOUNT_DISABLE", "ACCOUNT_CREATED",

            // Complaints
            "COMPLAINT_CREATE", "COMPLAINT_UPDATE", "COMPLAINT_DELETE",
            "COMPLAINT_DISABLE", "COMPLAINT_ENABLE", "COMPLAINT_VIEW",
            "COMPLAINT_VISITED", "COMPLAINT_STATUS_CHANGE",

            // Interactions
            "COMMENT_ADD", "COMMENT_UPDATE", "COMMENT_DELETE",
            "COMMENT_DISABLE", "COMMENT_ENABLE",
            "VOTE_ADD", "VOTE_REMOVE", "VOTE_CHANGE",
            "ADMIN_COMMENT",

            // Admin Actions
            "ADMIN_CREATE", "ADMIN_UPDATE", "ADMIN_DISABLE", "ADMIN_ENABLE",

            // Department Admin Actions
            "DEPARTMENT_ADMIN_CREATE", "DEPARTMENT_ADMIN_UPDATE",
            "DEPARTMENT_ADMIN_DISABLE", "DEPARTMENT_ADMIN_ENABLE",

            // Student Actions
            "STUDENT_CREATE", "STUDENT_UPDATE", "STUDENT_DISABLE", "STUDENT_ENABLE",

            // Department Management
            "DEPARTMENT_CREATE", "DEPARTMENT_UPDATE", "DEPARTMENT_DISABLE", "DEPARTMENT_ENABLE",

            // Category Management
            "CATEGORY_CREATE", "CATEGORY_UPDATE", "CATEGORY_DISABLE", "CATEGORY_ENABLE",

            // System Settings
            "SETTINGS_UPDATE", "SEMESTER_END",

            // OTP
            "OTP_REQUEST", "OTP_VERIFIED"
        ]
    },

    // Target of the action (if applicable)
    targetId: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: "targetModel"
    },
    targetModel: {
        type: String,
        enum: ["Complaint", "User", "Department", "Category", "Comment"]
    },
    targetName: {
        type: String
    },

    // Details about the action
    details: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },

    // IP Address and User Agent
    ipAddress: {
        type: String
    },
    userAgent: {
        type: String
    },

    // Timestamp
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Index for efficient queries
activityLogSchema.index({ userId: 1, createdAt: -1 });
activityLogSchema.index({ action: 1, createdAt: -1 });
activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ userRole: 1, createdAt: -1 });

module.exports = mongoose.model("ActivityLog", activityLogSchema);