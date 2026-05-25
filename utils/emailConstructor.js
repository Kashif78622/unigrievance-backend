// utils/emailConstructor.js
const Settings = require("../models/Settings");
const Department = require("../models/Department");

/**
 * Get fresh settings from database
 */
const getFreshSettings = async () => {
    return await Settings.findOne();
};

/**
 * Get fresh department data
 */
const getFreshDepartment = async (departmentId) => {
    if (!departmentId) return null;
    return await Department.findById(departmentId);
};

/**
 * Get email format from settings
 */
const getEmailFormat = async () => {
    const settings = await getFreshSettings();
    return settings?.emailFormat?.student || [];
};

/**
 * Construct email dynamically from user data and fresh system settings
 * @param {Object} user - User object (contains rollNumber, shift, sessionYear, department)
 * @returns {Promise<string>} - Complete email address
 */
const constructEmailFromUser = async (user) => {
    try {
        // Fetch fresh data from database
        const settings = await getFreshSettings();
        if (!settings) {
            console.error("Settings not found");
            return null;
        }

        // Fetch fresh department data
        let department = null;
        if (user.department) {
            department = await getFreshDepartment(user.department);
        }

        // Get email format
        const emailFormat = settings.emailFormat?.student || [];

        let emailString = "";

        if (emailFormat.length === 0) {
            // Fallback format using fresh data
            const universityTag = settings.universityTag;
            const departmentTag = department?.tag?.toLowerCase() || "";
            const shiftPart = user.shift === "E" ? `f${user.sessionYear}e` : `f${user.sessionYear}`;
            const domain = settings.universityDomain;
            const paddedRoll = user.rollNumber?.padStart(3, "0") || user.rollNumber;
            const prefix = `${universityTag}-bs${departmentTag}-${shiftPart}-${paddedRoll}`;
            return `${prefix}@${domain}`;
        }

        // Process each component in order using fresh data
        for (const component of emailFormat) {
            if (!component) continue;

            switch (component.id) {
                case "separator":
                    emailString += component.value || "";
                    break;

                case "degreeTag":
                    emailString += component.value || "bs";
                    break;

                case "domain":
                    // Always fetch fresh domain from settings
                    emailString += settings.universityDomain;
                    break;

                case "universityTag":
                    // Always fetch fresh university tag from settings
                    emailString += settings.universityTag;
                    break;

                case "departmentTag":
                    // Always fetch fresh department tag from database
                    emailString += department?.tag?.toLowerCase() || "";
                    break;

                case "shiftCode":
                    // User shift data
                    const shiftValue = user.shift === "E" ? "e" : "";
                    emailString += shiftValue;
                    break;

                case "sessionYear":
                    // User session year
                    emailString += `f${user.sessionYear}`;
                    break;

                case "rollNumber":
                    // User roll number (padded)
                    emailString += user.rollNumber?.padStart(3, "0") || user.rollNumber;
                    break;

                case "studentText":
                    emailString += component.value || "students";
                    break;

                default:
                    if (component.value) {
                        emailString += component.value;
                    }
                    break;
            }
        }

        return emailString;

    } catch (error) {
        console.error("Error constructing email:", error);
        return null;
    }
};

/**
 * Get user's email (always uses latest system data)
 * @param {Object} user - User object
 * @returns {Promise<string>} - Complete email address
 */
const getUserEmail = async (user) => {
    return await constructEmailFromUser(user);
};

/**
 * Get multiple users' emails with batch processing (optimized)
 * @param {Array} users - Array of user objects
 * @returns {Promise<Array>} - Users with email field added
 */
const getUsersWithEmails = async (users) => {
    // Fetch settings once for all users
    const settings = await getFreshSettings();
    if (!settings) return users;

    // Fetch all departments once
    const departments = await Department.find();
    const deptMap = new Map(departments.map(d => [d._id.toString(), d]));

    // Get email format
    const emailFormat = settings.emailFormat?.student || [];

    // Process each user
    return users.map(user => {
        const department = deptMap.get(user.department?.toString());
        const email = constructEmailFromComponents(
            user,
            settings,
            department,
            emailFormat
        );
        return { ...user.toObject(), email };
    });
};

/**
 * Construct email from components (synchronous version for batch processing)
 */
const constructEmailFromComponents = (user, settings, department, emailFormat) => {
    if (!user.sessionYear || !user.rollNumber) {
        return null;
    }

    let emailString = "";

    if (emailFormat.length === 0) {
        const universityTag = settings.universityTag;
        const departmentTag = department?.tag?.toLowerCase() || "";
        const shiftPart = user.shift === "E" ? `f${user.sessionYear}e` : `f${user.sessionYear}`;
        const domain = settings.universityDomain;
        const paddedRoll = user.rollNumber?.padStart(3, "0") || user.rollNumber;
        const prefix = `${universityTag}-bs${departmentTag}-${shiftPart}-${paddedRoll}`;
        return `${prefix}@${domain}`;
    }

    for (const component of emailFormat) {
        if (!component) continue;

        switch (component.id) {
            case "separator":
                emailString += component.value || "";
                break;

            case "degreeTag":
                emailString += component.value || "bs";
                break;

            case "domain":
                emailString += settings.universityDomain;
                break;

            case "universityTag":
                emailString += settings.universityTag;
                break;

            case "departmentTag":
                emailString += department?.tag?.toLowerCase() || "";
                break;

            case "shiftCode":
                const shiftValue = user.shift === "E" ? "e" : "";
                emailString += shiftValue;
                break;

            case "sessionYear":
                emailString += `f${user.sessionYear}`;
                break;

            case "rollNumber":
                emailString += user.rollNumber?.padStart(3, "0") || user.rollNumber;
                break;

            case "studentText":
                emailString += component.value || "students";
                break;

            default:
                if (component.value) {
                    emailString += component.value;
                }
                break;
        }
    }

    return emailString;
};

module.exports = {
    constructEmailFromUser,
    getUserEmail,
    getUsersWithEmails,
    getFreshSettings,
    getFreshDepartment,
    getEmailFormat
};