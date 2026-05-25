const express = require("express");
const router = express.Router();

const { protect, authorize } = require("../middleware/authMiddleware"); // ✅ Changed

const {
    getAdmins,
    createAdmin,
    updateAdmin,
    toggleAdminStatus
} = require("../controllers/adminController");

router.get("/", protect, authorize("admin", "superadmin"), getAdmins); // ✅ Changed
router.post("/add", protect, authorize("superadmin"), createAdmin); // ✅ Changed
router.put("/update/:id", protect, authorize("admin", "superadmin"), updateAdmin); // ✅ Changed
router.patch("/toggle/:id", protect, authorize("superadmin"), toggleAdminStatus); // ✅ Changed

module.exports = router;