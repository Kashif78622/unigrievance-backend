const mongoose = require("mongoose");

const readStatusSchema = new mongoose.Schema({
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
        default: null
    },
    isRead: {
        type: Boolean,
        default: true  // When created, it's marked as read
    }
}, { timestamps: true });

// prevent duplicate entries
readStatusSchema.index({ complaintId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("ReadStatus", readStatusSchema);