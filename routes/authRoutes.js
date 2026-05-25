const express = require("express");
const router = express.Router();

// Import all functions directly
const {
    changePassword,
    adminLogin,
    sendAdminResetOtp,
    verifyAdminResetOtp,
    resetAdminPassword,
    studentLogin,
    sendPasswordResetOtp,
    verifyResetOtp,
    resetPassword,
    checkEmailAvailability,
    logout,
    getProfile,
    updateProfile
} = require("../controllers/authController");

const { protect } = require("../middleware/authMiddleware");

// Import controllers for OTP and Signup
let sendOtp, verifyOtp, signup;

try {
    sendOtp = require("../controllers/sendOtpController");
    console.log("✅ sendOtp loaded successfully, type:", typeof sendOtp);
} catch (err) {
    console.error("❌ Failed to load sendOtpController:", err.message);
    sendOtp = (req, res) => res.status(501).json({ message: "Send OTP endpoint not configured" });
}

try {
    verifyOtp = require("../controllers/verifyOtpController");
    console.log("✅ verifyOtp loaded successfully, type:", typeof verifyOtp);
} catch (err) {
    console.error("❌ Failed to load verifyOtpController:", err.message);
    verifyOtp = (req, res) => res.status(501).json({ message: "Verify OTP endpoint not configured" });
}

try {
    signup = require("../controllers/signupController");
    console.log("✅ signup loaded successfully, type:", typeof signup);
} catch (err) {
    console.error("❌ Failed to load signupController:", err.message);
    signup = (req, res) => res.status(501).json({ message: "Signup endpoint not configured" });
}

// Auth routes
router.post("/admin/login", adminLogin);
router.post("/admin/send-reset-otp", sendAdminResetOtp);
router.post("/admin/verify-reset-otp", verifyAdminResetOtp);
router.post("/admin/reset-password", resetAdminPassword);
router.post("/login", studentLogin);
router.post("/send-reset-otp", sendPasswordResetOtp);
router.post("/verify-reset-otp", verifyResetOtp);
router.post("/reset-password", resetPassword);

// Protected routes
router.post("/change-password", protect, changePassword);
router.get("/profile", protect, getProfile);
router.put("/update-profile", protect, updateProfile);
router.post("/logout", protect, logout);

// OTP and Signup routes (public)
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/signup", signup);
router.post("/check-email", checkEmailAvailability);

module.exports = router;