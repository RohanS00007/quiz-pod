const mongoose = require('mongoose');

const ClassroomSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    teacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    joinCode: {
        type: String,
        required: true,
        unique: true
    },
    joinCodeExpires: {
        type: Date
    },
    enrolledStudents: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    approvalQueue: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }], // Handles unauthorized access
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Classroom', ClassroomSchema);
