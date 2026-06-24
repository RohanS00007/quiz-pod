import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from '../config.js';
import '../styles/StudentPerformanceMetrics.css';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';

// ── Custom Tooltip ────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="spm-tooltip">
      <div className="spm-tooltip__label">{label}</div>
      <div className="spm-tooltip__value">{payload[0].value}%</div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────
const StudentPerformanceMetrics = ({ studentName = 'Student', contained = false }) => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('token');
  const storedUser = (() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; }
  })();
  const displayName = storedUser.name?.split(' ')[0] || studentName;

  useEffect(() => {
    const load = async () => {
      try {
        const response = await axios.get(`${API_BASE}/api/quiz/my`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSubmissions(Array.isArray(response.data) ? response.data : []);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  if (loading) {
    return (
      <div className={`spm-page ${contained ? 'spm-page--contained' : ''}`}>
        <div className="spm-container">
          <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>Loading performance data...</p>
        </div>
      </div>
    );
  }

  // Compute stats from real data
  const quizHistory = submissions.map((s) => ({
    quiz: s.title?.split(' ')[0] || 'Quiz',
    date: new Date(s.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    score: s.score,
    total: s.totalQuestions,
    subject: (s.subject || s.tags?.[0] || 'QUIZ').toUpperCase(),
  }));

  const avg = quizHistory.length > 0
    ? Math.round(quizHistory.reduce((sum, q) => sum + q.score, 0) / quizHistory.length)
    : 0;

  const best = quizHistory.length > 0
    ? quizHistory.reduce((a, b) => a.score >= b.score ? a : b)
    : { quiz: 'N/A', date: '', score: 0 };

  const worst = quizHistory.length > 0
    ? quizHistory.reduce((a, b) => a.score <= b.score ? a : b)
    : { quiz: 'N/A', date: '', score: 0 };

  // Subject accuracy
  const subjectMap = {};
  quizHistory.forEach((q) => {
    if (!subjectMap[q.subject]) subjectMap[q.subject] = [];
    subjectMap[q.subject].push(q.score);
  });

  const SUBJECT_COLORS = ['#a78bfa', '#34d399', '#f87171', '#60a5fa', '#fbbf24', '#fb7185'];
  const subjectAccuracy = Object.entries(subjectMap).map(([subject, scores], i) => ({
    subject,
    accuracy: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    color: SUBJECT_COLORS[i % SUBJECT_COLORS.length],
  }));

  // Weak topics (subjects with accuracy < 70%)
  const weakTopics = subjectAccuracy
    .filter(s => s.accuracy < 70)
    .sort((a, b) => a.accuracy - b.accuracy)
    .map(s => ({
      topic: s.subject,
      subject: s.subject,
      mistakes: subjectMap[s.subject].filter(score => score < 70).length,
      color: s.color,
    }));

  return (
    <div className={`spm-page ${contained ? 'spm-page--contained' : ''}`}>
      <div className="spm-container">

        {/* Header */}
        <div className="spm-header">
          <h1 className="spm-header__title">📊 Performance Metrics</h1>
          <p className="spm-header__sub">
            {displayName}, here's a detailed breakdown of your quiz performance.
          </p>
        </div>

        {quizHistory.length === 0 ? (
          <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>
            No quizzes taken yet. Take some quizzes to see your performance!
          </p>
        ) : (
          <>
            {/* Top Stats */}
            <div className="spm-stats">
              {[
                { label: 'Quizzes Taken',  value: quizHistory.length, color: 'purple' },
                { label: 'Average Score',  value: `${avg}%`,           color: 'blue'   },
                { label: 'Best Score',     value: `${best.score}%`,    color: 'green'  },
                { label: 'Lowest Score',   value: `${worst.score}%`,   color: 'red'    },
              ].map((s, i) => (
                <div key={i} className="spm-stat">
                  <div className={`spm-stat__value spm-stat__value--${s.color}`}>{s.value}</div>
                  <div className="spm-stat__label">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Score Trend Chart */}
            <div className="spm-card">
              <h2 className="spm-card__title">📈 Score Trend</h2>
              <p className="spm-card__sub">Your score across all quizzes over time</p>
              <div className="spm-chart-wrap">
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={quizHistory} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
                    <XAxis dataKey="quiz" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} unit="%" />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine y={avg} stroke="#a78bfa" strokeDasharray="4 4" label={{ value: `Avg ${avg}%`, fill: '#a78bfa', fontSize: 11 }} />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#a78bfa"
                      strokeWidth={2.5}
                      dot={{ fill: '#a78bfa', r: 5, strokeWidth: 0 }}
                      activeDot={{ r: 7, fill: '#c4b5fd' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Best & Worst Quiz */}
            <div className="spm-bw-row">
              <div className="spm-bw-card spm-bw-card--best">
                <div className="spm-bw-card__icon">🏆</div>
                <div className="spm-bw-card__info">
                  <div className="spm-bw-card__tag">Best Quiz</div>
                  <div className="spm-bw-card__name">{best.quiz}</div>
                  <div className="spm-bw-card__date">{best.date}</div>
                </div>
                <div className="spm-bw-card__score spm-bw-card__score--best">{best.score}%</div>
              </div>
              <div className="spm-bw-card spm-bw-card--worst">
                <div className="spm-bw-card__icon">📉</div>
                <div className="spm-bw-card__info">
                  <div className="spm-bw-card__tag">Needs Work</div>
                  <div className="spm-bw-card__name">{worst.quiz}</div>
                  <div className="spm-bw-card__date">{worst.date}</div>
                </div>
                <div className="spm-bw-card__score spm-bw-card__score--worst">{worst.score}%</div>
              </div>
            </div>

            {/* Subject Accuracy */}
            {subjectAccuracy.length > 0 && (
              <div className="spm-card">
                <h2 className="spm-card__title">🎯 Accuracy by Subject</h2>
                <p className="spm-card__sub">How well you performed in each subject</p>
                <div className="spm-accuracy-list">
                  {subjectAccuracy.map((s, i) => (
                    <div key={i} className="spm-accuracy-row">
                      <div className="spm-accuracy-row__subject" style={{ color: s.color }}>{s.subject}</div>
                      <div className="spm-accuracy-row__bar-wrap">
                        <div
                          className="spm-accuracy-row__bar"
                          style={{ width: `${s.accuracy}%`, background: s.color }}
                        />
                      </div>
                      <div className="spm-accuracy-row__pct" style={{ color: s.color }}>{s.accuracy}%</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Weak Topics */}
            {weakTopics.length > 0 && (
              <div className="spm-card">
                <h2 className="spm-card__title">⚠️ Weak Topics</h2>
                <p className="spm-card__sub">Topics where you scored below 70%</p>
                <div className="spm-weak-list">
                  {weakTopics.map((t, i) => (
                    <div key={i} className="spm-weak-item">
                      <div className="spm-weak-item__left">
                        <span className="spm-weak-item__subject" style={{ color: t.color, borderColor: t.color + '55', background: t.color + '22' }}>
                          {t.subject}
                        </span>
                        <span className="spm-weak-item__topic">{t.topic}</span>
                      </div>
                      <div className="spm-weak-item__mistakes">
                        {'🔴'.repeat(t.mistakes)}
                        <span className="spm-weak-item__count"> {t.mistakes} weak quiz{t.mistakes > 1 ? 'zes' : ''}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
};

export default StudentPerformanceMetrics;