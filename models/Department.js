const mongoose = require("mongoose");

const DepartmentSchema = new mongoose.Schema({

    departmentId: {
        type: String,
        required: true,
        unique: true
    },

    name: {
        type: String,
        required: true,
        unique: true
    },

    tag: {
        type: String,
        required: true,
        unique: true
    },

    isActive: {
        type: Boolean,
        default: true
    }

}, { timestamps: true });

module.exports = mongoose.model("Department", DepartmentSchema);