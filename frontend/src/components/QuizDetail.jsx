import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE } from '../config.js';
import '../styles/QuizDetail.css';
import StudentSidebar from './StudentSidebar';

const TAG_COLORS = {
  Science:   { bg: '#06443320', color: '#34d399', border: '#34d39944' },
  Math:      { bg: '#1d4ed820', color: '#93c5fd', border: '#93c5fd44' },
  English:   { bg: '#7c3aed20', color: '#c4b5fd', border: '#c4b5fd44' },
  Geography: { bg: '#92400e20', color: '#fcd34d', border: '#fcd34d44' },
  History:   { bg: '#9f123520', color: '#fb7185', border: '#fb718544' },
};

export default function QuizDetail({ studentName = 'Student', lastName = '' }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const quizId = searchParams.get('quizId');

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPerf, setShowPerf] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Try to get student name from localStorage
  const storedUser = (() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; }
  })();
  const displayName = storedUser.name?.split(' ')[0] || studentName;
  const displayLast = storedUser.name?.split(' ').slice(1).join(' ') || lastName;

  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!quizId) {
      setError('No quiz ID provided.');
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        const resQuiz = await axios.get(`${API_BASE}/api/quiz/${quizId}/result`, { 
          headers: { Authorization: `Bearer ${token}` } 
        });
        setData(resQuiz.data);
      } catch (err) {
        setError(err?.response?.data?.message || 'Could not load quiz results.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [quizId, token]);

  if (loading) {
    return (
      <div className="qd" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <p style={{ color: '#94a3b8', fontSize: '1.2rem' }}>Loading results...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="qd" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '1rem' }}>
        <p style={{ color: '#f87171', fontSize: '1.2rem' }}>{error || 'No data available.'}</p>
        <button onClick={() => navigate('/student')} style={{ padding: '10px 24px', borderRadius: '8px', background: '#a78bfa', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '1rem' }}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  const { quiz, submission, questions } = data;
  const correct = submission.totalCorrect;
  const wrong = submission.totalQuestions - correct;
  const pct = submission.score;
  const tc = TAG_COLORS[quiz.subject] || TAG_COLORS.Science;

  function scoreColor(p) {
    return p >= 80 ? '#34d399' : p >= 60 ? '#fbbf24' : '#f87171';
  }

  const ringColor = scoreColor(pct);
  const dashOffset = Math.round(226 - (pct / 100) * 226);

  const formatTime = (seconds) => {
    if (!seconds) return 'N/A';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="qd">
      <StudentSidebar 
        studentName={displayName}
        lastName={displayLast}
        activeId="performance"
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onLogout={() => {
          localStorage.clear();
          window.location.href = '/';
        }}
      />

      <main className="qd__main">

        {/* Breadcrumb */}
        <div className="qd__breadcrumb">
          <span onClick={() => navigate('/student/performance')} style={{cursor:'pointer'}}>Performance</span>
          <span className="qd__sep">›</span>
          <span onClick={() => navigate('/student')} style={{cursor:'pointer'}}>{displayName}</span>
          <span className="qd__sep">›</span>
          <span className="qd__cur">{quiz.title}</span>
        </div>

        {/* Hero */}
        <div className="qd__hero">
          <div className="qd__hero-left">
            <span className="qd__hero-tag" style={{ background: tc.bg, color: tc.color, border: `1px solid ${tc.border}` }}>
              {quiz.subject || 'Quiz'}
            </span>
            <div className="qd__hero-title">{quiz.title}</div>
            <div className="qd__hero-meta">
              <span>📅 {new Date(submission.submittedAt).toLocaleDateString()}</span>
              <span>⏱ {formatTime(submission.timeTaken)}</span>
              <span>👤 {displayName} {displayLast}</span>
              {quiz.teacher && <span>🧑‍🏫 {quiz.teacher}</span>}
            </div>
            {/* Compare bars */}
            <div className="qd__compare">
              <div className="qd__compare-row">
                <span className="qd__compare-name">{displayName}</span>
                <div className="qd__compare-bg">
                  <div className="qd__compare-fill" style={{ width: pct + '%', background: ringColor }} />
                </div>
                <span className="qd__compare-val" style={{ color: ringColor }}>{pct}%</span>
              </div>
            </div>
          </div>

          {/* Score ring */}
          <div className="qd__ring-wrap">
            <div className="qd__ring">
              <svg width="90" height="90" viewBox="0 0 90 90">
                <circle cx="45" cy="45" r="36" fill="none" stroke="#1e1e30" strokeWidth="8" />
                <circle cx="45" cy="45" r="36" fill="none" stroke={ringColor} strokeWidth="8"
                  strokeDasharray="226" strokeDashoffset={dashOffset}
                  strokeLinecap="round"
                  style={{ transform: 'rotate(-90deg)', transformOrigin: '45px 45px' }}
                />
              </svg>
              <div className="qd__ring-val">
                <span className="qd__ring-num" style={{ color: ringColor }}>{correct}/{submission.totalQuestions}</span>
                <span className="qd__ring-lbl">score</span>
              </div>
            </div>
            <span className="qd__verdict" style={{ color: ringColor, background: ringColor + '20', border: `1px solid ${ringColor}44` }}>
              {pct >= 60 ? 'Passed ✓' : 'Failed ✗'}
            </span>
          </div>
        </div>

        {/* Stat cards */}
        <div className="qd__stats">
          {[
            { icon: '✅', val: correct, lbl: 'Correct',      color: '#34d399' },
            { icon: '❌', val: wrong,   lbl: 'Wrong',        color: '#f87171' },
            { icon: '⏱',  val: formatTime(submission.timeTaken), lbl: 'Time Taken', color: '#a78bfa' },
            { icon: '⚠️', val: submission.warnings || 0, lbl: 'Violations', color: '#fbbf24' },
          ].map((s, i) => (
            <div key={i} className="qd__stat">
              <div className="qd__stat-icon" style={{ background: s.color + '22' }}>{s.icon}</div>
              <div className="qd__stat-val" style={{ color: s.color }}>{s.val}</div>
              <div className="qd__stat-lbl">{s.lbl}</div>
            </div>
          ))}
        </div>

        {/* Questions header */}
        <div className="qd__section-hdr">
          <div className="qd__section-title">
            Questions
            <span className="qd__badge qd__badge--correct">{correct} correct</span>
            <span className="qd__badge qd__badge--wrong">{wrong} wrong</span>
          </div>
          <button className="qd__toggle-btn" onClick={() => setShowPerf(v => !v)}>
            {showPerf ? 'Hide details ▴' : 'Show details ▾'}
          </button>
        </div>

        {/* Question cards */}
        <div className="qd__qlist">
          {questions.map((q, i) => {
            const isCorrect = q.studentAnswer === q.correctOption;
            return (
              <div key={i} className="qd__qcard">
                <div className="qd__qcard-top">
                  <div className="qd__qnum">{String(i + 1).padStart(2, '0')}</div>
                  <div className="qd__qcard-body">
                    <div className="qd__qcard-status">
                      <span className={`qd__status-pill ${isCorrect ? 'qd__status-pill--correct' : 'qd__status-pill--wrong'}`}>
                        {isCorrect ? 'Correct' : 'Wrong'}
                      </span>
                      {q.studentAnswer === -1 && <span className="qd__status-pill">Unanswered</span>}
                    </div>
                    <div className="qd__qtext">{q.text}</div>
                    <div className="qd__opts">
                      {q.options.map((o, oi) => {
                        let cls = 'qd__opt';
                        if (oi === q.correctOption) cls += ' qd__opt--correct';
                        else if (oi === q.studentAnswer && !isCorrect) cls += ' qd__opt--wrong';
                        return (
                          <div key={oi} className={cls}>
                            <div className="qd__opt-dot"
                              style={{ background: oi === q.correctOption ? '#34d399' : oi === q.studentAnswer && !isCorrect ? '#f87171' : '#333355' }} />
                            {o}
                            {oi === q.correctOption && <span className="qd__opt-mark">✓</span>}
                            {oi === q.studentAnswer && !isCorrect && <span className="qd__opt-mark qd__opt-mark--wrong">✗</span>}
                          </div>
                        );
                      })}
                    </div>

                    {/* Explanation */}
                    {showPerf && q.explanation && (
                      <div className="qd__perf">
                        <div className="qd__explanation">💡 {q.explanation}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </main>
    </div>
  );
}
