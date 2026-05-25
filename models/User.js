// models/User.js
const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
    {
        /* ---------------- BASIC PROFILE ---------------- */

        name: {
            type: String,
            default: null
        },

        username: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },

        profileImage: {
            type: String,
            default: "/uploads/defaults/default-profile.png",
        },

        phone: {
            type: String,
            default: "01234567890",
        },

        email: {
            type: String,
            // Remove unique constraint - students will have null
            // Only admins will have actual email values
            index: true,  // Keep index for performance but not unique
            default: null,
            sparse: true  // Allows multiple null values
        },

        /* ---------------- AUTHENTICATION ---------------- */

        password: {
            type: String,
            required: false
        },

        role: {
            type: String,
            enum: [
                "student",
                "departmentadmin",
                "admin",
                "superadmin",
            ],
            default: "student",
        },

        /* ---------------- STUDENT FIELDS ---------------- */

        rollNumber: {
            type: String,
            sparse: true,
        },

        department: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Department",
            default: null,
        },

        sessionYear: {
            type: String,
            default: null,
        },

        shift: {
            type: String,
            enum: ["M", "E"],
            default: null
        },

        /* ---------------- ACCOUNT STATUS ---------------- */

        isVerified: {
            type: Boolean,
            default: false,
        },

        isActive: {
            type: Boolean,
            default: true,
        },

        anonymousPost: {
            type: Boolean,
            default: false
        },

        anonymousVote: {
            type: Boolean,
            default: false
        },

        anonymousComment: {
            type: Boolean,
            default: false
        },

        hideProfilePicture: {
            type: Boolean,
            default: false
        },

        /* ---------------- OTP VERIFICATION ---------------- */

        otp: {
            type: String,
            default: null,
        },

        otpExpires: {
            type: Date,
            default: null,
        },

        /* ---------------- LOGIN SECURITY ---------------- */

        lastLogin: {
            type: Date,
            default: null,
        },

        loginAttempts: {
            type: Number,
            default: 0,
        },

        accountLockedUntil: {
            type: Date,
            default: null,
        },

        /* ---------------- ADMIN MANAGEMENT ---------------- */

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        /* ---------------- SYSTEM DATA ---------------- */

        complaintsPosted: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Complaint",
            },
        ],

        complaintsResolved: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Complaint",
            },
        ],
    },

    {
        timestamps: true,
    }
);

module.exports = mongoose.models.User || mongoose.model("User", UserSchema);