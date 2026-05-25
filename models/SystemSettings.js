const mongoose = require("mongoose");

const systemSettingsSchema = new mongoose.Schema(
    {
        universityName: {
            type: String,
            required: true,
            trim: true
        },

        universityTag: {
            type: String,
            required: true,
            trim: true
        },

        universityDomain: {
            type: String,
            required: true,
            trim: true,
        },

        sessionYear: {
            type: String,
            default: null
        },

        semester: {
            type: String,
            enum: ["Spring", "Summer", "Fall"],
            default: null
        },

        sessionStartDate: {
            type: Date,
            default: null
        }
    },
    { timestamps: true }
);

module.exports =
    mongoose.models.SystemSettings ||
    mongoose.model("SystemSettings", systemSettingsSchema);