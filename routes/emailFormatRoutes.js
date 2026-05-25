// routes/emailFormatRoutes.js
const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const {
    getStudentEmailFormat,
    saveStudentEmailFormat
} = require("../controllers/emailFormatController");

// Superadmin only routes for student email format
router.get("/student", getStudentEmailFormat);
router.post("/student", protect, authorize("superadmin"), saveStudentEmailFormat);

module.exports = router;