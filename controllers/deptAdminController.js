// controllers/deptAdminController.js
const User = require("../models/user");
const Department = require("../models/Department");
const bcrypt = require("bcryptjs");
const ActivityLogger = require("../utils/activityLogger");

const getLogger = (req) => new ActivityLogger(req);

/* ---------------- GET DEPARTMENT ADMINS ---------------- */
exports.getDepartmentAdmins = async (req, res) => {
    try {
        const departmentadmins = await User.find({
            role: "departmentadmin"
        })
            .populate("department", "name tag isActive")
            .select("-password")
            .sort({ createdAt: -1 });

        res.json(departmentadmins);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

/* ---------------- CREATE DEPARTMENT ADMIN ---------------- */
exports.createDepartmentAdmin = async (req, res) => {
    try {
        const { name, email, phone, password, role, department } = req.body;

        if (!name || !phone || !password || !department) {
            return res.status(400).json({
                message: "Required fields missing"
            });
        }

        /* only admin can create */
        if (req.user.role !== "admin") {
            return res.status(403).json({
                message: "Only admin can create department admins"
            });
        }

        // 🔥 VALIDATE DEPARTMENT ID
        const departmentExists = await Department.findById(department);
        if (!departmentExists) {
            return res.status(400).json({
                message: "Invalid department selected"
            });
        }

        const count = await User.countDocuments({
            role: "departmentadmin"
        });

        const username = `deptadmin${String(count + 1).padStart(3, "0")}`;

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

        const departmentadmin = new User({
            name,
            username,
            email,
            phone,
            department,
            password: hashedPassword,
            role: role || "departmentadmin",
            createdBy: req.user.id,
            isVerified: true
        });

        await departmentadmin.save();

        // RETURN POPULATED DATA
        const populatedAdmin = await User.findById(departmentadmin._id)
            .populate("department", "name tag")
            .select("-password");

        // ✅ Log activity - Department Admin Creation
        const logger = getLogger(req);
        await logger.log(req.user, "DEPARTMENT_ADMIN_CREATE", departmentadmin, {
            adminName: name,
            adminEmail: email,
            departmentName: departmentExists.name,
            departmentId: department,
            createdBy: req.user.name || req.user.username,
            createdByRole: req.user.role
        });

        res.status(201).json({
            message: "Department Admin created successfully",
            departmentadmin: populatedAdmin
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Creation failed" });
    }
};

/* ---------------- UPDATE DEPARTMENT ADMIN ---------------- */
exports.updateDepartmentAdmin = async (req, res) => {
    try {
        const departmentadmin = await User.findById(req.params.id);

        if (!departmentadmin) {
            return res.status(404).json({
                message: "Department Admin not found"
            });
        }

        if (departmentadmin.role === "superadmin") {
            return res.status(403).json({
                message: "Superadmin cannot be edited"
            });
        }

        const { name, email, phone, department } = req.body;
        const changes = {};

        // Track changes
        if (name && name !== departmentadmin.name) {
            changes.name = { old: departmentadmin.name, new: name };
        }
        if (email && email !== departmentadmin.email) {
            changes.email = { old: departmentadmin.email, new: email };
        }
        if (phone && phone !== departmentadmin.phone) {
            changes.phone = { old: departmentadmin.phone, new: phone };
        }

        // 🔥 VALIDATE DEPARTMENT IF PROVIDED
        if (department) {
            const departmentExists = await Department.findById(department);
            if (!departmentExists) {
                return res.status(400).json({
                    message: "Invalid department selected"
                });
            }

            if (department !== departmentadmin.department?.toString()) {
                const oldDept = await Department.findById(departmentadmin.department);
                changes.department = {
                    old: oldDept?.name || departmentadmin.department,
                    new: departmentExists.name
                };
            }
            departmentadmin.department = department;
        }

        departmentadmin.name = name || departmentadmin.name;
        departmentadmin.email = email || departmentadmin.email;
        departmentadmin.phone = phone || departmentadmin.phone;

        await departmentadmin.save();

        // 🔥 RETURN POPULATED
        const updatedAdmin = await User.findById(departmentadmin._id)
            .populate("department", "name tag")
            .select("-password");

        // ✅ Log activity - Department Admin Update
        if (Object.keys(changes).length > 0) {
            const logger = getLogger(req);
            await logger.log(req.user, "DEPARTMENT_ADMIN_UPDATE", departmentadmin, {
                changes: changes,
                updatedBy: req.user.name || req.user.username,
                updatedByRole: req.user.role
            });
        }

        res.json({
            message: "Department Admin updated successfully",
            departmentadmin: updatedAdmin
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Update failed" });
    }
};

/* ---------------- ENABLE / DISABLE DEPARTMENT ADMIN ---------------- */
exports.toggleDepartmentAdminStatus = async (req, res) => {
    try {
        const departmentadmin = await User.findById(req.params.id);

        if (!departmentadmin) {
            return res.status(404).json({
                message: "Department Admin not found"
            });
        }

        if (departmentadmin.role === "superadmin") {
            return res.status(403).json({
                message: "Superadmin cannot be disabled"
            });
        }

        if (departmentadmin._id.toString() === req.user.id) {
            return res.status(403).json({
                message: "You cannot disable your own account"
            });
        }

        const oldStatus = departmentadmin.isActive;
        departmentadmin.isActive = !departmentadmin.isActive;
        await departmentadmin.save();

        // ✅ Log activity - Department Admin Enable/Disable
        const logger = getLogger(req);
        const action = departmentadmin.isActive ? "DEPARTMENT_ADMIN_ENABLE" : "DEPARTMENT_ADMIN_DISABLE";

        await logger.log(req.user, action, departmentadmin, {
            previousStatus: oldStatus,
            newStatus: departmentadmin.isActive,
            toggledBy: req.user.name || req.user.username,
            toggledByRole: req.user.role,
            adminName: departmentadmin.name,
            adminUsername: departmentadmin.username,
            adminEmail: departmentadmin.email
        });

        res.json({
            message: `Admin ${departmentadmin.isActive ? "enabled" : "disabled"} successfully`,
            isActive: departmentadmin.isActive
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Operation failed"
        });
    }
};