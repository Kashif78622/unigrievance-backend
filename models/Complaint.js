const mongoose = require("mongoose");

const ComplaintSchema = new mongoose.Schema(
    {
        subject: String,
        description: String,

        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Category"
        },

        department: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Department"
            }
        ],

        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },

        media: [String],

        // 🔥 AI FIELD
        emotion: {
            type: String,
            enum: ["Angry", "Frustrated", "Sad", "Neutral", "Urgent", "Satisfied"],
            default: "Neutral"
        },

        status: {
            type: String,
            default: "Unread"
        },
        isActive: {
            type: Boolean,
            default: true
        },

        priority: {
            type: Number,
            default: 1
        },

        // 🔥 UPDATED EDIT HISTORY TRACKING - Stores both old AND new values
        editHistory: [
            {
                editedAt: {
                    type: Date,
                    default: Date.now
                },
                editedBy: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "User"
                },
                changes: {
                    // OLD VALUES (what was there before)
                    oldSubject: { type: String, default: null },
                    oldDescription: { type: String, default: null },
                    oldCategory: { type: String, default: null },
                    oldEmotion: { type: String, default: null },
                    oldDepartment: [{ type: String }],
                    // NEW VALUES (what it changed to)
                    newSubject: { type: String, default: null },
                    newDescription: { type: String, default: null },
                    newCategory: { type: String, default: null },
                    newEmotion: { type: String, default: null },
                    newDepartment: [{ type: String }],
                    // Track what was added/removed
                    mediaAdded: [String],
                    mediaRemoved: [String]
                }
            }
        ],

        // Track if complaint has been edited
        isEdited: {
            type: Boolean,
            default: false
        },

        lastEditedAt: {
            type: Date,
            default: null
        },

        disabledBy: {
            type: String,
            enum: ["student", "departmentadmin", "admin", "superadmin"],
            default: null
        },
        disabledAt: {
            type: Date,
            default: null
        },
        disabledByUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },
        disabledByName: {
            type: String,
            default: null
        },

        assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },

        resolvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },

        resolvedAt: {
            type: Date,
            default: null
        },
        visitors: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Visitor"
            }
        ],

        adminActions: [
            {
                action: String,
                performedBy: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "User"
                },
                note: String,
                previousStatus: String,
                newStatus: String,
                media: [String],
                createdAt: {
                    type: Date,
                    default: Date.now
                }
            }
        ],

        statusHistory: [
            {
                status: String,
                changedBy: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "User"
                },
                changedAt: {
                    type: Date,
                    default: Date.now
                }
            }
        ]
    },
    { timestamps: true }
);

module.exports = mongoose.model("Complaint", ComplaintSchema);