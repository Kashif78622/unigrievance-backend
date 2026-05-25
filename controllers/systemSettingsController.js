// controllers/systemSettingsController.js
const SystemSettings = require("../models/SystemSettings");
const ActivityLogger = require("../utils/activityLogger");

const getLogger = (req) => new ActivityLogger(req);

/* GET SETTINGS */
exports.getSettings = async (req, res) => {
    try {
        const settings = await SystemSettings.findOne();
        if (!settings) {
            return res.status(404).json({ message: "Settings not found" });
        }
        res.json(settings);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

/* UPDATE SETTINGS */
exports.updateSettings = async (req, res) => {
    try {
        const {
            universityName,
            universityTag,
            universityDomain,
            sessionYear,
            semester,
            sessionStartDate
        } = req.body;

        let safeDate = null;
        if (sessionStartDate) {
            const [year, month, day] = sessionStartDate.split("-");
            safeDate = new Date(year, month - 1, day);
        }

        let settings = await SystemSettings.findOne();

        if (settings && settings.sessionStartDate) {
            return res.status(400).json({ message: "Cannot update university details during active semester" });
        }

        const changes = {};
        if (settings) {
            if (universityName && universityName !== settings.universityName) changes.universityName = { old: settings.universityName, new: universityName };
            if (universityTag && universityTag !== settings.universityTag) changes.universityTag = { old: settings.universityTag, new: universityTag };
            if (universityDomain && universityDomain !== settings.universityDomain) changes.universityDomain = { old: settings.universityDomain, new: universityDomain };
            if (sessionYear && sessionYear !== settings.sessionYear) changes.sessionYear = { old: settings.sessionYear, new: sessionYear };
            if (semester && semester !== settings.semester) changes.semester = { old: settings.semester, new: semester };
        }

        if (!settings) {
            settings = new SystemSettings({
                universityName,
                universityTag,
                universityDomain,
                sessionYear,
                semester,
                sessionStartDate: safeDate
            });
        } else {
            settings.universityName = universityName;
            settings.universityTag = universityTag;
            settings.universityDomain = universityDomain;
            settings.sessionYear = sessionYear;
            settings.semester = semester;
            settings.sessionStartDate = safeDate;
        }

        await settings.save();

        // ✅ Log activity
        if (Object.keys(changes).length > 0) {
            const logger = getLogger(req);
            await logger.log(req.user, "SETTINGS_UPDATE", null, {
                changes: changes,
                updatedFields: Object.keys(changes)
            });
        }

        res.status(200).json({ success: true, data: settings });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
};

/* END SEMESTER */
exports.endSemester = async (req, res) => {
    try {
        const settings = await SystemSettings.findOne();

        if (!settings) {
            return res.status(404).json({ message: "Settings not found" });
        }

        const previousSettings = {
            sessionYear: settings.sessionYear,
            semester: settings.semester,
            sessionStartDate: settings.sessionStartDate
        };

        settings.sessionStartDate = null;
        settings.sessionYear = null;
        settings.semester = null;
        await settings.save();

        // ✅ Log activity
        const logger = getLogger(req);
        await logger.log(req.user, "SEMESTER_END", null, {
            previousSettings: previousSettings,
            endedBy: req.user.name || req.user.username
        });

        res.json({ message: "Semester ended successfully" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
};