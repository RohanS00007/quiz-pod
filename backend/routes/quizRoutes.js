const express = require('express');
const multer = require('multer');
const router = express.Router();
const {
    createQuiz,
    generateQuiz,
    joinQuiz,
    takeQuiz,
    submitQuiz,
    getMySubmissions,
    getSubmissionResult,
    getTeacherQuizzes,
    getQuizSubmissions,
    uploadRoster,
} = require('../controllers/quizController');
const { protect, requireTeacher } = require('../middleware/authMiddleware');

// Multer setup — store PDF in memory for parsing
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    fileFilter: (_req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed.'));
        }
    },
});

// ── Teacher routes ─────────────────────────────────────────────────────────
router.post('/', protect, requireTeacher, createQuiz);
router.post('/generate', protect, requireTeacher, generateQuiz);
router.get('/my-quizzes', protect, requireTeacher, getTeacherQuizzes);
router.get('/:id/submissions', protect, requireTeacher, getQuizSubmissions);
router.post('/:id/roster', protect, requireTeacher, upload.single('roster'), uploadRoster);

// ── Student routes ─────────────────────────────────────────────────────────
router.get('/join/:code', protect, joinQuiz);
router.get('/my', protect, getMySubmissions);
router.get('/:id/take', protect, takeQuiz);
router.post('/:id/submit', protect, submitQuiz);
router.get('/:id/result', protect, getSubmissionResult);

module.exports = router;
