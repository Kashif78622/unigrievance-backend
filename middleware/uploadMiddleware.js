const multer = require("multer");
const path = require("path");

/* STORAGE */
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/profile"); // folder
    },
    filename: (req, file, cb) => {
        const uniqueName =
            Date.now() + "-" + Math.round(Math.random() * 1e9);

        cb(null, uniqueName + path.extname(file.originalname));
    },
});

/* FILE FILTER */
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith("image")) {
        cb(null, true);
    } else {
        cb(new Error("Only images allowed"), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
});

module.exports = upload;