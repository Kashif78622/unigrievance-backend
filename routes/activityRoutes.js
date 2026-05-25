// routes/activityRoutes.js
const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const {
    getMyActivityLog,
    getUserActivities,
    getDepartmentActivities,
    getAllActivityLogs,
    getActivityStats,
    getCategoryActivities
} = require("../controllers/activityLogController");

// User routes
router.get("/my-activities", protect, getMyActivityLog);

// Admin only routes - IMPORTANT: This must be before /all-activities
router.get("/user-activities", protect, authorize("admin", "superadmin", "departmentadmin"), getUserActivities);
router.get("/department-activities", protect, authorize("admin", "superadmin"), getDepartmentActivities);
router.get("/all-activities", protect, authorize("admin", "superadmin"), getAllActivityLogs);
router.get("/stats", protect, authorize("admin", "superadmin"), getActivityStats);
router.get("/category-activities", protect, authorize("admin", "superadmin"), getCategoryActivities);

module.exports = router;