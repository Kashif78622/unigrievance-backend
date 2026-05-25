// models/Otp.js
const mongoose = require("mongoose");

const OtpSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            index: true
        },
        otp: {
            type: String,
            required: true
        },
        email: {
            type: String,
            required: true
        },
        type: {
            type: String,
            enum: ["signup", "reset-password"],
            required: true,
            default: "signup"
        },
        expiresAt: {
            type: Date,
            required: true,
            default: () => new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
            index: { expires: 0 } // TTL index to auto-delete expired documents
        },
        isUsed: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true }
);

// Compound index for faster lookups
OtpSchema.index({ username: 1, type: 1, otp: 1 });
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("Otp", OtpSchema);