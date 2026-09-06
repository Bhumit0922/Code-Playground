const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const Contest = require('../models/Contest');
const User = require('../models/User');
const mongoose = require('mongoose');

// @route GET /api/contests
// @desc Get all public and user contests
router.get('/', async (req, res) => {
    try {
        const contests = await Contest.find()
            .populate({
                path: 'participants.user',
                select: 'username'
            })
            .populate({
                path: 'leaderboard.user',
                select: 'username'
            })
            .populate({
                path: 'createdBy',
                select: 'username'
            })
            .sort({ startTime: -1 });

        // Update contest statuses in real-time
        const updatedContests = [];
        for (const contest of contests) {
            await contest.updateStatus();
            updatedContests.push(contest);
        }

        const currentContests = updatedContests.filter(c => c.status !== 'Completed');
        const pastContests = updatedContests.filter(c => c.status === 'Completed');

        res.json({
            currentContests: currentContests.map(c => ({
                _id: c._id,
                name: c.name,
                description: c.description,
                startTime: c.startTime,
                endTime: c.endTime,
                difficulty: c.difficulty,
                participants: c.participants || [],
                status: c.status,
                visibility: c.visibility,
                contestCode: c.contestCode
            })),
            pastContests: pastContests.map(c => ({
                _id: c._id,
                name: c.name,
                description: c.description,
                startTime: c.startTime,
                endTime: c.endTime,
                difficulty: c.difficulty,
                leaderboard: c.leaderboard ? c.leaderboard.map(entry => ({
                    username: entry.user ? entry.user.username : 'Anonymous',
                    score: entry.totalScore || 0,
                    rank: entry.rank || 1
                })) : [],
                status: c.status,
                visibility: c.visibility
            }))
        });
    } catch (error) {
        console.error('Error fetching contests:', error);
        res.status(500).json({ error: 'Failed to fetch contests' });
    }
});

// @route POST /api/contests
// @desc Create a new contest
router.post('/', [
    check('name', 'Contest name is required').not().isEmpty(),
    check('contestCode', 'Contest code is required').not().isEmpty(),
    check('startTime', 'Start time is required').not().isEmpty(),
    check('endTime', 'End time is required').not().isEmpty(),
    check('problems', 'At least one problem is required').isArray({ min: 1 }),
    check('userId', 'User ID is required').not().isEmpty()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const {
            name,
            contestCode,
            description,
            startTime,
            endTime,
            difficulty,
            problems,
            userId,
            visibility = "Private"
        } = req.body;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ msg: 'Invalid user ID' });
        }

        const existingContest = await Contest.findOne({ contestCode });
        if (existingContest) {
            return res.status(400).json({ msg: 'Contest code already exists. Please choose a unique code.' });
        }

        const user = await User.findById(userId);
        const isAdmin = user && user.role === 'admin';

        // Only admins can make contests Public
        const finalVisibility = isAdmin && visibility === 'Public' ? 'Public' : 'Private';

        const newContest = new Contest({
            _id: new mongoose.Types.ObjectId(),
            name,
            contestCode,
            description: description || 'No description provided',
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            difficulty: difficulty || 'Medium',
            problems: problems.filter(id => mongoose.Types.ObjectId.isValid(id)).map(id => new mongoose.Types.ObjectId(id)),
            participants: [{ user: new mongoose.Types.ObjectId(userId) }],
            status: 'Upcoming',
            visibility: finalVisibility,
            leaderboard: [],
            createdBy: new mongoose.Types.ObjectId(userId)
        });

        await newContest.updateStatus();
        const contest = await newContest.save();
        
        res.status(201).json({
            success: true,
            contest: {
                _id: contest._id,
                name: contest.name,
                contestCode: contest.contestCode,
                startTime: contest.startTime,
                endTime: contest.endTime,
                status: contest.status,
                visibility: contest.visibility,
                isAdmin
            }
        });
    } catch (error) {
        console.error('Error creating contest:', error);
        res.status(500).json({ 
            success: false, 
            msg: 'Server error creating contest',
            error: error.message 
        });
    }
});

// @route POST /api/contests/join-by-code
router.post('/join-by-code', [
    check('contestCode', 'Contest code is required').not().isEmpty()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { contestCode, userId } = req.body;
        const contest = await Contest.findOne({ contestCode: contestCode.trim() });

        if (!contest) {
            return res.status(404).json({ 
                success: false, 
                msg: 'Contest not found with code: ' + contestCode 
            });
        }

        // Add user to participants if userId passed
        if (userId && mongoose.Types.ObjectId.isValid(userId)) {
            const alreadyJoined = contest.participants.some(p => p.user && p.user.toString() === userId.toString());
            if (!alreadyJoined) {
                contest.participants.push({ user: new mongoose.Types.ObjectId(userId) });
                await contest.save();
            }
        }

        res.json({
            success: true,
            contestId: contest._id
        });
    } catch (error) {
        console.error('Error joining contest by code:', error);
        res.status(500).json({ success: false, msg: 'Server error joining contest' });
    }
});

// @route GET /api/contests/:id
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.query.userId;
        
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'Invalid contest ID' });
        }
        
        const contest = await Contest.findById(id)
            .populate({
                path: 'participants.user',
                select: 'username'
            })
            .populate({
                path: 'leaderboard.user',
                select: 'username'
            })
            .populate({
                path: 'createdBy',
                select: 'username _id'
            })
            .populate({
                path: 'problems',
                select: 'title difficulty'
            });
            
        if (!contest) {
            return res.status(404).json({ error: 'Contest not found' });
        }
        
        await contest.updateStatus();
        
        let userSolvedProblems = [];
        let userLeaderboardEntry = null;
        
        if (userId && mongoose.Types.ObjectId.isValid(userId)) {
            const leaderboardEntry = contest.leaderboard.find(
                entry => entry.user && entry.user._id && entry.user._id.toString() === userId.toString()
            );
            
            if (leaderboardEntry) {
                userLeaderboardEntry = {
                    totalScore: leaderboardEntry.totalScore,
                    rank: leaderboardEntry.rank || 0,
                    problemsCount: leaderboardEntry.submissions ? leaderboardEntry.submissions.filter(s => s.score > 0).length : 0
                };
                
                userSolvedProblems = (leaderboardEntry.submissions || [])
                    .filter(sub => sub.score > 0)
                    .map(sub => sub.problem ? sub.problem.toString() : "");
            }
        }
        
        res.json({
            _id: contest._id,
            name: contest.name,
            description: contest.description,
            startTime: contest.startTime,
            endTime: contest.endTime,
            difficulty: contest.difficulty,
            status: contest.status,
            visibility: contest.visibility,
            participants: contest.participants || [],
            contestCode: contest.contestCode,
            createdBy: contest.createdBy ? contest.createdBy._id : null,
            createdByName: contest.createdBy ? contest.createdBy.username : "Admin",
            createdAt: contest.createdAt,
            problems: (contest.problems || []).map(p => ({
                _id: p._id,
                title: p.title,
                difficulty: p.difficulty,
                solved: userSolvedProblems.includes(p._id.toString())
            })),
            leaderboard: (contest.leaderboard || []).map(entry => ({
                userId: entry.user ? entry.user._id : null,
                username: entry.user ? entry.user.username : 'Unknown',
                totalScore: entry.totalScore || 0,
                rank: entry.rank || 1,
                problemsCount: entry.submissions ? entry.submissions.filter(s => s.score > 0).length : 0
            })),
            userStats: userLeaderboardEntry
        });
    } catch (error) {
        console.error('Error fetching contest:', error);
        res.status(500).json({ error: 'Failed to fetch contest details' });
    }
});

module.exports = router;