// controllers/categoryController.js
const Category = require("../models/Category");
const ActivityLogger = require("../utils/activityLogger");

const getLogger = (req) => new ActivityLogger(req);

/* GET ALL */
exports.getCategories = async (req, res) => {
    try {
        const categories = await Category.find().sort({ type: 1, position: 1 });
        res.json(categories);
    } catch {
        res.status(500).json({ message: "Server error" });
    }
};

/* ADD */
exports.addCategory = async (req, res) => {
    try {
        const { name, type, position } = req.body;

        if (!name || !type) {
            return res.status(400).json({ message: "All fields required" });
        }

        let newPosition = parseInt(position);

        if (newPosition) {
            await Category.updateMany(
                { type, position: { $gte: newPosition } },
                { $inc: { position: 1 } }
            );
        } else {
            const last = await Category.findOne({ type }).sort({ position: -1 });
            newPosition = last ? last.position + 1 : 1;
        }

        const category = new Category({
            name,
            type,
            position: newPosition
        });

        await category.save();

        // ✅ Log activity
        const logger = getLogger(req);
        await logger.log(req.user, "CATEGORY_CREATE", category, {
            categoryName: name,
            categoryType: type,
            position: newPosition
        });

        res.json({ message: "Category added successfully", category });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

/* UPDATE */
exports.updateCategory = async (req, res) => {
    try {
        const { name, type, position } = req.body;
        const category = await Category.findById(req.params.id);

        if (!category) {
            return res.status(404).json({ message: "Category not found" });
        }

        const changes = {};
        const oldPosition = category.position;
        const oldType = category.type;
        const newPosition = parseInt(position);

        // Track name change
        if (name && name !== category.name) {
            changes.name = { old: category.name, new: name };
            category.name = name;
        }

        // CASE 1: TYPE CHANGED
        if (type && type !== oldType) {
            changes.type = { old: oldType, new: type };

            await Category.updateMany(
                { type: oldType, position: { $gt: oldPosition } },
                { $inc: { position: -1 } }
            );

            if (newPosition) {
                await Category.updateMany(
                    { type, position: { $gte: newPosition } },
                    { $inc: { position: 1 } }
                );
            } else {
                const last = await Category.findOne({ type }).sort({ position: -1 });
                category.position = last ? last.position + 1 : 1;
                changes.position = { old: oldPosition, new: category.position };
            }
            category.type = type;
        }
        // CASE 2: SAME TYPE, POSITION CHANGE
        else if (newPosition && newPosition !== oldPosition) {
            changes.position = { old: oldPosition, new: newPosition };

            if (newPosition > oldPosition) {
                await Category.updateMany(
                    { type: oldType, position: { $gt: oldPosition, $lte: newPosition } },
                    { $inc: { position: -1 } }
                );
            } else {
                await Category.updateMany(
                    { type: oldType, position: { $gte: newPosition, $lt: oldPosition } },
                    { $inc: { position: 1 } }
                );
            }
            category.position = newPosition;
        }

        await category.save();

        // ✅ Log activity
        if (Object.keys(changes).length > 0) {
            const logger = getLogger(req);
            await logger.log(req.user, "CATEGORY_UPDATE", category, {
                changes: changes,
                updatedFields: Object.keys(changes)
            });
        }

        res.json({ message: "Category updated successfully", category });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

/* TOGGLE */
exports.toggleCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const category = await Category.findById(id);

        if (!category) {
            return res.status(404).json({ message: "Category not found" });
        }

        const oldStatus = category.isActive;
        category.isActive = !category.isActive;
        await category.save();

        // ✅ Log activity
        const logger = getLogger(req);
        const action = category.isActive ? "CATEGORY_ENABLE" : "CATEGORY_DISABLE";
        await logger.log(req.user, action, category, {
            previousStatus: oldStatus,
            newStatus: category.isActive,
            categoryName: category.name
        });

        res.json({
            message: `Category ${category.isActive ? "enabled" : "disabled"} successfully`,
            isActive: category.isActive
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
};
// Add this function to categoryController.js
exports.getCategoriesByIds = async (req, res) => {
    try {
        const { ids } = req.query;
        if (!ids) {
            return res.status(400).json({ message: "No IDs provided" });
        }

        const idArray = ids.split(',');
        const categories = await Category.find({ _id: { $in: idArray } }).select('name isActive');

        res.json(categories);
    } catch (error) {
        console.error("getCategoriesByIds error:", error);
        res.status(500).json({ message: "Server error" });
    }
};