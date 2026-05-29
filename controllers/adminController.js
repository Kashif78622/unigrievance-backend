// controllers/adminController.js
const User = require("../models/user");
const bcrypt = require("bcryptjs");
const ActivityLogger = require("../utils/activityLogger");
const { sendAdminDirectEmail } = require("../services/mailService"); // Add this import

const getLogger = (req) => new ActivityLogger(req);

/* ---------------- GET ADMINS ---------------- */
exports.getAdmins = async (req, res) => {
    try {
        const admins = await User.find({
            role: { $in: ["admin"] }
        })
            .select("-password")
            .sort({ createdAt: -1 });

        res.json(admins);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

/* ---------------- CREATE ADMIN ---------------- */
exports.createAdmin = async (req, res) => {
    try {
        const { name, email, phone, password, role } = req.body;

        if (!name || !phone || !password) {
            return res.status(400).json({
                message: "Required fields missing"
            });
        }

        /* only superadmin can create admins */
        if (req.user.role !== "superadmin") {
            return res.status(403).json({
                message: "Only superadmin can create admins"
            });
        }

        const count = await User.countDocuments({
            role: { $in: ["admin"] }
        });

        const username = `admin${String(count + 1).padStart(3, "0")}`;

        const existingPhone = await User.findOne({ phone });
        const existingEmail = await User.findOne({ email });

        if (existingEmail) {
            return res.status(400).json({
                message: "Email already registered"
            });
        }
        if (existingPhone) {
            return res.status(400).json({
                message: "Mobile already registered"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const admin = new User({
            name,
            username,
            email,
            phone,
            password: hashedPassword,
            role: role || "admin",
            createdBy: req.user.id,
            isVerified: true
        });

        await admin.save();

        // ✅ Log activity - Admin Creation
        const logger = getLogger(req);
        await logger.logAdminCreate(req.user, admin, {
            adminName: name,
            adminEmail: email,
            adminRole: role || "admin",
            createdBy: req.user.name || req.user.username,
            createdByRole: req.user.role
        });

        res.status(201).json({
            message: "Admin created successfully",
            admin
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Creation failed" });
    }
};

/* ---------------- UPDATE ADMIN ---------------- */
exports.updateAdmin = async (req, res) => {
    try {
        const admin = await User.findById(req.params.id);

        if (!admin) {
            return res.status(404).json({
                message: "Admin not found"
            });
        }

        if (admin.role === "superadmin") {
            return res.status(403).json({
                message: "Superadmin cannot be edited"
            });
        }

        const { name, email, phone } = req.body;
        const changes = {};

        /* CHECK EMAIL DUPLICATE */
        if (email && email !== admin.email) {
            const emailExists = await User.findOne({
                email: email,
                _id: { $ne: admin._id }
            });

            if (emailExists) {
                return res.status(400).json({
                    message: "Email already registered"
                });
            }
            changes.email = { old: admin.email, new: email };
        }

        /* CHECK PHONE DUPLICATE */
        if (phone && phone !== admin.phone) {
            const phoneExists = await User.findOne({
                phone: phone,
                _id: { $ne: admin._id }
            });

            if (phoneExists) {
                return res.status(400).json({
                    message: "Mobile number already registered"
                });
            }
            changes.phone = { old: admin.phone, new: phone };
        }

        /* UPDATE FIELDS */
        if (name && name !== admin.name) {
            changes.name = { old: admin.name, new: name };
            admin.name = name;
        }
        if (email && email !== admin.email) {
            admin.email = email;
        }
        if (phone && phone !== admin.phone) {
            admin.phone = phone;
        }

        await admin.save();

        // ✅ Log activity - Admin Update
        if (Object.keys(changes).length > 0) {
            const logger = getLogger(req);
            await logger.logAdminUpdate(req.user, admin, changes, {
                updatedBy: req.user.name || req.user.username,
                updatedByRole: req.user.role
            });
        }

        res.json({
            message: "Admin updated successfully",
            admin
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Update failed"
        });
    }
};

/* ---------------- ENABLE / DISABLE ADMIN ---------------- */
exports.toggleAdminStatus = async (req, res) => {
    try {
        const admin = await User.findById(req.params.id);

        if (!admin) {
            return res.status(404).json({
                message: "Admin not found"
            });
        }

        /* prevent superadmin disable */
        if (admin.role === "superadmin") {
            return res.status(403).json({
                message: "Superadmin cannot be disabled"
            });
        }

        /* prevent disabling yourself */
        if (admin._id.toString() === req.user.id) {
            return res.status(403).json({
                message: "You cannot disable your own account"
            });
        }

        const oldStatus = admin.isActive;
        admin.isActive = !admin.isActive;
        await admin.save();
        if (global.notificationService) {
            await global.notificationService.notifyUserToggled(admin, admin.isActive, req.user);
        }
        // ✅ Log activity - Admin Enable/Disable
        const logger = getLogger(req);
        const action = admin.isActive ? "ADMIN_ENABLE" : "ADMIN_DISABLE";

        await logger.log(req.user, action, admin, {
            previousStatus: oldStatus,
            newStatus: admin.isActive,
            toggledBy: req.user.name || req.user.username,
            toggledByRole: req.user.role,
            adminName: admin.name,
            adminUsername: admin.username,
            adminEmail: admin.email,
            adminRole: admin.role
        });

        res.json({
            message: `Admin ${admin.isActive ? "enabled" : "disabled"} successfully`,
            admin
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Operation failed"
        });
    }
};

exports.sendEmailToAdmin = async (req, res) => {
    try {
        const { adminId, to, subject, message, emailType } = req.body;

        console.log("Send email to admin request:", { adminId, to, subject, emailType });

        if (!to || !subject || !message) {
            return res.status(400).json({ message: "Recipient, subject, and message are required" });
        }

        // Verify admin exists
        const admin = await User.findById(adminId);
        if (!admin || (admin.role !== "admin" && admin.role !== "superadmin")) {
            return res.status(404).json({ message: "Admin not found" });
        }

        // Construct full email address if needed
        let fullEmail = to;
        if (!fullEmail.includes('@')) {
            const SystemSettings = require("../models/SystemSettings");
            const settings = await SystemSettings.findOne();
            const domain = settings?.universityDomain || "unigrievance.com";
            fullEmail = `${to}@${domain}`;
        }

        // Send email using the mail service for admins
        await sendAdminDirectEmail(
            fullEmail,
            admin.name,
            subject,
            message,
            req.user.name || req.user.username,
            emailType || "general"
        );

        // Create activity log for email sent - Wrap in try-catch to prevent email failure
        try {
            const logger = getLogger(req);
            await logger.log(req.user, "EMAIL_SENT", admin, {
                recipientType: "admin",
                recipientId: admin._id,
                recipientName: admin.name,
                recipientEmail: fullEmail,
                recipientRole: admin.role,
                emailSubject: subject,
                emailType: emailType || "general",
                emailMessagePreview: message.substring(0, 100),
                sentBy: req.user.name || req.user.username,
                sentByRole: req.user.role,
                timestamp: new Date().toISOString()
            });
        } catch (logError) {
            console.error("Failed to log email activity:", logError);
            // Don't fail the email sending if logging fails
        }

        res.json({
            message: "Email sent successfully",
            recipient: admin.name,
            email: fullEmail
        });

    } catch (error) {
        console.error("Send email error:", error);
        res.status(500).json({ message: "Failed to send email: " + error.message });
    }
};