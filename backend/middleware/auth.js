const jwt = require("jsonwebtoken");
const User = require("../models/User");

const JWT_SECRET = process.env.JWT_SECRET || "codeplayground_jwt_super_secret_key_2025";

/**
 * Middleware to require valid JWT authentication
 */
const requireAuth = async (req, res, next) => {
    try {
        let token = null;

        if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
            token = req.headers.authorization.split(" ")[1];
        } else if (req.headers["x-auth-token"]) {
            token = req.headers["x-auth-token"];
        } else if (req.headers.token) {
            token = req.headers.token;
        }

        if (!token) {
            return res.status(401).json({ message: "Authentication required. Please sign in." });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.userId).select("-password");

        if (!user) {
            return res.status(401).json({ message: "User session expired or user does not exist." });
        }

        req.user = {
            id: user._id.toString(),
            userId: user._id.toString(),
            username: user.username,
            email: user.email,
            role: user.role || "user"
        };

        next();
    } catch (err) {
        return res.status(401).json({ message: "Invalid or expired session token." });
    }
};

/**
 * Optional authentication: attaches user if token provided, but allows guests
 */
const optionalAuth = async (req, res, next) => {
    try {
        let token = null;
        if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
            token = req.headers.authorization.split(" ")[1];
        } else if (req.headers["x-auth-token"]) {
            token = req.headers["x-auth-token"];
        }

        if (token) {
            const decoded = jwt.verify(token, JWT_SECRET);
            const user = await User.findById(decoded.userId).select("-password");
            if (user) {
                req.user = {
                    id: user._id.toString(),
                    userId: user._id.toString(),
                    username: user.username,
                    email: user.email,
                    role: user.role || "user"
                };
            }
        }
    } catch (err) {
        // Ignore errors in optional auth
    }
    next();
};

/**
 * Middleware to require admin privileges
 */
const requireAdmin = async (req, res, next) => {
    requireAuth(req, res, () => {
        if (req.user && req.user.role === "admin") {
            return next();
        }
        return res.status(403).json({ message: "Access denied: Administrator privileges required." });
    });
};

module.exports = {
    requireAuth,
    optionalAuth,
    requireAdmin,
    JWT_SECRET
};
