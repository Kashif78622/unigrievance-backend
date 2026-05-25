const express = require("express");
const router = express.Router();

const {
    getSettings,
    updateSettings,
    endSemester
} = require("../controllers/systemSettingsController");

const { protect } = require("../middleware/authMiddleware"); // ✅ Changed

router.get("/", getSettings);
router.put("/", protect, updateSettings); // ✅ Changed
router.put("/end-semester", protect, endSemester); // ✅ Changed

module.exports = router;