const express = require("express");
const router = express.Router();
const executeCode = require("../utils/executeCode");
const User = require("../models/User");
const Problem = require("../models/Problem");
const { updateContestLeaderboard, endContest } = require("../utils/contestService");
const mongoose = require("mongoose");
const { ObjectId } = mongoose.Types;

// @route POST /api/execute
// Execute single code snippet with custom input
router.post("/", async (req, res) => {
    try {
        const { code, language, input = "" } = req.body;
        
        if (!code || !language) {
            return res.status(400).json({ status: "error", error: "Code and language are required." });
        }

        const result = await executeCode(code, language, input);
        res.json(result);
    } catch (error) {
        console.error("Error executing code:", error);
        res.status(500).json({ 
            status: "error", 
            error: error.message || "Execution failed on the server." 
        });
    }
});

// @route POST /api/execute/test
// Run code against provided test cases
router.post("/test", async (req, res) => {
    try {
        const { code, language, testCases, userId, problemId, contestId } = req.body;
        
        if (!code || !language || !testCases || !Array.isArray(testCases)) {
            return res.status(400).json({ error: "Code, language, and testCases array are required" });
        }
        
        const results = [];
        let allPassed = true;
        
        for (let i = 0; i < testCases.length; i++) {
            const testCase = testCases[i];
            try {
                const response = await executeCode(code, language, testCase.input || "");
                const actual = (response.output || "").trim();
                const expected = (testCase.output || "").trim();
                const outputMatches = actual === expected && response.status === "success";
                
                results.push({
                    testCase: i + 1,
                    input: testCase.input,
                    expectedOutput: testCase.output,
                    actualOutput: response.output,
                    passed: outputMatches,
                    error: response.error
                });
                
                if (!outputMatches) {
                    allPassed = false;
                }
            } catch (error) {
                results.push({
                    testCase: i + 1,
                    input: testCase.input,
                    expectedOutput: testCase.output,
                    actualOutput: "",
                    passed: false,
                    error: error.message
                });
                allPassed = false;
            }
        }
        
        const submissionStatus = allPassed ? "Accepted" : "Wrong Answer";
        
        // Record submission if user and problem provided
        if (userId && problemId && ObjectId.isValid(userId) && ObjectId.isValid(problemId)) {
            try {
                const [user, problem] = await Promise.all([
                    User.findById(userId),
                    Problem.findById(problemId)
                ]);

                if (user && problem) {
                    user.submissions.push({
                        problem: new ObjectId(problemId),
                        language,
                        code,
                        status: submissionStatus,
                        timestamp: new Date()
                    });

                    if (submissionStatus === "Accepted" && !user.problemsSolved.includes(problemId)) {
                        user.problemsSolved.push(new ObjectId(problemId));
                    }
                    await user.save();

                    problem.submissionsCount = (problem.submissionsCount || 0) + 1;
                    if (submissionStatus === "Accepted") {
                        problem.acceptedCount = (problem.acceptedCount || 0) + 1;
                    }
                    await problem.save();

                    if (contestId && ObjectId.isValid(contestId)) {
                        await updateContestLeaderboard(userId, problemId, submissionStatus, contestId, problem.difficulty);
                    }
                }
            } catch (recordErr) {
                console.error("Error recording test submission:", recordErr.message);
            }
        }
        
        res.json({
            status: submissionStatus,
            results
        });
    } catch (error) {
        console.error("Error testing code:", error);
        res.status(500).json({ 
            status: "error", 
            error: error.message || "Failed to run test cases." 
        });
    }
});

// @route POST /api/execute/contest-end/:contestId
router.post("/contest-end/:contestId", async (req, res) => {
    try {
        const { contestId } = req.params;
        const contest = await endContest(contestId);
        res.json({
            success: true,
            message: 'Contest ended and ratings updated successfully',
            status: contest.status
        });
    } catch (error) {
        console.error("Error ending contest:", error);
        res.status(500).json({ error: error.message || "Failed to end contest" });
    }
});

module.exports = router;
