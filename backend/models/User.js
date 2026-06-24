const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['student', 'teacher'],
        required: true
    },
    rollNo: {
        type: String,
        trim: true,
        default: ''
    },
    xp: {
        type: Number,
        default: 0
    },
    badges: [{
        type: String
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    favouriteQuestions: [{
        subject: String,
        text: String,
        options: [String],
        correct: Number,
        createdAt: { type: Date, default: Date.now }
    }]
});

// Hash password before saving
UserSchema.pre('save', async function() {
    if (!this.isModified('password')) return;
    
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

module.exports = mongoose.model('User', UserSchema);
