import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE } from '../config.js';
import '../styles/CreateQuiz.css';

// ── Blank question factory ─────────────────────────────────────────────────
const blankQuestion = () => ({
    text: '',
    options: ['', '', '', ''],
    correctOption: 0,
});

// ── Tag chip input ─────────────────────────────────────────────────────────
const TagInput = ({ tags, onChange }) => {
    const [input, setInput] = useState('');

    const addTag = (raw) => {
        const tag = raw.trim();
        if (tag && !tags.includes(tag)) {
            onChange([...tags, tag]);
        }
        setInput('');
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag(input);
        } else if (e.key === 'Backspace' && input === '' && tags.length > 0) {
            onChange(tags.slice(0, -1));
        }
    };

    const removeTag = (idx) => onChange(tags.filter((_, i) => i !== idx));

    return (
        <div className="cq-tag-input">
            {tags.map((tag, idx) => (
                <span key={idx} className="cq-tag-chip">
                    {tag}
                    <button
                        type="button"
                        className="cq-tag-chip__remove"
                        onClick={() => removeTag(idx)}
                        aria-label={`Remove tag ${tag}`}
                    >
                        ×
                    </button>
                </span>
            ))}
            <input
                type="text"
                className="cq-tag-input__field"
                placeholder={tags.length === 0 ? 'Add tags (press Enter or comma)' : ''}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => { if (input.trim()) addTag(input); }}
            />
        </div>
    );
};

// ── Single question editor ─────────────────────────────────────────────────
const QuestionEditor = ({ question, index, onChange, onRemove, canRemove }) => {
    const updateText = (text) => onChange({ ...question, text });
    const updateOption = (optIdx, value) => {
        const options = [...question.options];
        options[optIdx] = value;
        onChange({ ...question, options });
    };
    const setCorrect = (optIdx) => onChange({ ...question, correctOption: optIdx });

    return (
        <div className="cq-question-card">
            <div className="cq-question-card__header">
                <span className="cq-question-card__num">Q{index + 1}</span>
                {canRemove && (
                    <button
                        type="button"
                        className="cq-question-card__remove"
                        onClick={onRemove}
                        aria-label="Remove question"
                    >
                        Remove
                    </button>
                )}
            </div>

            <div className="cq-field">
                <label className="cq-label">Question</label>
                <textarea
                    className="cq-textarea"
                    placeholder="Enter question text..."
                    value={question.text}
                    onChange={(e) => updateText(e.target.value)}
                    rows={2}
                />
            </div>

            <div className="cq-options-grid">
                {question.options.map((opt, optIdx) => (
                    <div key={optIdx} className="cq-option-row">
                        <label className="cq-option-row__radio-wrap" aria-label={`Mark option ${optIdx + 1} as correct`}>
                            <input
                                type="radio"
                                name={`correct-${index}`}
                                checked={question.correctOption === optIdx}
                                onChange={() => setCorrect(optIdx)}
                                className="cq-option-row__radio"
                            />
                            <span className="cq-option-row__radio-dot" />
                        </label>
                        <input
                            type="text"
                            className="cq-input cq-option-row__input"
                            placeholder={`Option ${optIdx + 1}`}
                            value={opt}
                            onChange={(e) => updateOption(optIdx, e.target.value)}
                        />
                    </div>
                ))}
            </div>
            <p className="cq-option-hint">Select the radio button next to the correct answer.</p>
        </div>
    );
};

// ── Success screen ─────────────────────────────────────────────────────────
const SuccessScreen = ({ joinCode, joinLink, onCreateAnother }) => {
    const [codeCopied, setCodeCopied] = useState(false);
    const [linkCopied, setLinkCopied] = useState(false);

    const copy = async (text, setter) => {
        try {
            await navigator.clipboard.writeText(text);
            setter(true);
            setTimeout(() => setter(false), 2000);
        } catch {
            // Fallback for non-HTTPS contexts
            const el = document.createElement('textarea');
            el.value = text;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
            setter(true);
            setTimeout(() => setter(false), 2000);
        }
    };

    return (
        <div className="cq-success">
            <div className="cq-success__icon">✓</div>
            <h2 className="cq-success__title">Quiz Created!</h2>
            <p className="cq-success__sub">Share the code or link below with your students.</p>

            <div className="cq-success__item">
                <span className="cq-success__item-label">Join Code</span>
                <div className="cq-success__item-row">
                    <span className="cq-success__code">{joinCode}</span>
                    <button
                        type="button"
                        className={`cq-success__copy-btn ${codeCopied ? 'cq-success__copy-btn--copied' : ''}`}
                        onClick={() => copy(joinCode, setCodeCopied)}
                    >
                        {codeCopied ? 'Copied!' : 'Copy Code'}
                    </button>
                </div>
            </div>

            <div className="cq-success__item">
                <span className="cq-success__item-label">Shareable Link</span>
                <div className="cq-success__item-row cq-success__item-row--link">
                    <span className="cq-success__link">{joinLink}</span>
                    <button
                        type="button"
                        className={`cq-success__copy-btn ${linkCopied ? 'cq-success__copy-btn--copied' : ''}`}
                        onClick={() => copy(joinLink, setLinkCopied)}
                    >
                        {linkCopied ? 'Copied!' : 'Copy Link'}
                    </button>
                </div>
            </div>

            <button type="button" className="cq-btn cq-btn--secondary" onClick={onCreateAnother}>
                Create Another Quiz
            </button>
        </div>
    );
};

// ── Main component ─────────────────────────────────────────────────────────
export default function CreateQuiz({ contained = false }) {
    const navigate = useNavigate();
    const token = localStorage.getItem('token');

    // Mode
    const [mode, setMode] = useState('manual'); // 'manual' | 'ai'

    // Shared fields
    const [title, setTitle] = useState('');
    const [tags, setTags] = useState([]);
    const [questions, setQuestions] = useState([blankQuestion()]);
    const [timeLimit, setTimeLimit] = useState(10); // minutes

    // AI-only fields
    const [aiPrompt, setAiPrompt] = useState('');
    const [aiPromptError, setAiPromptError] = useState('');
    const [difficulty, setDifficulty] = useState('medium');
    const [numQuestions, setNumQuestions] = useState(5);

    // UI state
    const [aiGenerating, setAiGenerating] = useState(false);
    const [aiError, setAiError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [successData, setSuccessData] = useState(null); // { joinCode, joinLink }

    const authHeader = { Authorization: `Bearer ${token}` };

    // ── Question list handlers ───────────────────────────────────────────
    const updateQuestion = useCallback((idx, updated) => {
        setQuestions((prev) => prev.map((q, i) => (i === idx ? updated : q)));
    }, []);

    const addQuestion = () => setQuestions((prev) => [...prev, blankQuestion()]);

    const removeQuestion = (idx) =>
        setQuestions((prev) => prev.filter((_, i) => i !== idx));

    // ── AI generate ─────────────────────────────────────────────────────
    const handleGenerate = async () => {
        setAiError('');
        setAiPromptError('');

        if (!aiPrompt.trim() || aiPrompt.trim().length < 10) {
            setAiPromptError('Please describe the topic in at least 10 characters.');
            return;
        }

        setAiGenerating(true);
        try {
            const response = await axios.post(
                `${API_BASE}/api/quiz/generate`,
                { prompt: aiPrompt.trim(), tags, difficulty, numQuestions },
                { headers: authHeader }
            );
            setQuestions(response.data.questions);
        } catch (err) {
            setAiError(err.response?.data?.message || 'Failed to generate questions. Please try again.');
        } finally {
            setAiGenerating(false);
        }
    };

    // ── Client-side validation ───────────────────────────────────────────
    const validate = () => {
        if (!title.trim()) return 'Title is required.';
        if (timeLimit <= 0 || isNaN(timeLimit)) return 'Time limit must be a positive number.';
        if (questions.length === 0) return 'Add at least one question.';
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            const num = i + 1;
            if (!q.text.trim()) return `Question ${num}: question text is required.`;
            for (let j = 0; j < 4; j++) {
                if (!q.options[j].trim()) return `Question ${num}, option ${j + 1}: cannot be empty.`;
            }
        }
        return null;
    };

    // ── Submit ───────────────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitError('');

        const validationError = validate();
        if (validationError) {
            setSubmitError(validationError);
            return;
        }

        setSubmitting(true);
        try {
            const response = await axios.post(
                `${API_BASE}/api/quiz`,
                { title, tags, questions, timeLimit: Number(timeLimit) },
                { headers: authHeader }
            );
            setSuccessData({
                joinCode: response.data.joinCode,
                joinLink: response.data.joinLink,
            });
        } catch (err) {
            setSubmitError(err.response?.data?.message || 'Failed to save quiz. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setTitle('');
        setTags([]);
        setQuestions([blankQuestion()]);
        setTimeLimit(10);
        setAiPrompt('');
        setAiPromptError('');
        setDifficulty('medium');
        setNumQuestions(5);
        setSubmitError('');
        setAiError('');
        setSuccessData(null);
    };

    // ── Success screen ───────────────────────────────────────────────────
    if (successData) {
        return (
            <div className={`cq-layout ${contained ? 'cq-layout--contained' : ''}`}>
                {!contained && (
                    <aside className="cq-sidebar">
                        <div className="cq-sidebar__header">
                            <span className="cq-sidebar__logo">QuizPod</span>
                        </div>
                        <button
                            className="cq-sidebar__back"
                            onClick={() => navigate('/teacher')}
                            type="button"
                        >
                            ← Back to Dashboard
                        </button>
                    </aside>
                )}
                <main className={`cq-main ${contained ? 'cq-main--contained' : ''}`}>
                    <SuccessScreen
                        joinCode={successData.joinCode}
                        joinLink={successData.joinLink}
                        onCreateAnother={resetForm}
                    />
                </main>
            </div>
        );
    }

    // ── Main form ────────────────────────────────────────────────────────
    return (
        <div className={`cq-layout ${contained ? 'cq-layout--contained' : ''}`}>

            {/* Sidebar */}
            {!contained && (
                <aside className="cq-sidebar">
                    <div className="cq-sidebar__header">
                        <span className="cq-sidebar__logo">QuizPod</span>
                    </div>
                    <button
                        className="cq-sidebar__back"
                        onClick={() => navigate('/teacher')}
                        type="button"
                    >
                        ← Back to Dashboard
                    </button>
                </aside>
            )}

            {/* Main content */}
            <main className={`cq-main ${contained ? 'cq-main--contained' : ''}`}>
                <div className="cq-page-header">
                    <h1 className="cq-page-title">Create Quiz</h1>
                    <p className="cq-page-sub">Build manually or let AI generate a draft you can edit.</p>
                </div>

                {/* Mode tabs */}
                <div className="cq-tabs" role="tablist">
                    <button
                        role="tab"
                        aria-selected={mode === 'manual'}
                        className={`cq-tab ${mode === 'manual' ? 'cq-tab--active' : ''}`}
                        onClick={() => { setMode('manual'); setSubmitError(''); setAiError(''); setAiPromptError(''); }}
                        type="button"
                    >
                        ✏️ Manual Create
                    </button>
                    <button
                        role="tab"
                        aria-selected={mode === 'ai'}
                        className={`cq-tab ${mode === 'ai' ? 'cq-tab--active' : ''}`}
                        onClick={() => { setMode('ai'); setSubmitError(''); setAiError(''); setAiPromptError(''); }}
                        type="button"
                    >
                        ✨ AI Generate
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="cq-form" noValidate>

                    {/* ── Shared: Title ── */}
                    <div className="cq-section">
                        <div className="cq-field">
                            <label className="cq-label" htmlFor="cq-title">Quiz Title</label>
                            <input
                                id="cq-title"
                                type="text"
                                className="cq-input"
                                placeholder="e.g. Chemical Reactions — Chapter 4"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                        </div>

                        <div className="cq-field">
                            <label className="cq-label">Tags</label>
                            <TagInput tags={tags} onChange={setTags} />
                        </div>

                        <div className="cq-field cq-field--short">
                            <label className="cq-label" htmlFor="cq-timelimit">Time Limit (minutes)</label>
                            <input
                                id="cq-timelimit"
                                type="number"
                                min="1"
                                max="180"
                                className="cq-input"
                                value={timeLimit}
                                onChange={(e) => setTimeLimit(Number(e.target.value))}
                            />
                        </div>
                    </div>

                    {/* ── AI-only controls ── */}
                    {mode === 'ai' && (
                        <div className="cq-section cq-section--ai">
                            <h2 className="cq-section__title">AI Settings</h2>

                            <div className="cq-field">
                                <label className="cq-label" htmlFor="cq-ai-prompt">Topic / Prompt</label>
                                <textarea
                                    id="cq-ai-prompt"
                                    className={`cq-textarea cq-textarea--prompt${aiPromptError ? ' cq-textarea--error' : ''}`}
                                    placeholder={'e.g. "Beginner Python for-loops and nested loops for CS101 students. Focus on loop counters, range(), and common off-by-one mistakes."'}
                                    value={aiPrompt}
                                    onChange={(e) => { setAiPrompt(e.target.value); if (aiPromptError) setAiPromptError(''); }}
                                    rows={4}
                                />
                                {aiPromptError && <p className="cq-field__error">{aiPromptError}</p>}
                            </div>

                            <div className="cq-ai-row">
                                <div className="cq-field">
                                    <label className="cq-label" htmlFor="cq-difficulty">Difficulty</label>
                                    <select
                                        id="cq-difficulty"
                                        className="cq-select"
                                        value={difficulty}
                                        onChange={(e) => setDifficulty(e.target.value)}
                                    >
                                        <option value="easy">Easy</option>
                                        <option value="medium">Medium</option>
                                        <option value="hard">Hard</option>
                                    </select>
                                </div>

                                <div className="cq-field">
                                    <label className="cq-label" htmlFor="cq-numq">Number of Questions</label>
                                    <input
                                        id="cq-numq"
                                        type="number"
                                        min="1"
                                        max="30"
                                        className="cq-input"
                                        value={numQuestions}
                                        onChange={(e) => setNumQuestions(Number(e.target.value))}
                                    />
                                </div>
                            </div>

                            {aiError && <p className="cq-error">{aiError}</p>}

                            <button
                                type="button"
                                className="cq-btn cq-btn--ai"
                                onClick={handleGenerate}
                                disabled={aiGenerating}
                            >
                                {aiGenerating ? (
                                    <><span className="cq-spinner" /> Generating…</>
                                ) : (
                                    '✨ Generate Questions'
                                )}
                            </button>

                            {questions.length > 0 && !aiGenerating && (
                                <p className="cq-ai-hint">
                                    {questions.length} question{questions.length !== 1 ? 's' : ''} generated.
                                    Review and edit below before saving.
                                </p>
                            )}
                        </div>
                    )}

                    {/* ── Questions list ── */}
                    <div className="cq-section">
                        <div className="cq-section__header">
                            <h2 className="cq-section__title">
                                Questions
                                <span className="cq-section__count">{questions.length}</span>
                            </h2>
                        </div>

                        {questions.map((q, idx) => (
                            <QuestionEditor
                                key={idx}
                                question={q}
                                index={idx}
                                onChange={(updated) => updateQuestion(idx, updated)}
                                onRemove={() => removeQuestion(idx)}
                                canRemove={questions.length > 1}
                            />
                        ))}

                        <button
                            type="button"
                            className="cq-btn cq-btn--add"
                            onClick={addQuestion}
                        >
                            + Add Question
                        </button>
                    </div>

                    {/* ── Submit ── */}
                    {submitError && <p className="cq-error cq-error--submit">{submitError}</p>}

                    <div className="cq-form-footer">
                        <button
                            type="button"
                            className="cq-btn cq-btn--secondary"
                            onClick={() => navigate('/teacher')}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="cq-btn cq-btn--primary"
                            disabled={submitting}
                        >
                            {submitting ? 'Saving…' : 'Save Quiz'}
                        </button>
                    </div>
                </form>
            </main>
        </div>
    );
}
