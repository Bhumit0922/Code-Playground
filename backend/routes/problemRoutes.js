const express = require("express");
const Problem = require("../models/Problem");
const User = require("../models/User");
const executeCode = require("../utils/executeCode");
const { updateContestLeaderboard, endContest } = require("../utils/contestService");
const mongoose = require("mongoose");
const { ObjectId } = mongoose.Types;

const router = express.Router();

// @route POST /api/problems/add
router.post("/add", async (req, res) => {
    try {
        const { 
            title, 
            description, 
            difficulty, 
            topic,
            tags,
            inputFormat, 
            outputFormat, 
            constraints, 
            sampleInput,
            sampleOutput,
            testCases 
        } = req.body;
        
        if (!title || !description) {
            return res.status(400).json({ message: "Title and description are required" });
        }

        const problem = new Problem({ 
            title, 
            description, 
            difficulty: difficulty || "Medium", 
            topic: topic || "Algorithms",
            tags: tags || [],
            inputFormat: inputFormat || "", 
            outputFormat: outputFormat || "", 
            constraints: constraints || {},
            sampleInput: sampleInput || "",
            sampleOutput: sampleOutput || "",
            testCases: testCases || [] 
        });
        
        await problem.save();
        res.status(201).json(problem);
    } catch (error) {
        console.error("Error creating problem:", error);
        res.status(500).json({ message: "Error creating problem: " + error.message });
    }
});

// @route GET /api/problems/search
router.get('/search', async (req, res) => {
    try {
        const searchTerm = (req.query.q || "").trim();
        
        if (!searchTerm || searchTerm.length < 2) {
            return res.json([]);
        }

        const problems = await Problem.find({
            $or: [
                { title: { $regex: searchTerm, $options: 'i' } },
                { description: { $regex: searchTerm, $options: 'i' } },
                { difficulty: { $regex: searchTerm, $options: 'i' } },
                { topic: { $regex: searchTerm, $options: 'i' } }
            ]
        })
        .select('_id title description difficulty topic acceptance submissionsCount acceptedCount')
        .limit(10)
        .lean({ virtuals: true });

        res.json(problems);
    } catch (error) {
        console.error('Problem search error:', error);
        res.status(500).json([]);
    }
});

// @route GET /api/problems
router.get("/", async (req, res) => {
    try {
        const { difficulty, topic, sort, search, limit, page } = req.query;
        let query = {};
        
        if (difficulty && difficulty !== 'all') {
            query.difficulty = difficulty;
        }
        
        if (topic && topic !== 'all') {
            query.topic = { $regex: topic, $options: 'i' };
        }

        if (search && search.trim()) {
            query.$or = [
                { title: { $regex: search.trim(), $options: 'i' } },
                { description: { $regex: search.trim(), $options: 'i' } }
            ];
        }
        
        let sortConfig = { createdAt: -1 };
        if (sort === 'difficulty') {
            sortConfig = { difficulty: 1 };
        } else if (sort === 'most-solved') {
            sortConfig = { acceptedCount: -1 };
        } else if (sort === 'newest') {
            sortConfig = { createdAt: -1 };
        }
        
        let queryBuilder = Problem.find(query).sort(sortConfig);
        
        if (limit) {
            const parsedLimit = parseInt(limit);
            if (!isNaN(parsedLimit) && parsedLimit > 0) {
                if (page) {
                    const parsedPage = Math.max(1, parseInt(page) || 1);
                    queryBuilder = queryBuilder.skip((parsedPage - 1) * parsedLimit);
                }
                queryBuilder = queryBuilder.limit(parsedLimit);
            }
        }
        
        const problems = await queryBuilder.lean({ virtuals: true });
        res.json(problems);
    } catch (error) {
        console.error("Error fetching problems:", error);
        res.status(500).json({ message: "Error fetching problems" });
    }
});

// @route GET /api/problems/:id
router.get("/:id", async (req, res) => {
    try {
        if (!ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid problem ID" });
        }

        const problem = await Problem.findById(req.params.id).lean({ virtuals: true });
        if (!problem) {
            return res.status(404).json({ message: "Problem not found" });
        }
        res.json(problem);
    } catch (error) {
        console.error("Error fetching problem:", error);
        res.status(500).json({ message: "Error fetching problem" });
    }
});

// @route POST /api/problems/:id/submit
router.post("/:id/submit", async (req, res) => {
    try {
        const { userId, code, language, contestId } = req.body;
        const problemId = req.params.id;
        
        if (!userId || !code || !language) {
            return res.status(400).json({ message: "UserId, code, and language are required" });
        }
        
        const problem = await Problem.findById(problemId);
        if (!problem) {
            return res.status(404).json({ message: "Problem not found" });
        }
        
        let allTestsPassed = true;
        let results = [];
        
        const testCasesToRun = (problem.testCases && problem.testCases.length > 0) 
            ? problem.testCases 
            : [{ input: problem.sampleInput || "", output: problem.sampleOutput || "" }];

        for (let i = 0; i < testCasesToRun.length; i++) {
            const testCase = testCasesToRun[i];
            try {
                const execResult = await executeCode(code, language, testCase.input || "");
                const actual = (execResult.output || "").trim();
                const expected = (testCase.output || "").trim();
                const passed = actual === expected && execResult.status === "success";
                
                results.push({
                    testCase: i + 1,
                    input: testCase.input,
                    expectedOutput: testCase.output,
                    actualOutput: execResult.output,
                    passed,
                    error: execResult.error
                });
                
                if (!passed) {
                    allTestsPassed = false;
                }
            } catch (err) {
                allTestsPassed = false;
                results.push({
                    testCase: i + 1,
                    input: testCase.input,
                    expectedOutput: testCase.output,
                    actualOutput: "",
                    passed: false,
                    error: err.message
                });
            }
        }
        
        const status = allTestsPassed ? "Accepted" : "Wrong Answer";
        
        // Increment problem stats
        problem.submissionsCount = (problem.submissionsCount || 0) + 1;
        if (status === "Accepted") {
            problem.acceptedCount = (problem.acceptedCount || 0) + 1;
        }
        await problem.save();

        // Update user record
        const user = await User.findById(userId);
        if (user) {
            user.submissions.push({
                problem: problem._id,
                language,
                code,
                status,
                timestamp: new Date()
            });
            
            if (status === "Accepted" && !user.problemsSolved.includes(problem._id)) {
                user.problemsSolved.push(problem._id);
            }
            await user.save();
        }
        
        let contestUpdateResult = null;
        if (contestId && ObjectId.isValid(contestId)) {
            try {
                contestUpdateResult = await updateContestLeaderboard(
                    userId, problemId, status, contestId, problem.difficulty
                );
            } catch (contestError) {
                console.error("Contest leaderboard update notice:", contestError.message);
            }
        }
        
        res.json({ 
            status,
            results,
            message: status === "Accepted" 
                ? "Solution accepted! All test cases passed." 
                : "Solution failed one or more test cases.",
            contestUpdate: contestUpdateResult
        });
    } catch (error) {
        console.error("Error submitting solution:", error);
        res.status(500).json({ message: "Error submitting solution: " + error.message });
    }
});

// @route PUT /api/problems/:id
// @desc Update an existing problem
router.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid problem ID" });
        }

        const {
            title,
            description,
            difficulty,
            topic,
            tags,
            inputFormat,
            outputFormat,
            constraints,
            sampleInput,
            sampleOutput,
            testCases
        } = req.body;

        const updateData = {};
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (difficulty !== undefined) updateData.difficulty = difficulty;
        if (topic !== undefined) updateData.topic = topic;
        if (tags !== undefined) updateData.tags = Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim()).filter(Boolean);
        if (inputFormat !== undefined) updateData.inputFormat = inputFormat;
        if (outputFormat !== undefined) updateData.outputFormat = outputFormat;
        if (constraints !== undefined) updateData.constraints = constraints;
        if (sampleInput !== undefined) updateData.sampleInput = sampleInput;
        if (sampleOutput !== undefined) updateData.sampleOutput = sampleOutput;
        if (testCases !== undefined) updateData.testCases = testCases;

        const updatedProblem = await Problem.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!updatedProblem) {
            return res.status(404).json({ message: "Problem not found" });
        }

        res.json({ success: true, problem: updatedProblem });
    } catch (error) {
        console.error("Error updating problem:", error);
        res.status(500).json({ message: "Error updating problem: " + error.message });
    }
});

// @route DELETE /api/problems/:id
// @desc Delete a problem
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid problem ID" });
        }

        const deleted = await Problem.findByIdAndDelete(id);
        if (!deleted) {
            return res.status(404).json({ message: "Problem not found" });
        }

        res.json({ success: true, message: `Problem '${deleted.title}' deleted successfully` });
    } catch (error) {
        console.error("Error deleting problem:", error);
        res.status(500).json({ message: "Error deleting problem: " + error.message });
    }
});

// @route POST /api/problems/contest/:contestId/end
router.post("/contest/:contestId/end", async (req, res) => {
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
        res.status(500).json({ message: error.message || "Failed to end contest" });
    }
});

module.exports = router;
