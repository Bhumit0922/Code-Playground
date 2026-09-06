const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Problem = require("../models/Problem");
const Contest = require("../models/Contest");
const User = require("../models/User");
const { endContest } = require("../utils/contestService");

// ==========================================
// VIEW RENDERING ROUTES (/admin/...)
// ==========================================

// Admin Dashboard Overview
router.get("/", async (req, res) => {
    try {
        const [totalProblems, totalContests, totalUsers, recentUsers] = await Promise.all([
            Problem.countDocuments(),
            Contest.countDocuments(),
            User.countDocuments(),
            User.find().sort({ createdAt: -1 }).limit(5).select("username email role createdAt")
        ]);

        const ongoingContests = await Contest.countDocuments({ status: "Ongoing" });

        res.render("admin/dashboard", {
            activePage: "admin",
            stats: {
                totalProblems,
                totalContests,
                totalUsers,
                ongoingContests
            },
            recentUsers
        });
    } catch (err) {
        console.error("Admin dashboard error:", err);
        res.status(500).render("error", { title: "Admin Error", message: "Failed to load admin dashboard." });
    }
});

// Problem Management View
router.get("/problems", async (req, res) => {
    try {
        const problems = await Problem.find()
            .sort({ createdAt: -1 })
            .select("title difficulty topic acceptance submissionsCount acceptedCount createdAt")
            .lean({ virtuals: true });

        res.render("admin/problems", {
            activePage: "admin",
            problems
        });
    } catch (err) {
        console.error("Admin problems view error:", err);
        res.status(500).render("error", { title: "Admin Error", message: "Failed to load problems directory." });
    }
});

// Add New Problem View
router.get("/add-problem", (req, res) => {
    res.render("admin/add_problem", {
        activePage: "admin",
        problem: null,
        isEdit: false
    });
});

// Edit Problem View
router.get("/edit-problem/:id", async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).render("error", { title: "Invalid ID", message: "Invalid problem ID" });
        }

        const problem = await Problem.findById(id).lean();
        if (!problem) {
            return res.status(404).render("error", { title: "Not Found", message: "Problem not found" });
        }

        res.render("admin/add_problem", {
            activePage: "admin",
            problem,
            isEdit: true
        });
    } catch (err) {
        console.error("Admin edit problem error:", err);
        res.status(500).render("error", { title: "Admin Error", message: "Failed to load problem for editing." });
    }
});

// Contest Management View
router.get("/contests", async (req, res) => {
    try {
        const contests = await Contest.find()
            .populate("createdBy", "username")
            .sort({ startTime: -1 })
            .lean();

        res.render("admin/contests", {
            activePage: "admin",
            contests
        });
    } catch (err) {
        console.error("Admin contests view error:", err);
        res.status(500).render("error", { title: "Admin Error", message: "Failed to load contest manager." });
    }
});

// User Management View
router.get("/users", async (req, res) => {
    try {
        const users = await User.find()
            .sort({ createdAt: -1 })
            .select("username email role rating problemsSolved submissions createdAt")
            .lean();

        res.render("admin/users", {
            activePage: "admin",
            users
        });
    } catch (err) {
        console.error("Admin users view error:", err);
        res.status(500).render("error", { title: "Admin Error", message: "Failed to load users directory." });
    }
});

// ==========================================
// REST API ENDPOINTS (/api/admin/...)
// ==========================================

// @route GET /api/admin/stats
router.get("/api/stats", async (req, res) => {
    try {
        const [totalProblems, totalContests, totalUsers] = await Promise.all([
            Problem.countDocuments(),
            Contest.countDocuments(),
            User.countDocuments()
        ]);

        res.json({
            success: true,
            totalProblems,
            totalContests,
            totalUsers
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// @route GET /api/admin/stats or /admin/stats
router.get(["/stats", "/api/stats"], async (req, res) => {
    try {
        const [totalProblems, totalContests, totalUsers] = await Promise.all([
            Problem.countDocuments(),
            Contest.countDocuments(),
            User.countDocuments()
        ]);

        res.json({
            success: true,
            totalProblems,
            totalContests,
            totalUsers
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// @route GET /api/admin/users or /admin/api/users
router.get(["/users/list", "/api/users"], async (req, res) => {
    try {
        const users = await User.find()
            .sort({ createdAt: -1 })
            .select("username email role rating problemsSolved createdAt")
            .lean();

        res.json({ success: true, users });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// @route POST /api/admin/users/:id/role
// @desc Change user role between "user" and "admin"
router.post(["/users/:id/role", "/api/users/:id/role"], async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        if (!["user", "admin"].includes(role)) {
            return res.status(400).json({ success: false, message: "Invalid role specified." });
        }

        const user = await User.findByIdAndUpdate(id, { role }, { new: true });
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        res.json({ success: true, message: `Role for ${user.username} updated to ${role}.`, user });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// @route DELETE /api/admin/users/:id
// @desc Delete a user account
router.delete(["/users/:id", "/api/users/:id"], async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findByIdAndDelete(id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }
        res.json({ success: true, message: `User ${user.username} deleted.` });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// @route POST /api/admin/contests/:id/extend
// @desc Extend contest duration
router.post(["/contests/:id/extend", "/api/contests/:id/extend"], async (req, res) => {
    try {
        const { id } = req.params;
        const { minutes = 30 } = req.body;

        const contest = await Contest.findById(id);
        if (!contest) {
            return res.status(404).json({ success: false, message: "Contest not found." });
        }

        const currentEnd = new Date(contest.endTime);
        contest.endTime = new Date(currentEnd.getTime() + parseInt(minutes) * 60 * 1000);
        await contest.updateStatus();
        await contest.save();

        res.json({
            success: true,
            message: `Contest extended by ${minutes} minutes. New end time: ${contest.endTime}`,
            contest
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// @route POST /api/admin/contests/:id/end
// @desc Force end contest and calculate leaderboard / ratings
router.post(["/contests/:id/end", "/api/contests/:id/end"], async (req, res) => {
    try {
        const { id } = req.params;
        const contest = await endContest(id);
        res.json({
            success: true,
            message: `Contest '${contest.name}' has been ended and user ratings recalculated.`,
            contest
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// @route DELETE /api/admin/contests/:id
// @desc Delete a contest
router.delete(["/contests/:id", "/api/contests/:id"], async (req, res) => {
    try {
        const { id } = req.params;
        const contest = await Contest.findByIdAndDelete(id);
        if (!contest) {
            return res.status(404).json({ success: false, message: "Contest not found." });
        }
        res.json({ success: true, message: `Contest '${contest.name}' deleted.` });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
