const mongoose = require("mongoose");

const viewSchema = new mongoose.Schema({
    complaintId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Complaint",
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
}, { timestamps: true });

// ✅ UNIQUE: one user → one view per complaint
viewSchema.index({ complaintId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("View", viewSchema);