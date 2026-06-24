const mongoose = require('mongoose');

const AnswerSchema = new mongoose.Schema({
    questionIndex:  { type: Number, required: true },
    selectedOption: { type: Number, required: true }, // 0-3
});

const SubmissionSchema = new mongoose.Schema({
    quiz: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quiz',
        required: true,
    },
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    answers:        [AnswerSchema],
    score:          { type: Number, default: 0 },       // percentage
    totalCorrect:   { type: Number, default: 0 },
    totalQuestions:  { type: Number, default: 0 },
    timeTaken:      { type: Number },                    // seconds
    warnings:       { type: Number, default: 0 },        // anti-cheat violation count
    submittedAt:    { type: Date, default: Date.now },
});

// One attempt per student per quiz
SubmissionSchema.index({ quiz: 1, student: 1 }, { unique: true });

module.exports = mongoose.model('Submission', SubmissionSchema);
