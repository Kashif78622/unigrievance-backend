const express = require("express");
const router = express.Router();

const {
    getDepartments,
    addDepartment,
    toggleDepartmentStatus,
    updateDepartment,
    getDepartmentsByIds
} = require("../controllers/departmentController");

const { protect } = require("../middleware/authMiddleware"); // ✅ Changed

router.get("/", getDepartments);
router.post("/add", protect, addDepartment); // ✅ Changed
router.put("/update/:id", protect, updateDepartment); // ✅ Changed
router.patch("/toggle/:id", protect, toggleDepartmentStatus); // ✅ Changed
router.get("/by-ids", getDepartmentsByIds);

module.exports = router;