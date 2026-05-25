const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Category = require("../models/Category");

dotenv.config();

/* 🔹 MAIN CATEGORIES (EXTENDED) */

const categories = [
    "Academic",
    "Examination",
    "Facilities",
    "Hostel",
    "Transport",
    "Administration",
    "Finance",
    "IT Services",
    "Library",
    "Security",
    "Harassment",
    "Admission",
    "Scholarship",
    "Attendance",
    "Result",
    "Fee Issues",
    "Timetable",
    "Faculty",
    "Infrastructure",
    "Cleanliness",
    "Cafeteria",
    "Internet/WiFi",
    "Parking",
    "Medical",
    "Sports",
    "Events",
    "Other",
];

/* 🔹 EMOTIONS - ALL 6 EMOTIONS from AI model */
const emotions = [
    "Urgent",
    "Angry",
    "Frustrated",
    "Sad",
    "Neutral",
    "Satisfied"
];

/* 🔹 STATUSES - Including Unread */
const statuses = [
    "Unread",
    "Pending",
    "In Progress",
    "Resolved"
];

/* 🔹 CONNECT DB */

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB Connected"))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });

/* 🔹 SEED FUNCTION */

const seedCategories = async () => {
    try {

        console.log("Seeding categories...");

        /* 🔥 DO NOT DELETE → SAFE INSERT */
        const allData = [];

        /* ---------- MAIN ---------- */
        categories.forEach((name, index) => {
            allData.push({
                name,
                type: "main",
                position: index + 1,
                isActive: true
            });
        });

        /* ---------- EMOTIONS (ALL 6) ---------- */
        emotions.forEach((name, index) => {
            allData.push({
                name,
                type: "emotion",
                position: index + 1,
                isActive: true
            });
        });

        /* ---------- STATUS (WITH UNREAD) ---------- */
        statuses.forEach((name, index) => {
            allData.push({
                name,
                type: "status",
                position: index + 1,
                isActive: true
            });
        });

        /* 🔥 INSERT WITHOUT DUPLICATES */
        for (let item of allData) {

            const exists = await Category.findOne({
                name: item.name,
                type: item.type
            });

            if (!exists) {
                await Category.create(item);
                console.log(`✔ Added: ${item.name} (${item.type})`);
            } else {
                console.log(`⏩ Skipped: ${item.name} (${item.type})`);
            }
        }

        console.log("\n✅ Seeding completed");
        console.log("\n📊 Summary:");
        console.log(`   - Main Categories: ${categories.length}`);
        console.log(`   - Emotions: ${emotions.length}`);
        console.log(`   - Statuses: ${statuses.length}`);
        console.log(`   - Total: ${allData.length}`);

        process.exit();

    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

seedCategories();