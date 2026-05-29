const express = require("express");
const router = express.Router();

const { protect, authorize } = require("../middleware/authMiddleware");

const {
    getAdmins,
    createAdmin,
    updateAdmin,
    toggleAdminStatus,
    sendEmailToAdmin  // Add this import
} = require("../controllers/adminController");

router.get("/", protect, authorize("admin", "superadmin"), getAdmins);
router.post("/add", protect, authorize("superadmin"), createAdmin);
router.put("/update/:id", protect, authorize("admin", "superadmin"), updateAdmin);
router.patch("/toggle/:id", protect, authorize("superadmin"), toggleAdminStatus);
router.post("/send-email", protect, authorize("superadmin"), sendEmailToAdmin);  // Add this route - only superadmin can send emails to admins

module.exports = router;