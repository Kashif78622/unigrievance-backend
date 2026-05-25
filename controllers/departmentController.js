// controllers/departmentController.js
const Department = require("../models/Department");
const ActivityLogger = require("../utils/activityLogger");

const getLogger = (req) => new ActivityLogger(req);

// GET all departments
exports.getDepartments = async (req, res) => {
    try {
        let filter = {};
        if (req.query.active === "true") {
            filter.isActive = true;
        }
        const departments = await Department.find(filter).sort({ name: 1 });
        res.json(departments);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

// ADD department
exports.addDepartment = async (req, res) => {
    try {
        const { name, tag } = req.body;

        if (!name || !tag) {
            return res.status(400).json({ message: "Name and Tag are required" });
        }

        const departmentId = `DEP-${tag.toUpperCase()}`;

        const existingname = await Department.findOne({ name });
        const existingtag = await Department.findOne({ tag });

        if (existingname) {
            return res.status(400).json({ message: "Department with this name already exists" });
        } else if (existingtag) {
            return res.status(400).json({ message: "Department with this tag already exists" });
        }

        const department = new Department({
            departmentId,
            name,
            tag
        });

        await department.save();

        // ✅ Log activity
        const logger = getLogger(req);
        await logger.log(req.user, "DEPARTMENT_CREATE", department, {
            departmentName: name,
            departmentTag: tag,
            departmentId: departmentId
        });

        res.status(201).json({
            message: "Department added successfully",
            department
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

// UPDATE department
exports.updateDepartment = async (req, res) => {
    try {
        const { name, tag } = req.body;
        const department = await Department.findById(req.params.id);

        if (!department) {
            return res.status(404).json({ message: "Department not found" });
        }

        const changes = {};

        if (name && name !== department.name) {
            changes.name = { old: department.name, new: name };
        }
        if (tag && tag !== department.tag) {
            changes.tag = { old: department.tag, new: tag };
        }

        const departmentId = `DEP-${(tag || department.tag).toUpperCase()}`;

        const updatedDepartment = await Department.findByIdAndUpdate(
            req.params.id,
            { departmentId, name, tag },
            { new: true }
        );

        // ✅ Log activity
        if (Object.keys(changes).length > 0) {
            const logger = getLogger(req);
            await logger.log(req.user, "DEPARTMENT_UPDATE", department, {
                changes: changes,
                updatedFields: Object.keys(changes)
            });
        }

        res.json({
            message: "Department updated successfully",
            department: updatedDepartment
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Please check existing department with same Name or Tag" });
    }
};

// ENABLE / DISABLE department
exports.toggleDepartmentStatus = async (req, res) => {
    try {
        const department = await Department.findById(req.params.id);

        if (!department) {
            return res.status(404).json({ message: "Department not found" });
        }

        const oldStatus = department.isActive;
        department.isActive = !department.isActive;
        await department.save();

        // ✅ Log activity
        const logger = getLogger(req);
        const action = department.isActive ? "DEPARTMENT_ENABLE" : "DEPARTMENT_DISABLE";
        await logger.log(req.user, action, department, {
            previousStatus: oldStatus,
            newStatus: department.isActive,
            departmentName: department.name
        });

        res.json({
            message: department.isActive ? "Department enabled successfully" : "Department disabled successfully",
            department
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Status update failed" });
    }
};
// Add this function to departmentController.js
exports.getDepartmentsByIds = async (req, res) => {
    try {
        const { ids } = req.query;
        if (!ids) {
            return res.status(400).json({ message: "No IDs provided" });
        }

        const idArray = ids.split(',');
        const departments = await Department.find({ _id: { $in: idArray } }).select('name tag isActive');

        res.json(departments);
    } catch (error) {
        console.error("getDepartmentsByIds error:", error);
        res.status(500).json({ message: "Server error" });
    }
};