// controllers/signupController.js (Alternative - Store only prefix)
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Department = require("../models/Department");
const SystemSettings = require("../models/SystemSettings");
const { otpStore } = require("./sendOtpController");
const ActivityLogger = require("../utils/activityLogger");

const getLogger = (req) => new ActivityLogger(req);

// Helper function to generate email prefix only
const generateEmailPrefix = (userData, department) => {
    const { sessionYear, shift, rollNumber } = userData;
    const paddedRoll = rollNumber.padStart(3, "0");
    const deptCode = `bs${department.tag.toLowerCase()}`;
    const shiftPart = shift === "E" ? `f${sessionYear}e` : `f${sessionYear}`;
    return `${deptCode}-${shiftPart}-${paddedRoll}`;
};

const signup = async (req, res) => {
    console.log("=== SIGNUP CONTROLLER HIT ===");
    console.log("Request body:", req.body);

    const {
        name,
        username,
        department: departmentId,
        password,
        sessionYear,
        rollNumber,
        shift
    } = req.body;

    // Validate required fields
    if (!name || !username || !departmentId || !password || !sessionYear || !rollNumber || !shift) {
        return res.status(400).json({ message: "Missing required fields" });
    }

    try {
        // Check if OTP was verified
        const record = otpStore.get(username);
        if (!record || !record.verified) {
            return res.status(400).json({ message: "Please verify your email with OTP first" });
        }

        // Verify department exists
        const department = await Department.findById(departmentId);
        if (!department) {
            return res.status(400).json({ message: "Department not found" });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists with this registration number" });
        }

        // Generate email prefix (without domain and university tag)
        const emailPrefix = generateEmailPrefix({ sessionYear, shift, rollNumber }, department);

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user with email prefix
        const newUser = new User({
            name,
            username,
            department: departmentId,
            sessionYear,
            rollNumber: rollNumber.padStart(3, "0"),
            shift,
            password: hashedPassword,
            email: emailPrefix,  // Store only the prefix
            isVerified: true,
            role: "student"
        });

        await newUser.save();

        // Cleanup OTP
        otpStore.delete(username);

        // Get settings to construct full email for response
        const settings = await SystemSettings.findOne();
        const domain = settings?.universityDomain || "uoc.edu.pk";
        const universityTag = settings?.universityTag || "uoc";
        const fullEmail = `${universityTag}-${emailPrefix}@students.${domain}`;

        // Log signup completion
        try {
            const logger = getLogger(req);
            await logger.log(newUser, "ACCOUNT_CREATED", newUser, {
                registrationNumber: username,
                department: departmentId,
                sessionYear,
                shift,
                rollNumber,
                email: fullEmail,
                signupMethod: "email_verification"
            });
        } catch (logError) {
            console.error("Logging error (non-critical):", logError);
        }

        res.status(201).json({
            message: "Account created successfully",
            user: {
                id: newUser._id,
                name: newUser.name,
                username: newUser.username,
                email: fullEmail,
                role: newUser.role
            }
        });

    } catch (error) {
        console.error("Signup error:", error);

        if (error.code === 11000) {
            if (error.keyPattern?.username) {
                return res.status(400).json({
                    message: "Username already exists. Please check your registration number."
                });
            }
        }

        res.status(500).json({
            message: "Signup failed: " + error.message
        });
    }
};

module.exports = signup;