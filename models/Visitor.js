// models/Visitor.js
const mongoose = require("mongoose");

const VisitorSchema = new mongoose.Schema(
    {
        complaintId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Complaint",
            required: true
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        userName: {
            type: String,
            default: null
        },
        userRole: {
            type: String,
            enum: ["student", "departmentadmin", "admin", "superadmin"],
            default: "student"
        },
        visitedAt: {
            type: Date,
            default: Date.now
        }
    },
    { timestamps: true }
);

// Ensure a user can only visit a complaint once
VisitorSchema.index({ complaintId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("Visitor", VisitorSchema);