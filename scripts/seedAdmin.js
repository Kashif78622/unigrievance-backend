const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const connectDB = require("../config/db");
const User = require("../models/user");

const seedSuperAdmin = async () => {
    try {
        await connectDB();

        const existingAdmin = await User.findOne({ role: "superadmin" });

        if (existingAdmin) {
            console.log("SuperAdmin already exists");
            process.exit();
        }

        const hashedPassword = await bcrypt.hash("admin123", 10);

        const superAdmin = new User({
            name: "System Super Admin",
            username: "superadmin",
            email: "admin@unigrievance.com",
            password: hashedPassword,
            role: "superadmin",

            department: null,
            sessionYear: null,
            registration_number: null,

            isVerified: true,
            isActive: true,

            profileImage: null,
            phone: null,

            lastLogin: null,
        });

        await superAdmin.save();

        console.log("✅ SuperAdmin created successfully");
        console.log("Username: superadmin");
        console.log("Password: admin123");

        process.exit();
    } catch (error) {
        console.error("Error seeding superadmin:", error);
        process.exit(1);
    }
};

seedSuperAdmin();