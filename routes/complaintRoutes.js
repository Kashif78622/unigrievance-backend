const express = require("express");
const router = express.Router();

const { createComplaint } = require("../controllers/complaintController");
const { getAllComplaints } = require("../controllers/complaintController");
const { getFeedComplaints } = require("../controllers/complaintController");
const { getComplaintById } = require("../controllers/complaintController");
const { markAsRead } = require("../controllers/complaintController");
const { getComplaintVisitors } = require("../controllers/complaintController");
const { trackVisitor } = require("../controllers/complaintController");
const { takeAction } = require("../controllers/complaintController");
const { toggleComplaintVisibility } = require("../controllers/complaintController");
const { updateComplaint } = require("../controllers/complaintController");
const { toggleVote } = require("../controllers/complaintController");
const { addComment } = require("../controllers/complaintController");
const { updateComment } = require("../controllers/complaintController");
const { toggleCommentVisibility } = require("../controllers/complaintController");
const { addView } = require("../controllers/complaintController");

const { protect, authorize } = require("../middleware/authMiddleware"); // ✅ Changed
const multer = require("multer");

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    }
});

const upload = multer({ storage });

router.get("/feed", protect, getFeedComplaints); // ✅ Changed
router.get("/", protect, getAllComplaints); // ✅ Changed
router.get("/:id", protect, getComplaintById); // ✅ Changed
router.put("/read/:id", protect, markAsRead); // ✅ Changed
router.get("/:id/visitors", protect, getComplaintVisitors); // ✅ Changed
router.post("/:id/track-visitor", protect, trackVisitor); // ✅ Changed
router.patch("/toggle-visibility/:id", protect, toggleComplaintVisibility); // ✅ Changed
router.put("/:id", protect, upload.array("media"), updateComplaint); // ✅ Changed
router.put("/update/:id", protect, upload.array("media"), updateComplaint); // ✅ Changed
router.patch("/take-action/:id", protect, authorize("admin", "superadmin", "departmentadmin"), upload.array("media", 5), takeAction); // ✅ Changed
router.put("/vote/:id", protect, toggleVote); // ✅ Changed
router.post("/comment/:id", protect, addComment); // ✅ Changed
router.put("/comments/:id", protect, updateComment); // ✅ Changed
router.put("/comments/toggle/:id", protect, toggleCommentVisibility); // ✅ Changed
router.post("/view/:id", protect, addView); // ✅ Changed
router.post("/create", protect, upload.array("media"), createComplaint); // ✅ Changed

module.exports = router;