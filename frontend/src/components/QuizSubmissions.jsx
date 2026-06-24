import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE } from '../config.js';
import '../styles/TeacherDashboard.css'; // Reuse some styles

export default function QuizSubmissions() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('submissions');
  const [favourites, setFavourites] = useState(new Set());

  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const [resSub, resFav] = await Promise.all([
          axios.get(`${API_BASE}/api/quiz/${id}/submissions`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API_BASE}/api/user/favourites`, { headers: { Authorization: `Bearer ${token}` } })
        ]);

        setData(resSub.data);
        
        // Mark existing favourites
        const favSet = new Set();
        resSub.data.quiz.questions?.forEach((q, idx) => {
          if (resFav.data.some(f => f.text === q.text)) {
            favSet.add(idx);
          }
        });
        setFavourites(favSet);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load submissions.');
      } finally {
        setLoading(false);
      }
    };
    fetchSubmissions();
  }, [id, token]);

  async function toggleFav(i) {
    const q = quiz.questions[i];
    if (favourites.has(i)) {
      alert('Question is already in your vault!');
      return;
    }

    try {
      await axios.post(`${API_BASE}/api/user/favourites`, {
        subject: quiz.subject || 'General',
        text: q.text,
        options: q.options.map(o => o.text),
        correct: q.options.findIndex(o => o.isCorrect)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setFavourites(prev => {
        const next = new Set(prev);
        next.add(i);
        return next;
      });
      alert('Saved to your vault!');
    } catch (err) {
      alert('Failed to save to vault.');
    }
  }

  if (loading) return <div className="teacher-dashboard__main" style={{ color: '#fff' }}>Loading analytics...</div>;
  if (error) return <div className="teacher-dashboard__main" style={{ color: '#f87171' }}>{error}</div>;

  const { quiz, submissions } = data;

  return (
    <div className="teacher-dashboard" style={{ display: 'block' }}>
      <div className="teacher-dashboard__main" style={{ marginLeft: 0, padding: '2rem' }}>
        <button onClick={() => navigate('/teacher')} className="qd__sidebar-toggle" style={{ marginBottom: '1rem', color: '#a78bfa' }}>
          ← Back to Dashboard
        </button>
        
        <div className="teacher-dashboard__banner" style={{ marginBottom: '2rem' }}>
          <div className="teacher-dashboard__banner-left">
            <h1 className="teacher-dashboard__banner-title">{quiz.title}</h1>
            <p className="teacher-dashboard__banner-sub">
              Quiz Analytics & Questions
            </p>
          </div>
          <div className="teacher-dashboard__banner-badges">
            <div className="teacher-dashboard__banner-badge">
              <span className="teacher-dashboard__banner-badge-val">{submissions.length}</span>
              <span className="teacher-dashboard__banner-badge-lbl">Students Took This</span>
            </div>
            <div className="teacher-dashboard__banner-badge">
              <span className="teacher-dashboard__banner-badge-val">
                {submissions.length > 0 
                  ? Math.round(submissions.reduce((s, sub) => s + sub.score, 0) / submissions.length)
                  : 0}%
              </span>
              <span className="teacher-dashboard__banner-badge-lbl">Average Score</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          <button 
            onClick={() => setTab('submissions')}
            style={{ 
              padding: '10px 24px', borderRadius: '10px', 
              background: tab === 'submissions' ? '#a78bfa' : '#1a1a2e',
              color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold'
            }}
          >
            Submissions
          </button>
          <button 
            onClick={() => setTab('questions')}
            style={{ 
              padding: '10px 24px', borderRadius: '10px', 
              background: tab === 'questions' ? '#a78bfa' : '#1a1a2e',
              color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold'
            }}
          >
            Questions List
          </button>
        </div>

        {tab === 'submissions' ? (
          <div className="teacher-dashboard__card">
            <div className="teacher-dashboard__card-header">
              <h2 className="teacher-dashboard__card-title">Student Submissions</h2>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid #2a2a4a' }}>
                    <th style={{ padding: '1rem', color: '#94a3b8' }}>Student</th>
                    <th style={{ padding: '1rem', color: '#94a3b8' }}>Roll No</th>
                    <th style={{ padding: '1rem', color: '#94a3b8' }}>Score</th>
                    <th style={{ padding: '1rem', color: '#94a3b8' }}>Violations</th>
                    <th style={{ padding: '1rem', color: '#94a3b8' }}>Time Taken</th>
                    <th style={{ padding: '1rem', color: '#94a3b8' }}>Submitted At</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((s, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #1e1e30' }}>
                      <td style={{ padding: '1rem', color: '#fff' }}>{s.student?.name || 'Unknown'}</td>
                      <td style={{ padding: '1rem', color: '#94a3b8' }}>{s.student?.rollNo || '-'}</td>
                      <td style={{ padding: '1rem', color: s.score >= 60 ? '#34d399' : '#f87171', fontWeight: 'bold' }}>
                        {s.score}% ({s.totalCorrect}/{s.totalQuestions})
                      </td>
                      <td style={{ padding: '1rem', color: s.warnings > 0 ? '#fbbf24' : '#60a5fa' }}>
                         {s.warnings} {s.warnings > 1 ? 'warnings' : 'warning'}
                      </td>
                      <td style={{ padding: '1rem', color: '#94a3b8' }}>{Math.floor(s.timeTaken / 60)}m {s.timeTaken % 60}s</td>
                      <td style={{ padding: '1rem', color: '#94a3b8' }}>{new Date(s.submittedAt).toLocaleString()}</td>
                    </tr>
                  ))}
                  {submissions.length === 0 && (
                    <tr>
                      <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                        No submissions yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="teacher-dashboard__quiz-list" style={{ gap: '16px' }}>
            {quiz.questions && quiz.questions.map((q, i) => (
              <div key={i} className="teacher-dashboard__card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <span style={{ 
                      background: '#1a1a2e', color: '#a78bfa', padding: '4px 10px', 
                      borderRadius: '8px', fontWeight: 'bold', fontSize: '0.9rem' 
                    }}>
                      Q{i + 1}
                    </span>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#fff', lineHeight: '1.4' }}>{q.text}</h3>
                  </div>
                  <button 
                    onClick={() => toggleFav(i)}
                    style={{ 
                      background: 'none', border: 'none', cursor: 'pointer', 
                      fontSize: '1.4rem', color: favourites.has(i) ? '#fbbf24' : '#334155',
                      padding: '4px', transition: 'transform 0.2s'
                    }}
                    title={favourites.has(i) ? "Starred" : "Star to vault"}
                  >
                    {favourites.has(i) ? '★' : '☆'}
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                  {q.options.map((opt, oi) => (
                    <div key={oi} style={{ 
                      padding: '12px 16px', borderRadius: '10px',
                      background: opt.isCorrect ? 'rgba(52, 211, 153, 0.1)' : '#0f0f1a',
                      border: `1px solid ${opt.isCorrect ? '#34d39966' : '#2a2a3e'}`,
                      color: opt.isCorrect ? '#34d399' : '#94a3b8',
                      fontSize: '0.95rem'
                    }}>
                      <span style={{ fontWeight: 'bold', marginRight: '8px' }}>{String.fromCharCode(65 + oi)}.</span>
                      {opt.text}
                      {opt.isCorrect && <span style={{ marginLeft: '8px' }}>✓</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
