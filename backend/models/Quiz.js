const mongoose = require('mongoose');

const OptionSchema = new mongoose.Schema({
    text: { type: String, required: true },
    isCorrect: { type: Boolean, required: true, default: false }
});

const QuestionSchema = new mongoose.Schema({
    text: { type: String, required: true },
    options: [OptionSchema],
    explanation: { type: String }, // For 'Shallow Feedback' fix
    tags: [{ type: String }] // For weak topics matching
});

const QuizSchema = new mongoose.Schema({
    title: { type: String, required: true },
    subject: { type: String },
    tags: [{ type: String }],
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'] },
    joinCode: { type: String, unique: true, sparse: true },
    joinLink: { type: String },
    creator: {
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    questions: [QuestionSchema],
    timeLimit: { type: Number, default: 600 }, // In seconds
    createdAt: { type: Date, default: Date.now },
    isPublished: { type: Boolean, default: false },
    classroomId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Classroom' 
    },
    // PDF roster — list of allowed students for this quiz
    restrictToRoster: { type: Boolean, default: false },
    allowedStudents: [{
        email:  { type: String, trim: true, lowercase: true },
        rollNo: { type: String, trim: true },
        name:   { type: String, trim: true },
    }],
});

module.exports = mongoose.model('Quiz', QuizSchema);
