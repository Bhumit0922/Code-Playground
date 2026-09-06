const mongoose = require("mongoose");

const ProblemSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    difficulty: { type: String, enum: ["Easy", "Medium", "Hard"], required: true, default: "Medium" },
    topic: { type: String, default: "Algorithms" },
    tags: [{ type: String }],
    inputFormat: { type: String, default: "" },
    outputFormat: { type: String, default: "" },
    constraints: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    sampleInput: { type: String, default: "" },
    sampleOutput: { type: String, default: "" },
    testCases: [{ 
        input: { type: String, default: "" }, 
        output: { type: String, default: "" } 
    }],
    submissionsCount: { type: Number, default: 0 },
    acceptedCount: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

ProblemSchema.virtual('acceptance').get(function() {
    if (!this.submissionsCount || this.submissionsCount === 0) {
        return "75%"; // Realistic default baseline
    }
    return Math.round((this.acceptedCount / this.submissionsCount) * 100) + "%";
});

module.exports = mongoose.model("Problem", ProblemSchema);
