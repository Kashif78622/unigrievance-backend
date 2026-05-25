const User = require("../models/User");
const Otp = require("../models/Otp");
const SystemSettings = require("../models/SystemSettings");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { sendLoginEmail, sendStudentLoginEmail, sendPasswordResetOtp, sendAdminResetOtpEmail } = require("../services/mailService");
const ActivityLogger = require("../utils/activityLogger");
const getRealIP = require("../utils/getRealIP");

// Helper function to get logger instance
const getLogger = (req) => new ActivityLogger(req);

// Send OTP for admin password reset
exports.sendAdminResetOtp = async (req, res) => {
    try {
        const { username } = req.body;

        if (!username) {
            return res.status(400).json({ message: "Username is required" });
        }

        // Find admin by username
        const admin = await User.findOne({
            username: username,
            role: { $in: ["admin", "superadmin", "departmentadmin"] }
        });

        if (!admin) {
            return res.status(404).json({ message: "No admin account found with this username" });
        }

        // Get university domain from settings
        const settings = await SystemSettings.findOne();
        const domain = settings?.universityDomain || "uoc.edu.pk";

        // Construct email
        let fullEmail = admin.email + "." + domain;

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Store OTP in database
        await Otp.findOneAndUpdate(
            { username, type: "admin-reset-password" },
            { otp, email: fullEmail, expiresAt: new Date(Date.now() + 5 * 60 * 1000) },
            { upsert: true, new: true }
        );

        // Send admin password reset email
        await sendAdminResetOtpEmail(fullEmail, otp, username);

        // ✅ Log OTP request activity
        const logger = getLogger(req);
        await logger.log(admin, "PASSWORD_RESET_OTP_REQUEST", admin, {
            email: fullEmail,
            requestType: "admin_password_reset"
        });

        res.json({ message: "Password reset OTP sent successfully to admin email" });

    } catch (error) {
        console.error("Send admin reset OTP error:", error);
        res.status(500).json({ message: "Server error: " + error.message });
    }
};

// Verify OTP for admin password reset
exports.verifyAdminResetOtp = async (req, res) => {
    try {
        const { username, otp } = req.body;

        const otpRecord = await Otp.findOne({
            username,
            otp,
            type: "admin-reset-password",
            expiresAt: { $gt: new Date() }
        });

        if (!otpRecord) {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }

        // ✅ Log OTP verification
        const admin = await User.findOne({ username });
        if (admin) {
            const logger = getLogger(req);
            await logger.log(admin, "PASSWORD_RESET_OTP_VERIFIED", admin, {
                verified: true
            });
        }

        res.json({ message: "OTP verified successfully" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

// Reset admin password after OTP verification
exports.resetAdminPassword = async (req, res) => {
    try {
        const { username, newPassword, otp } = req.body;

        // Verify OTP one more time before resetting password
        const otpRecord = await Otp.findOne({
            username,
            otp,
            type: "admin-reset-password",
            expiresAt: { $gt: new Date() }
        });

        if (!otpRecord) {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }

        // Find admin
        const admin = await User.findOne({
            username: username,
            role: { $in: ["admin", "superadmin", "departmentadmin"] }
        });

        if (!admin) {
            return res.status(404).json({ message: "Admin not found" });
        }

        // Validate password strength
        if (newPassword.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters" });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update password
        admin.password = hashedPassword;
        await admin.save();

        // Delete used OTP
        await Otp.deleteOne({ _id: otpRecord._id });

        // ✅ Log password reset activity
        const logger = getLogger(req);
        await logger.logPasswordChange(admin, {
            resetMethod: "OTP",
            changedBy: username
        });

        res.json({ message: "Admin password reset successfully" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

// In authController.js - Update adminLogin
exports.adminLogin = async (req, res) => {
    try {
        const { username, password } = req.body;

        const user = await User.findOne({ username }).populate("department");

        if (!user) {
            return res.status(401).json({ message: "Invalid username" });
        }

        if (user.role !== "admin" && user.role !== "superadmin" && user.role !== "departmentadmin") {
            return res.status(403).json({ message: "Access denied" });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ message: "Invalid password" });
        }
        if (!user.isActive) {
            return res.status(403).json({
                message: "Your account is disabled. Contact administrator."
            });
        }

        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        const settings = await SystemSettings.findOne();
        const domain = settings?.universityDomain || "uoc.edu.pk";

        let adminEmail = user.email + "." + domain;

        if (adminEmail) {
            sendLoginEmail(adminEmail, user.username).catch(err =>
                console.error("Failed to send email:", err)
            );
        }

        // ✅ Log login activity with real IP and device info
        const logger = getLogger(req);
        await logger.logLogin(user, {
            loginType: "admin",
            userAgent: req.headers["user-agent"],
            ipAddress: getRealIP(req)
        });

        res.json({
            message: "Login successful",
            token,
            user: {
                _id: user._id,
                name: user.name,
                username: user.username,
                role: user.role,
                department: user.department,
                email: adminEmail
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

// Update studentLogin
exports.studentLogin = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                message: "Username and password are required"
            });
        }

        const student = await User.findOne({
            username: username,
            role: "student"
        }).populate("department");

        if (!student) {
            return res.status(404).json({
                message: "Student not found. Please check your registration number."
            });
        }

        if (!student.isActive) {
            return res.status(403).json({
                message: "Your account is disabled. Please contact administrators."
            });
        }

        const isMatch = await bcrypt.compare(password, student.password);

        if (!isMatch) {
            return res.status(400).json({
                message: "Invalid password. Please try again."
            });
        }

        const token = jwt.sign(
            { id: student._id, role: student.role },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        let fullEmail = null;

        try {
            const settings = await SystemSettings.findOne();
            const domain = settings?.universityDomain || "uoc.edu.pk";
            const universityTag = settings?.universityTag || "uoc";

            if (student.email) {
                if (student.email.includes('@')) {
                    if (student.email.includes('@students.')) {
                        if (!student.email.startsWith(universityTag)) {
                            const emailParts = student.email.split('@');
                            const localPart = emailParts[0];
                            const domainPart = emailParts[1];
                            fullEmail = `${universityTag}-${localPart}@${domainPart}`;
                        } else {
                            fullEmail = student.email;
                        }
                    } else if (student.email.includes('@students')) {
                        const emailWithoutDomain = student.email.replace('@students', '');
                        fullEmail = `${universityTag}-${emailWithoutDomain}@students.${domain}`;
                    } else {
                        const emailParts = student.email.split('@');
                        const localPart = emailParts[0];
                        const domainPart = emailParts[1];
                        if (!localPart.startsWith(universityTag)) {
                            fullEmail = `${universityTag}-${localPart}@${domainPart}`;
                        } else {
                            fullEmail = student.email;
                        }
                    }
                } else {
                    if (student.email.startsWith(universityTag)) {
                        fullEmail = `${student.email}@students.${domain}`;
                    } else {
                        fullEmail = `${universityTag}-${student.email}@students.${domain}`;
                    }
                }
            }

            if (!fullEmail && student.department && student.sessionYear && student.rollNumber && student.shift) {
                const deptCode = `bs${student.department.tag.toLowerCase()}`;
                const paddedRoll = student.rollNumber.padStart(3, "0");
                const shiftPart = student.shift === "E" ? `f${student.sessionYear}e` : `f${student.sessionYear}`;
                const emailPrefix = `${deptCode}-${shiftPart}-${paddedRoll}`;
                fullEmail = `${universityTag}-${emailPrefix}@students.${domain}`;
                const prefixToSave = `${universityTag}-${emailPrefix}`;
                student.email = prefixToSave;
                await student.save();
            }

            fullEmail = fullEmail.replace(new RegExp(`^${universityTag}-${universityTag}-`), `${universityTag}-`);
            fullEmail = fullEmail.replace(new RegExp(`@students\\.@students\\.`), '@students.');

        } catch (settingsError) {
            console.error("Error constructing email:", settingsError);
            fullEmail = student.email;
        }

        if (fullEmail && fullEmail.includes('@') && fullEmail.includes('students')) {
            sendStudentLoginEmail(fullEmail, student.username).catch(err =>
                console.error("Failed to send login email:", err)
            );
        }

        // ✅ Log student login activity with real IP and device info
        const logger = getLogger(req);
        await logger.logLogin(student, {
            loginType: "student",
            userAgent: req.headers["user-agent"],
            ipAddress: getRealIP(req),
            registrationNumber: student.username
        });

        res.status(200).json({
            message: "Login successful",
            token,
            user: {
                _id: student._id,
                id: student._id,
                name: student.name,
                username: student.username,
                email: fullEmail,
                role: student.role,
                department: student.department,
                isActive: student.isActive
            }
        });

    } catch (error) {
        console.error("Student login error:", error);
        res.status(500).json({
            message: "Server error during login. Please try again later."
        });
    }
};

// Update logout function
exports.logout = async (req, res) => {
    try {
        // Log logout activity with real IP
        const logger = getLogger(req);
        await logger.logLogout(req.user, {
            logoutTime: new Date(),
            userAgent: req.headers["user-agent"],
            ipAddress: getRealIP(req)
        });

        res.json({ message: "Logged out successfully" });
    } catch (error) {
        console.error("Logout error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

exports.changePassword = async (req, res) => {
    try {
        const userId = req.user.id;
        const { currentPassword, newPassword, confirmPassword } = req.body;

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);

        if (!isMatch) {
            return res.status(400).json({ message: "Current password is incorrect" });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ message: "Passwords do not match" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        user.password = hashedPassword;
        await user.save();

        // ✅ Log password change activity
        const logger = getLogger(req);
        await logger.logPasswordChange(user, {
            changedBy: user._id,
            changedAt: new Date()
        });

        res.json({ message: "Password updated successfully" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
};

/* GET PROFILE */
exports.getProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId).select("-password");

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json({
            username: user.username,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

/* UPDATE PROFILE */
exports.updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, email, phone } = req.body;
        const user = await User.findById(userId);
        const changes = {};

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Track changes for logging
        if (name && name !== user.name) {
            changes.name = { old: user.name, new: name };
            user.name = name;
        }

        // 🔒 STUDENT: DO NOT UPDATE EMAIL
        if (user.role !== "student") {
            if (email && email !== user.email) {
                const emailExists = await User.findOne({
                    email,
                    _id: { $ne: userId }
                });

                if (emailExists) {
                    return res.status(400).json({
                        message: "Email already registered with another account"
                    });
                }

                changes.email = { old: user.email, new: email };
                user.email = email;
            }
        }

        // Mobile logic
        if (phone && phone !== user.phone) {
            const phoneExists = await User.findOne({
                phone,
                _id: { $ne: userId }
            });

            if (phoneExists) {
                return res.status(400).json({
                    message: "Mobile number already registered"
                });
            }

            changes.phone = { old: user.phone, new: phone };
            user.phone = phone;
        }

        await user.save();

        // ✅ Log profile update if changes were made
        if (Object.keys(changes).length > 0) {
            const logger = getLogger(req);
            await logger.logProfileUpdate(user, changes, {
                updatedFields: Object.keys(changes)
            });
        }

        res.json({
            message: "Profile updated successfully"
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Server error"
        });
    }
};

exports.checkEmailAvailability = async (req, res) => {
    try {
        const { email } = req.body;

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.json({ isAvailable: false, message: "Email already registered" });
        }

        return res.json({ isAvailable: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

exports.sendPasswordResetOtp = async (req, res) => {
    try {
        const { username, email } = req.body;

        const user = await User.findOne({ username }).populate("department");

        if (!user) {
            return res.status(404).json({ message: "No account found with this registration number" });
        }

        // Get university settings
        const settings = await SystemSettings.findOne();
        const domain = settings?.universityDomain || "uoc.edu.pk";
        const universityTag = settings?.universityTag || "uoc";

        let fullEmail = null;

        if (user.email) {
            if (user.email.includes('@')) {
                if (user.email.includes('@students.')) {
                    if (!user.email.startsWith(universityTag)) {
                        const emailParts = user.email.split('@');
                        const localPart = emailParts[0];
                        const domainPart = emailParts[1];
                        fullEmail = `${universityTag}-${localPart}@${domainPart}`;
                    } else {
                        fullEmail = user.email;
                    }
                } else if (user.email.includes('@students')) {
                    const emailWithoutDomain = user.email.replace('@students', '');
                    fullEmail = `${universityTag}-${emailWithoutDomain}@students.${domain}`;
                } else {
                    const emailParts = user.email.split('@');
                    const localPart = emailParts[0];
                    const domainPart = emailParts[1];
                    if (!localPart.startsWith(universityTag)) {
                        fullEmail = `${universityTag}-${localPart}@${domainPart}`;
                    } else {
                        fullEmail = user.email;
                    }
                }
            } else {
                if (user.email.startsWith(universityTag)) {
                    fullEmail = `${user.email}@students.${domain}`;
                } else {
                    fullEmail = `${universityTag}-${user.email}@students.${domain}`;
                }
            }
        }

        if (!fullEmail && user.department && user.sessionYear && user.rollNumber && user.shift) {
            const deptCode = `bs${user.department.tag.toLowerCase()}`;
            const paddedRoll = user.rollNumber.padStart(3, "0");
            const shiftPart = user.shift === "E" ? `f${user.sessionYear}e` : `f${user.sessionYear}`;
            const emailPrefix = `${deptCode}-${shiftPart}-${paddedRoll}`;
            fullEmail = `${universityTag}-${emailPrefix}@students.${domain}`;
            const prefixToSave = `${universityTag}-${emailPrefix}`;
            user.email = prefixToSave;
            await user.save();
        }

        fullEmail = fullEmail.replace(new RegExp(`^${universityTag}-${universityTag}-`), `${universityTag}-`);
        fullEmail = fullEmail.replace(new RegExp(`@students\\.@students\\.`), '@students.');

        if (!fullEmail || !fullEmail.includes('@') || !fullEmail.includes('students')) {
            return res.status(400).json({ message: "Unable to determine email address. Please contact support." });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        await Otp.findOneAndUpdate(
            { username, type: "reset-password" },
            { otp, email: fullEmail, expiresAt: new Date(Date.now() + 5 * 60 * 1000) },
            { upsert: true, new: true }
        );

        await sendPasswordResetOtp(fullEmail, otp, username);

        // ✅ Log password reset OTP request
        const logger = getLogger(req);
        await logger.log(user, "PASSWORD_RESET_OTP_REQUEST", user, {
            email: fullEmail,
            requestType: "student_password_reset"
        });

        res.json({ message: "Password reset OTP sent successfully" });

    } catch (error) {
        console.error("Send password reset OTP error:", error);
        res.status(500).json({ message: "Server error: " + error.message });
    }
};

exports.verifyResetOtp = async (req, res) => {
    try {
        const { username, otp } = req.body;

        const otpRecord = await Otp.findOne({
            username,
            otp,
            type: "reset-password",
            expiresAt: { $gt: new Date() }
        });

        if (!otpRecord) {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }

        // ✅ Log OTP verification
        const user = await User.findOne({ username });
        if (user) {
            const logger = getLogger(req);
            await logger.log(user, "PASSWORD_RESET_OTP_VERIFIED", user, {
                verified: true
            });
        }

        res.json({ message: "OTP verified successfully" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { username, newPassword, otp } = req.body;

        const otpRecord = await Otp.findOne({
            username,
            otp,
            type: "reset-password",
            expiresAt: { $gt: new Date() }
        });

        if (!otpRecord) {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }

        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        user.password = hashedPassword;
        await user.save();

        await Otp.deleteOne({ _id: otpRecord._id });

        // ✅ Log password reset completion
        const logger = getLogger(req);
        await logger.logPasswordChange(user, {
            resetMethod: "OTP",
            changedBy: username,
            resetCompleted: true
        });

        res.json({ message: "Password reset successfully" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

// At the end of authController.js, make sure all functions are exported
module.exports = {
    adminLogin: exports.adminLogin,
    sendAdminResetOtp: exports.sendAdminResetOtp,
    verifyAdminResetOtp: exports.verifyAdminResetOtp,
    resetAdminPassword: exports.resetAdminPassword,
    studentLogin: exports.studentLogin,
    sendPasswordResetOtp: exports.sendPasswordResetOtp,
    verifyResetOtp: exports.verifyResetOtp,
    resetPassword: exports.resetPassword,
    changePassword: exports.changePassword,
    getProfile: exports.getProfile,
    updateProfile: exports.updateProfile,
    checkEmailAvailability: exports.checkEmailAvailability,
    logout: exports.logout
};