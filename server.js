require("dotenv").config();
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const path = require("path");
const fs = require("fs");

const connectDB = require("./config/db");

// ROUTES
const userRoutes = require("./routes/userRoutes");
const authRoutes = require("./routes/authRoutes");
const departmentRoutes = require("./routes/departmentRoutes");
const adminRoutes = require("./routes/adminRoutes");
const deptAdminRoutes = require("./routes/deptAdminRoutes");
const systemSettingsRoutes = require("./routes/systemSettingsRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const studentRoutes = require("./routes/studentRoutes");
const complaintRoutes = require("./routes/complaintRoutes");
const activityRoutes = require("./routes/activityRoutes");
const emailFormatRoutes = require("./routes/emailFormatRoutes");
const { attachLogger } = require("./middleware/activityMiddleware");

const app = express();

// CONNECT DB
connectDB();

// Create uploads directory if it doesn't exist
const uploadDirs = ['uploads', 'uploads/profile'];
uploadDirs.forEach(dir => {
    const uploadPath = path.join(__dirname, dir);
    if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
        console.log(`Created directory: ${dir}`);
    }
});

// ✅ UPDATED CORS for production
const allowedOrigins = [
    'http://localhost:3000',  // Local React dev
    'http://localhost:5173',  // Vite dev
    'https://your-frontend.onrender.com',  // Your frontend on Render (update after deploy)
    'https://your-frontend.vercel.app',   // If using Vercel
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, curl, postman)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) === -1) {
            // For development, you can allow all
            if (process.env.NODE_ENV === 'development') {
                return callback(null, true);
            }
            console.warn(`Origin ${origin} not allowed by CORS`);
            return callback(null, false);
        }
        return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(attachLogger);

// STATIC FILES
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ROUTES
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/admins", adminRoutes);
app.use("/api/deptadmins", deptAdminRoutes);
app.use("/api/settings", systemSettingsRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/activity", activityRoutes);
app.use("/api/settings/email-format", emailFormatRoutes);

// Health check endpoint (important for Render)
app.get("/api/health", (req, res) => {
    res.json({
        status: "ok",
        timestamp: new Date(),
        uptime: process.uptime()
    });
});

// TEST ROUTE
app.get("/", (req, res) => {
    res.send("UniGrievance API Running 🚀");
});

const PORT = process.env.PORT || 5000;

// =========================
// 🔥 SOCKET.IO SETUP
// =========================
const http = require("http");
const { Server } = require("socket.io");
const User = require("./models/User");

const server = http.createServer(app);

// ✅ Updated Socket.IO CORS for production
const io = new Server(server, {
    cors: {
        origin: process.env.NODE_ENV === 'production'
            ? [process.env.FRONTEND_URL, "https://your-frontend.onrender.com"]
            : "http://localhost:3000",
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
        credentials: true,
    },
});

// Make io available globally
global.io = io;

// Socket authentication middleware
io.use(async (socket, next) => {
    try {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error("Authentication error: No token provided"));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select("_id role department name");

        if (!user) {
            return next(new Error("Authentication error: User not found"));
        }

        socket.userId = user._id.toString();
        socket.userRole = user.role;
        socket.userDepartment = user.department?.toString();
        socket.userName = user.name || user.username;

        next();
    } catch (err) {
        console.error("Socket auth error:", err);
        next(new Error("Authentication error: Invalid token"));
    }
});

io.on("connection", (socket) => {
    console.log(`🔥 User connected: ${socket.userId} (${socket.userRole})`);

    socket.join(`user:${socket.userId}`);
    socket.join(`role:${socket.userRole}`);

    if (socket.userDepartment) {
        socket.join(`department:${socket.userDepartment}`);
    }

    socket.on("disconnect", () => {
        console.log(`❌ User disconnected: ${socket.userId}`);
    });
});

// Socket emitter functions
const emitNewComplaint = (complaint) => { if (io) io.emit("complaint:new", complaint); };
const emitComplaintUpdate = (complaintId, updateData) => { if (io) io.emit("complaint:update", { complaintId, ...updateData }); };
const emitVoteUpdate = (complaintId, votes) => { if (io) io.emit("vote:update", { complaintId, votes }); };
const emitCommentUpdate = (complaintId, commentCount) => { if (io) io.emit("comment:update", { complaintId, commentCount }); };
const emitViewUpdate = (complaintId, viewCount) => { if (io) io.emit("view:update", { complaintId, viewCount }); };
const emitStatusUpdate = (complaintId, status, statusHistory) => { if (io) io.emit("status:update", { complaintId, status, statusHistory }); };
const emitComplaintDelete = (complaintId) => { if (io) io.emit("complaint:delete", complaintId); };

global.emitNewComplaint = emitNewComplaint;
global.emitComplaintUpdate = emitComplaintUpdate;
global.emitVoteUpdate = emitVoteUpdate;
global.emitCommentUpdate = emitCommentUpdate;
global.emitViewUpdate = emitViewUpdate;
global.emitStatusUpdate = emitStatusUpdate;
global.emitComplaintDelete = emitComplaintDelete;

server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 Socket.IO server ready`);
});