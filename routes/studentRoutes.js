// routes/studentRoutes.js
const express = require("express");
const router = express.Router();

const { protect, authorize } = require("../middleware/authMiddleware");

const {
    getStudents,
    toggleStudent,
    updateStudent,
    sendEmailToStudent  // Add this import
} = require("../controllers/studentController");

router.get("/", protect, authorize("admin", "departmentadmin"), getStudents);
router.patch("/toggle/:id", protect, authorize("admin", "departmentadmin"), toggleStudent);
router.put("/update/:id", protect, authorize("admin", "departmentadmin"), updateStudent);
router.post("/send-email", protect, authorize("admin", "departmentadmin"), sendEmailToStudent);  // Add this route

module.exports = router;