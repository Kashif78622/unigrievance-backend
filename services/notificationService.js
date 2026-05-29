// services/notificationService.js
const Notification = require("../models/Notification");
const User = require("../models/User");
const ActivityLogger = require("../utils/activityLogger");

class NotificationService {
    constructor(io = null) {
        this.io = io;
    }

    setIO(io) {
        this.io = io;
    }

    /**
     * Create a notification and emit via socket
     */
    async createNotification(notificationData) {
        try {
            const notification = new Notification(notificationData);
            await notification.save();

            // Emit real-time notification via socket
            if (this.io) {
                this.io.to(`user:${notification.userId}`).emit("notification:new", {
                    _id: notification._id,
                    title: notification.title,
                    message: notification.message,
                    type: notification.type,
                    priority: notification.priority,
                    relatedId: notification.relatedId,
                    relatedModel: notification.relatedModel,
                    relatedTitle: notification.relatedTitle,
                    createdAt: notification.createdAt,
                    metadata: notification.metadata
                });
            }

            return notification;
        } catch (error) {
            console.error("Failed to create notification:", error);
            return null;
        }
    }

    /**
     * Send browser push notification
     */
    async sendBrowserNotification(userId, title, body, icon = null, tag = null) {
        try {
            const user = await User.findById(userId);
            if (!user || !user.pushSubscription) return;

            const webpush = require('web-push');

            const payload = JSON.stringify({
                title: title,
                body: body,
                icon: icon || '/logo192.png',
                badge: '/badge.png',
                tag: tag || 'unigrievance',
                data: {
                    url: '/',
                    userId: userId.toString()
                }
            });

            await webpush.sendNotification(user.pushSubscription, payload);
        } catch (error) {
            console.error("Failed to send browser notification:", error);
        }
    }

    /**
     * Get user's unread notification count
     */
    async getUnreadCount(userId) {
        return await Notification.countDocuments({ userId, isRead: false });
    }

    /**
     * Get user's notifications with pagination
     */
    async getUserNotifications(userId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;

        const [notifications, total] = await Promise.all([
            Notification.find({ userId })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Notification.countDocuments({ userId })
        ]);

        return {
            data: notifications,
            total,
            page,
            limit,
            hasMore: skip + notifications.length < total
        };
    }

    /**
     * Mark notification as read
     */
    async markAsRead(notificationId, userId) {
        return await Notification.findOneAndUpdate(
            { _id: notificationId, userId },
            { isRead: true, readAt: new Date() },
            { new: true }
        );
    }

    /**
     * Mark all notifications as read
     */
    async markAllAsRead(userId) {
        return await Notification.updateMany(
            { userId, isRead: false },
            { isRead: true, readAt: new Date() }
        );
    }

    // ==================== SPECIFIC NOTIFICATION TRIGGERS ====================

    /**
     * Notify when complaint is created
     */
    async notifyComplaintCreated(complaint, creator) {
        const notifications = [];
        const votersInfo = [];

        // Determine recipients based on creator role
        if (creator.role === "student") {
            // Notify department admins of tagged departments
            for (const deptId of complaint.department) {
                const departmentAdmins = await User.find({
                    role: "departmentadmin",
                    department: deptId,
                    isActive: true
                });

                for (const admin of departmentAdmins) {
                    notifications.push({
                        userId: admin._id,
                        userRole: admin.role,
                        title: "New Complaint Submitted",
                        message: `${creator.name || creator.username} submitted a new complaint: "${complaint.subject.substring(0, 50)}${complaint.subject.length > 50 ? '...' : ''}"`,
                        type: "COMPLAINT_CREATED",
                        priority: "high",
                        relatedId: complaint._id,
                        relatedModel: "Complaint",
                        relatedTitle: complaint.subject,
                        metadata: {
                            creatorName: creator.name,
                            creatorRole: creator.role,
                            departmentIds: complaint.department,
                            subject: complaint.subject
                        }
                    });
                }
            }
        }
        else if (creator.role === "departmentadmin") {
            // Notify admins and superadmins
            const admins = await User.find({
                role: { $in: ["admin", "superadmin"] },
                isActive: true
            });

            for (const admin of admins) {
                notifications.push({
                    userId: admin._id,
                    userRole: admin.role,
                    title: "New Complaint from Department Admin",
                    message: `${creator.name} (${creator.department?.name}) submitted: "${complaint.subject.substring(0, 50)}${complaint.subject.length > 50 ? '...' : ''}"`,
                    type: "COMPLAINT_CREATED",
                    priority: "high",
                    relatedId: complaint._id,
                    relatedModel: "Complaint",
                    relatedTitle: complaint.subject,
                    metadata: {
                        creatorName: creator.name,
                        creatorRole: creator.role,
                        departmentId: creator.department,
                        subject: complaint.subject
                    }
                });
            }
        }

        // Also notify the creator about their own complaint creation
        notifications.push({
            userId: creator._id,
            userRole: creator.role,
            title: "Complaint Submitted Successfully",
            message: `Your complaint "${complaint.subject.substring(0, 50)}${complaint.subject.length > 50 ? '...' : ''}" has been submitted.`,
            type: "COMPLAINT_CREATED",
            priority: "medium",
            relatedId: complaint._id,
            relatedModel: "Complaint",
            relatedTitle: complaint.subject,
            metadata: {
                creatorName: creator.name,
                subject: complaint.subject
            }
        });

        // Create all notifications and track voters
        for (const notif of notifications) {
            const created = await this.createNotification(notif);
            if (created && notif.userId !== creator._id.toString()) {
                votersInfo.push({
                    userId: notif.userId,
                    userRole: notif.userRole
                });
            }
        }

        return { notifications: notifications.length, votersInfo };
    }

    /**
     * Notify when vote is added on complaint
     */
    // In notificationService.js - Update notifyVoteAdded to respect privacy
    async notifyVoteAdded(complaint, voter, voteType, currentVoteCount) {
        try {
            const creator = await User.findById(complaint.user);
            if (!creator) return null;

            const notifications = [];

            // 1. Notify the complaint creator about the vote (if not self-voting)
            if (creator._id.toString() !== voter._id.toString()) {
                // Check if voter wants to remain anonymous
                const isAnonymousVote = voter.anonymousVote === true;
                const isAnonymousProfile = voter.hideProfilePicture === true;

                let voterDisplayName = "Someone";
                if (!isAnonymousVote) {
                    voterDisplayName = voter.name || voter.username;
                }

                const voteEmoji = voteType === "UP" ? "👍" : "👎";
                const voteText = voteType === "UP" ? "upvoted" : "downvoted";

                // Create message that respects anonymity
                const message = isAnonymousVote
                    ? `${voteEmoji} Someone ${voteText} your complaint: "${complaint.subject.substring(0, 50)}${complaint.subject.length > 50 ? '...' : ''}"`
                    : `${voteEmoji} ${voterDisplayName} ${voteText} your complaint: "${complaint.subject.substring(0, 50)}${complaint.subject.length > 50 ? '...' : ''}"`;

                notifications.push({
                    userId: creator._id,
                    userRole: creator.role,
                    title: voteType === "UP" ? "👍 New Upvote" : "👎 New Downvote",
                    message: message,
                    type: "VOTE_ADDED",
                    priority: "low",
                    relatedId: complaint._id,
                    relatedModel: "Complaint",
                    relatedTitle: complaint.subject,
                    metadata: {
                        voterId: voter._id,
                        voterName: isAnonymousVote ? null : voter.name,
                        isAnonymous: isAnonymousVote,
                        voteType: voteType,
                        complaintSubject: complaint.subject,
                        complaintId: complaint._id
                    }
                });
            }

            // 2. Check vote milestones (only for upvotes) - these are system notifications
            const upvoteCount = currentVoteCount.upvotes;

            if (upvoteCount === 20 || upvoteCount === 50 || upvoteCount === 100) {
                const milestone = upvoteCount;
                const title = milestone === 20 ? "⚠️ Complaint Reached 20 Votes"
                    : milestone === 50 ? "🔥 Complaint Reached 50 Votes!"
                        : "🚨 URGENT: Complaint Reached 100 Votes!";
                const priority = milestone === 20 ? "high" : "urgent";

                // Determine recipients based on milestone
                let recipientUsers = [];

                if (milestone === 20) {
                    // Department admins
                    for (const deptId of complaint.department) {
                        const deptAdmins = await User.find({
                            role: "departmentadmin",
                            department: deptId,
                            isActive: true
                        });
                        recipientUsers.push(...deptAdmins);
                    }
                } else if (milestone === 50) {
                    // Admins
                    const admins = await User.find({
                        role: "admin",
                        isActive: true
                    });
                    recipientUsers.push(...admins);
                } else if (milestone === 100) {
                    // Superadmins
                    const superAdmins = await User.find({
                        role: "superadmin",
                        isActive: true
                    });
                    recipientUsers.push(...superAdmins);
                }

                // Remove duplicates and exclude creator
                const uniqueRecipients = recipientUsers.filter(
                    (user, index, self) =>
                        self.findIndex(u => u._id.toString() === user._id.toString()) === index &&
                        user._id.toString() !== creator._id.toString()
                );

                for (const recipient of uniqueRecipients) {
                    notifications.push({
                        userId: recipient._id,
                        userRole: recipient.role,
                        title: title,
                        message: `Complaint "${complaint.subject.substring(0, 50)}${complaint.subject.length > 50 ? '...' : ''}" has received ${milestone} upvotes!`,
                        type: "VOTE_MILESTONE",
                        priority: priority,
                        relatedId: complaint._id,
                        relatedModel: "Complaint",
                        relatedTitle: complaint.subject,
                        metadata: {
                            voteCount: upvoteCount,
                            milestone: milestone,
                            complaintSubject: complaint.subject,
                            complaintId: complaint._id
                        }
                    });
                }
            }

            for (const notif of notifications) {
                await this.createNotification(notif);
            }

            return notifications.length;
        } catch (error) {
            console.error("notifyVoteAdded error:", error);
            return 0;
        }
    }

    // Update notifyCommentAdded to respect privacy
    async notifyCommentAdded(complaint, comment, commenter) {
        try {
            const creator = await User.findById(complaint.user);
            if (!creator) return null;

            // Don't notify if commenting on own complaint
            if (creator._id.toString() === commenter._id.toString()) {
                return null;
            }

            // Check if commenter wants to remain anonymous
            const isAnonymousComment = commenter.anonymousComment === true;
            const isAnonymousProfile = commenter.hideProfilePicture === true;

            let commenterDisplayName = "Someone";
            if (!isAnonymousComment) {
                commenterDisplayName = commenter.name || commenter.username;
            }

            // Create message that respects anonymity
            const message = isAnonymousComment
                ? `💬 Someone commented on your complaint: "${comment.text.substring(0, 60)}${comment.text.length > 60 ? '...' : ''}"`
                : `💬 ${commenterDisplayName} commented on your complaint: "${comment.text.substring(0, 60)}${comment.text.length > 60 ? '...' : ''}"`;

            const notification = {
                userId: creator._id,
                userRole: creator.role,
                title: "💬 New Comment on Your Complaint",
                message: message,
                type: "COMMENT_ADDED",
                priority: "medium",
                relatedId: comment._id,
                relatedModel: "Comment",
                relatedTitle: complaint.subject,
                metadata: {
                    commenterId: commenter._id,
                    commenterName: isAnonymousComment ? null : commenter.name,
                    isAnonymous: isAnonymousComment,
                    commentText: comment.text,
                    complaintSubject: complaint.subject,
                    complaintId: complaint._id
                }
            };

            return await this.createNotification(notification);
        } catch (error) {
            console.error("notifyCommentAdded error:", error);
            return null;
        }
    }

    /**
     * Notify when complaint status changes
     */
    async notifyComplaintStatusChange(complaint, oldStatus, newStatus, changedBy) {
        const creator = await User.findById(complaint.user);
        if (!creator) return null;

        let title = "📋 Complaint Status Updated";
        let message = `Your complaint "${complaint.subject.substring(0, 50)}${complaint.subject.length > 50 ? '...' : ''}" status changed from ${oldStatus} to ${newStatus}.`;
        let priority = "medium";

        if (newStatus === "Resolved") {
            title = "✅ Complaint Resolved";
            message = `Great news! Your complaint "${complaint.subject.substring(0, 50)}${complaint.subject.length > 50 ? '...' : ''}" has been resolved.`;
            priority = "high";
        } else if (newStatus === "In Progress") {
            title = "🔄 Complaint In Progress";
            message = `Your complaint "${complaint.subject.substring(0, 50)}${complaint.subject.length > 50 ? '...' : ''}" is now being processed.`;
            priority = "high";
        }

        const notification = {
            userId: creator._id,
            userRole: creator.role,
            title: title,
            message: message,
            type: "COMPLAINT_STATUS_CHANGE",
            priority: priority,
            relatedId: complaint._id,
            relatedModel: "Complaint",
            relatedTitle: complaint.subject,
            metadata: {
                oldStatus,
                newStatus,
                changedBy: changedBy.name || changedBy.username,
                changedByRole: changedBy.role,
                complaintSubject: complaint.subject
            }
        };

        return await this.createNotification(notification);
    }

    /**
     * Notify when complaint is enabled/disabled
     */
    async notifyComplaintToggled(complaint, isEnabled, changedBy) {
        const creator = await User.findById(complaint.user);
        if (!creator) return null;

        const notification = {
            userId: creator._id,
            userRole: creator.role,
            title: isEnabled ? "🔓 Complaint Enabled" : "🔒 Complaint Disabled",
            message: `Your complaint "${complaint.subject.substring(0, 50)}${complaint.subject.length > 50 ? '...' : ''}" has been ${isEnabled ? "enabled" : "disabled"} by ${changedBy.name || changedBy.username}.`,
            type: isEnabled ? "COMPLAINT_ENABLED" : "COMPLAINT_DISABLED",
            priority: "high",
            relatedId: complaint._id,
            relatedModel: "Complaint",
            relatedTitle: complaint.subject,
            metadata: {
                isEnabled,
                changedBy: changedBy.name || changedBy.username,
                changedByRole: changedBy.role,
                complaintSubject: complaint.subject
            }
        };

        return await this.createNotification(notification);
    }

    /**
     * Notify when user is enabled/disabled
     */
    async notifyUserToggled(targetUser, isEnabled, changedBy) {
        const notification = {
            userId: targetUser._id,
            userRole: targetUser.role,
            title: isEnabled ? "✅ Account Enabled" : "⚠️ Account Disabled",
            message: `Your account has been ${isEnabled ? "enabled" : "disabled"} by ${changedBy.name || changedBy.username}. ${!isEnabled ? "Please contact administration for reactivation." : ""}`,
            type: isEnabled ? "USER_ENABLED" : "USER_DISABLED",
            priority: "urgent",
            relatedId: targetUser._id,
            relatedModel: "User",
            relatedTitle: targetUser.name,
            metadata: {
                isEnabled,
                changedBy: changedBy.name || changedBy.username,
                changedByRole: changedBy.role
            }
        };

        return await this.createNotification(notification);
    }

    /**
     * Notify when comment is enabled/disabled
     */
    async notifyCommentToggled(comment, isEnabled, changedBy, complaint) {
        const commenter = await User.findById(comment.userId);
        if (!commenter) return null;

        const notification = {
            userId: commenter._id,
            userRole: commenter.role,
            title: isEnabled ? "💬 Comment Enabled" : "🔒 Comment Disabled",
            message: `Your comment on "${complaint.subject.substring(0, 50)}${complaint.subject.length > 50 ? '...' : ''}" has been ${isEnabled ? "enabled" : "disabled"} by ${changedBy.name || changedBy.username}.`,
            type: isEnabled ? "COMMENT_ENABLED" : "COMMENT_DISABLED",
            priority: "medium",
            relatedId: comment._id,
            relatedModel: "Comment",
            relatedTitle: complaint.subject,
            metadata: {
                isEnabled,
                changedBy: changedBy.name || changedBy.username,
                changedByRole: changedBy.role,
                commentText: comment.text,
                complaintSubject: complaint.subject
            }
        };

        return await this.createNotification(notification);
    }
}

module.exports = NotificationService;