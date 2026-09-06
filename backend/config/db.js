const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

let isConnected = false;

const connectDB = async () => {
    if (isConnected) {
        return;
    }

    const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/codeplayground";

    try {
        const conn = await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 8000,
        });

        isConnected = true;
        console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`[Database Error] Could not connect to MongoDB: ${error.message}`);
        console.warn("[Database Notice] Make sure MONGODB_URI is set properly in .env or MongoDB is running.");
        // Do not call process.exit(1) so serverless or web servers can serve static views/show friendly errors
    }
};

module.exports = connectDB;