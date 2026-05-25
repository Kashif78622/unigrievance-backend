// controllers/userController.js
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const ActivityLogger = require("../utils/activityLogger");

const getLogger = (req) => new ActivityLogger(req);

const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .populate("department", "name tag isActive")
            .select("-password");

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Include student-specific fields
        const responseData = {
            id: user._id,
            name: user.name || user.username,
            username: user.username,
            email: user.email,
            phone: user.phone,
            role: user.role,
            profileImage: user.profileImage,
            hideProfilePicture: user.hideProfilePicture,
            createdAt: user.createdAt,
            department: user.department ? {
                _id: user.department._id,
                name: user.department.name,
                tag: user.department.tag,
                isActive: user.department.isActive,
            } : null
        };

        // Add student-specific fields if user is a student
        if (user.role === "student") {
            responseData.rollNumber = user.rollNumber;
            responseData.sessionYear = user.sessionYear;
            responseData.shift = user.shift;
        }

        res.json(responseData);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

const updateProfileImage = async (req, res) => {
    try {
        const userId = req.user.id;

        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        const imagePath = `/uploads/profile/${req.file.filename}`;
        const user = await User.findByIdAndUpdate(userId, { profileImage: imagePath }, { new: true });

        // ✅ Log activity
        const logger = getLogger(req);
        await logger.log(req.user, "PROFILE_IMAGE_UPDATE", user, {
            newImage: imagePath,
            previousImage: user.profileImage
        });

        res.json({ message: "Profile image updated", profileImage: user.profileImage });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Upload failed" });
    }
};

const disableAccount = async (req, res) => {
    try {
        const userId = req.user.id;
        const { password } = req.body;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Incorrect password" });
        }

        const oldStatus = user.isActive;
        user.isActive = false;
        await user.save();

        // ✅ Log activity
        const logger = getLogger(req);
        await logger.log(req.user, "ACCOUNT_DISABLE", user, {
            previousStatus: oldStatus,
            newStatus: false,
            disabledBy: req.user.name || req.user.username
        });

        res.json({ message: "Account disabled successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

const getProfileSettings = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select(
            "anonymousPost anonymousVote anonymousComment hideProfilePicture"
        );

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json({
            anonymousPost: user.anonymousPost,
            anonymousVote: user.anonymousVote,
            anonymousComment: user.anonymousComment,
            hideProfilePicture: user.hideProfilePicture
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

const updateProfileSettings = async (req, res) => {
    try {
        const {
            anonymousPost,
            anonymousVote,
            anonymousComment,
            hideProfilePicture
        } = req.body;

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const changes = {};
        if (anonymousPost !== undefined && anonymousPost !== user.anonymousPost) {
            changes.anonymousPost = { old: user.anonymousPost, new: anonymousPost };
        }
        if (anonymousVote !== undefined && anonymousVote !== user.anonymousVote) {
            changes.anonymousVote = { old: user.anonymousVote, new: anonymousVote };
        }
        if (anonymousComment !== undefined && anonymousComment !== user.anonymousComment) {
            changes.anonymousComment = { old: user.anonymousComment, new: anonymousComment };
        }
        if (hideProfilePicture !== undefined && hideProfilePicture !== user.hideProfilePicture) {
            changes.hideProfilePicture = { old: user.hideProfilePicture, new: hideProfilePicture };
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            { anonymousPost, anonymousVote, anonymousComment, hideProfilePicture },
            { new: true }
        ).select("anonymousPost anonymousVote anonymousComment hideProfilePicture");

        // ✅ Log activity
        if (Object.keys(changes).length > 0) {
            const logger = getLogger(req);
            await logger.log(req.user, "PROFILE_SETTINGS_UPDATE", null, {
                changes: changes,
                updatedFields: Object.keys(changes)
            });
        }

        res.json({ message: "Settings updated successfully", settings: updatedUser });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

const getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .populate("department", "name tag isActive")
            .select("-password");

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const responseData = {
            _id: user._id,
            name: user.name || user.username,
            username: user.username,
            email: user.email,
            phone: user.phone,
            role: user.role,
            profileImage: user.profileImage,
            hideProfilePicture: user.hideProfilePicture,
            isActive: user.isActive,
            createdAt: user.createdAt,
            department: user.department ? {
                _id: user.department._id,
                name: user.department.name,
                tag: user.department.tag,
                isActive: user.department.isActive
            } : null
        };

        // Add student-specific fields if user is a student
        if (user.role === "student") {
            responseData.rollNumber = user.rollNumber;
            responseData.sessionYear = user.sessionYear;
            responseData.shift = user.shift;
        }

        res.json(responseData);
    } catch (error) {
        console.error("getUserById error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
// Add to userController.js
// controllers/userController.js - Update the removeProfileImage function
const removeProfileImage = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Store the previous image for logging
        const previousImage = user.profileImage;

        // Set profile image to default profile image path
        // This should be the path to your default avatar image
        user.profileImage = "/uploads/defaults/default-profile.png";
        await user.save();

        // Log activity
        const logger = getLogger(req);
        await logger.log(req.user, "PROFILE_IMAGE_REMOVED", user, {
            action: "profile_image_removed",
            previousImage: previousImage,
            newImage: user.profileImage
        });

        res.json({
            message: "Profile image removed successfully",
            profileImage: user.profileImage
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};
module.exports = {
    getMe,
    updateProfileImage,
    removeProfileImage,
    disableAccount,
    getProfileSettings,
    updateProfileSettings,
    getUserById
};