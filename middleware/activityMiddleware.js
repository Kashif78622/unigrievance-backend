// middleware/activityMiddleware.js
const ActivityLogger = require("../utils/activityLogger");

// Middleware to attach logger to request
const attachLogger = (req, res, next) => {
    req.activityLogger = new ActivityLogger(req);
    next();
};

// Middleware to log page views (optional)
const logPageView = (pageName) => {
    return async (req, res, next) => {
        const originalJson = res.json;

        res.json = function (data) {
            // Don't log if it's an error
            if (res.statusCode >= 400) {
                return originalJson.call(this, data);
            }

            // Log page view in background
            if (req.user && req.user.id) {
                req.activityLogger.log(req.user, "PAGE_VIEW", null, { page: pageName });
            }

            return originalJson.call(this, data);
        };

        next();
    };
};

module.exports = { attachLogger, logPageView };