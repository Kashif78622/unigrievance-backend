const Complaint = require("../models/Complaint");
const Vote = require("../models/Vote");
const Comment = require("../models/Comment");
const View = require("../models/View");
const Visitor = require("../models/Visitor");
const ComplaintStats = require("../models/ComplaintStats");
const Category = require("../models/Category");
const User = require("../models/User");
const ReadStatus = require("../models/ReadStatus");
const axios = require("axios");
const ActivityLogger = require("../utils/activityLogger");

const getLogger = (req) => new ActivityLogger(req);

exports.getComplaintById = async (req, res) => {
    try {
        const complaint = await Complaint.findById(req.params.id)
            .populate("user", "name profileImage role _id hideProfilePicture anonymousPost department isActive")
            .populate("department", "name tag isActive")
            .populate("category", "name isActive");

        if (!complaint) {
            return res.status(404).json({ message: "Complaint not found" });
        }

        // Track complaint view
        const userId = req.user?.id;
        if (userId) {
            const logger = getLogger(req);
            await logger.log(req.user, "COMPLAINT_VIEW", complaint, {
                complaintSubject: complaint.subject,
                complaintStatus: complaint.status
            });
        }

        // 🔥 TRACK VISITOR (separate from view tracking)
        let hasVisited = false;
        let visitorCount = 0;

        if (userId) {
            const userRole = req.user?.role;
            const userName = req.user?.name || req.user?.username || "Unknown";

            const existingVisitor = await Visitor.findOne({
                complaintId: complaint._id,
                userId: userId
            });

            if (!existingVisitor) {
                const visitor = await Visitor.create({
                    complaintId: complaint._id,
                    userId: userId,
                    userName: userName,
                    userRole: userRole
                });

                await Complaint.findByIdAndUpdate(complaint._id, {
                    $addToSet: { visitors: visitor._id }
                });
                hasVisited = false;
            } else {
                hasVisited = true;
            }

            visitorCount = await Visitor.countDocuments({ complaintId: complaint._id });
        }

        // ✅ VOTES
        const votes = await Vote.find({ complaintId: complaint._id })
            .populate({
                path: "userId",
                select: "name profileImage role hideProfilePicture anonymousVote department",
                populate: {
                    path: "department",
                    select: "name tag"
                }
            });

        const votesList = votes.map(v => ({
            user: v.userId,
            voteType: v.voteType,
            createdAt: v.createdAt,
            anonymousVote: v.userId?.anonymousVote,
            hideProfilePicture: v.userId?.hideProfilePicture
        }));

        // ✅ COMMENTS
        const comments = await Comment.find({ complaintId: complaint._id })
            .populate({
                path: "userId",
                select: "name profileImage role hideProfilePicture anonymousComment department",
                populate: {
                    path: "department",
                    select: "name tag"
                }
            });

        const commentsList = comments.map(c => ({
            _id: c._id,
            user: c.userId,
            text: c.text,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
            isVisible: c.isVisible,
            anonymousComment: c.userId?.anonymousComment,
            hideProfilePicture: c.userId?.hideProfilePicture
        }));

        // ✅ VIEWS (for view count)
        const views = await View.find({ complaintId: complaint._id })
            .populate({
                path: "userId",
                select: "name profileImage role department",
                populate: {
                    path: "department",
                    select: "name tag"
                }
            });

        const viewedBy = views.map(v => ({
            user: v.userId,
            createdAt: v.createdAt,
            hideProfilePicture: v.userId?.hideProfilePicture
        }));

        // ✅ READ HISTORY
        const readHistory = await ReadStatus.find({ complaintId: complaint._id })
            .populate({
                path: "userId",
                select: "name role profileImage department",
                populate: {
                    path: "department",
                    select: "name tag isActive"
                }
            })
            .sort({ createdAt: -1 });

        const formattedReadHistory = readHistory.map(history => {
            const userName = history.userName || history.userId?.name || "Unknown User";
            const userRole = history.userRole || history.userId?.role || "Unknown";

            return {
                user: {
                    _id: history.userId?._id,
                    name: userName,
                    role: userRole,
                    profileImage: history.userId?.profileImage,
                    department: history.userId?.department
                        ? {
                            _id: history.userId.department._id,
                            name: history.userId.department.name,
                            tag: history.userId.department.tag,
                            isActive: history.userId.department.isActive
                        }
                        : null,
                    isActive: history.userId?.isActive
                },
                createdAt: history.createdAt,
                isRead: history.isRead
            };
        });

        // ✅ ADMIN ACTIONS
        const adminActionsWithUsers = await Promise.all(
            (complaint.adminActions || []).map(async (action) => {
                let populatedAction = { ...action.toObject ? action.toObject() : action };
                if (action.performedBy) {
                    const user = await User.findById(action.performedBy)
                        .select("name role department")
                        .populate("department", "name tag isActive");
                    populatedAction.performedBy = user;
                }
                return populatedAction;
            })
        );

        // ✅ STATUS HISTORY
        const statusHistoryWithUsers = await Promise.all(
            (complaint.statusHistory || []).map(async (history) => {
                let populatedHistory = { ...history.toObject ? history.toObject() : history };
                if (history.changedBy) {
                    const user = await User.findById(history.changedBy)
                        .select("name role department")
                        .populate("department", "name tag isActive");
                    populatedHistory.changedBy = user;
                }
                return populatedHistory;
            })
        );

        const recentVisitors = await Visitor.find({ complaintId: complaint._id })
            .populate("userId", "name role profileImage")
            .sort({ visitedAt: -1 })
            .limit(20);

        return res.json({
            ...complaint.toObject(),
            isAnonymousPost: complaint.user?.anonymousPost || false,
            hideProfilePicture: complaint.user?.hideProfilePicture || false,
            votesList,
            commentsList,
            viewedBy,
            readHistory: formattedReadHistory,
            adminActions: adminActionsWithUsers,
            statusHistory: statusHistoryWithUsers,
            visitorCount: visitorCount,
            hasVisited: hasVisited,
            recentVisitors: recentVisitors
        });

    } catch (error) {
        console.error("getComplaintById ERROR:", error);
        return res.status(500).json({ message: "Server error" });
    }
};

exports.getAllComplaints = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const userId = req.user?.id?.toString();
        const userRole = req.user?.role;
        const userDepartmentId = req.user?.department?.toString();

        const {
            department,
            category,
            emotion,
            status,
            dateFrom,
            dateTo
        } = req.query;

        let filter = {};

        // =========================
        // 🔥 VISIBILITY RULES BASED ON ROLE
        // =========================

        if (userRole === "admin" || userRole === "superadmin") {
            filter = {};
        }
        else if (userRole === "departmentadmin") {
            filter = {
                $or: [
                    { user: userId },
                    {
                        department: userDepartmentId,
                        "user.role": "student"
                    },
                    {
                        department: userDepartmentId,
                        isActive: true
                    }
                ]
            };
        }
        else if (userRole === "student") {
            filter = {
                $or: [
                    { user: userId },
                    {
                        department: userDepartmentId,
                        isActive: true
                    }
                ]
            };
        }
        else {
            filter = { isActive: true };
        }

        if (department) {
            filter.$and = filter.$and || [];
            filter.$and.push({ department: { $in: [department] } });
        }

        if (category) {
            filter.$and = filter.$and || [];
            filter.$and.push({ category });
        }

        if (emotion) {
            filter.$and = filter.$and || [];
            filter.$and.push({ emotion });
        }

        if (status) {
            filter.$and = filter.$and || [];
            filter.$and.push({ status });
        }

        if (dateFrom || dateTo) {
            filter.createdAt = {};
            if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
            if (dateTo) filter.createdAt.$lte = new Date(dateTo);
        }

        const complaints = await Complaint.find(filter)
            .populate("user", "name profileImage role _id hideProfilePicture isActive anonymousPost department")
            .populate("department", "name tag isActive")
            .populate("category", "name isActive")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Complaint.countDocuments(filter);
        const complaintIds = complaints.map(c => c._id);

        const readStatuses = await ReadStatus.find({
            complaintId: { $in: complaintIds },
            userId: userId
        });

        const readMap = {};
        readStatuses.forEach(r => {
            readMap[r.complaintId.toString()] = r.isRead;
        });

        const stats = await ComplaintStats.find({
            _id: { $in: complaintIds }
        });

        const userVotes = await Vote.find({
            complaintId: { $in: complaintIds },
            userId
        });

        const userVoteMap = {};
        userVotes.forEach(v => {
            userVoteMap[v.complaintId.toString()] = v.voteType;
        });

        const statsMap = {};
        stats.forEach(s => {
            statsMap[s._id.toString()] = s;
        });

        const formatted = complaints.map(c => {
            const cid = c._id.toString();
            const stat = statsMap[cid];
            const complaintObj = c.toObject();

            return {
                ...complaintObj,
                upvotes: stat?.upvoteCount || 0,
                downvotes: stat?.downvoteCount || 0,
                commentCount: stat?.commentCount || 0,
                viewCount: stat?.viewCount || 0,
                userVote: userVoteMap[cid] || null,
                isRead: readMap[cid] || false,
                disabledByUserId: c.disabledByUserId,  // ✅ Add user ID of who disabled
                disabledByName: c.disabledByName,      // ✅ Add name of who disabled
                disabledBy: c.disabledBy,              // ✅ Add role of who disabled
                emotionIsActive: true,
                statusIsActive: c.status !== "Disabled",
                categoryIsActive: complaintObj.category?.isActive !== false,
                user: complaintObj.user ? {
                    ...complaintObj.user,
                    isActive: complaintObj.user?.isActive !== false
                } : null
            };
        });

        const hasMore = skip + complaints.length < total;

        res.json({
            data: formatted,
            total,
            page,
            limit,
            hasMore
        });

    } catch (err) {
        console.error("getAllComplaints ERROR:", err);
        res.status(500).json({ message: "Server error" });
    }
};

exports.trackVisitor = async (req, res) => {
    try {
        const complaintId = req.params.id;
        const userId = req.user?.id;
        const userRole = req.user?.role;
        const userName = req.user?.name || req.user?.username || "Unknown";

        if (!userId) {
            return res.json({ success: true, skipped: true });
        }

        const existingVisitor = await Visitor.findOne({ complaintId, userId });

        if (!existingVisitor) {
            const visitor = await Visitor.create({
                complaintId,
                userId,
                userName,
                userRole
            });

            await Complaint.findByIdAndUpdate(complaintId, {
                $addToSet: { visitors: visitor._id }
            });

            // Log visitor tracking
            const logger = getLogger(req);
            await logger.log(req.user, "COMPLAINT_VISITED", { _id: complaintId }, {
                complaintId: complaintId,
                visitorType: "new"
            });
        }

        const visitorCount = await Visitor.countDocuments({ complaintId });

        res.json({
            success: true,
            isNewVisitor: !existingVisitor,
            visitorCount,
            message: existingVisitor ? "Already visited" : "Visitor tracked"
        });

    } catch (error) {
        console.error("trackVisitor ERROR:", error);
        res.status(500).json({ message: "Server error" });
    }
};

exports.getComplaintVisitors = async (req, res) => {
    try {
        const complaintId = req.params.id;
        const userId = req.user?.id;
        const userRole = req.user?.role;

        const complaint = await Complaint.findById(complaintId);
        if (!complaint) {
            return res.status(404).json({ message: "Complaint not found" });
        }

        const isAdmin = ["admin", "superadmin"].includes(userRole);
        const isOwner = complaint.user.toString() === userId;

        if (!isAdmin && !isOwner) {
            return res.status(403).json({ message: "Not authorized to view visitors" });
        }

        const visitors = await Visitor.find({ complaintId })
            .populate("userId", "name email profileImage role")
            .sort({ visitedAt: -1 });

        res.json({
            success: true,
            count: visitors.length,
            visitors
        });

    } catch (error) {
        console.error("getComplaintVisitors ERROR:", error);
        res.status(500).json({ message: "Server error" });
    }
};

exports.getFeedComplaints = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        const userId = req.user?.id?.toString();
        const userRole = req.user?.role;
        const userDepartmentId = req.user?.department?.toString();

        const {
            department,
            category,
            emotion,
            status,
            dateFrom,
            dateTo
        } = req.query;

        let filter = {};

        if (userRole === "admin" || userRole === "superadmin") {
            filter = {};
        }
        else if (userRole === "departmentadmin") {
            const studentsInDepartment = await User.find({
                department: userDepartmentId,
                role: "student"
            }).select("_id");

            const studentIds = studentsInDepartment.map(s => s._id.toString());
            const allowedUserIds = [...studentIds, userId];

            filter = {
                $or: [
                    { isActive: true },
                    {
                        isActive: false,
                        user: { $in: allowedUserIds }
                    }
                ]
            };
        }
        else if (userRole === "student") {
            filter = {
                $or: [
                    { isActive: true },
                    { isActive: false, user: userId }
                ]
            };
        }
        else {
            filter = { isActive: true };
        }

        if (department) {
            filter.$and = filter.$and || [];
            filter.$and.push({ department: { $in: [department] } });
        }

        if (category) {
            filter.$and = filter.$and || [];
            filter.$and.push({ category });
        }

        if (emotion) {
            filter.$and = filter.$and || [];
            filter.$and.push({ emotion });
        }

        if (status) {
            filter.$and = filter.$and || [];
            filter.$and.push({ status });
        }

        if (dateFrom || dateTo) {
            filter.createdAt = {};
            if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
            if (dateTo) filter.createdAt.$lte = new Date(dateTo);
        }

        const allComplaintIds = await Complaint.find(filter).distinct('_id');

        if (allComplaintIds.length === 0) {
            return res.json({
                data: [],
                total: 0,
                page,
                limit,
                hasMore: false
            });
        }

        const complaintsBasicInfo = await Complaint.find({
            _id: { $in: allComplaintIds }
        }).select('_id status isActive createdAt');

        const complaintStatusMap = new Map();
        complaintsBasicInfo.forEach(c => {
            complaintStatusMap.set(c._id.toString(), {
                status: c.status,
                isActive: c.isActive,
                createdAt: c.createdAt
            });
        });

        const visitorStatuses = await Visitor.find({
            complaintId: { $in: allComplaintIds },
            userId: userId
        });

        const visitedSet = new Set();
        visitorStatuses.forEach(v => {
            visitedSet.add(v.complaintId.toString());
        });

        const unvisitedIds = [];
        const visitedIds = [];
        const disabledIds = [];

        for (const complaintId of allComplaintIds) {
            const complaintInfo = complaintStatusMap.get(complaintId.toString());
            const isDisabled = complaintInfo?.isActive === false;

            if (isDisabled) {
                disabledIds.push(complaintId);
            } else if (visitedSet.has(complaintId.toString())) {
                visitedIds.push(complaintId);
            } else {
                unvisitedIds.push(complaintId);
            }
        }

        const unvisitedComplaintsBasic = await Complaint.find({
            _id: { $in: unvisitedIds }
        }).select('_id createdAt');

        unvisitedComplaintsBasic.sort((a, b) => {
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        const sortedUnvisitedIds = unvisitedComplaintsBasic.map(c => c._id);

        const visitedComplaintsBasic = await Complaint.find({
            _id: { $in: visitedIds }
        }).select('_id createdAt');

        visitedComplaintsBasic.sort((a, b) => {
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        const sortedVisitedIds = visitedComplaintsBasic.map(c => c._id);

        const disabledComplaintsBasic = await Complaint.find({
            _id: { $in: disabledIds }
        }).select('_id createdAt');

        disabledComplaintsBasic.sort((a, b) => {
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        const sortedDisabledIds = disabledComplaintsBasic.map(c => c._id);

        const sortedAllIds = [...sortedUnvisitedIds, ...sortedVisitedIds, ...sortedDisabledIds];
        const total = sortedAllIds.length;

        const paginatedIds = sortedAllIds.slice(skip, skip + limit);

        const complaints = await Complaint.find({
            _id: { $in: paginatedIds }
        })
            .populate({
                path: "user",
                select: "name profileImage role _id hideProfilePicture isActive anonymousPost department",
                populate: {
                    path: "department",
                    select: "name tag _id"
                }
            })
            .populate("department", "name tag isActive")
            .populate("category", "name isActive");

        const complaintMap = new Map();
        complaints.forEach(c => {
            complaintMap.set(c._id.toString(), c);
        });

        const sortedComplaints = paginatedIds.map(id => complaintMap.get(id.toString())).filter(c => c);

        const complaintIds = sortedComplaints.map(c => c._id);

        const readStatuses = await ReadStatus.find({
            complaintId: { $in: complaintIds },
            userId: userId
        });

        const readMap = {};
        readStatuses.forEach(r => {
            readMap[r.complaintId.toString()] = r.isRead;
        });

        const stats = await ComplaintStats.find({
            _id: { $in: complaintIds }
        });

        const userVotes = await Vote.find({
            complaintId: { $in: complaintIds },
            userId
        });

        const statsMap = {};
        stats.forEach(s => {
            statsMap[s._id.toString()] = s;
        });

        const userVoteMap = {};
        userVotes.forEach(v => {
            userVoteMap[v.complaintId.toString()] = v.voteType;
        });

        const visitorCounts = await Visitor.aggregate([
            { $match: { complaintId: { $in: complaintIds } } },
            { $group: { _id: "$complaintId", count: { $sum: 1 } } }
        ]);

        const visitorCountMap = {};
        visitorCounts.forEach(vc => {
            visitorCountMap[vc._id.toString()] = vc.count;
        });

        const formatted = sortedComplaints.map(c => {
            const cid = c._id.toString();
            const stat = statsMap[cid];
            const complaintObj = c.toObject();
            const complaintInfo = complaintStatusMap.get(cid);
            const isDisabled = complaintInfo?.isActive === false;

            const isRead = readMap[cid] || false;
            const hasVisited = visitedSet.has(cid);
            const showNewBadge = !isDisabled && !hasVisited && !isRead;

            return {
                ...complaintObj,
                upvotes: stat?.upvoteCount || 0,
                downvotes: stat?.downvoteCount || 0,
                commentCount: stat?.commentCount || 0,
                viewCount: stat?.viewCount || 0,
                userVote: userVoteMap[cid] || null,
                isRead: isRead,
                hasVisited: hasVisited,
                visitorCount: visitorCountMap[cid] || 0,
                showNewBadge: showNewBadge,
                disabledByUserId: c.disabledByUserId,  // ✅ Add user ID of who disabled
                disabledByName: c.disabledByName,      // ✅ Add name of who disabled
                disabledBy: c.disabledBy,              // ✅ Add role of who disabled
                user: complaintObj.user ? {
                    ...complaintObj.user,
                    hideProfilePicture: complaintObj.user?.hideProfilePicture || false,
                    anonymousPost: complaintObj.user?.anonymousPost || false,
                    isActive: complaintObj.user?.isActive !== false
                } : null,
                emotionIsActive: true,
                statusIsActive: c.status !== "Disabled",
                categoryIsActive: complaintObj.category?.isActive !== false,
                departmentIsActive: complaintObj.department?.every(d => d.isActive !== false)
            };
        });

        const hasMore = skip + limit < total;

        res.json({
            data: formatted,
            total,
            page,
            limit,
            hasMore
        });

    } catch (err) {
        console.error("getFeedComplaints ERROR:", err);
        res.status(500).json({ message: "Server error" });
    }
};

exports.markAsRead = async (req, res) => {
    try {
        const complaintId = req.params.id;
        const userId = req.user.id;
        const userRole = req.user.role;
        const userName = req.user.name || req.user.username || "Unknown";

        await ReadStatus.findOneAndUpdate(
            { complaintId, userId },
            {
                isRead: true,
                userName: userName,
                userRole: userRole
            },
            { upsert: true, new: true }
        );

        const complaint = await Complaint.findById(complaintId);

        if (!complaint) {
            return res.status(404).json({ message: "Complaint not found" });
        }

        if (complaint.status !== "Unread") {
            return res.json({ success: true, status: complaint.status });
        }

        const creator = await User.findById(complaint.user);
        let shouldChangeStatus = false;

        if (["admin", "superadmin"].includes(userRole)) {
            shouldChangeStatus = true;
        }
        else if (
            creator.role === "student" &&
            userRole === "departmentadmin" &&
            complaint.department.some(
                (d) => d.toString() === req.user.department.toString()
            )
        ) {
            shouldChangeStatus = true;
        }
        else if (
            creator.role === "departmentadmin" &&
            ["admin", "superadmin"].includes(userRole)
        ) {
            shouldChangeStatus = true;
        }

        if (shouldChangeStatus) {
            const oldStatus = complaint.status;
            complaint.status = "Pending";

            complaint.statusHistory.push({
                status: "Pending",
                changedBy: userId,
                changedAt: new Date()
            });

            await complaint.save();

            // Log status change
            const logger = getLogger(req);
            await logger.logComplaintStatusChange(req.user, complaint, oldStatus, "Pending", {
                markAsRead: true,
                readerRole: userRole
            });
        }

        res.json({
            success: true,
            status: complaint.status
        });

    } catch (err) {
        console.error("markAsRead ERROR:", err);
        res.status(500).json({ message: "Server error" });
    }
};

exports.takeAction = async (req, res) => {
    try {
        const { status, comment, assignTo, isActive } = req.body;
        const userId = req.user.id;
        const complaint = await Complaint.findById(req.params.id);

        if (!complaint) {
            return res.status(404).json({ message: "Complaint not found" });
        }

        const previousStatus = complaint.status;
        const previousActiveStatus = complaint.isActive;
        const mediaFiles = req.files ? req.files.map(file => file.filename) : [];

        // Handle complaint enable/disable
        let activeStatusChanged = false;
        if (isActive !== undefined && isActive !== complaint.isActive) {
            const wasActive = complaint.isActive;
            complaint.isActive = isActive;
            activeStatusChanged = true;

            // Set disabled by info if disabling
            if (!isActive) {
                complaint.disabledBy = req.user.role;
                complaint.disabledAt = new Date();
                complaint.disabledByUserId = userId;
                complaint.disabledByName = req.user.name || req.user.username;
            } else {
                // Clear disabled info if enabling
                complaint.disabledBy = null;
                complaint.disabledAt = null;
                complaint.disabledByUserId = null;
                complaint.disabledByName = null;
            }

            // Record enable/disable event in status history
            complaint.statusHistory.push({
                status: isActive ? "Enabled" : "Disabled",
                changedBy: userId,
                changedAt: new Date()
            });

            // Log the enable/disable action
            const logger = getLogger(req);
            const action = isActive ? "COMPLAINT_ENABLE" : "COMPLAINT_DISABLE";
            await logger.log(req.user, action, complaint, {
                previousStatus: wasActive,
                newStatus: isActive,
                complaintSubject: complaint.subject,
                performedVia: "take_action_modal"
            });
        }

        // Handle status change
        let statusChanged = false;
        if (status && status !== complaint.status) {
            // Check if trying to change status of disabled complaint
            if (!complaint.isActive && !isActive) {
                return res.status(400).json({
                    message: "Cannot change status of a disabled complaint. Please enable it first."
                });
            }

            complaint.status = status;
            complaint.statusHistory.push({
                status,
                changedBy: userId,
                changedAt: new Date()
            });
            statusChanged = true;

            // Log status change
            const logger = getLogger(req);
            await logger.logComplaintStatusChange(req.user, complaint, previousStatus, status, {
                actionNote: comment,
                mediaFiles: mediaFiles,
                performedVia: "take_action_modal"
            });
        }

        // Handle admin action (comment/media)
        let adminActionAdded = false;
        if (comment || mediaFiles.length > 0) {
            // Add to admin actions
            complaint.adminActions.push({
                action: statusChanged ? "Status Changed" : (comment ? "Comment" : "Media Added"),
                performedBy: userId,
                note: comment || "",
                previousStatus: statusChanged ? previousStatus : undefined,
                newStatus: statusChanged ? status : undefined,
                media: mediaFiles,
                createdAt: new Date()
            });
            adminActionAdded = true;

            // Log admin action
            if (!statusChanged) {
                const logger = getLogger(req);
                await logger.log(req.user, "ADMIN_COMMENT", complaint, {
                    comment: comment,
                    mediaFiles: mediaFiles,
                    complaintSubject: complaint.subject
                });
            }
        }

        // Save the complaint
        await complaint.save();

        // Emit socket events for real-time updates
        try {
            if (statusChanged && global.emitStatusUpdate && typeof global.emitStatusUpdate === 'function') {
                global.emitStatusUpdate(complaint._id, complaint.status, complaint.statusHistory);
            }
            if (activeStatusChanged && global.emitComplaintUpdate && typeof global.emitComplaintUpdate === 'function') {
                global.emitComplaintUpdate(complaint._id, { isActive: complaint.isActive });
            }
        } catch (err) {
            console.error("Socket emit error:", err);
        }

        res.json({
            message: "Action applied successfully",
            complaint: {
                _id: complaint._id,
                status: complaint.status,
                isActive: complaint.isActive,
                disabledBy: complaint.disabledBy,
                disabledAt: complaint.disabledAt,
                disabledByName: complaint.disabledByName
            }
        });

    } catch (error) {
        console.error("Take action error:", error);
        res.status(500).json({ message: "Server error: " + error.message });
    }
};

exports.createComplaint = async (req, res) => {
    try {
        const { subject, description, category } = req.body;

        let departments = req.body.department;
        if (!departments) {
            departments = [];
        } else if (!Array.isArray(departments)) {
            departments = [departments];
        }

        let aiEmotion = "Neutral";
        let confidence = 0;

        try {
            const aiRes = await axios.post("http://localhost:5001/analyze", {
                text: description
            });

            console.log("AI Response:", aiRes.data);
            aiEmotion = aiRes.data.emotion;
            confidence = aiRes.data.confidence || 0;
        } catch (err) {
            console.log("AI ERROR:", err.message);
            aiEmotion = "Neutral";
        }

        const emotionMapping = {
            "Urgency": "Urgent",
            "Anger": "Angry",
            "Frustration": "Frustrated",
            "Sadness": "Sad",
            "Neutral": "Neutral",
            "Positive": "Satisfied"
        };

        let mappedEmotion = emotionMapping[aiEmotion] || "Neutral";
        const emotionVariations = {
            "urgent": "Urgent",
            "emergency": "Urgent",
            "angry": "Angry",
            "frustrated": "Frustrated",
            "sad": "Sad",
            "positive": "Satisfied",
            "happy": "Satisfied"
        };

        if (!emotionMapping[aiEmotion]) {
            const lowerEmotion = aiEmotion.toLowerCase();
            mappedEmotion = emotionVariations[lowerEmotion] || "Neutral";
        }

        const priorityMap = {
            "Urgent": 5,
            "Angry": 4,
            "Frustrated": 3,
            "Sad": 2,
            "Neutral": 1,
            "Satisfied": 0
        };

        const priority = priorityMap[mappedEmotion] || 1;
        const mediaPaths = req.files ? req.files.map(file => file.filename) : [];

        const complaint = await Complaint.create({
            subject,
            description,
            category,
            department: departments,
            media: mediaPaths,
            emotion: mappedEmotion,
            priority,
            user: req.user.id
        });

        await ComplaintStats.create({
            _id: complaint._id,
            upvoteCount: 0,
            downvoteCount: 0,
            netScore: 0,
            commentCount: 0,
            viewCount: 0
        });

        // Log complaint creation
        const logger = getLogger(req);
        await logger.logComplaintCreate(req.user, complaint, {
            subject: subject,
            emotion: mappedEmotion,
            priority: priority,
            departments: departments,
            mediaCount: mediaPaths.length
        });

        try {
            if (global.emitNewComplaint && typeof global.emitNewComplaint === 'function') {
                global.emitNewComplaint(complaint);
            }
        } catch (err) {
            console.error("Socket emit error:", err);
        }

        res.status(201).json({
            message: "Complaint created successfully",
            complaint,
            emotionDetected: mappedEmotion,
            originalEmotion: aiEmotion,
            confidence: confidence
        });

    } catch (error) {
        console.error("Create complaint error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

exports.toggleComplaintVisibility = async (req, res) => {
    try {
        const complaint = await Complaint.findById(req.params.id)
            .populate("user", "role name");

        if (!complaint) {
            return res.status(404).json({ message: "Complaint not found" });
        }

        const currentUser = req.user;
        const userRole = currentUser.role;
        const currentUserId = currentUser.id;
        const currentUserDept = currentUser.department?.toString();
        const currentUserName = currentUser.name || currentUser.username;

        const isOwner = complaint.user._id.toString() === currentUserId;
        const complaintCreatorRole = complaint.user.role;

        const roleLevel = {
            student: 1,
            departmentadmin: 2,
            admin: 3,
            superadmin: 4
        };

        const currentLevel = roleLevel[userRole];
        const disabledByLevel = roleLevel[complaint.disabledBy || null];

        let canToggle = false;
        let permissionMessage = "";

        if (userRole === "superadmin") {
            canToggle = true;
        }
        else if (userRole === "admin") {
            canToggle = true;
        }
        else if (userRole === "departmentadmin") {
            const isInDepartment = complaint.department.some(
                d => d.toString() === currentUserDept
            );

            if (isOwner) {
                canToggle = true;
            } else if (isInDepartment && complaintCreatorRole === "student") {
                canToggle = true;
            } else {
                permissionMessage = "You can only toggle your own complaints or students' complaints in your department";
            }
        }
        else if (userRole === "student") {
            if (isOwner && complaint.status === "Unread") {
                canToggle = true;
            } else if (isOwner && complaint.status !== "Unread") {
                permissionMessage = "Cannot modify complaint after it has been viewed by admin";
            } else {
                permissionMessage = "You can only toggle your own complaints";
            }
        }

        if (!canToggle) {
            return res.status(403).json({ message: permissionMessage || "You don't have permission to toggle this complaint" });
        }

        const isCurrentlyActive = complaint.isActive;

        if (!isCurrentlyActive && complaint.disabledBy) {
            const disabledByRole = complaint.disabledBy;
            const disabledByLevelValue = roleLevel[disabledByRole];

            if (currentLevel < disabledByLevelValue) {
                return res.status(403).json({
                    message: `Cannot enable this complaint. It was disabled by ${disabledByRole}. Only users with equal or higher authority can enable it.`
                });
            }
        }

        const oldStatus = complaint.isActive;
        complaint.isActive = !complaint.isActive;

        if (!complaint.isActive) {
            complaint.disabledBy = userRole;
            complaint.disabledAt = new Date();
            complaint.disabledByUserId = currentUserId;
            complaint.disabledByName = currentUserName;
        } else {
            complaint.disabledBy = null;
            complaint.disabledAt = null;
            complaint.disabledByUserId = null;
            complaint.disabledByName = null;
        }

        complaint.statusHistory.push({
            status: complaint.isActive ? "Enabled" : "Disabled",
            changedBy: currentUserId,
            changedAt: new Date()
        });

        await complaint.save();

        // Log visibility toggle
        const logger = getLogger(req);
        const action = complaint.isActive ? "COMPLAINT_ENABLE" : "COMPLAINT_DISABLE";
        await logger.log(req.user, action, complaint, {
            previousStatus: oldStatus,
            newStatus: complaint.isActive,
            complaintStatus: complaint.status,
            complaintSubject: complaint.subject
        });

        const updatedComplaint = await Complaint.findById(req.params.id)
            .populate("user", "name profileImage role _id hideProfilePicture isActive")
            .populate("department", "name tag isActive")
            .populate("category", "name isActive");

        res.json({
            message: `Complaint ${complaint.isActive ? "enabled" : "disabled"} successfully`,
            isActive: complaint.isActive,
            disabledBy: complaint.disabledBy,
            disabledAt: complaint.disabledAt,
            disabledByName: complaint.disabledByName,
            complaint: updatedComplaint
        });

    } catch (err) {
        console.error("toggleComplaintVisibility ERROR:", err);
        res.status(500).json({ message: "Server error" });
    }
};

exports.updateComplaint = async (req, res) => {
    try {
        const complaint = await Complaint.findById(req.params.id);

        if (!complaint) {
            return res.status(404).json({ message: "Complaint not found" });
        }

        if (complaint.user.toString() !== req.user.id) {
            return res.status(403).json({ message: "Unauthorized" });
        }

        if (complaint.status !== "Unread") {
            return res.status(400).json({
                message: "Cannot edit complaint after it has been viewed by admin"
            });
        }

        const { subject, description, category } = req.body;

        // Initialize changes object with old and new values
        const changes = {
            oldSubject: null,
            oldDescription: null,
            oldCategory: null,
            oldEmotion: null,
            oldDepartment: [],
            newSubject: null,
            newDescription: null,
            newCategory: null,
            newEmotion: null,
            newDepartment: [],
            mediaAdded: [],
            mediaRemoved: []
        };

        let hasChanges = false;

        // Track subject change
        if (subject && subject !== complaint.subject) {
            changes.oldSubject = complaint.subject;
            changes.newSubject = subject;
            complaint.subject = subject;
            hasChanges = true;
        }

        // Track description change
        if (description && description !== complaint.description) {
            changes.oldDescription = complaint.description;
            changes.newDescription = description;
            complaint.description = description;
            hasChanges = true;
        }

        // Track category change
        if (category && category !== complaint.category?.toString()) {
            changes.oldCategory = complaint.category;
            changes.newCategory = category;
            complaint.category = category;
            hasChanges = true;
        }

        // Track emotion change by running AI analysis on updated complaint text
        if (hasChanges) {
            let aiEmotion = "Neutral";
            try {
                const aiRes = await axios.post("http://localhost:5001/analyze", {
                    text: description || complaint.description
                });
                aiEmotion = aiRes.data.emotion;
            } catch (err) {
                console.log("AI ERROR:", err.message);
                aiEmotion = "Neutral";
            }

            const emotionMapping = {
                "Urgency": "Urgent",
                "Anger": "Angry",
                "Frustration": "Frustrated",
                "Sadness": "Sad",
                "Neutral": "Neutral",
                "Positive": "Satisfied"
            };

            let mappedEmotion = emotionMapping[aiEmotion] || "Neutral";
            const emotionVariations = {
                "urgent": "Urgent",
                "emergency": "Urgent",
                "angry": "Angry",
                "frustrated": "Frustrated",
                "sad": "Sad",
                "positive": "Satisfied",
                "happy": "Satisfied"
            };
            if (!emotionMapping[aiEmotion]) {
                const lowerEmotion = String(aiEmotion).toLowerCase();
                mappedEmotion = emotionVariations[lowerEmotion] || "Neutral";
            }

            if (mappedEmotion && mappedEmotion !== complaint.emotion) {
                changes.oldEmotion = complaint.emotion;
                changes.newEmotion = mappedEmotion;
                complaint.emotion = mappedEmotion;
            }
        }

        // Track department changes
        let departments = req.body.department;
        if (!departments) departments = [];
        else if (!Array.isArray(departments)) departments = [departments];

        const oldDepartments = complaint.department.map(d => d.toString());
        const newDepartments = departments;

        if (JSON.stringify(oldDepartments.sort()) !== JSON.stringify(newDepartments.sort())) {
            changes.oldDepartment = oldDepartments;
            changes.newDepartment = newDepartments;
            complaint.department = departments;
            hasChanges = true;
        }

        // Track media changes
        let existingMedia = [];
        if (req.body.existingMedia) {
            existingMedia = JSON.parse(req.body.existingMedia);
        }

        const newMedia = req.files ? req.files.map(file => file.filename) : [];
        const removedMedia = complaint.media.filter(m => !existingMedia.includes(m));

        if (removedMedia.length > 0) {
            changes.mediaRemoved = removedMedia;
            hasChanges = true;
        }

        if (newMedia.length > 0) {
            changes.mediaAdded = newMedia;
            hasChanges = true;
        }

        complaint.media = [...existingMedia, ...newMedia];

        // If there are any changes, save to edit history
        if (hasChanges) {
            complaint.editHistory.push({
                editedAt: new Date(),
                editedBy: req.user.id,
                changes: changes
            });

            complaint.isEdited = true;
            complaint.lastEditedAt = new Date();
        }

        await complaint.save();

        // Log complaint update
        const logger = getLogger(req);
        await logger.logComplaintUpdate(req.user, complaint, changes, {
            updatedFields: Object.keys(changes).filter(k => changes[k] !== null && changes[k].length !== 0)
        });

        const updatedComplaint = await Complaint.findById(req.params.id)
            .populate("user", "name profileImage role _id hideProfilePicture isActive")
            .populate("department", "name tag isActive")
            .populate("category", "name isActive");

        try {
            if (global.emitComplaintUpdate && typeof global.emitComplaintUpdate === 'function') {
                global.emitComplaintUpdate(complaint._id, { complaint: updatedComplaint });
            }
        } catch (err) {
            console.error("Socket emit error:", err);
        }

        res.json({
            message: "Complaint updated successfully",
            complaint: updatedComplaint
        });

    } catch (err) {
        console.error("Update complaint error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

exports.toggleVote = async (req, res) => {
    try {
        if (["admin", "superadmin"].includes(req.user.role)) {
            return res.status(403).json({
                message: "Admins are not allowed to vote"
            });
        }

        const { type } = req.body;
        const userId = req.user.id;
        const complaintId = req.params.id;

        if (!["UP", "DOWN"].includes(type)) {
            return res.status(400).json({ message: "Invalid vote type" });
        }

        // ✅ Get complaint details for logging
        const complaint = await Complaint.findById(complaintId).select("subject department");

        let vote = await Vote.findOne({ complaintId, userId });
        let upChange = 0;
        let downChange = 0;
        let actionType = "";
        let voteDetails = {};

        if (vote) {
            if (vote.voteType === type) {
                // REMOVE vote
                if (type === "UP") upChange = -1;
                if (type === "DOWN") downChange = -1;
                await vote.deleteOne();
                vote = null;
                actionType = "VOTE_REMOVE";
                voteDetails = {
                    voteType: type,
                    action: "removed",
                    complaintId: complaintId,
                    complaintTitle: complaint.subject
                };
            } else {
                // SWITCH vote
                const oldVote = vote.voteType;
                if (vote.voteType === "UP") upChange = -1;
                if (vote.voteType === "DOWN") downChange = -1;
                if (type === "UP") upChange += 1;
                if (type === "DOWN") downChange += 1;
                vote.voteType = type;
                await vote.save();
                actionType = "VOTE_CHANGE";
                voteDetails = {
                    oldVote: oldVote,
                    newVote: type,
                    action: "changed",
                    complaintId: complaintId,
                    complaintTitle: complaint.subject
                };
            }
        } else {
            // NEW vote
            vote = await Vote.create({ complaintId, userId, voteType: type });
            if (type === "UP") upChange = 1;
            if (type === "DOWN") downChange = 1;
            actionType = "VOTE_ADD";
            voteDetails = {
                voteType: type,
                action: "added",
                complaintId: complaintId,
                complaintTitle: complaint.subject
            };
        }

        const stats = await ComplaintStats.findOneAndUpdate(
            { _id: complaintId },
            {
                $inc: {
                    upvoteCount: upChange,
                    downvoteCount: downChange,
                    netScore: upChange - downChange
                }
            },
            { upsert: true, new: true }
        );

        // ✅ Log vote action with complaint details
        const logger = getLogger(req);
        await logger.log(req.user, actionType, complaint, {
            ...voteDetails,
            voteType: type,
            upvotesAfter: stats.upvoteCount,
            downvotesAfter: stats.downvoteCount
        });

        try {
            if (global.emitVoteUpdate && typeof global.emitVoteUpdate === 'function') {
                global.emitVoteUpdate(complaintId, { upvotes: stats.upvoteCount, downvotes: stats.downvoteCount });
            }
        } catch (err) {
            console.error("Socket emit error:", err);
        }

        res.json({
            upvotes: stats.upvoteCount,
            downvotes: stats.downvoteCount,
            userVote: vote ? vote.voteType : null
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
};

exports.addComment = async (req, res) => {
    try {
        const { text } = req.body;
        const userId = req.user.id;
        const complaintId = req.params.id;

        if (!text || text.trim() === "") {
            return res.status(400).json({ message: "Comment cannot be empty" });
        }

        // ✅ Get complaint details for logging
        const complaint = await Complaint.findById(complaintId).select("subject department");

        const comment = await Comment.create({
            complaintId,
            userId,
            text
        });

        await ComplaintStats.findOneAndUpdate(
            { _id: complaintId },
            { $inc: { commentCount: 1 } },
            { upsert: true }
        );

        // ✅ Log comment addition with complaint details
        const logger = getLogger(req);
        await logger.log(req.user, "COMMENT_ADD", complaint, {
            complaintId: complaintId,
            complaintTitle: complaint.subject,
            comment: text,
            commentId: comment._id,
            commentText: text.substring(0, 100)
        });

        const updatedStats = await ComplaintStats.findById(complaintId);

        // Populate user details before sending response
        const populatedComment = await Comment.findById(comment._id)
            .populate("userId", "name profileImage role hideProfilePicture anonymousComment department");

        try {
            if (global.emitCommentUpdate && typeof global.emitCommentUpdate === 'function') {
                global.emitCommentUpdate(complaintId, updatedStats.commentCount);
            }
        } catch (err) {
            console.error("Socket emit error:", err);
        }

        res.status(201).json(populatedComment);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
};

exports.updateComment = async (req, res) => {
    try {
        const { text } = req.body;
        const commentId = req.params.id;
        const userId = req.user.id;

        if (!text || text.trim() === "") {
            return res.status(400).json({ message: "Comment cannot be empty" });
        }

        const comment = await Comment.findById(commentId);

        if (!comment) {
            return res.status(404).json({ message: "Comment not found" });
        }

        if (comment.userId.toString() !== userId) {
            return res.status(403).json({ message: "Not allowed" });
        }

        // ✅ Get complaint details for logging
        const complaint = await Complaint.findById(comment.complaintId).select("subject");

        const oldText = comment.text;
        comment.text = text;
        await comment.save();

        // ✅ Log comment update with complaint details
        const logger = getLogger(req);
        await logger.log(req.user, "COMMENT_UPDATE", complaint, {
            complaintId: comment.complaintId,
            complaintTitle: complaint.subject,
            oldComment: oldText,
            comment: text,
            commentId: comment._id
        });

        // Populate user details before sending response
        const populatedComment = await Comment.findById(comment._id)
            .populate("userId", "name profileImage role hideProfilePicture anonymousComment department");

        res.json({
            message: "Comment updated",
            comment: populatedComment
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
};

exports.toggleCommentVisibility = async (req, res) => {
    try {
        const commentId = req.params.id;
        const currentUser = req.user;

        const roleLevel = {
            student: 1,
            departmentadmin: 2,
            admin: 3,
            superadmin: 4
        };

        const currentRole = currentUser.role;
        const currentLevel = roleLevel[currentRole];

        const comment = await Comment.findById(commentId).populate({
            path: "userId",
            populate: {
                path: "department",
                select: "_id role"
            }
        });

        if (!comment) {
            return res.status(404).json({ message: "Comment not found" });
        }

        // ✅ Get complaint details for logging
        const complaint = await Complaint.findById(comment.complaintId).select("subject");

        const commentOwner = comment.userId;
        const isAdmin = ["admin", "superadmin"].includes(currentRole);
        const isDeptAdmin = currentRole === "departmentadmin";
        const isStudent = currentRole === "student";
        const isOwner = commentOwner._id.toString() === currentUser.id;
        const sameDepartment = commentOwner?.department?._id &&
            currentUser?.department &&
            String(commentOwner.department._id) === String(currentUser.department);

        let canToggle = false;

        if (isAdmin) {
            canToggle = true;
        } else if (isDeptAdmin) {
            canToggle = isOwner || (sameDepartment && commentOwner.role === "student");
        } else if (isStudent) {
            canToggle = isOwner;
        }

        if (!canToggle) {
            return res.status(403).json({ message: "Not allowed" });
        }

        const oldVisibility = comment.isVisible;

        if (comment.isVisible) {
            comment.isVisible = false;
            comment.disabledBy = currentRole;
            await ComplaintStats.findOneAndUpdate(
                { _id: comment.complaintId },
                { $inc: { commentCount: -1 } }
            );
        } else {
            const disabledByLevel = roleLevel[comment.disabledBy || "student"];
            if (currentLevel < disabledByLevel) {
                return res.status(403).json({
                    message: "You cannot enable this comment (disabled by higher authority)"
                });
            }
            comment.isVisible = true;
            comment.disabledBy = null;
            await ComplaintStats.findOneAndUpdate(
                { _id: comment.complaintId },
                { $inc: { commentCount: 1 } }
            );
        }

        await comment.save({ timestamps: false });

        // ✅ Log visibility change with complaint details
        const logger = getLogger(req);
        const action = comment.isVisible ? "COMMENT_ENABLE" : "COMMENT_DISABLE";

        // Pass the complaint as the target to store complaint ID
        await logger.log(currentUser, action, complaint, {
            previousVisibility: oldVisibility,
            newVisibility: comment.isVisible,
            complaintId: comment.complaintId,
            complaintTitle: complaint.subject,
            commentId: comment._id,
            commentText: comment.text.substring(0, 100),
            toggledBy: currentUser.name || currentUser.username,
            toggledByRole: currentUser.role
        });

        res.json({
            message: "Visibility updated",
            isVisible: comment.isVisible,
            disabledBy: comment.disabledBy
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
};
exports.addView = async (req, res) => {
    try {
        const complaintId = req.params.id;
        const userId = req.user?.id || null;
        const userRole = req.user?.role;

        if (userRole === "admin" || userRole === "superadmin") {
            return res.json({ skipped: true });
        }

        if (!userId) {
            return res.json({ skipped: true });
        }

        const existingView = await View.findOne({ complaintId, userId });
        let alreadyViewed = true;

        if (!existingView) {
            alreadyViewed = false;
            await View.create({ complaintId, userId });
            await ComplaintStats.findOneAndUpdate(
                { _id: complaintId },
                { $inc: { viewCount: 1 } },
                { upsert: true }
            );
        }

        const stats = await ComplaintStats.findById(complaintId);

        // Log view if not already viewed
        if (!alreadyViewed) {
            const logger = getLogger(req);
            await logger.log(req.user, "COMPLAINT_VIEW", { _id: complaintId }, {
                viewType: "detail_view",
                viewsAfter: stats?.viewCount || 0
            });
        }

        try {
            if (global.emitViewUpdate && typeof global.emitViewUpdate === 'function') {
                global.emitViewUpdate(complaintId, stats.viewCount);
            }
        } catch (err) {
            console.error("Socket emit error:", err);
        }

        res.json({
            alreadyViewed,
            views: stats?.viewCount || 0
        });

    } catch (err) {
        console.error("❌ VIEW ERROR:", err);
        res.status(500).json({ message: "Server error" });
    }
};