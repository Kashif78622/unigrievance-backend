// controllers/emailFormatController.js
const StudentEmailFormat = require("../models/StudentEmailFormat");
const ActivityLogger = require("../utils/activityLogger");

const getLogger = (req) => new ActivityLogger(req);

// Get student email format
exports.getStudentEmailFormat = async (req, res) => {
    try {
        let format = await StudentEmailFormat.findOne();
        if (!format) {
            return res.json({
                format: []
            });
        }
        res.json(format);
    } catch (error) {
        console.error("Get student email format error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Save student email format
exports.saveStudentEmailFormat = async (req, res) => {
    try {
        const { format } = req.body;

        // Validate that format is not empty
        if (!format || format.length === 0) {
            return res.status(400).json({
                message: "Please add at least one component before saving"
            });
        }

        let studentFormat = await StudentEmailFormat.findOne();

        if (!studentFormat) {
            studentFormat = new StudentEmailFormat({ format });
        } else {
            studentFormat.format = format;
            studentFormat.version += 1;
        }

        await studentFormat.save();

        // Log activity
        const logger = getLogger(req);
        await logger.log(req.user, "SETTINGS_UPDATE", null, {
            setting: "student_email_format",
            action: "updated",
            componentsCount: format.length
        });

        res.json({
            message: "Student email format saved successfully",
            format: studentFormat
        });
    } catch (error) {
        console.error("Save student email format error:", error);
        res.status(500).json({ message: "Server error" });
    }
};