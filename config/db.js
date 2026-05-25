const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        // Use MONGODB_URI for Render (match your .env variable name)
        const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI;

        await mongoose.connect(mongoURI, {
            // These options are for older Mongoose versions, remove if not needed
            // useNewUrlParser: true,
            // useUnifiedTopology: true,
        });

        console.log("MongoDB Connected Successfully");
    } catch (error) {
        console.error("Database connection error:", error);
        process.exit(1);
    }
};

module.exports = connectDB;