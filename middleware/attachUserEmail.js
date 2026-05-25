// middleware/attachUserEmail.js
const { getUserEmail } = require("../utils/emailConstructor");

const attachUserEmail = async (req, res, next) => {
    try {
        if (req.user) {
            req.user.email = await getUserEmail(req.user);
        }
        next();
    } catch (error) {
        console.error("Error attaching email:", error);
        next();
    }
};

module.exports = attachUserEmail;