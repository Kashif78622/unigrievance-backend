const express = require("express");
const router = express.Router();

const { protect, authorize } = require("../middleware/authMiddleware"); // ✅ Changed

const {
    getDepartmentAdmins,
    createDepartmentAdmin,
    updateDepartmentAdmin,
    toggleDepartmentAdminStatus
} = require("../controllers/deptAdminController");

router.get("/", protect, authorize("admin"), getDepartmentAdmins); // ✅ Changed

router.post("/add", protect, authorize("admin"), createDepartmentAdmin); // ✅ Changed

router.put("/update/:id", protect, authorize("admin"), updateDepartmentAdmin); // ✅ Changed

router.patch("/toggle/:id", protect, authorize("admin"), toggleDepartmentAdminStatus); // ✅ Changed

module.exports = router;