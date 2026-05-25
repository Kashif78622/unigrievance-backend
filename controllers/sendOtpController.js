// controllers/sendOtpController.js
const generateOtp = require("../utils/generateOtp");
const sendEmail = require("../utils/sendEmail");
const User = require("../models/User");
const ActivityLogger = require("../utils/activityLogger");

const otpStore = new Map();
const getLogger = (req) => new ActivityLogger(req);

const sendOtp = async (req, res) => {
    const { username, email } = req.body;

    try {
        if (!username || !email) {
            return res.status(400).json({ message: "Username and email required" });
        }

        // Check if email is already registered
        const existingEmail = await User.findOne({ email });
        if (existingEmail) {
            return res.status(400).json({
                message: "This email is already registered. Please login or use a different account."
            });
        }

        // Check if username is already registered
        const existingUsername = await User.findOne({ username });
        if (existingUsername) {
            return res.status(400).json({
                message: "This registration number is already registered. Please login or contact support."
            });
        }

        const otp = generateOtp();

        otpStore.set(username, {
            otp,
            email,
            verified: false,
            expires: Date.now() + 5 * 60 * 1000
        });

        await sendEmail(email, otp);

        // ✅ Log OTP request (if user is logged in, otherwise skip)
        if (req.user) {
            const logger = getLogger(req);
            await logger.log(req.user, "OTP_REQUEST", null, {
                email: email,
                username: username,
                purpose: "signup_verification"
            });
        }

        res.json({ message: "OTP sent successfully" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to send OTP" });
    }
};

module.exports = sendOtp;
module.exports.otpStore = otpStore;