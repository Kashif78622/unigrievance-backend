// controllers/activityLogController.js
const ActivityLog = require("../models/ActivityLog");
const User = require("../models/User");

// Get user's own activity log
// controllers/activityLogController.js - Add device info to response
const getMyActivityLog = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 15;
        const skip = (page - 1) * limit;

        const filter = { userId: req.user.id };

        if (req.query.action) {
            filter.action = req.query.action;
        }

        if (req.query.startDate) {
            filter.createdAt = { $gte: new Date(req.query.startDate) };
        }

        if (req.query.endDate) {
            filter.createdAt = { ...filter.createdAt, $lte: new Date(req.query.endDate) };
        }

        const activities = await ActivityLog.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await ActivityLog.countDocuments(filter);

        // Format device info for response
        const formattedActivities = activities.map(activity => {
            const activityObj = activity.toObject();
            if (activityObj.action === "LOGIN" || activityObj.action === "LOGOUT") {
                if (activityObj.details) {
                    activityObj.deviceInfo = {
                        browser: activityObj.details.browser,
                        os: activityObj.details.os,
                        deviceType: activityObj.details.deviceType
                    };
                }
            }
            return activityObj;
        });

        res.json({
            data: formattedActivities,
            total,
            page,
            limit,
            hasMore: skip + activities.length < total
        });

    } catch (error) {
        console.error("getMyActivityLog error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
const getUserActivities = async (req, res) => {
    try {
        // Only superadmin and admin can access other users' logs
        if (!["superadmin", "admin", "departmentadmin"].includes(req.user.role)) {
            return res.status(403).json({ message: "Not authorized" });
        }

        // Get userId from query params
        const targetUserId = req.query.userId;
        if (!targetUserId) {
            return res.status(400).json({ message: "User ID is required" });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 15;
        const skip = (page - 1) * limit;

        let filter = { userId: targetUserId };

        // Apply action filter
        if (req.query.action && req.query.action !== "") {
            filter.action = req.query.action;
        }

        // Apply date filters
        if (req.query.startDate && req.query.startDate !== "") {
            filter.createdAt = { $gte: new Date(req.query.startDate) };
        }
        if (req.query.endDate && req.query.endDate !== "") {
            filter.createdAt = {
                ...filter.createdAt,
                $lte: new Date(req.query.endDate + "T23:59:59.999Z")
            };
        }

        console.log("Fetching activities for user:", targetUserId);
        console.log("Filter:", JSON.stringify(filter, null, 2));

        const activities = await ActivityLog.find(filter)
            .populate("userId", "name username role")
            .populate("targetId")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await ActivityLog.countDocuments(filter);

        console.log(`Found ${activities.length} activities out of ${total} total`);

        // Format activities for response
        const formattedActivities = activities.map(activity => {
            const activityObj = activity.toObject();
            if (activityObj.action === "LOGIN" || activityObj.action === "LOGOUT") {
                if (activityObj.details) {
                    activityObj.deviceInfo = {
                        browser: activityObj.details.browser,
                        os: activityObj.details.os,
                        deviceType: activityObj.details.deviceType
                    };
                }
            }
            return activityObj;
        });

        res.json({
            data: formattedActivities,
            total,
            page,
            limit,
            hasMore: skip + activities.length < total
        });

    } catch (error) {
        console.error("getUserActivities error:", error);
        res.status(500).json({ message: "Server error: " + error.message });
    }
};

// Admin: Get all activity logs
const getAllActivityLogs = async (req, res) => {
    try {
        if (!["superadmin", "admin"].includes(req.user.role)) {
            return res.status(403).json({ message: "Not authorized" });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;

        let filter = {};

        if (req.query.userId) {
            filter.userId = req.query.userId;
        }

        if (req.query.userRole) {
            filter.userRole = req.query.userRole;
        }

        if (req.query.action) {
            filter.action = req.query.action;
        }

        if (req.query.startDate) {
            filter.createdAt = { $gte: new Date(req.query.startDate) };
        }

        if (req.query.endDate) {
            filter.createdAt = { ...filter.createdAt, $lte: new Date(req.query.endDate) };
        }

        const activities = await ActivityLog.find(filter)
            .populate("userId", "name username role")
            .populate("targetId")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await ActivityLog.countDocuments(filter);

        res.json({
            data: activities,
            total,
            page,
            limit,
            hasMore: skip + activities.length < total
        });

    } catch (error) {
        console.error("getAllActivityLogs error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Get activity statistics
const getActivityStats = async (req, res) => {
    try {
        const stats = await ActivityLog.aggregate([
            {
                $group: {
                    _id: {
                        action: "$action",
                        date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $group: {
                    _id: "$_id.action",
                    daily: {
                        $push: {
                            date: "$_id.date",
                            count: "$count"
                        }
                    },
                    total: { $sum: "$count" }
                }
            },
            { $sort: { total: -1 } }
        ]);

        const userStats = await ActivityLog.aggregate([
            {
                $group: {
                    _id: "$userRole",
                    count: { $sum: 1 },
                    actions: { $push: "$action" }
                }
            }
        ]);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayStats = await ActivityLog.aggregate([
            {
                $match: {
                    createdAt: { $gte: today }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    uniqueUsers: { $addToSet: "$userId" }
                }
            }
        ]);

        res.json({
            actions: stats,
            byRole: userStats,
            totalLogs: await ActivityLog.countDocuments(),
            todayLogs: todayStats[0]?.total || 0,
            uniqueUsersToday: todayStats[0]?.uniqueUsers?.length || 0
        });

    } catch (error) {
        console.error("getActivityStats error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
// Add this function to activityLogController.js
const getDepartmentActivities = async (req, res) => {
    try {
        const { departmentId } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        if (!departmentId) {
            return res.status(400).json({ message: "Department ID is required" });
        }

        const filter = {
            $or: [
                { targetId: departmentId, targetModel: "Department" },
                { "details.departmentId": departmentId },
                { userDepartment: departmentId }
            ]
        };

        const activities = await ActivityLog.find(filter)
            .populate("userId", "name username role")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await ActivityLog.countDocuments(filter);

        res.json({
            data: activities,
            total,
            page,
            limit,
            hasMore: skip + activities.length < total
        });
    } catch (error) {
        console.error("getDepartmentActivities error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
// Get activities for a specific category (admin only)
const getCategoryActivities = async (req, res) => {
    try {
        // Only superadmin and admin can access category logs
        if (!["superadmin", "admin"].includes(req.user.role)) {
            return res.status(403).json({ message: "Not authorized" });
        }

        const categoryId = req.query.categoryId;
        if (!categoryId) {
            return res.status(400).json({ message: "Category ID is required" });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 15;
        const skip = (page - 1) * limit;

        let filter = {
            $or: [
                { targetId: categoryId, targetModel: "Category" },
                { "details.categoryId": categoryId }
            ]
        };

        if (req.query.action) {
            filter.action = req.query.action;
        }

        if (req.query.startDate) {
            filter.createdAt = { $gte: new Date(req.query.startDate) };
        }

        if (req.query.endDate) {
            filter.createdAt = { ...filter.createdAt, $lte: new Date(req.query.endDate) };
        }

        const activities = await ActivityLog.find(filter)
            .populate("userId", "name username role")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await ActivityLog.countDocuments(filter);

        res.json({
            data: activities,
            total,
            page,
            limit,
            hasMore: skip + activities.length < total
        });

    } catch (error) {
        console.error("getCategoryActivities error:", error);
        res.status(500).json({ message: "Server error: " + error.message });
    }
};
module.exports = {
    getMyActivityLog,
    getUserActivities,
    getDepartmentActivities,
    getCategoryActivities,  // Add this
    getAllActivityLogs,
    getActivityStats
};