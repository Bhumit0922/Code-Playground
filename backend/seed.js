const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env") });

const Problem = require("./models/Problem");
const User = require("./models/User");
const Contest = require("./models/Contest");
const Discussion = require("./models/Discussion");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/codeplayground";

const sampleProblems = [
    {
        title: "Two Sum",
        difficulty: "Easy",
        topic: "Arrays & Hashing",
        tags: ["Array", "Hash Table"],
        description: "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.",
        inputFormat: "First line contains n (array size). Second line contains n integers. Third line contains target.",
        outputFormat: "Print the two 0-indexed indices separated by space.",
        constraints: {
            "2 <= nums.length <= 10^4": true,
            "-10^9 <= nums[i] <= 10^9": true,
            "-10^9 <= target <= 10^9": true
        },
        sampleInput: "4\n2 7 11 15\n9",
        sampleOutput: "0 1",
        testCases: [
            { input: "4\n2 7 11 15\n9", output: "0 1" },
            { input: "3\n3 2 4\n6", output: "1 2" },
            { input: "2\n3 3\n6", output: "0 1" }
        ],
        submissionsCount: 1420,
        acceptedCount: 1150
    },
    {
        title: "Valid Parentheses",
        difficulty: "Easy",
        topic: "Stacks",
        tags: ["Stack", "String"],
        description: "Given a string `s` containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.\n\nAn input string is valid if open brackets are closed by the same type of brackets and in the correct order.",
        inputFormat: "A single line string s.",
        outputFormat: "Print 'true' if valid, otherwise 'false'.",
        constraints: {
            "1 <= s.length <= 10^4": true,
            "s consists of parentheses only '()[]{}'": true
        },
        sampleInput: "()[]{}",
        sampleOutput: "true",
        testCases: [
            { input: "()", output: "true" },
            { input: "()[]{}", output: "true" },
            { input: "(]", output: "false" },
            { input: "([)]", output: "false" },
            { input: "{[]}", output: "true" }
        ],
        submissionsCount: 980,
        acceptedCount: 780
    },
    {
        title: "Reverse a String",
        difficulty: "Easy",
        topic: "Strings",
        tags: ["String", "Two Pointers"],
        description: "Write a function that reverses a string. The input string is given as an array of characters.",
        inputFormat: "A single line containing the string.",
        outputFormat: "Print the reversed string.",
        constraints: {
            "1 <= s.length <= 10^5": true
        },
        sampleInput: "hello",
        sampleOutput: "olleh",
        testCases: [
            { input: "hello", output: "olleh" },
            { input: "Hannah", output: "hannaH" },
            { input: "CodePlayground", output: "dnuorgyalPedoC" }
        ],
        submissionsCount: 1200,
        acceptedCount: 1050
    },
    {
        title: "Binary Search",
        difficulty: "Easy",
        topic: "Searching",
        tags: ["Array", "Binary Search"],
        description: "Given an array of integers `nums` which is sorted in ascending order, and an integer `target`, write a function to search `target` in `nums`. If `target` exists, return its index. Otherwise, return -1.\n\nYou must write an algorithm with O(log n) runtime complexity.",
        inputFormat: "First line: n. Second line: n sorted integers. Third line: target.",
        outputFormat: "Print index of target or -1.",
        constraints: {
            "1 <= nums.length <= 10^4": true,
            "nums is sorted in ascending order": true
        },
        sampleInput: "6\n-1 0 3 5 9 12\n9",
        sampleOutput: "4",
        testCases: [
            { input: "6\n-1 0 3 5 9 12\n9", output: "4" },
            { input: "6\n-1 0 3 5 9 12\n2", output: "-1" },
            { input: "1\n5\n5", output: "0" }
        ],
        submissionsCount: 890,
        acceptedCount: 650
    },
    {
        title: "Maximum Subarray",
        difficulty: "Medium",
        topic: "Dynamic Programming",
        tags: ["Array", "Divide and Conquer", "Dynamic Programming"],
        description: "Given an integer array `nums`, find the subarray with the largest sum, and return its sum (Kadane's Algorithm).",
        inputFormat: "First line: n. Second line: n space separated integers.",
        outputFormat: "Print the maximum subarray sum.",
        constraints: {
            "1 <= nums.length <= 10^5": true,
            "-10^4 <= nums[i] <= 10^4": true
        },
        sampleInput: "9\n-2 1 -3 4 -1 2 1 -5 4",
        sampleOutput: "6",
        testCases: [
            { input: "9\n-2 1 -3 4 -1 2 1 -5 4", output: "6" },
            { input: "1\n1", output: "1" },
            { input: "5\n5 4 -1 7 8", output: "23" }
        ],
        submissionsCount: 750,
        acceptedCount: 420
    },
    {
        title: "Longest Substring Without Repeating Characters",
        difficulty: "Medium",
        topic: "Sliding Window",
        tags: ["Hash Table", "String", "Sliding Window"],
        description: "Given a string `s`, find the length of the longest substring without duplicate characters.",
        inputFormat: "A single line containing string s.",
        outputFormat: "Print the length of the longest substring.",
        constraints: {
            "0 <= s.length <= 5 * 10^4": true
        },
        sampleInput: "abcabcbb",
        sampleOutput: "3",
        testCases: [
            { input: "abcabcbb", output: "3" },
            { input: "bbbbb", output: "1" },
            { input: "pwwkew", output: "3" }
        ],
        submissionsCount: 620,
        acceptedCount: 310
    },
    {
        title: "Container With Most Water",
        difficulty: "Medium",
        topic: "Two Pointers",
        tags: ["Array", "Two Pointers", "Greedy"],
        description: "You are given an integer array `height` of length n. Find two lines that together with the x-axis form a container, such that the container contains the most water. Return the maximum amount of water a container can store.",
        inputFormat: "First line: n. Second line: n integers representing heights.",
        outputFormat: "Print the maximum area.",
        constraints: {
            "2 <= n <= 10^5": true,
            "0 <= height[i] <= 10^4": true
        },
        sampleInput: "9\n1 8 6 2 5 4 8 3 7",
        sampleOutput: "49",
        testCases: [
            { input: "9\n1 8 6 2 5 4 8 3 7", output: "49" },
            { input: "2\n1 1", output: "1" }
        ],
        submissionsCount: 540,
        acceptedCount: 300
    },
    {
        title: "Trapping Rain Water",
        difficulty: "Hard",
        topic: "Dynamic Programming",
        tags: ["Array", "Two Pointers", "Dynamic Programming", "Stack"],
        description: "Given `n` non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.",
        inputFormat: "First line: n. Second line: n elevation heights.",
        outputFormat: "Print the total trapped water volume.",
        constraints: {
            "n == height.length": true,
            "1 <= n <= 2 * 10^4": true,
            "0 <= height[i] <= 10^5": true
        },
        sampleInput: "12\n0 1 0 2 1 0 1 3 2 1 2 1",
        sampleOutput: "6",
        testCases: [
            { input: "12\n0 1 0 2 1 0 1 3 2 1 2 1", output: "6" },
            { input: "6\n4 2 0 3 2 5", output: "9" }
        ],
        submissionsCount: 420,
        acceptedCount: 160
    }
];

async function seedDatabase() {
    try {
        console.log(`Connecting to MongoDB at: ${MONGODB_URI}...`);
        await mongoose.connect(MONGODB_URI);
        console.log("Connected successfully to MongoDB.");

        // Clear existing collections
        console.log("Clearing existing data...");
        await Problem.deleteMany({});
        await Contest.deleteMany({});
        await User.deleteMany({});
        await Discussion.deleteMany({});

        // Seed Users
        console.log("Seeding users...");
        const adminPassword = await bcrypt.hash("Admin@123", 10);
        const userPassword = await bcrypt.hash("User@123", 10);

        const admin = await User.create({
            username: "admin",
            email: "admin@codeplayground.com",
            password: adminPassword,
            role: "admin",
            profilePicture: "/profile.png",
            contestRating: { current: 2150, highest: 2150, history: [] }
        });

        const user1 = await User.create({
            username: "alex_coder",
            email: "alex@codeplayground.com",
            password: userPassword,
            role: "user",
            profilePicture: "/profile.png",
            contestRating: { current: 1620, highest: 1650, history: [] }
        });

        const user2 = await User.create({
            username: "sarah_dev",
            email: "sarah@codeplayground.com",
            password: userPassword,
            role: "user",
            profilePicture: "/profile.png",
            contestRating: { current: 1540, highest: 1580, history: [] }
        });

        console.log(`Created ${3} default accounts.`);
        console.log("  -> Admin: admin@codeplayground.com / Admin@123");
        console.log("  -> User 1: alex@codeplayground.com / User@123");
        console.log("  -> User 2: sarah@codeplayground.com / User@123");

        // Seed Problems
        console.log("Seeding problem bank...");
        const createdProblems = await Problem.insertMany(sampleProblems);
        console.log(`Created ${createdProblems.length} standard coding problems.`);

        // Seed Contests
        console.log("Seeding contests...");
        const now = Date.now();
        const oneHour = 60 * 60 * 1000;
        const oneDay = 24 * 60 * 60 * 1000;

        // 1. Ongoing Contest
        const ongoingContest = await Contest.create({
            name: "Weekly Speed Challenge 101",
            contestCode: "WEEKLY101",
            description: "A fast-paced contest featuring algorithms, data structures, and optimization problems. Test your speed and accuracy!",
            startTime: new Date(now - oneHour),
            endTime: new Date(now + 2 * oneHour),
            difficulty: "Medium",
            status: "Ongoing",
            visibility: "Public",
            problems: [createdProblems[0]._id, createdProblems[1]._id, createdProblems[4]._id],
            participants: [
                { user: user1._id, registeredAt: new Date(now - oneHour) },
                { user: user2._id, registeredAt: new Date(now - oneHour) }
            ],
            leaderboard: [
                {
                    user: user1._id,
                    totalScore: 200,
                    rank: 1,
                    submissions: [
                        { problem: createdProblems[0]._id, score: 100, timeTaken: 120000 },
                        { problem: createdProblems[1]._id, score: 100, timeTaken: 250000 }
                    ]
                },
                {
                    user: user2._id,
                    totalScore: 100,
                    rank: 2,
                    submissions: [
                        { problem: createdProblems[0]._id, score: 100, timeTaken: 180000 }
                    ]
                }
            ],
            createdBy: admin._id
        });

        // 2. Upcoming Contest
        const upcomingContest = await Contest.create({
            name: "Biweekly Code Masters Sprint",
            contestCode: "BIWEEKLY42",
            description: "Compete with the top coders across universities and colleges. High-rated contest with 4 challenging algorithmic problems.",
            startTime: new Date(now + 2 * oneDay),
            endTime: new Date(now + 2 * oneDay + 2 * oneHour),
            difficulty: "Hard",
            status: "Upcoming",
            visibility: "Public",
            problems: [createdProblems[2]._id, createdProblems[4]._id, createdProblems[6]._id, createdProblems[7]._id],
            participants: [
                { user: user1._id, registeredAt: new Date() }
            ],
            leaderboard: [],
            createdBy: admin._id
        });

        // 3. Completed Contest
        const completedContest = await Contest.create({
            name: "Grand Beginner Cup 2025",
            contestCode: "BEGINNER25",
            description: "Introductory competitive programming round for beginners to sharpen fundamental problem solving skills.",
            startTime: new Date(now - 7 * oneDay),
            endTime: new Date(now - 7 * oneDay + 2 * oneHour),
            difficulty: "Easy",
            status: "Completed",
            visibility: "Public",
            problems: [createdProblems[0]._id, createdProblems[2]._id],
            participants: [
                { user: user1._id, registeredAt: new Date(now - 7 * oneDay) },
                { user: user2._id, registeredAt: new Date(now - 7 * oneDay) }
            ],
            leaderboard: [
                {
                    user: user1._id,
                    totalScore: 200,
                    rank: 1,
                    submissions: [
                        { problem: createdProblems[0]._id, score: 100, timeTaken: 90000 },
                        { problem: createdProblems[2]._id, score: 100, timeTaken: 150000 }
                    ]
                },
                {
                    user: user2._id,
                    totalScore: 100,
                    rank: 2,
                    submissions: [
                        { problem: createdProblems[0]._id, score: 100, timeTaken: 110000 }
                    ]
                }
            ],
            createdBy: admin._id
        });

        console.log(`Created 3 sample contests (Ongoing: ${ongoingContest.contestCode}, Upcoming: ${upcomingContest.contestCode}, Completed: ${completedContest.contestCode}).`);

        // Seed Discussions
        console.log("Seeding discussions...");
        await Discussion.create([
            {
                title: "How to approach Dynamic Programming problems as a beginner?",
                content: "I often struggle to identify whether a problem can be solved with DP or greedy. Any advice or standard patterns to practice first?",
                author: user1._id,
                authorName: user1.username,
                tags: ["Dynamic Programming", "Interview Prep", "Algorithms"],
                upvotes: 18,
                downvotes: 1
            },
            {
                title: "Time complexity analysis for Sliding Window vs Two Pointers",
                content: "Here is a quick cheat sheet on when to use sliding window (fixed vs dynamic size) vs two pointers opposite direction...",
                author: admin._id,
                authorName: admin.username,
                tags: ["Two Pointers", "Sliding Window", "Data Structures"],
                upvotes: 42,
                downvotes: 0
            }
        ]);
        console.log("Created sample discussion threads.");

        console.log("\n=============================================");
        console.log("DATABASE SEEDING COMPLETED SUCCESSFULLY!");
        console.log("=============================================\n");
        process.exit(0);
    } catch (err) {
        console.error("Database seeding failed:", err);
        process.exit(1);
    }
}

seedDatabase();
