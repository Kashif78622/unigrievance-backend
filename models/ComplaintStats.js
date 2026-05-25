const mongoose = require("mongoose");

const ComplaintStatsSchema = new mongoose.Schema({
    _id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Complaint"
    },
    upvoteCount: { type: Number, default: 0 },
    downvoteCount: { type: Number, default: 0 },
    netScore: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model("ComplaintStats", ComplaintStatsSchema);