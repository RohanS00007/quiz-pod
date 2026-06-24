import { useState, useEffect } from 'react';
import '../styles/StudentDashboardV2.css';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE } from '../config.js';
import MyQuiz from './MyQuiz';
import StudentPerformanceMetrics from './StudentPerformanceMetrics';
import MistakeBook from './MistakeBook';
import StudentSidebar from './StudentSidebar';

// ── Sub-components ────────────────────────────────────────────────────────

const StatCard = ({ icon, value, label, delta, color }) => (
  <div className="sd2-stat-card">
    <div className="sd2-stat-card__icon" style={{ background: color + '22' }}>
      <span>{icon}</span>
    </div>
    <div className="sd2-stat-card__info">
      <div className="sd2-stat-card__value">{value}</div>
      <div className="sd2-stat-card__label">{label}</div>
      <div className="sd2-stat-card__delta">{delta}</div>
    </div>
  </div>
);

const QuizRow = ({ tag, tagColor, title, date, score, scoreColor }) => (
  <div className="sd2-quiz-row">
    <div className="sd2-quiz-row__left">
      <span className="sd2-quiz-row__tag" style={{ background: tagColor + '33', color: tagColor === '#065f46' ? '#34d399' : '#c4b5fd', borderColor: tagColor + '66' }}>
        {tag}
      </span>
      <div>
        <div className="sd2-quiz-row__title">{title}</div>
        <div className="sd2-quiz-row__date">{date}</div>
      </div>
    </div>
    <div className="sd2-quiz-row__score" style={{ color: scoreColor }}>{score}</div>
  </div>
);

const WeakTopicRow = ({ subject, sub, pct, color }) => (
  <div className="sd2-weak-row">
    <div className="sd2-weak-row__top">
      <div>
        <div className="sd2-weak-row__subject">{subject}</div>
        <div className="sd2-weak-row__sub">{sub}</div>
      </div>
      <div className="sd2-weak-row__pct" style={{ color }}>{pct}%</div>
    </div>
    <div className="sd2-weak-row__bar-bg">
      <div className="sd2-weak-row__bar-fill" style={{ width: pct + '%', background: color }} />
    </div>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────
const StudentDashboardV2 = ({
  studentName = 'Student',
  lastName = '',
  streak = 0,
  rank = 0,
  onLogout,
}) => {
  const navigate = useNavigate();
  const [activeNav, setActiveNav] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [submissions, setSubmissions] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  const token = localStorage.getItem('token');

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
        setLoadingData(false);
      }
    };
    load();
  }, [token]);

  // Compute dashboard stats from real data
  const quizCount = submissions.length;
  const avgScore = quizCount > 0
    ? Math.round(submissions.reduce((s, q) => s + q.score, 0) / quizCount)
    : 0;
  const accuracyRate = quizCount > 0
    ? Math.round(submissions.reduce((s, q) => s + (q.totalCorrect / q.totalQuestions) * 100, 0) / quizCount)
    : 0;

  const TAG_COLORS = ['#7c3aed', '#1d4ed8', '#065f46', '#92400e', '#9f1235'];
  const recentQuizzes = submissions.slice(0, 5).map((s, i) => ({
    tag: (s.subject || s.tags?.[0] || 'QUIZ').toUpperCase().slice(0, 6),
    tagColor: TAG_COLORS[i % TAG_COLORS.length],
    title: s.title,
    date: new Date(s.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    score: `${s.totalCorrect}/${s.totalQuestions}`,
    scoreColor: s.score >= 80 ? '#34d399' : s.score >= 60 ? '#fbbf24' : '#f87171',
    quizId: s.quizId,
  }));

  const computedStats = [
    { icon: '🎯', value: `${avgScore}%`, label: 'Average Score', delta: quizCount > 0 ? `${quizCount} quiz${quizCount > 1 ? 'zes' : ''} taken` : 'No quizzes yet', color: '#a78bfa' },
    { icon: '📄', value: String(quizCount), label: 'Quizzes Taken', delta: '', color: '#60a5fa' },
    { icon: '✅', value: `${accuracyRate}%`, label: 'Accuracy Rate', delta: '', color: '#34d399' },
  ];

  // Compute weak topics
  const subjectMap = {};
  submissions.forEach(s => {
    const subj = (s.subject || s.tags?.[0] || 'General').toUpperCase();
    if (!subjectMap[subj]) subjectMap[subj] = { scores: [], count: 0 };
    subjectMap[subj].scores.push(s.score);
    subjectMap[subj].count++;
  });
  const computedWeakTopics = Object.entries(subjectMap)
    .map(([subject, d]) => ({
      subject,
      sub: `${d.count} attempt${d.count > 1 ? 's' : ''}`,
      pct: Math.round(d.scores.reduce((a, b) => a + b, 0) / d.scores.length),
      color: d.scores.reduce((a, b) => a + b, 0) / d.scores.length < 60 ? '#f87171' : '#fbbf24',
    }))
    .filter(t => t.pct < 70)
    .sort((a, b) => a.pct - b.pct);

  return (
    <div className="sd2-layout">
      <StudentSidebar
        studentName={studentName}
        lastName={lastName}
        rank={rank}
        activeId={activeNav}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onLogout={onLogout}
        onNavClick={(id) => setActiveNav(id)}
      />

      <main className="sd2-main">

        {activeNav === 'dashboard' && (
          <>
            {/* Welcome Banner */}
            <div className="sd2-banner">
              <div className="sd2-banner__left">
                <h1 className="sd2-banner__title">Welcome back, {studentName}! 👋</h1>
                <p className="sd2-banner__sub">You have {quizCount} quizzes this week. Keep going!</p>
              </div>
              <div className="sd2-banner__badges">
                <div className="sd2-banner__badge">
                  <span className="sd2-banner__badge-icon">🔥</span>
                  <span className="sd2-banner__badge-val">{streak}</span>
                  <span className="sd2-banner__badge-lbl">Day Streak</span>
                </div>
                <div className="sd2-banner__badge">
                  <span className="sd2-banner__badge-val">#{rank}</span>
                  <span className="sd2-banner__badge-lbl">Your Rank</span>
                </div>
              </div>
            </div>

            {/* Stats Row */}
            <div className="sd2-stats-row">
              {computedStats.map((s, i) => <StatCard key={i} {...s} />)}
            </div>

            {/* Bottom Grid */}
            <div className="sd2-grid">

              {/* Recent Quizzes */}
              <div className="sd2-card sd2-card--quizzes">
                <div className="sd2-card__header">
                  <h2 className="sd2-card__title">Recent Quizzes</h2>
                  <button className="sd2-card__action" onClick={() => setActiveNav('myquiz')}>View All →</button>
                </div>
                <div className="sd2-quiz-list">
                  {recentQuizzes.length === 0 && !loadingData ? (
                    <p style={{ color: '#94a3b8', padding: '1rem', textAlign: 'center' }}>No quizzes yet. Join one to get started!</p>
                  ) : (
                    recentQuizzes.map((q, i) => (
                      <div key={i} onClick={() => navigate(`/student/quizdetail?quizId=${q.quizId}`)} style={{ cursor: 'pointer' }}>
                        <QuizRow {...q} />
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Right column */}
              <div className="sd2-right-col">

                {/* Weak Topics */}
                {computedWeakTopics.length > 0 && (
                  <div className="sd2-card">
                    <div className="sd2-card__header">
                      <h2 className="sd2-card__title">Weak Topics</h2>
                      <button className="sd2-card__action" onClick={() => setActiveNav('performance')}>Focus →</button>
                    </div>
                    <div className="sd2-weak-list">
                      {computedWeakTopics.map((t, i) => <WeakTopicRow key={i} {...t} />)}
                    </div>
                  </div>
                )}

              </div>
            </div>
          </>
        )}

        {activeNav === 'myquiz' && (
          <MyQuiz contained={true} />
        )}

        {activeNav === 'performance' && (
          <StudentPerformanceMetrics studentName={studentName} contained={true} />
        )}

        {activeNav === 'mistakebook' && (
          <MistakeBook studentName={studentName} contained={true} />
        )}

      </main>
    </div>
  );
};

export default StudentDashboardV2;
