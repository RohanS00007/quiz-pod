import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE } from '../config.js';
import '../styles/MyQuiz.css';

const buildAuthHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
});

const formatDate = (value) => {
  if (!value) return 'Date unavailable';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'Date unavailable';
  return d.toLocaleDateString();
};

const getQuizTag = (quiz) => {
  const subject = quiz?.subject || 'QUIZ';
  return String(subject).slice(0, 8).toUpperCase();
};

export default function MyQuiz({ contained = false }) {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [joinBusy, setJoinBusy] = useState(false);
  const [joinMessage, setJoinMessage] = useState('');

  const token = useMemo(() => localStorage.getItem('token') || '', []);

  useEffect(() => {
    const loadQuizzes = async () => {
      if (!token) {
        setError('Please log in to view your quizzes.');
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(`${API_BASE}/api/quiz/my`, {
          headers: buildAuthHeaders(token),
        });
        setQuizzes(Array.isArray(response.data) ? response.data : []);
        setError('');
      } catch (err) {
        const status = err?.response?.status;
        if (status === 401) {
          setError('Your session has expired. Please log in again.');
        } else {
          setError(err?.response?.data?.message || 'Could not load previous quizzes.');
        }
      }
      setLoading(false);
    };

    loadQuizzes();
  }, [token]);

  const handleJoinQuiz = async (e) => {
    e.preventDefault();
    setJoinMessage('');
    if (!joinCode.trim()) {
      setJoinMessage('Please enter a quiz code.');
      return;
    }

    setJoinBusy(true);
    try {
      const response = await axios.get(`${API_BASE}/api/quiz/join/${joinCode.trim()}`, {
        headers: buildAuthHeaders(token),
      });
      // Quiz found — navigate to the arena
      navigate(`/quizArena?quizId=${response.data._id}`);
    } catch (err) {
      setJoinMessage(err?.response?.data?.message || 'Could not find quiz with that code.');
    } finally {
      setJoinBusy(false);
    }
  };

  return (
    <div className={`myquiz-page ${contained ? 'myquiz-page--contained' : ''}`}>
      <header className="myquiz-banner">
        <div>
          <h1 className="myquiz-banner__title">My Quizzes</h1>
          <p className="myquiz-banner__subtitle">
            Revisit your previous attempts and jump into a new quiz using a code.
          </p>
        </div>
        <div className="myquiz-banner__badge-wrap">
          <div className="myquiz-banner__badge">
            <span className="myquiz-banner__badge-value">{quizzes.length}</span>
            <span className="myquiz-banner__badge-label">Quizzes</span>
          </div>
        </div>
      </header>

      <section className="myquiz-card myquiz-card--join">
        <div className="myquiz-card__head">
          <h2 className="myquiz-card__title">Join a Quiz</h2>
          <span className="myquiz-chip">Code Entry</span>
        </div>

        <form onSubmit={handleJoinQuiz} className="myquiz-join-form">
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            placeholder="Enter quiz code"
            className="myquiz-join-form__input"
          />
          <button
            type="submit"
            disabled={joinBusy}
            className="myquiz-join-form__button"
          >
            {joinBusy ? 'Joining...' : 'Join Quiz'}
          </button>
        </form>
        {joinMessage ? <p className="myquiz-feedback">{joinMessage}</p> : null}
      </section>

      <section className="myquiz-card">
        <div className="myquiz-card__head">
          <h2 className="myquiz-card__title">Previous Quizzes</h2>
        </div>
        {loading ? <p className="myquiz-muted">Loading quizzes...</p> : null}
        {!loading && error ? <p className="myquiz-muted">{error}</p> : null}
        {!loading && quizzes.length === 0 && !error ? (
          <p className="myquiz-muted">You haven't taken any quizzes yet. Join one using a code above!</p>
        ) : null}

        {!loading && quizzes.length > 0 ? (
          <div className="myquiz-list">
            {quizzes.map((quiz) => (
              <article
                key={quiz._id}
                className="myquiz-item"
                onClick={() => navigate(`/student/quizdetail?quizId=${quiz.quizId}`)}
                style={{ cursor: 'pointer' }}
              >
                <div className="myquiz-item__top">
                  <span className="myquiz-item__tag">{getQuizTag(quiz)}</span>
                  <span className="myquiz-item__status">Completed</span>
                </div>
                <h3 className="myquiz-item__title">{quiz.title || 'Untitled Quiz'}</h3>
                <p className="myquiz-item__meta">
                  Subject: {quiz.subject || 'N/A'}
                </p>
                <p className="myquiz-item__meta">
                  Questions: {quiz.questionCount || quiz.totalQuestions || 0}
                </p>
                <p className="myquiz-item__meta">Submitted: {formatDate(quiz.submittedAt)}</p>
                <p className="myquiz-item__score">Score: {quiz.score}% ({quiz.totalCorrect}/{quiz.totalQuestions})</p>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}
