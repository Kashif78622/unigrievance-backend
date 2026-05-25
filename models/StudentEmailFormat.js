// models/StudentEmailFormat.js
const mongoose = require("mongoose");

const componentSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true
    },
    label: {
        type: String,
        required: true
    },
    value: {
        type: mongoose.Schema.Types.Mixed,
        default: ""
    },
    type: {
        type: String,
        enum: ["dynamic", "static", "separator", "domain"],
        required: true
    },
    options: [{
        type: String
    }]
});

const studentEmailFormatSchema = new mongoose.Schema({
    format: [componentSchema],
    version: {
        type: Number,
        default: 1
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("StudentEmailFormat", studentEmailFormatSchema);