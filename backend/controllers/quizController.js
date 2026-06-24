const crypto = require('crypto');
const Quiz = require('../models/Quiz');
const Submission = require('../models/Submission');
const pdfParse = require('pdf-parse');
const { GoogleGenAI } = require('@google/genai');

// ── Startup API key check ──────────────────────────────────────────────────
if (!process.env.GEMINI_API_KEY) {
    console.warn('[generateQuiz] WARNING: GEMINI_API_KEY is not set in environment. /api/quiz/generate will fail at runtime.');
}

// ── Join code helpers ──────────────────────────────────────────────────────

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

const makeCode = () => {
    const bytes = crypto.randomBytes(6);
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += CHARS[bytes[i] % CHARS.length];
    }
    return code;
};

const uniqueJoinCode = async () => {
    for (let attempt = 0; attempt < 5; attempt++) {
        const code = makeCode();
        const exists = await Quiz.findOne({ joinCode: code }).lean();
        if (!exists) return code;
    }
    throw new Error('Could not generate a unique join code after 5 attempts. Please try again.');
};

// ── Validation helpers ─────────────────────────────────────────────────────

const validateQuestions = (questions) => {
    if (!Array.isArray(questions) || questions.length === 0) {
        return 'At least one question is required.';
    }
    for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const num = i + 1;
        if (!q.text || !q.text.trim()) {
            return `Question ${num}: text is required.`;
        }
        if (!Array.isArray(q.options) || q.options.length !== 4) {
            return `Question ${num}: exactly 4 options are required.`;
        }
        for (let j = 0; j < 4; j++) {
            if (!q.options[j] || !q.options[j].trim()) {
                return `Question ${num}, option ${j + 1}: option text cannot be empty.`;
            }
        }
        if (typeof q.correctOption !== 'number' || q.correctOption < 0 || q.correctOption > 3) {
            return `Question ${num}: correctOption must be a number between 0 and 3.`;
        }
    }
    return null;
};

// Convert the { text, correctOption } shape the frontend sends into
// the { text, options:[{text,isCorrect}] } shape the DB stores.
const normalizeQuestions = (questions) =>
    questions.map((q) => ({
        text: q.text.trim(),
        options: q.options.map((opt, idx) => ({
            text: opt.trim(),
            isCorrect: idx === q.correctOption,
        })),
    }));

// ── @desc   Create a quiz
// ── @route  POST /api/quiz
// ── @access teacher only
exports.createQuiz = async (req, res) => {
    try {
        const { title, tags, questions, timeLimit } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({ message: 'Title is required.' });
        }
        if (typeof timeLimit !== 'number' || timeLimit <= 0) {
            return res.status(400).json({ message: 'Time limit must be a positive number (in minutes).' });
        }

        const validationError = validateQuestions(questions);
        if (validationError) {
            return res.status(400).json({ message: validationError });
        }

        const joinCode = await uniqueJoinCode();
        const frontendBase = process.env.FRONTEND_BASE_URL || 'http://localhost:5173';
        const joinLink = `${frontendBase}/student/myquiz?code=${joinCode}`;

        const quiz = await Quiz.create({
            title: title.trim(),
            tags: Array.isArray(tags) ? tags.map((t) => t.trim()).filter(Boolean) : [],
            questions: normalizeQuestions(questions),
            timeLimit: Math.round(timeLimit * 60), // minutes → seconds
            creator: req.user.id,
            joinCode,
            joinLink,
            isPublished: true,
        });

        res.status(201).json({
            _id: quiz._id,
            title: quiz.title,
            joinCode: quiz.joinCode,
            joinLink: quiz.joinLink,
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error while creating quiz.', error: error.message });
    }
};

// ── Gemini prompt ──────────────────────────────────────────────────────────

const buildPrompt = (prompt, tags, difficulty, numQuestions) => `
You are a quiz question generator. Generate exactly ${numQuestions} multiple-choice questions.

Topic / Focus: ${prompt}

Additional context:
- Tags: ${tags.length > 0 ? tags.join(', ') : 'none'}
- Difficulty: ${difficulty}

Requirements:
- Each question must have exactly 4 answer options.
- correctOption is the zero-based index (0, 1, 2, or 3) of the correct answer.
- No empty strings anywhere.
- No explanations, no extra text — return ONLY valid JSON.

One-shot example of the required output shape:
{
  "questions": [
    {
      "question": "What is the capital of France?",
      "options": ["Berlin", "Madrid", "Paris", "Rome"],
      "correctOption": 2
    }
  ]
}

Now generate ${numQuestions} question(s) in exactly that JSON shape. Output nothing except the JSON object.
`.trim();

// ── Gemini response validator ──────────────────────────────────────────────

const validateGeminiResponse = (parsed, numQuestions) => {
    if (!parsed || !Array.isArray(parsed.questions)) {
        return 'Response missing "questions" array.';
    }
    if (parsed.questions.length !== numQuestions) {
        return `Expected ${numQuestions} questions, got ${parsed.questions.length}.`;
    }
    for (let i = 0; i < parsed.questions.length; i++) {
        const q = parsed.questions[i];
        const num = i + 1;
        if (!q.question || !q.question.trim()) {
            return `Question ${num}: "question" field is empty.`;
        }
        if (!Array.isArray(q.options) || q.options.length !== 4) {
            return `Question ${num}: must have exactly 4 options.`;
        }
        for (let j = 0; j < 4; j++) {
            if (!q.options[j] || !String(q.options[j]).trim()) {
                return `Question ${num}, option ${j + 1}: empty string.`;
            }
        }
        if (typeof q.correctOption !== 'number' || q.correctOption < 0 || q.correctOption > 3) {
            return `Question ${num}: correctOption must be 0–3.`;
        }
    }
    return null;
};

// ── @desc   Generate quiz questions via Gemini
// ── @route  POST /api/quiz/generate
// ── @access teacher only
exports.generateQuiz = async (req, res) => {
    console.log('[generateQuiz] ── incoming request ──────────────────────────');
    console.log('[generateQuiz] req.body:', JSON.stringify(req.body, null, 2));
    console.log('[generateQuiz] GEMINI_API_KEY present:', !!process.env.GEMINI_API_KEY);

    try {
        const { prompt, tags, difficulty, numQuestions } = req.body;

        if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 10) {
            console.log('[generateQuiz] Validation failed: invalid prompt:', prompt);
            return res.status(400).json({ message: 'prompt is required and must be at least 10 characters.' });
        }
        if (!['easy', 'medium', 'hard'].includes(difficulty)) {
            console.log('[generateQuiz] Validation failed: invalid difficulty:', difficulty);
            return res.status(400).json({ message: 'difficulty must be easy, medium, or hard.' });
        }
        const count = parseInt(numQuestions, 10);
        if (!count || count < 1 || count > 30) {
            console.log('[generateQuiz] Validation failed: invalid numQuestions:', numQuestions, '→ parsed:', count);
            return res.status(400).json({ message: 'numQuestions must be between 1 and 30.' });
        }

        const modelName = 'gemini-2.5-flash';
        console.log('[generateQuiz] Model:', modelName);

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const geminiPrompt = buildPrompt(prompt.trim(), Array.isArray(tags) ? tags : [], difficulty, count);

        console.log('[generateQuiz] Prompt being sent to Gemini:\n───────────────────────────────────────\n' + geminiPrompt + '\n───────────────────────────────────────');

        let parsed = null;
        let lastError = '';

        for (let attempt = 1; attempt <= 2; attempt++) {
            console.log(`[generateQuiz] Attempt ${attempt}/2 — calling ai.models.generateContent`);
            let responseText = '';
            try {
                const response = await ai.models.generateContent({
                    model: modelName,
                    contents: geminiPrompt,
                    config: { responseMimeType: 'application/json' },
                });

                console.log(`[generateQuiz] Attempt ${attempt} — raw response.text:`, response.text);
                console.log(`[generateQuiz] Attempt ${attempt} — typeof response.text:`, typeof response.text);

                responseText = response.text;
                parsed = JSON.parse(responseText);

                console.log(`[generateQuiz] Attempt ${attempt} — parsed result:`, JSON.stringify(parsed, null, 2));
            } catch (parseErr) {
                lastError = `Attempt ${attempt}: Failed to parse Gemini response — ${parseErr.message}`;
                console.error(`[generateQuiz] Attempt ${attempt} — inner catch:`, lastError);
                console.error(`[generateQuiz] Attempt ${attempt} — error.message:`, parseErr.message);
                console.error(`[generateQuiz] Attempt ${attempt} — error.stack:`, parseErr.stack);
                if (parseErr.status !== undefined)    console.error(`[generateQuiz] Attempt ${attempt} — error.status:`, parseErr.status);
                if (parseErr.statusText !== undefined) console.error(`[generateQuiz] Attempt ${attempt} — error.statusText:`, parseErr.statusText);
                if (parseErr.response !== undefined)  console.error(`[generateQuiz] Attempt ${attempt} — error.response:`, JSON.stringify(parseErr.response, null, 2));
                if (parseErr.cause !== undefined)     console.error(`[generateQuiz] Attempt ${attempt} — error.cause:`, parseErr.cause);
                parsed = null;
                continue;
            }

            const validationError = validateGeminiResponse(parsed, count);
            if (!validationError) {
                console.log(`[generateQuiz] Attempt ${attempt} — validation passed`);
                break;
            }

            lastError = `Attempt ${attempt}: ${validationError}`;
            console.warn(`[generateQuiz] Attempt ${attempt} — validation failed: ${validationError}`);
            parsed = null;
        }

        if (!parsed) {
            console.error('[generateQuiz] All attempts failed. Returning 502. lastError:', lastError);
            return res.status(502).json({
                message: 'Gemini returned an invalid response after 2 attempts. Please try again.',
                detail: lastError,
            });
        }

        // Return questions in the same shape the frontend's question editor expects
        // (text, options[], correctOption index) — conversion to {isCorrect} happens at save time
        const questions = parsed.questions.map((q) => ({
            text: q.question,
            options: q.options.map(String),
            correctOption: q.correctOption,
        }));

        console.log('[generateQuiz] Success — returning', questions.length, 'question(s)');
        res.json({ questions });
    } catch (error) {
        console.error('[generateQuiz] Outer catch — unexpected error:');
        console.error('[generateQuiz] error.message:', error.message);
        console.error('[generateQuiz] error.stack:', error.stack);
        if (error.status !== undefined)    console.error('[generateQuiz] error.status:', error.status);
        if (error.statusText !== undefined) console.error('[generateQuiz] error.statusText:', error.statusText);
        if (error.response !== undefined)  console.error('[generateQuiz] error.response:', JSON.stringify(error.response, null, 2));
        if (error.cause !== undefined)     console.error('[generateQuiz] error.cause:', error.cause);

        // Distinguish common Gemini API errors
        const msg = error.message || '';
        if (msg.includes('API_KEY') || msg.includes('api key')) {
            return res.status(500).json({ message: 'Gemini API key is missing or invalid. Check GEMINI_API_KEY in .env.' });
        }
        if (msg.includes('quota') || msg.includes('rate') || msg.includes('429')) {
            return res.status(429).json({ message: 'Gemini rate limit hit. Please wait a moment and try again.' });
        }
        res.status(500).json({ message: 'Server error while calling Gemini.', error: msg });
    }
};

// ── @desc   Look up quiz by join code (student)
// ── @route  GET /api/quiz/join/:code
// ── @access student
exports.joinQuiz = async (req, res) => {
    try {
        const quiz = await Quiz.findOne({ joinCode: req.params.code.toUpperCase(), isPublished: true })
            .select('title subject tags timeLimit questions joinCode restrictToRoster allowedStudents')
            .lean();

        if (!quiz) {
            return res.status(404).json({ message: 'Quiz not found or not published.' });
        }

        // Check if student already submitted
        const existing = await Submission.findOne({ quiz: quiz._id, student: req.user.id }).lean();
        if (existing) {
            return res.status(400).json({ message: 'You have already submitted this quiz.' });
        }

        // --- Roster Check ---
        if (quiz.restrictToRoster) {
            const User = require('../models/User');
            const student = await User.findById(req.user.id).lean();
            
            const isAllowed = quiz.allowedStudents.some(s => {
                const matchesEmail = s.email && student.email && s.email.toLowerCase() === student.email.toLowerCase();
                const matchesRoll  = s.rollNo && student.rollNo && s.rollNo.toUpperCase() === student.rollNo.toUpperCase();
                return matchesEmail || matchesRoll;
            });

            if (!isAllowed) {
                return res.status(403).json({ 
                    message: 'Sorry, your name/roll number is not on the approved roster for this quiz. Please contact your instructor.' 
                });
            }
        }

        res.json({
            _id: quiz._id,
            title: quiz.title,
            subject: quiz.subject || '',
            tags: quiz.tags || [],
            questionCount: quiz.questions.length,
            timeLimit: quiz.timeLimit,
            joinCode: quiz.joinCode,
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error.', error: error.message });
    }
};

// ── @desc   Get quiz questions for taking (no correct answers)
// ── @route  GET /api/quiz/:id/take
// ── @access student
exports.takeQuiz = async (req, res) => {
    try {
        const quiz = await Quiz.findById(req.params.id)
            .select('title subject tags timeLimit questions')
            .lean();

        if (!quiz) {
            return res.status(404).json({ message: 'Quiz not found.' });
        }

        // Check if student already submitted
        const existing = await Submission.findOne({ quiz: quiz._id, student: req.user.id }).lean();
        if (existing) {
            return res.status(400).json({ message: 'You have already submitted this quiz.' });
        }

        // Strip correct answers from questions
        const sanitized = quiz.questions.map((q, i) => ({
            index: i,
            text: q.text,
            options: q.options.map((o) => o.text),
        }));

        res.json({
            _id: quiz._id,
            title: quiz.title,
            subject: quiz.subject || '',
            tags: quiz.tags || [],
            timeLimit: quiz.timeLimit,
            questions: sanitized,
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error.', error: error.message });
    }
};

// ── @desc   Submit answers for a quiz
// ── @route  POST /api/quiz/:id/submit
// ── @access student
exports.submitQuiz = async (req, res) => {
    try {
        const { answers, warnings, timeTaken } = req.body;
        // answers = [{ questionIndex, selectedOption }]

        const quiz = await Quiz.findById(req.params.id).lean();
        if (!quiz) {
            return res.status(404).json({ message: 'Quiz not found.' });
        }

        // Check for duplicate submission
        const existing = await Submission.findOne({ quiz: quiz._id, student: req.user.id }).lean();
        if (existing) {
            return res.status(400).json({ message: 'You have already submitted this quiz.' });
        }

        if (!Array.isArray(answers)) {
            return res.status(400).json({ message: 'answers must be an array.' });
        }

        // Grade
        let totalCorrect = 0;
        const totalQuestions = quiz.questions.length;

        const correctAnswers = quiz.questions.map((q) => {
            const correctIdx = q.options.findIndex((o) => o.isCorrect);
            return correctIdx;
        });

        for (const a of answers) {
            if (a.questionIndex >= 0 && a.questionIndex < totalQuestions) {
                if (a.selectedOption === correctAnswers[a.questionIndex]) {
                    totalCorrect++;
                }
            }
        }

        const score = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

        const submission = await Submission.create({
            quiz: quiz._id,
            student: req.user.id,
            answers,
            score,
            totalCorrect,
            totalQuestions,
            timeTaken: timeTaken || 0,
            warnings: warnings || 0,
        });

        // Return score summary + correct answers for post-quiz review
        res.status(201).json({
            _id: submission._id,
            score,
            totalCorrect,
            totalQuestions,
            correctAnswers,
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'You have already submitted this quiz.' });
        }
        res.status(500).json({ message: 'Server error while submitting quiz.', error: error.message });
    }
};

// ── @desc   Get all submissions for the logged-in student
// ── @route  GET /api/quiz/my
// ── @access student
exports.getMySubmissions = async (req, res) => {
    try {
        const submissions = await Submission.find({ student: req.user.id })
            .populate('quiz', 'title subject tags questions timeLimit createdAt joinCode')
            .sort({ submittedAt: -1 })
            .lean();

        const result = submissions.map((s) => ({
            _id: s._id,
            quizId: s.quiz._id,
            title: s.quiz.title,
            subject: s.quiz.subject || '',
            tags: s.quiz.tags || [],
            questionCount: s.quiz.questions.length,
            score: s.score,
            totalCorrect: s.totalCorrect,
            totalQuestions: s.totalQuestions,
            timeTaken: s.timeTaken,
            warnings: s.warnings,
            submittedAt: s.submittedAt,
            createdAt: s.quiz.createdAt,
        }));

        res.json(result);
    } catch (error) {
        res.status(500).json({ message: 'Server error.', error: error.message });
    }
};

// ── @desc   Get detailed result for a specific quiz submission
// ── @route  GET /api/quiz/:id/result
// ── @access student
exports.getSubmissionResult = async (req, res) => {
    try {
        const submission = await Submission.findOne({
            quiz: req.params.id,
            student: req.user.id,
        }).lean();

        if (!submission) {
            return res.status(404).json({ message: 'Submission not found.' });
        }

        const quiz = await Quiz.findById(req.params.id)
            .select('title subject tags questions timeLimit createdAt creator')
            .populate('creator', 'name')
            .lean();

        if (!quiz) {
            return res.status(404).json({ message: 'Quiz not found.' });
        }

        // Build detailed question data with correct answers
        const questions = quiz.questions.map((q, i) => {
            const studentAnswer = submission.answers.find((a) => a.questionIndex === i);
            return {
                text: q.text,
                options: q.options.map((o) => o.text),
                correctOption: q.options.findIndex((o) => o.isCorrect),
                studentAnswer: studentAnswer ? studentAnswer.selectedOption : -1,
                explanation: q.explanation || '',
            };
        });

        res.json({
            quiz: {
                _id: quiz._id,
                title: quiz.title,
                subject: quiz.subject || '',
                tags: quiz.tags || [],
                teacher: quiz.creator?.name || 'Unknown',
                createdAt: quiz.createdAt,
            },
            submission: {
                _id: submission._id,
                score: submission.score,
                totalCorrect: submission.totalCorrect,
                totalQuestions: submission.totalQuestions,
                timeTaken: submission.timeTaken,
                warnings: submission.warnings,
                submittedAt: submission.submittedAt,
            },
            questions,
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error.', error: error.message });
    }
};

// ── @desc   Get all quizzes created by the logged-in teacher
// ── @route  GET /api/quiz/teacher/my
// ── @access teacher
exports.getTeacherQuizzes = async (req, res) => {
    try {
        const quizzes = await Quiz.find({ creator: req.user.id })
            .select('title subject tags questions timeLimit createdAt isPublished joinCode joinLink')
            .sort({ createdAt: -1 })
            .lean();

        // For each quiz, count submissions
        const result = await Promise.all(
            quizzes.map(async (q) => {
                const submissionCount = await Submission.countDocuments({ quiz: q._id });
                return {
                    _id: q._id,
                    title: q.title,
                    subject: q.subject || '',
                    tags: q.tags || [],
                    questionCount: q.questions.length,
                    timeLimit: q.timeLimit,
                    createdAt: q.createdAt,
                    isPublished: q.isPublished,
                    joinCode: q.joinCode,
                    joinLink: q.joinLink,
                    submissions: submissionCount,
                };
            })
        );

        res.json(result);
    } catch (error) {
        res.status(500).json({ message: 'Server error.', error: error.message });
    }
};

// ── @desc   Get all submissions for a specific quiz (teacher analytics)
// ── @route  GET /api/quiz/:id/submissions
// ── @access teacher
exports.getQuizSubmissions = async (req, res) => {
    try {
        // Verify the teacher owns this quiz
        const quiz = await Quiz.findById(req.params.id).lean();
        if (!quiz) {
            return res.status(404).json({ message: 'Quiz not found.' });
        }
        if (String(quiz.creator) !== req.user.id) {
            return res.status(403).json({ message: 'You are not the creator of this quiz.' });
        }

        const submissions = await Submission.find({ quiz: req.params.id })
            .populate('student', 'name email rollNo')
            .sort({ submittedAt: -1 })
            .lean();

        res.json({
            quiz: {
                _id: quiz._id,
                title: quiz.title,
                subject: quiz.subject || '',
                totalQuestions: quiz.questions.length,
                questions: quiz.questions, // Include full questions for teacher view
            },
            submissions: submissions.map((s) => ({
                _id: s._id,
                student: {
                    name: s.student.name,
                    email: s.student.email,
                    rollNo: s.student.rollNo || '',
                },
                score: s.score,
                totalCorrect: s.totalCorrect,
                totalQuestions: s.totalQuestions,
                timeTaken: s.timeTaken,
                warnings: s.warnings,
                submittedAt: s.submittedAt,
            })),
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error.', error: error.message });
    }
};

// ── @desc   Upload a PDF student roster for a quiz
// ── @route  POST /api/quiz/:id/roster
// ── @access teacher (must be quiz creator)
exports.uploadRoster = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No PDF file uploaded.' });
        }

        const quiz = await Quiz.findById(req.params.id);
        if (!quiz) {
            return res.status(404).json({ message: 'Quiz not found.' });
        }
        if (String(quiz.creator) !== req.user.id) {
            return res.status(403).json({ message: 'You are not the creator of this quiz.' });
        }

        // Parse the PDF
        const pdfData = await pdfParse(req.file.buffer);
        const text = pdfData.text;

        // Extract student entries from the text
        // Strategy: look for lines containing emails or roll numbers
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const rollNoRegex = /\b([A-Z]{2,4}\d{2,}[A-Z]*\d*|\d{6,})\b/gi; // matches patterns like BT23CSE001 or 230001

        const students = [];
        const seenEmails = new Set();

        for (const line of lines) {
            const emails = line.match(emailRegex) || [];
            const rollNos = line.match(rollNoRegex) || [];

            if (emails.length > 0) {
                for (const email of emails) {
                    const lower = email.toLowerCase();
                    if (!seenEmails.has(lower)) {
                        seenEmails.add(lower);
                        students.push({
                            email: lower,
                            rollNo: rollNos[0] || '',
                            name: line.replace(email, '').replace(rollNos[0] || '___NOREPLACEMENT___', '').replace(/[,|\t]+/g, ' ').trim() || '',
                        });
                    }
                }
            } else if (rollNos.length > 0) {
                // Line has rollNo but no email
                for (const rollNo of rollNos) {
                    students.push({
                        email: '',
                        rollNo: rollNo.toUpperCase(),
                        name: line.replace(rollNo, '').replace(/[,|\t]+/g, ' ').trim() || '',
                    });
                }
            }
        }

        if (students.length === 0) {
            return res.status(400).json({
                message: 'Could not extract any student data from the PDF. Ensure it contains emails or roll numbers.',
            });
        }

        // Update quiz
        quiz.allowedStudents = students;
        quiz.restrictToRoster = true;
        await quiz.save();

        res.json({
            message: `Successfully uploaded roster with ${students.length} student(s).`,
            count: students.length,
            students: students.slice(0, 10), // preview first 10
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error while processing PDF.', error: error.message });
    }
};
