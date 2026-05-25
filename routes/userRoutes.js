const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware"); // ✅ Destructure protect
const upload = require("../middleware/uploadMiddleware");

const {
    getMe,
    updateProfileImage,
    disableAccount,
    getProfileSettings,
    updateProfileSettings,
    getUserById,
    removeProfileImage
} = require("../controllers/userController");

router.get("/me", protect, getMe);  // ✅ Use protect instead of authMiddleware
router.post("/disable-account", protect, disableAccount);  // ✅ Use protect
router.get("/profile-settings", protect, getProfileSettings);  // ✅ Use protect
router.put("/profile-settings", protect, updateProfileSettings);  // ✅ Use protect
router.get("/:id", protect, getUserById);  // ✅ Use protect
// In userRoutes.js
router.delete("/remove-profile-image", protect, removeProfileImage);
router.put(
    "/upload-profile",
    protect,  // ✅ Use protect
    upload.single("image"),
    updateProfileImage
);

module.exports = router;