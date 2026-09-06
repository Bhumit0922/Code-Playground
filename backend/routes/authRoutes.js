const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { requireAuth, JWT_SECRET } = require("../middleware/auth");

const router = express.Router();

// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../../frontend/imgg/uploads/profile');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const userId = req.body.userId || "user";
        const fileExt = path.extname(file.originalname);
        const fileName = `profile_${userId}_${Date.now()}${fileExt}`;
        cb(null, fileName);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed'), false);
    }
};

const upload = multer({ 
    storage: storage, 
    fileFilter: fileFilter,
    limits: { fileSize: 3 * 1024 * 1024 } // 3MB limit
});

// Helper to generate JWT token
function generateToken(user) {
    return jwt.sign(
        { 
            userId: user._id.toString(), 
            email: user.email, 
            role: user.role || "user" 
        }, 
        JWT_SECRET, 
        { expiresIn: "7d" }
    );
}

// @route POST /api/auth/register
router.post("/register", async (req, res) => {
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

        const existingUser = await User.findOne({ 
            $or: [{ email: finalEmail }, { username: finalUsername }] 
        });

        if (existingUser) {
            return res.status(400).json({ 
                message: existingUser.email === finalEmail ? "Email is already registered" : "Username is already taken" 
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({
            username: finalUsername,
            email: finalEmail,
            password: hashedPassword,
            role: "user"
        });

        await user.save();

        const token = generateToken(user);
        res.status(201).json({
            message: "User registered successfully",
            token,
            userId: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            profilePicture: user.profilePicture
        });
    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ message: "Error registering user: " + error.message });
    }
});

// @route POST /api/auth/login
router.post("/login", async (req, res) => {
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
            return res.status(400).json({ message: "Invalid email or username." });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Incorrect password." });
        }

        const token = generateToken(user);
        res.json({
            message: "Sign in successful",
            token,
            userId: user._id,
            username: user.username,
            email: user.email,
            role: user.role || "user",
            profilePicture: user.profilePicture || "/profile.png"
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: "Error signing in: " + error.message });
    }
});

// @route GET /api/auth/verify
router.get("/verify", requireAuth, async (req, res) => {
    res.json({
        valid: true,
        user: req.user
    });
});

// @route GET /api/auth/check-admin
router.get("/check-admin", async (req, res) => {
    try {
        let token = req.headers.authorization && req.headers.authorization.startsWith("Bearer ")
            ? req.headers.authorization.split(" ")[1]
            : req.headers["x-auth-token"] || req.headers.token;

        const userId = req.query.userId || req.headers.userid;

        if (token) {
            try {
                const decoded = jwt.verify(token, JWT_SECRET);
                const user = await User.findById(decoded.userId);
                if (user && user.role === "admin") {
                    return res.json({ isAdmin: true });
                }
            } catch (e) {}
        }

        if (userId) {
            const user = await User.findById(userId);
            if (user && user.role === "admin") {
                return res.json({ isAdmin: true });
            }
        }

        res.json({ isAdmin: false });
    } catch (error) {
        console.error("Check admin error:", error);
        res.status(500).json({ isAdmin: false, message: "Error checking admin privilege" });
    }
});

// @route POST /api/auth/upload-profile-picture
router.post("/upload-profile-picture", upload.single('profilePicture'), async (req, res) => {
    try {
        const userId = req.body.userId;
        if (!userId) {
            return res.status(400).json({ message: "User ID is required" });
        }
        
        if (!req.file) {
            return res.status(400).json({ message: "No image file uploaded" });
        }
        
        const relativePath = `/uploads/profile/${req.file.filename}`;
        const user = await User.findByIdAndUpdate(
            userId, 
            { profilePicture: relativePath },
            { new: true }
        );
        
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        
        res.json({ 
            message: "Profile picture updated successfully", 
            profilePicture: relativePath 
        });
    } catch (error) {
        console.error("Error uploading profile picture:", error);
        res.status(500).json({ message: "Error uploading profile picture" });
    }
});

// @route GET /api/auth/profile/:userId
router.get("/profile/:userId", async (req, res) => {
    try {
        const userId = req.params.userId;
        const user = await User.findById(userId)
            .select("-password")
            .populate("problemsSolved", "title difficulty topic");

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const submissionCount = user.submissions ? user.submissions.length : 0;
        const acceptedCount = user.submissions
            ? user.submissions.filter(sub => sub.status === "Accepted").length
            : 0;

        const stats = {
            problemsSolved: user.problemsSolved ? user.problemsSolved.length : 0,
            totalSubmissions: submissionCount,
            acceptedSubmissions: acceptedCount,
            acceptanceRate: submissionCount > 0 ? Math.round((acceptedCount / submissionCount) * 100) : 0
        };

        res.json({
            user: {
                _id: user._id,
                username: user.username,
                email: user.email,
                role: user.role || "user",
                profilePicture: user.profilePicture || "/profile.png",
                contestRating: user.contestRating || { current: 1500, highest: 1500, history: [] },
                contestsParticipated: user.contestsParticipated || [],
                createdAt: user.createdAt
            },
            stats,
            submissions: user.submissions ? user.submissions.slice(-10).reverse() : []
        });
    } catch (error) {
        console.error("Error fetching user profile:", error);
        res.status(500).json({ message: "Error fetching user profile" });
    }
});

// @route GET /api/auth/user/:userId/submissions
router.get("/user/:userId/submissions", async (req, res) => {
    try {
        const user = await User.findById(req.params.userId).populate("submissions.problem", "title difficulty");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json(user.submissions || []);
    } catch (error) {
        res.status(500).json({ message: "Error fetching submissions" });
    }
});

module.exports = router;