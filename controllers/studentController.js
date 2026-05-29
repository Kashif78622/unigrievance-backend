// controllers/studentController.js
const User = require("../models/User");
const Department = require("../models/Department");
const SystemSettings = require("../models/SystemSettings");
const bcrypt = require("bcryptjs");
const ActivityLogger = require("../utils/activityLogger");
const { sendAdminMessageEmail } = require("../services/mailService");
const getLogger = (req) => new ActivityLogger(req);

// Helper function to generate registration number from student data
const generateRegistrationNumber = (studentData, department) => {
    const { sessionYear, shift, rollNumber } = studentData;
    const paddedRoll = rollNumber.padStart(3, "0");
    return `BS${department.tag}F${sessionYear}${shift}${paddedRoll}`;
};

// Helper function to generate email from student data (same as signup/login)
const generateStudentEmail = async (studentData, department) => {
    try {
        const settings = await SystemSettings.findOne();
        if (!settings) return null;

        const domain = settings.universityDomain;
        const universityTag = settings.universityTag;
        const emailFormat = settings.emailFormat?.student || [];

        const { sessionYear, shift, rollNumber } = studentData;
        const paddedRoll = rollNumber.padStart(3, "0");

        // If no email format configured, use fallback
        if (emailFormat.length === 0) {
            const deptCode = `bs${department.tag?.toLowerCase() || ""}`;
            const shiftPart = shift === "E" ? `f${sessionYear}e` : `f${sessionYear}`;
            const emailPrefix = `${deptCode}-${shiftPart}-${paddedRoll}`;
            return `${universityTag}-${emailPrefix}@${domain}`;
        }

        // Build email from format
        let emailString = "";
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
                    emailString += domain;
                    break;
                case "universityTag":
                    emailString += universityTag;
                    break;
                case "departmentTag":
                    emailString += department.tag?.toLowerCase() || "";
                    break;
                case "shiftCode":
                    emailString += shift === "M" ? "" : "e";
                    break;
                case "sessionYear":
                    emailString += `f${sessionYear}`;
                    break;
                case "rollNumber":
                    emailString += paddedRoll;
                    break;
                case "studentText":
                    emailString += component.value || "students";
                    break;
                default:
                    if (component.value) emailString += component.value;
                    break;
            }
        }

        // Clean up the email
        let finalEmail = emailString;
        finalEmail = finalEmail.replace(new RegExp(`^${universityTag}-${universityTag}-`), `${universityTag}-`);
        finalEmail = finalEmail.replace(new RegExp(`@students\\.@students\\.`), '@students.');

        return finalEmail;

    } catch (error) {
        console.error("Error generating student email:", error);
        return null;
    }
};

/* GET STUDENTS */
exports.getStudents = async (req, res) => {
    try {
        let filter = { role: "student" };

        // Department admin can only see their department's students
        if (req.user.role === "departmentadmin") {
            filter.department = req.user.department;
        }

        const students = await User.find(filter)
            .populate("department", "name tag isActive")
            .select("-password");

        res.json(students);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to fetch students" });
    }
};

/* TOGGLE STUDENT STATUS */
exports.toggleStudent = async (req, res) => {
    try {
        const student = await User.findById(req.params.id);

        if (!student || student.role !== "student") {
            return res.status(404).json({ message: "Student not found" });
        }

        // Department admin can only toggle their department's students
        if (req.user.role === "departmentadmin") {
            if (student.department.toString() !== req.user.department.toString()) {
                return res.status(403).json({ message: "Not allowed to update this student" });
            }
        }

        const oldStatus = student.isActive;
        student.isActive = !student.isActive;
        await student.save();

        // Log activity
        const logger = getLogger(req);
        const action = student.isActive ? "STUDENT_ENABLE" : "STUDENT_DISABLE";
        await logger.log(req.user, action, student, {
            previousStatus: oldStatus,
            newStatus: student.isActive,
            studentName: student.name,
            studentUsername: student.username
        });

        res.json({
            message: `Student ${student.isActive ? "enabled" : "disabled"} successfully`,
            isActive: student.isActive
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to update status" });
    }
};

/* UPDATE STUDENT */
exports.updateStudent = async (req, res) => {
    try {
        const { name, phone, department, sessionYear, shift, rollNumber } = req.body;
        const isAdmin = req.user.role === "admin" || req.user.role === "superadmin";
        const isDeptAdmin = req.user.role === "departmentadmin";

        // Validate required fields based on role
        if (!name) {
            return res.status(400).json({ message: "Name is required" });
        }

        if (!phone) {
            return res.status(400).json({ message: "Mobile number is required" });
        }

        if (phone && !/^\d{11}$/.test(phone)) {
            return res.status(400).json({ message: "Mobile must be exactly 11 digits" });
        }

        const student = await User.findById(req.params.id).populate("department");

        if (!student || student.role !== "student") {
            return res.status(404).json({ message: "Student not found" });
        }

        // Access control based on role
        if (isDeptAdmin) {
            if (student.department._id.toString() !== req.user.department.toString()) {
                return res.status(403).json({ message: "Not allowed to update this student" });
            }
        }

        const changes = {};
        const studentData = {
            sessionYear: student.sessionYear,
            shift: student.shift,
            rollNumber: student.rollNumber
        };

        // Track changes and prepare update data
        if (name && name !== student.name) {
            changes.name = { old: student.name, new: name };
            student.name = name;
        }

        if (phone && phone !== student.phone) {
            changes.phone = { old: student.phone, new: phone };
            student.phone = phone;
        }

        let usernameUpdated = false;
        let newDepartment = null;

        // Admin can update these additional fields
        if (isAdmin) {
            // Update department if changed
            if (department && department !== student.department?._id?.toString()) {
                newDepartment = await Department.findById(department);
                if (newDepartment) {
                    changes.department = {
                        old: student.department?.name || "N/A",
                        new: newDepartment.name
                    };
                    student.department = department;
                    studentData.department = newDepartment;
                    usernameUpdated = true;
                }
            } else {
                studentData.department = student.department;
            }

            // Update session year if changed
            if (sessionYear && sessionYear !== student.sessionYear) {
                changes.sessionYear = { old: student.sessionYear, new: sessionYear };
                student.sessionYear = sessionYear;
                studentData.sessionYear = sessionYear;
                usernameUpdated = true;
            }

            // Update shift if changed
            if (shift && shift !== student.shift) {
                changes.shift = { old: student.shift, new: shift };
                student.shift = shift;
                studentData.shift = shift;
                usernameUpdated = true;
            }

            // Update roll number if changed
            if (rollNumber && rollNumber !== student.rollNumber) {
                const paddedRoll = rollNumber.padStart(3, "0");
                changes.rollNumber = { old: student.rollNumber, new: paddedRoll };
                student.rollNumber = paddedRoll;
                studentData.rollNumber = paddedRoll;
                usernameUpdated = true;
            }

            // If any academic fields changed, update username and email
            if (usernameUpdated) {
                // Get the department object for username generation
                const deptForUsername = newDepartment || student.department;

                // Generate new registration number
                const newUsername = generateRegistrationNumber(studentData, deptForUsername);

                // Check if new username already exists (for another student)
                const existingUser = await User.findOne({
                    username: newUsername,
                    _id: { $ne: student._id }
                });

                if (existingUser) {
                    return res.status(400).json({
                        message: "This registration number already exists. Please check the details."
                    });
                }

                changes.username = { old: student.username, new: newUsername };
                student.username = newUsername;

                // Regenerate email
                const departmentDoc = await Department.findById(student.department);
                const generatedEmail = await generateStudentEmail(studentData, departmentDoc);

                if (generatedEmail) {
                    // Store only the prefix in the database
                    const settings = await SystemSettings.findOne();
                    const domain = settings?.universityDomain;
                    if (domain && generatedEmail.includes(domain)) {
                        const emailPrefix = generatedEmail.replace(`@${domain}`, "");
                        student.email = emailPrefix;
                    } else {
                        student.email = generatedEmail;
                    }
                    changes.email = { old: student.email, new: generatedEmail };
                }
            }
        }

        await student.save();

        // Log activity if changes were made
        if (Object.keys(changes).length > 0) {
            const logger = getLogger(req);
            const action = isAdmin ? "STUDENT_UPDATE_FULL" : "STUDENT_UPDATE_PARTIAL";
            await logger.log(req.user, action, student, {
                changes: changes,
                updatedFields: Object.keys(changes),
                updatedBy: req.user.role,
                usernameUpdated: usernameUpdated
            });
        }

        // Return updated student with populated department
        const updatedStudent = await User.findById(student._id)
            .populate("department", "name tag isActive");

        res.json({
            message: usernameUpdated ? "Student updated successfully. Registration number has been updated." : "Student updated successfully",
            student: updatedStudent,
            usernameUpdated: usernameUpdated
        });

    } catch (error) {
        console.error("Update student error:", error);
        res.status(500).json({ message: "Failed to update student: " + error.message });
    }
};

/* UPDATE STUDENT - LIMITED (For Department Admin) */
exports.updateStudentLimited = async (req, res) => {
    try {
        const { name, phone } = req.body;

        if (!name && !phone) {
            return res.status(400).json({ message: "At least one field to update is required" });
        }

        if (phone && !/^\d{11}$/.test(phone)) {
            return res.status(400).json({ message: "Mobile must be exactly 11 digits" });
        }

        const student = await User.findById(req.params.id).populate("department");

        if (!student || student.role !== "student") {
            return res.status(404).json({ message: "Student not found" });
        }

        // Verify department admin has access to this student
        if (student.department._id.toString() !== req.user.department.toString()) {
            return res.status(403).json({ message: "Not allowed to update this student" });
        }

        const changes = {};

        if (name && name !== student.name) {
            changes.name = { old: student.name, new: name };
            student.name = name;
        }

        if (phone && phone !== student.phone) {
            changes.phone = { old: student.phone, new: phone };
            student.phone = phone;
        }

        await student.save();

        if (Object.keys(changes).length > 0) {
            const logger = getLogger(req);
            await logger.log(req.user, "STUDENT_UPDATE", student, {
                changes: changes,
                updatedFields: Object.keys(changes),
                updatedBy: req.user.role
            });
        }

        // Return updated student with populated department
        const updatedStudent = await User.findById(student._id)
            .populate("department", "name tag isActive");

        res.json({
            message: "Student updated successfully",
            student: updatedStudent
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to update student" });
    }
};
/* SEND EMAIL TO STUDENT */
exports.sendEmailToStudent = async (req, res) => {
    try {
        const { studentId, to, subject, message, emailType } = req.body;

        console.log("Send email request:", { studentId, to, subject, emailType });

        if (!to || !subject || !message) {
            return res.status(400).json({ message: "Recipient, subject, and message are required" });
        }

        // Verify student exists
        const student = await User.findById(studentId).populate("department");
        if (!student || student.role !== "student") {
            return res.status(404).json({ message: "Student not found" });
        }

        // Department admin can only email their department's students
        if (req.user.role === "departmentadmin") {
            if (student.department._id.toString() !== req.user.department.toString()) {
                return res.status(403).json({ message: "Not allowed to email this student" });
            }
        }

        // Construct full email address if needed
        let fullEmail = to;
        if (!fullEmail.includes('@')) {
            const SystemSettings = require("../models/SystemSettings");
            const settings = await SystemSettings.findOne();
            const domain = settings?.universityDomain || "unigrievance.com";
            fullEmail = `${to}@${domain}`;
        }

        // Send email using the mail service
        await sendAdminMessageEmail(
            fullEmail,
            student.name,
            subject,
            message,
            req.user.name || req.user.username,
            emailType || "general"
        );

        // Log the email activity - Wrap in try-catch
        try {
            const logger = getLogger(req);
            await logger.log(req.user, "EMAIL_SENT", student, {
                recipientType: "student",
                recipientId: student._id,
                recipientName: student.name,
                recipientEmail: fullEmail,
                recipientRegNo: student.username,
                recipientDepartment: student.department?.name,
                emailSubject: subject,
                emailType: emailType || "general",
                emailMessagePreview: message.substring(0, 100),
                sentBy: req.user.name || req.user.username,
                sentByRole: req.user.role,
                timestamp: new Date().toISOString()
            });
        } catch (logError) {
            console.error("Failed to log email activity:", logError);
        }

        res.json({
            message: "Email sent successfully",
            recipient: student.name,
            email: fullEmail
        });

    } catch (error) {
        console.error("Send email error:", error);
        res.status(500).json({ message: "Failed to send email: " + error.message });
    }
};