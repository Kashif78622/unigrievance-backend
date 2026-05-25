// middleware/authMiddleware.js
const jwt = require("jsonwebtoken");
const User = require("../models/user"); // ✅ ADD THIS

// ✅ PROTECT middleware (renamed from authMiddleware)
const protect = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ message: "No token provided" });
    }

    try {
        const token = authHeader.startsWith("Bearer ")
            ? authHeader.split(" ")[1]
            : authHeader;

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // ✅ IMPORTANT FIX: Fetch full user from DB
        const user = await User.findById(decoded.id).select("-password");

        if (!user) {
            return res.status(401).json({ message: "User not found" });
        }

        req.user = user; // ✅ now contains department, role, etc.
        next();

    } catch (error) {
        console.error("JWT Error:", error.message);
        res.status(401).json({ message: "Invalid token" });
    }
};

// ✅ AUTHORIZE middleware for role-based access
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                message: `Role ${req.user.role} is not authorized to access this route`
            });
        }
        next();
    };
};

// ✅ Export both functions
module.exports = { protect, authorize };