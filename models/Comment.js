const mongoose = require("mongoose");

const CommentSchema = new mongoose.Schema({
    complaintId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Complaint",
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        index: true
    },
    text: {
        type: String,
        required: true,
        trim: true
    },
    isVisible: {
        type: Boolean,
        default: true
    },
    disabledBy: {
        type: String,
        enum: ["student", "departmentadmin", "admin", "superadmin", null],
        default: null
    }
}, { timestamps: true });

module.exports = mongoose.model("Comment", CommentSchema);