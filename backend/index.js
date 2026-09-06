const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const Problem = require("./models/Problem");
const Contest = require("./models/Contest");
const User = require("./models/User");

// Load environment variables
dotenv.config();

const app = express();

// Connect to Database
connectDB();

// View engine setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../frontend/views"));

// Body parsing and security middleware
app.use(cors());
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// Static files configuration
app.use("/css", express.static(path.join(__dirname, "../frontend/css")));
app.use("/uploads", express.static(path.join(__dirname, "../frontend/imgg/uploads")));
app.use(express.static(path.join(__dirname, "../frontend/imgg")));
app.use(express.static(path.join(__dirname, "../frontend")));

// Import API Routes
const authRoutes = require("./routes/authRoutes");
const problemRoutes = require("./routes/problemRoutes");
const executeRoutes = require("./routes/executeRoutes");
const discussRoutes = require("./routes/discussRoutes");
const contestRoutes = require("./routes/contestRoutes");
const contestjoinRoutes = require("./routes/contestjoinRoutes");
const contactRoutes = require("./routes/contactRoutes");

// Mount API Endpoints
app.use("/api/auth", authRoutes);
app.use("/api/problems", problemRoutes);
app.use("/api/execute", executeRoutes);
app.use("/api/discuss", discussRoutes);
app.use("/api/contests/join", contestjoinRoutes);
app.use("/api/contests", contestRoutes);
app.use("/api/contact", contactRoutes);

// Compatibility authentication routes
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("./middleware/auth");

app.post("/signup", async (req, res) => {
    try {
        const { username, name, email, password, confirm_password } = req.body;
        const finalUsername = (username || name || "").trim();
        const finalEmail = (email || "").trim().toLowerCase();

        if (!finalUsername || !finalEmail || !password) {
            return res.status(400).json({ message: "Username, email, and password are required." });
        }

        if (confirm_password && password !== confirm_password) {
            return res.status(400).json({ message: "Passwords do not match." });
        }

        const existing = await User.findOne({ 
            $or: [{ email: finalEmail }, { username: finalUsername }] 
        });

        if (existing) {
            return res.status(400).json({ 
                message: existing.email === finalEmail ? "Email already exists" : "Username is already taken" 
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({
            username: finalUsername,
            email: finalEmail,
            password: hashedPassword,
            role: "user"
        });

        const token = jwt.sign(
            { userId: user._id.toString(), email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.status(201).json({
            message: "Signup successful",
            token,
            userId: user._id,
            username: user.username,
            email: user.email,
            role: user.role
        });
    } catch (err) {
        console.error("Signup error:", err);
        res.status(500).json({ message: "Error during sign up: " + err.message });
    }
});

app.post("/signin", async (req, res) => {
    try {
        const { email, password } = req.body;
        const finalEmail = (email || "").trim().toLowerCase();

        if (!finalEmail || !password) {
            return res.status(400).json({ message: "Email and password are required." });
        }

        const user = await User.findOne({
            $or: [{ email: finalEmail }, { username: finalEmail }]
        });

        if (!user) {
            return res.status(400).json({ message: "User not found with provided credentials." });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Incorrect password." });
        }

        const token = jwt.sign(
            { userId: user._id.toString(), email: user.email, role: user.role || "user" },
            JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.json({
            message: "Signin successful",
            token,
            userId: user._id,
            username: user.username,
            email: user.email,
            role: user.role || "user",
            profilePicture: user.profilePicture || "/profile.png"
        });
    } catch (err) {
        console.error("Signin error:", err);
        res.status(500).json({ message: "Error signing in: " + err.message });
    }
});

// ==========================================
// PAGE VIEW ROUTES
// ==========================================

// Landing page
app.get("/", (req, res) => {
    res.render("home", { activePage: "home" });
});

// Explore
app.get("/explore", (req, res) => {
    res.render("explore", { activePage: "explore" });
});

// Problems list
app.get("/problems", (req, res) => {
    res.render("problems", { activePage: "problems" });
});

// Code Editor for Problem
app.get("/editcode/:problemId", async (req, res) => {
    try {
        const problemId = req.params.problemId;
        if (!mongoose.Types.ObjectId.isValid(problemId)) {
            return res.status(404).render("error", { 
                title: "Problem Not Found", 
                message: "The requested problem ID is invalid." 
            });
        }

        const problem = await Problem.findById(problemId);
        if (!problem) {
            return res.status(404).render("error", { 
                title: "Problem Not Found", 
                message: "Could not find a problem with the requested ID." 
            });
        }

        res.render("editcode", { problem, activePage: "problems" });
    } catch (error) {
        console.error("Error fetching problem:", error);
        res.status(500).render("error", { 
            title: "Internal Error", 
            message: "Failed to load the code editor for this problem." 
        });
    }
});

// Contests directory
app.get("/contests", (req, res) => {
    res.render("contests", { activePage: "contests" });
});

// Create Contest
app.get("/create_contest", (req, res) => {
    res.render("create_contest", { activePage: "contests" });
});

// Single Contest Workspace
app.get("/contestpage/:id", async (req, res) => {
    try {
        const contestId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(contestId)) {
            return res.status(400).render("error", { 
                title: "Invalid Contest ID", 
                message: "The contest ID format is invalid." 
            });
        }

        const contest = await Contest.findById(contestId)
            .populate("problems", "title difficulty")
            .populate("participants.user", "username")
            .lean();

        if (!contest) {
            return res.status(404).render("error", { 
                title: "Contest Not Found", 
                message: "The contest you requested could not be found." 
            });
        }

        res.render("contestpage", { contestId: contest._id, contest, activePage: "contests" });
    } catch (error) {
        console.error("Error loading contestpage:", error);
        res.status(500).render("error", { 
            title: "Error Loading Contest", 
            message: "Failed to load contest details. Please try again." 
        });
    }
});

// Contest Leaderboard
app.get("/contest/:id/leaderboard", async (req, res) => {
    try {
        const contestId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(contestId)) {
            return res.status(400).render("error", { 
                title: "Invalid Contest ID", 
                message: "Invalid contest ID format." 
            });
        }

        const contest = await Contest.findById(contestId)
            .populate({
                path: "leaderboard.user",
                select: "username"
            })
            .lean();

        if (!contest) {
            return res.status(404).render("error", { 
                title: "Contest Not Found", 
                message: "Contest does not exist." 
            });
        }

        if (contest.status !== "Completed") {
            return res.render("contest_not_ended", { 
                contestId: contest._id,
                contestName: contest.name,
                endTime: contest.endTime,
                activePage: "contests"
            });
        }

        const leaderboard = (contest.leaderboard || [])
            .filter(entry => entry.user)
            .map((entry, index) => ({
                rank: entry.rank || (index + 1),
                username: entry.user.username || "Unknown",
                score: entry.totalScore || 0,
                problemsSolved: entry.submissions ? entry.submissions.filter(s => s.score > 0).length : 0
            }))
            .sort((a, b) => b.score - a.score);

        res.render("leaderboard", {
            contestId: contest._id,
            contestName: contest.name,
            leaderboard,
            activePage: "contests"
        });
    } catch (error) {
        console.error("Error fetching leaderboard:", error);
        res.status(500).render("error", { 
            title: "Error", 
            message: "Failed to fetch leaderboard standings." 
        });
    }
});

// Community Discussion
app.get("/discuss", (req, res) => {
    res.render("discuss", { activePage: "discuss" });
});

// About Us
app.get("/about", (req, res) => {
    res.render("about", { activePage: "about" });
});

// Contact Us
app.get("/contact", (req, res) => {
    res.render("contact", { activePage: "contact" });
});

// User Profile
app.get("/profile", (req, res) => {
    res.render("profile", { activePage: "profile" });
});

// Sign In
app.get("/signin", (req, res) => {
    res.render("signin", { activePage: "signin" });
});

// Sign Up
app.get("/signup", (req, res) => {
    res.render("signup", { activePage: "signup" });
});

// 404 Catch-All
app.use((req, res) => {
    res.status(404).render("error", {
        title: "404 - Page Not Found",
        message: `The page '${req.originalUrl}' does not exist on Code Playground.`
    });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error("Unhandled Application Error:", err);
    res.status(500).render("error", {
        title: "Internal Server Error",
        message: "An unexpected error occurred. Our team has been notified.",
        error: process.env.NODE_ENV === "development" ? err.stack : undefined
    });
});

const PORT = process.env.PORT || 4000;

if (process.env.NODE_ENV !== "test" && !process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`[Server] Code Playground running at http://localhost:${PORT}`);
    });
}

module.exports = app;