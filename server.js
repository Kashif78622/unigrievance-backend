require("dotenv").config();
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");

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

// MIDDLEWARES
app.use(cors());
app.use(express.json());
app.use(attachLogger);

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
// STATIC FILES
app.use("/uploads", express.static("uploads"));

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

const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
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

    // Join user's personal room
    socket.join(`user:${socket.userId}`);

    // Join role-based room
    socket.join(`role:${socket.userRole}`);

    // Join department room if department admin or student
    if (socket.userDepartment) {
        socket.join(`department:${socket.userDepartment}`);
    }

    socket.on("disconnect", () => {
        console.log(`❌ User disconnected: ${socket.userId}`);
    });
});

// =========================
// SOCKET EMITTER FUNCTIONS
// =========================

const emitNewComplaint = (complaint) => {
    if (!io) return;
    io.emit("complaint:new", complaint);
};

const emitComplaintUpdate = (complaintId, updateData) => {
    if (!io) return;
    io.emit("complaint:update", { complaintId, ...updateData });
};

const emitVoteUpdate = (complaintId, votes) => {
    if (!io) return;
    io.emit("vote:update", { complaintId, votes });
};

const emitCommentUpdate = (complaintId, commentCount) => {
    if (!io) return;
    io.emit("comment:update", { complaintId, commentCount });
};

const emitViewUpdate = (complaintId, viewCount) => {
    if (!io) return;
    io.emit("view:update", { complaintId, viewCount });
};

const emitStatusUpdate = (complaintId, status, statusHistory) => {
    if (!io) return;
    io.emit("status:update", { complaintId, status, statusHistory });
};

const emitComplaintDelete = (complaintId) => {
    if (!io) return;
    io.emit("complaint:delete", complaintId);
};

// Make emitter functions available globally
global.emitNewComplaint = emitNewComplaint;
global.emitComplaintUpdate = emitComplaintUpdate;
global.emitVoteUpdate = emitVoteUpdate;
global.emitCommentUpdate = emitCommentUpdate;
global.emitViewUpdate = emitViewUpdate;
global.emitStatusUpdate = emitStatusUpdate;
global.emitComplaintDelete = emitComplaintDelete;

server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 Socket.IO server ready`);
});