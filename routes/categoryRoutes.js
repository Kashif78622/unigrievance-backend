const express = require("express");
const router = express.Router();

const controller = require("../controllers/categoryController");
const { protect } = require("../middleware/authMiddleware"); // ✅ Changed

router.get("/", protect, controller.getCategories); // ✅ Changed
router.post("/add", protect, controller.addCategory); // ✅ Changed
router.put("/update/:id", protect, controller.updateCategory); // ✅ Changed
router.patch("/toggle/:id", protect, controller.toggleCategory); // ✅ Changed
router.get("/by-ids", protect, controller.getCategoriesByIds);

module.exports = router;