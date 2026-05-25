// utils/activityLogger.js
const ActivityLog = require("../models/ActivityLog");
const getRealIP = require("./getRealIP");
const UAParser = require('ua-parser-js');

class ActivityLogger {
    constructor(req = null) {
        this.req = req;
        // Get real IP address
        this.ipAddress = req ? getRealIP(req) : null;
        // Parse user agent for device info
        if (req && req.headers['user-agent']) {
            const parser = new UAParser(req.headers['user-agent']);
            this.userAgentInfo = parser.getResult();
        } else {
            this.userAgentInfo = null;
        }
        this.userAgent = req?.headers?.["user-agent"] || null;
    }

    async log(user, action, target = null, details = {}) {
        try {
            const logEntry = {
                userId: user._id || user.id,
                userName: user.name || user.username,
                userRole: user.role,
                userDepartment: user.department || null,
                action: action,
                details: {
                    ...details,
                    // Add device info for login/logout actions
                    ...((action === "LOGIN" || action === "LOGOUT") && this.userAgentInfo ? {
                        browser: this.userAgentInfo.browser?.name || 'Unknown',
                        browserVersion: this.userAgentInfo.browser?.version || 'Unknown',
                        os: this.userAgentInfo.os?.name || 'Unknown',
                        osVersion: this.userAgentInfo.os?.version || 'Unknown',
                        deviceType: this.userAgentInfo.device?.type || 'Desktop',
                        deviceVendor: this.userAgentInfo.device?.vendor || '',
                        deviceModel: this.userAgentInfo.device?.model || '',
                        userAgentString: this.userAgent
                    } : {})
                },
                ipAddress: this.ipAddress,
                userAgent: this.userAgent
            };

            // Add target information if provided
            if (target) {
                logEntry.targetId = target._id || target;
                logEntry.targetModel = target.constructor?.modelName;
                logEntry.targetName = target.name || target.title || target.subject || target.username;
            }

            await ActivityLog.create(logEntry);
        } catch (error) {
            console.error("Activity logging failed:", error);
        }
    }

    async logLogin(user, details = {}) {
        await this.log(user, "LOGIN", null, details);
    }

    async logLogout(user, details = {}) {
        await this.log(user, "LOGOUT", null, details);
    }

    async logPasswordChange(user, details = {}) {
        await this.log(user, "PASSWORD_CHANGE", null, details);
    }

    async logProfileUpdate(user, changes, details = {}) {
        await this.log(user, "PROFILE_UPDATE", null, { changes, ...details });
    }

    async logComplaintCreate(user, complaint, details = {}) {
        await this.log(user, "COMPLAINT_CREATE", complaint, details);
    }

    async logComplaintUpdate(user, complaint, changes, details = {}) {
        await this.log(user, "COMPLAINT_UPDATE", complaint, { changes, ...details });
    }

    async logComplaintStatusChange(user, complaint, oldStatus, newStatus, details = {}) {
        await this.log(user, "COMPLAINT_STATUS_CHANGE", complaint, { oldStatus, newStatus, ...details });
    }

    async logComplaintDisable(user, complaint, details = {}) {
        await this.log(user, "COMPLAINT_DISABLE", complaint, details);
    }

    async logComplaintEnable(user, complaint, details = {}) {
        await this.log(user, "COMPLAINT_ENABLE", complaint, details);
    }

    async logCommentAdd(user, comment, details = {}) {
        await this.log(user, "COMMENT_ADD", comment, details);
    }

    async logCommentUpdate(user, comment, oldText, newText, details = {}) {
        await this.log(user, "COMMENT_UPDATE", comment, { oldText, newText, ...details });
    }

    async logVote(user, complaint, voteType, action, details = {}) {
        await this.log(user, action, complaint, { voteType, ...details });
    }

    async logAdminCreate(creator, newAdmin, details = {}) {
        await this.log(creator, "ADMIN_CREATE", newAdmin, details);
    }

    async logAdminUpdate(updater, admin, changes, details = {}) {
        await this.log(updater, "ADMIN_UPDATE", admin, { changes, ...details });
    }
}

module.exports = ActivityLogger;