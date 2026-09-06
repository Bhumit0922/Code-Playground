const mongoose = require("mongoose");
const Contest = require("../models/Contest");
const User = require("../models/User");

/**
 * Updates contest leaderboard when a participant submits a solution
 */
async function updateContestLeaderboard(userId, problemId, status, contestId, problemDifficulty) {
    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(problemId) || !mongoose.Types.ObjectId.isValid(contestId)) {
        throw new Error("Invalid userId, problemId, or contestId");
    }

    const contest = await Contest.findById(contestId);
    if (!contest) throw new Error("Contest not found");

    const now = new Date();
    if (now < contest.startTime || now > contest.endTime) {
        throw new Error("Contest is not active");
    }

    const isProblemInContest = contest.problems.some(p => p.toString() === problemId.toString());
    if (!isProblemInContest) {
        throw new Error("Problem is not part of this contest");
    }

    let leaderboardEntry = contest.leaderboard.find(
        entry => entry.user && entry.user.toString() === userId.toString()
    );

    const isParticipant = contest.participants.some(p => 
        p.user && p.user.toString() === userId.toString()
    );

    if (!isParticipant) {
        contest.participants.push({ 
            user: new mongoose.Types.ObjectId(userId),
            registeredAt: new Date()
        });
    }

    if (!leaderboardEntry) {
        leaderboardEntry = {
            user: new mongoose.Types.ObjectId(userId),
            totalScore: 0,
            submissions: []
        };
        contest.leaderboard.push(leaderboardEntry);
    }

    const existingSubmission = leaderboardEntry.submissions.find(
        sub => sub.problem.toString() === problemId.toString()
    );

    if (status === "Accepted") {
        if (existingSubmission && existingSubmission.score > 0) {
            return {
                updated: false,
                message: "Problem already solved",
                totalScore: leaderboardEntry.totalScore,
                problemsCount: leaderboardEntry.submissions.filter(s => s.score > 0).length
            };
        }

        let score = 100;
        switch (problemDifficulty) {
            case "Easy": score = 100; break;
            case "Medium": score = 200; break;
            case "Hard": score = 300; break;
            default: score = 100;
        }

        if (existingSubmission) {
            existingSubmission.score = score;
        } else {
            leaderboardEntry.submissions.push({
                problem: new mongoose.Types.ObjectId(problemId),
                score: score,
                timeTaken: now - contest.startTime
            });
        }

        leaderboardEntry.totalScore = leaderboardEntry.submissions.reduce(
            (total, sub) => total + (sub.score || 0), 0
        );

        // Sort leaderboard descending by totalScore
        contest.leaderboard.sort((a, b) => b.totalScore - a.totalScore);
        contest.leaderboard.forEach((entry, index) => {
            entry.rank = index + 1;
        });

        await contest.save();

        return {
            updated: true,
            message: "Leaderboard updated successfully",
            totalScore: leaderboardEntry.totalScore,
            problemsCount: leaderboardEntry.submissions.filter(s => s.score > 0).length
        };
    }

    return { 
        updated: false,
        message: "Submission was not accepted",
        totalScore: leaderboardEntry.totalScore,
        problemsCount: leaderboardEntry.submissions.filter(sub => sub.score > 0).length
    };
}

/**
 * Updates user contest rating based on contest performance
 */
async function updateUserRating(user, contest, performance) {
    if (!user || !user._id) return null;
    
    const userDoc = user.username ? user : await User.findById(user._id);
    if (!userDoc) return null;

    if (!userDoc.contestRating) {
        userDoc.contestRating = { current: 1500, highest: 1500, history: [] };
    }
    
    let ratingChange = 0;
    const currentRating = userDoc.contestRating.current || 1500;
    
    const problemsBySolved = { Easy: 0, Medium: 0, Hard: 0 };
    
    for (const submission of (performance.submissions || [])) {
        if (submission.score > 0) {
            const problem = contest.problems.find(p => 
                (p._id ? p._id.toString() : p.toString()) === submission.problem.toString()
            );
            
            if (problem && problem.difficulty && problemsBySolved[problem.difficulty] !== undefined) {
                problemsBySolved[problem.difficulty]++;
            } else {
                problemsBySolved.Medium++;
            }
        }
    }
    
    if (currentRating < 1000) {
        ratingChange += problemsBySolved.Easy * 100;
        ratingChange += problemsBySolved.Medium * 150;
        ratingChange += problemsBySolved.Hard * 200;
    } else if (currentRating < 1600) {
        ratingChange += problemsBySolved.Easy * 50;
        ratingChange += problemsBySolved.Medium * 100;
        ratingChange += problemsBySolved.Hard * 150;
    } else {
        ratingChange += problemsBySolved.Easy * 25;
        ratingChange += problemsBySolved.Medium * 50;
        ratingChange += problemsBySolved.Hard * 100;
    }
    
    const newRating = Math.max(0, currentRating + ratingChange);
    userDoc.contestRating.current = newRating;
    userDoc.contestRating.highest = Math.max(userDoc.contestRating.highest || 1500, newRating);
    
    userDoc.contestRating.history.push({
        contestId: contest._id,
        contestName: contest.name,
        rating: newRating,
        change: ratingChange,
        timestamp: new Date()
    });
    
    const contestEntry = {
        contest: contest._id,
        rank: performance.rank || 0,
        score: performance.totalScore || 0,
        problemsSolved: Object.values(problemsBySolved).reduce((a, b) => a + b, 0),
        timestamp: new Date()
    };
    
    const existingIndex = userDoc.contestsParticipated.findIndex(
        cp => cp.contest && cp.contest.toString() === contest._id.toString()
    );
    
    if (existingIndex >= 0) {
        userDoc.contestsParticipated[existingIndex] = contestEntry;
    } else {
        userDoc.contestsParticipated.push(contestEntry);
    }
    
    await userDoc.save();
    return userDoc;
}

/**
 * Ends a contest, assigns final ranks, and recalculates all user ratings
 */
async function endContest(contestId) {
    if (!mongoose.Types.ObjectId.isValid(contestId)) {
        throw new Error("Invalid contest ID");
    }
    
    const contest = await Contest.findById(contestId)
        .populate('problems')
        .populate('leaderboard.user');
        
    if (!contest) throw new Error("Contest not found");

    await contest.calculateFinalLeaderboard();
    
    for (const entry of contest.leaderboard) {
        if (entry.user) {
            await updateUserRating(entry.user, contest, entry);
        }
    }
    
    contest.status = 'Completed';
    await contest.save();

    return contest;
}

module.exports = {
    updateContestLeaderboard,
    updateUserRating,
    endContest
};
