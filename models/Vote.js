const mongoose = require("mongoose");

const VoteSchema = new mongoose.Schema({
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
    voteType: {
        type: String,
        enum: ["UP", "DOWN"]
    }
}, { timestamps: true });

// 🔥 prevent duplicate votes per user per complaint
VoteSchema.index({ complaintId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("Vote", VoteSchema);