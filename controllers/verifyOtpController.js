// controllers/verifyOtpController.js
const sendOtpController = require("./sendOtpController");

const verifyOtp = async (req, res) => {
    const { username, otp } = req.body;

    try {
        if (!username || !otp) {
            return res.status(400).json({ message: "Username and OTP required" });
        }

        const record = sendOtpController.otpStore.get(username);
        console.log(`Verifying OTP for ${username}:`, { record, receivedOtp: otp });

        if (!record) {
            return res.status(400).json({ message: "OTP not found. Please request a new OTP." });
        }

        if (record.expires < Date.now()) {
            sendOtpController.otpStore.delete(username);
            return res.status(400).json({ message: "OTP expired. Please request a new OTP." });
        }

        if (record.otp !== otp) {
            return res.status(400).json({ message: "Invalid OTP. Please try again." });
        }

        // Mark verified
        record.verified = true;
        sendOtpController.otpStore.set(username, record);
        console.log(`OTP verified for ${username}`);

        res.json({ message: "OTP verified successfully" });

    } catch (error) {
        console.error("Verify OTP error:", error);
        res.status(500).json({ message: "Server error: " + error.message });
    }
};

module.exports = verifyOtp;