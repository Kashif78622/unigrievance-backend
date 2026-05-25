const mongoose = require("mongoose");
require("dotenv").config();

const connectDB = require("../config/db");
const Department = require("../models/Department");

const departments = [

    { name: "Computer Science", tag: "CS" },
    { name: "Software Engineering", tag: "SE" },
    { name: "Information Technology", tag: "IT" },
    { name: "Artificial Intelligence", tag: "AI" },
    { name: "Data Science", tag: "DS" },

    { name: "Electrical Engineering", tag: "EE" },
    { name: "Mechanical Engineering", tag: "ME" },
    { name: "Civil Engineering", tag: "CE" },
    { name: "Chemical Engineering", tag: "CHE" },

    { name: "Business Administration", tag: "BBA" },
    { name: "Accounting and Finance", tag: "AF" },
    { name: "Economics", tag: "ECO" },
    { name: "Management Sciences", tag: "MS" },

    { name: "Mathematics", tag: "MATH" },
    { name: "Physics", tag: "PHY" },
    { name: "Chemistry", tag: "CHEM" },
    { name: "Statistics", tag: "STAT" },

    { name: "English", tag: "ENG" },
    { name: "Urdu", tag: "URDU" },
    { name: "Islamic Studies", tag: "ISL" },
    { name: "Psychology", tag: "PSY" },

    { name: "Law", tag: "LAW" },
    { name: "Political Science", tag: "PS" },
    { name: "International Relations", tag: "IR" },

    { name: "Education", tag: "EDU" },

    { name: "Administration", tag: "ADMIN" },
    { name: "Examination Department", tag: "EXAM" },
    { name: "Admissions Office", tag: "ADM" },
    { name: "Student Affairs", tag: "SA" },
    { name: "Library", tag: "LIB" },
    { name: "Hostel Administration", tag: "HOSTEL" },
    { name: "Transport Department", tag: "TRANS" },
    { name: "Finance Department", tag: "FIN" },
    { name: "Human Resources", tag: "HR" },
    { name: "IT Support", tag: "ITS" },

];



const seedDepartments = async () => {

    try {

        await connectDB();

        await Department.deleteMany();

        const formattedDepartments = departments.map(dep => ({
            departmentId: `DEP-${dep.tag}`,
            name: dep.name,
            tag: dep.tag,
            isActive: true
        }));

        await Department.insertMany(formattedDepartments);

        console.log("All departments inserted successfully");

        process.exit();

    } catch (error) {

        console.error("Error seeding departments:", error);

        process.exit(1);

    }

};

seedDepartments();