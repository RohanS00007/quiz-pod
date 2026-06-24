import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { API_BASE } from '../config.js';
import '../styles/TeacherDashboard.css';
import CreateQuiz from './CreateQuiz';
import TeacherFavouriteQuestions from './TeacherFavouriteQuestions';

const NAV_ITEMS = [
  { id: 'home', label: 'Home', emoji: '🏠' },
  { id: 'favourites', label: 'Favourites', emoji: '⭐' },
  { id: 'create', label: 'Create Quiz', emoji: '✏️' },
  { id: 'community', label: 'Community', emoji: '👥' },
  { id: 'analytics', label: 'Analytics', emoji: '📊' },
];

const StatCard = ({ icon, value, label, delta, color }) => (
  <div className="teacher-dashboard__stat-card">
    <div className="teacher-dashboard__stat-card-icon" style={{ background: color + '22' }}>
      <span>{icon}</span>
    </div>
    <div className="teacher-dashboard__stat-card-info">
      <div className="teacher-dashboard__stat-card-value">{value}</div>
      <div className="teacher-dashboard__stat-card-label">{label}</div>
      <div className="teacher-dashboard__stat-card-delta">{delta}</div>
    </div>
  </div>
);

const QuizRow = ({ tag, tagBg, tagColor, title, subject, submissions, date, status, statusColor, onClick, onRoster }) => (
  <div className="teacher-dashboard__quiz-row">
    <div className="teacher-dashboard__quiz-row-left" onClick={onClick} style={{ cursor: 'pointer', flex: 1 }}>
      <span className="teacher-dashboard__quiz-tag" style={{ background: tagBg, color: tagColor, borderColor: tagColor + '55' }}>
        {tag}
      </span>
      <div>
        <div className="teacher-dashboard__quiz-title">{title}</div>
        <div className="teacher-dashboard__quiz-meta">{subject} • {submissions} submissions</div>
      </div>
    </div>
    <div className="teacher-dashboard__quiz-row-right" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
        <div className="teacher-dashboard__quiz-meta" style={{ fontWeight: '500' }}>{date}</div>
        <div className="teacher-dashboard__quiz-status" style={{ color: statusColor, borderColor: statusColor + '44', background: statusColor + '11' }}>
          {status}
        </div>
      </div>
      <button 
        className="teacher-dashboard__roster-btn" 
        onClick={(e) => { e.stopPropagation(); onRoster(); }} 
        title="Upload PDF Roster"
        style={{ 
          background: '#1e1e30', 
          border: '1px solid #2e2e40', 
          borderRadius: '8px',
          cursor: 'pointer', 
          fontSize: '1.1rem', 
          padding: '8px', 
          color: '#a0a0c0',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        onMouseOver={(e) => { e.currentTarget.style.background = '#2a2a40'; e.currentTarget.style.color = '#fff'; }}
        onMouseOut={(e) => { e.currentTarget.style.background = '#1e1e30'; e.currentTarget.style.color = '#a0a0c0'; }}
      >
        📋
      </button>
    </div>
  </div>
);

const TeacherDashboard = ({
  teacherName = 'Teacher',
  lastName = '',
  onLogout
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeNav, setActiveNav] = useState(
    location.state?.activeNav || (location.state?.openCreate ? 'create' : 'home')
  );
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState(null);

  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const response = await axios.get(`${API_BASE}/api/quiz/my-quizzes`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setQuizzes(response.data);
      } catch (err) {
        console.error('Failed to fetch quizzes:', err.response?.status, err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchQuizzes();
  }, [token]);

  const handleRosterClick = (id) => {
    setUploadingId(id);
    document.getElementById('roster-input').click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !uploadingId) return;

    const formData = new FormData();
    formData.append('roster', file);

    try {
      const res = await axios.post(`${API_BASE}/api/quiz/${uploadingId}/roster`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });
      alert(res.data.message);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to upload roster.');
    } finally {
      setUploadingId(null);
      e.target.value = ''; // clear input
    }
  };

  // Compute stats
  const totalSubmissions = quizzes.reduce((s, q) => s + (q.submissions || 0), 0);
  const computedStats = [
    { icon: '📝', value: String(quizzes.length), label: 'Quizzes Created', delta: '', color: '#a78bfa' },
    { icon: '📅', value: String(quizzes.filter(q => q.submissions === 0).length), label: 'Awaiting Submissions', delta: '', color: '#fbbf24' },
    { icon: '👥', value: String(totalSubmissions), label: 'Total Submissions', delta: '', color: '#34d399' },
  ];

  const TAG_BG_MAP = { 'SCI': '#06443388', 'MATH': '#1d4ed833', 'GEO': '#92400e33', 'ENG': '#7c3aed33' };
  const TAG_COLOR_MAP = { 'SCI': '#34d399', 'MATH': '#93c5fd', 'GEO': '#fcd34d', 'ENG': '#c4b5fd' };

  const recentQuizzes = quizzes.slice(0, 5).map((q) => {
    const tag = (q.subject || q.tags?.[0] || 'QUIZ').toUpperCase().slice(0, 4);
    return {
      tag,
      tagBg: TAG_BG_MAP[tag] || '#7c3aed33',
      tagColor: TAG_COLOR_MAP[tag] || '#c4b5fd',
      title: q.title,
      subject: q.subject || q.tags?.[0] || 'General',
      submissions: q.submissions || 0,
      date: new Date(q.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      status: q.submissions > 0 ? 'Active' : 'New',
      statusColor: q.submissions > 0 ? '#34d399' : '#fbbf24',
      quizId: q._id,
    };
  });

  return (
    <div className="teacher-dashboard">
      <input
        type="file"
        id="roster-input"
        style={{ display: 'none' }}
        accept=".pdf"
        onChange={handleFileChange}
      />

      {/* ── Sidebar ── */}
      <aside className={`teacher-dashboard__sidebar ${sidebarOpen ? '' : 'teacher-dashboard__sidebar--collapsed'}`}>
        <div className="teacher-dashboard__sidebar-header">
          <span className="teacher-dashboard__sidebar-logo">Quizz</span>
          <button
            className="teacher-dashboard__sidebar-toggle"
            onClick={() => setSidebarOpen(v => !v)}
          >
            ☰
          </button>
        </div>

        <div className="teacher-dashboard__sidebar-section-label">MENU</div>

        <nav className="teacher-dashboard__sidebar-nav">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              className={`teacher-dashboard__sidebar-item ${activeNav === item.id ? 'teacher-dashboard__sidebar-item--active' : ''}`}
              onClick={() => {
                setActiveNav(item.id);
              }}
            >
              <span className="teacher-dashboard__sidebar-item-icon">{item.emoji}</span>
              <span className="teacher-dashboard__sidebar-item-label">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* User profile at bottom */}
        <div className="teacher-dashboard__sidebar-user">
          <div className="teacher-dashboard__sidebar-avatar">
            {teacherName[0]}{lastName[0]}
          </div>
          <div className="teacher-dashboard__sidebar-user-info">
            <div className="teacher-dashboard__sidebar-user-name">{teacherName} {lastName}</div>
            <div className="teacher-dashboard__sidebar-user-role">Teacher</div>
          </div>
        </div>

        <button
          className="teacher-dashboard__logout-btn"
          onClick={onLogout}
        >
          <span className="teacher-dashboard__sidebar-item-icon">🚪</span>
          <span className="teacher-dashboard__sidebar-item-label">Logout</span>
        </button>
      </aside>

      {/* ── Main Content ── */}
      <main className="teacher-dashboard__main">
        {activeNav === 'home' && (
          <>
            {/* Welcome Banner */}
            <div className="teacher-dashboard__banner">
              <div className="teacher-dashboard__banner-left">
                <h1 className="teacher-dashboard__banner-title">Welcome back, {teacherName}! 👋</h1>
                <p className="teacher-dashboard__banner-sub">Manage your quizzes and track student performance.</p>
              </div>
            </div>

            {/* Stats Row */}
            <div className="teacher-dashboard__stats-row">
              {computedStats.map((s, i) => <StatCard key={i} {...s} />)}
            </div>

            {/* Recent Quizzes Card */}
            <div className="teacher-dashboard__card">
              <div className="teacher-dashboard__card-header">
                <h2 className="teacher-dashboard__card-title">Recent Quizzes</h2>
                <button className="teacher-dashboard__card-action">View All →</button>
              </div>
              <div className="teacher-dashboard__quiz-list">
                {loading ? (
                  <p style={{ color: '#94a3b8', padding: '1rem' }}>Loading quizzes...</p>
                ) : recentQuizzes.length === 0 ? (
                  <p style={{ color: '#94a3b8', padding: '1rem' }}>No quizzes created yet.</p>
                ) : (
                  recentQuizzes.map((q, i) => (
                    <QuizRow
                      key={i}
                      {...q}
                      onClick={() => navigate(`/teacher/quiz/${q.quizId}/submissions`)}
                      onRoster={() => handleRosterClick(q.quizId)}
                    />
                  ))
                )}
              </div>
            </div>
          </>
        )}

        {activeNav === 'create' && (
          <CreateQuiz contained={true} />
        )}

        {activeNav === 'favourites' && (
          <TeacherFavouriteQuestions contained={true} teacherName={teacherName} lastName={lastName} />
        )}
      </main>
    </div>
  );
};

export default TeacherDashboard;
