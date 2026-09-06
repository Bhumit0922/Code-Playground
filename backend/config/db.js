const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

/**
 * Global cache for MongoDB connection across serverless function invocations (Vercel).
 * Prevents opening duplicate connections on every cold start or concurrent request.
 */
let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
    // 1. If connection already exists and is active (readyState === 1)
    if (cached.conn && mongoose.connection.readyState === 1) {
        return cached.conn;
    }

    const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/codeplayground";

    // 2. If no connection promise is currently in flight, initiate one
    if (!cached.promise) {
        const opts = {
            bufferCommands: false, // Return immediately if disconnected rather than hanging
            maxPoolSize: 10,
            minPoolSize: 1,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            family: 4 // Force IPv4 (skips slow IPv6 DNS resolution in cloud)
        };

        cached.promise = mongoose.connect(uri, opts).then((m) => {
            console.log(`[Database] MongoDB Connected: ${m.connection.host}`);
            return m;
        });
    }

    // 3. Await the connection promise
    try {
        cached.conn = await cached.promise;
        return cached.conn;
    } catch (error) {
        cached.promise = null; // Clear so subsequent requests can retry cleanly
        console.error(`[Database Error] Could not connect to MongoDB: ${error.message}`);
        console.warn("[Database Notice] Ensure MONGODB_URI is valid in Vercel / environment variables.");
        throw error;
    }
};

module.exports = connectDB;