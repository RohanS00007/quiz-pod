import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from '../config.js';
import '../styles/MistakeBook.css';

// ── MistakeCard ───────────────────────────────────────────────────────────
const MistakeCard = ({ q }) => {
  const [showOptions, setShowOptions] = useState(false);

  return (
    <div className="mb-card">
      <p className="mb-card__question">
        Q{q.index + 1}. {q.text}
      </p>

      <div className="mb-card__answers">
        <div className="mb-answer mb-answer--wrong">
          <div className="mb-answer__label">❌ Your answer</div>
          <div className="mb-answer__value">{q.studentAnswer >= 0 ? q.options[q.studentAnswer] : 'Not answered'}</div>
        </div>
        <div className="mb-answer mb-answer--correct">
          <div className="mb-answer__label">✅ Correct answer</div>
          <div className="mb-answer__value">{q.options[q.correctOption]}</div>
        </div>
      </div>

      <button
        className="mb-card__toggle"
        onClick={() => setShowOptions(v => !v)}
      >
        {showOptions ? '▲ Hide all options' : '▼ See all options'}
      </button>

      {showOptions && (
        <ul className="mb-options">
          {q.options.map((opt, i) => (
            <li
              key={i}
              className={`mb-option ${i === q.correctOption ? 'mb-option--correct' :
                  i === q.studentAnswer ? 'mb-option--wrong' : ''
                }`}
            >
              {opt}
              {i === q.correctOption && ' ✅'}
              {i === q.studentAnswer && i !== q.correctOption && ' ❌'}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────
const MistakeBook = ({ studentName = 'Student', contained = false }) => {
  const [submissions, setSubmissions] = useState([]);
  const [selectedQuizId, setSelectedQuizId] = useState(null);
  const [quizResults, setQuizResults] = useState({}); // quizId -> { questions }
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  const token = localStorage.getItem('token');
  const storedUser = (() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; }
  })();
  const displayName = storedUser.name?.split(' ')[0] || studentName;

  // Load all submissions
  useEffect(() => {
    const load = async () => {
      try {
        const response = await axios.get(`${API_BASE}/api/quiz/my`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const subs = Array.isArray(response.data) ? response.data : [];
        setSubmissions(subs);
        if (subs.length > 0) {
          setSelectedQuizId(subs[0].quizId);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  // Load detailed result when selection changes
  useEffect(() => {
    if (!selectedQuizId || quizResults[selectedQuizId]) return;

    const loadDetail = async () => {
      setDetailLoading(true);
      try {
        const response = await axios.get(`${API_BASE}/api/quiz/${selectedQuizId}/result`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setQuizResults(prev => ({
          ...prev,
          [selectedQuizId]: response.data,
        }));
      } catch {
        // silently fail
      } finally {
        setDetailLoading(false);
      }
    };
    loadDetail();
  }, [selectedQuizId, token, quizResults]);

  const selectedResult = selectedQuizId ? quizResults[selectedQuizId] : null;
  const questions = selectedResult?.questions || [];

  const mistakes = questions
    .map((q, i) => ({ ...q, index: i }))
    .filter(q => q.studentAnswer !== q.correctOption);

  const totalAttempted = questions.length;
  const totalCorrect = totalAttempted - mistakes.length;

  if (loading) {
    return (
      <div className={`mb-page ${contained ? 'mb-page--contained' : ''}`}>
        <div className="mb-container">
          <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`mb-page ${contained ? 'mb-page--contained' : ''}`}>
      <div className="mb-container">

        {/* Header */}
        <div className="mb-header">
          <h1 className="mb-header__title">📖 Mistake Book</h1>
          <p className="mb-header__sub">
            {displayName}, select a quiz to review your mistakes.
          </p>
        </div>

        {/* Quiz Selector */}
        {submissions.length === 0 ? (
          <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>
            No quizzes taken yet. Take a quiz to see your mistakes here!
          </p>
        ) : (
          <>
            <div className="mb-selector">
              <label className="mb-selector__label">Select Quiz</label>
              <div className="mb-selector__buttons">
                {submissions.map(sub => (
                  <button
                    key={sub.quizId}
                    className={`mb-selector__btn ${selectedQuizId === sub.quizId ? 'mb-selector__btn--active' : ''}`}
                    onClick={() => setSelectedQuizId(sub.quizId)}
                  >
                    <span className="mb-selector__subject">{(sub.subject || 'QUIZ').toUpperCase()}</span>
                    <span className="mb-selector__qtitle">{sub.title}</span>
                    <span className="mb-selector__date">{new Date(sub.submittedAt).toLocaleDateString()}</span>
                  </button>
                ))}
              </div>
            </div>

            {detailLoading ? (
              <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>Loading quiz details...</p>
            ) : selectedResult ? (
              <>
                {/* Stats */}
                <div className="mb-stats">
                  <div className="mb-stat">
                    <div className="mb-stat__value mb-stat__value--purple">{totalAttempted}</div>
                    <div className="mb-stat__label">Total questions</div>
                  </div>
                  <div className="mb-stat">
                    <div className="mb-stat__value mb-stat__value--red">{mistakes.length}</div>
                    <div className="mb-stat__label">Mistakes</div>
                  </div>
                  <div className="mb-stat">
                    <div className="mb-stat__value mb-stat__value--green">{totalCorrect}</div>
                    <div className="mb-stat__label">Correct</div>
                  </div>
                </div>

                {/* Mistake Cards */}
                <div className="mb-list">
                  {mistakes.length === 0 ? (
                    <p className="mb-empty">🎉 No mistakes in this quiz! </p>
                  ) : (
                    mistakes.map((m, i) => <MistakeCard key={i} q={m} />)
                  )}
                </div>
              </>
            ) : null}
          </>
        )}

      </div>
    </div>
  );
};

export default MistakeBook;