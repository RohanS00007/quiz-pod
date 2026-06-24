import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from '../config.js';
import '../styles/TeacherFavouriteQuestions.css';

const TAG_COLORS = {
  Science:   { bg: '#06443320', color: '#34d399', border: '#34d39944' },
  Math:      { bg: '#1d4ed820', color: '#93c5fd', border: '#93c5fd44' },
  English:   { bg: '#7c3aed20', color: '#c4b5fd', border: '#c4b5fd44' },
  Geography: { bg: '#92400e20', color: '#fcd34d', border: '#fcd34d44' },
  History:   { bg: '#9f123520', color: '#fb7185', border: '#fb718544' },
};

const NAV_ITEMS = [
  { id: 'home',       label: 'Home',       emoji: '🏠', href: '/teacher' },
  { id: 'favourites', label: 'Favourites', emoji: '⭐', href: '/teacher/favourites' },
  { id: 'create',     label: 'Create Quiz',emoji: '✏️', href: '/teacher/create-quiz' },
  { id: 'community',  label: 'Community',  emoji: '👥', href: '#' },
  { id: 'analytics',  label: 'Analytics',  emoji: '📊', href: '#' },
];

const SUBJECTS = ['All', 'Science', 'Math', 'English', 'Geography', 'History'];

export default function TeacherFavouriteQuestions({ 
  teacherName = 'Teacher', 
  lastName = '',
  contained = false 
}) {
  const [questions, setQuestions]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState('All');
  const [modalOpen, setModalOpen]   = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [form, setForm] = useState({
    subject: 'Science',
    text: '',
    opts: ['', '', '', ''],
    correct: -1,
  });

  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchFavourites = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/user/favourites`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setQuestions(res.data);
      } catch (err) {
        console.error('Failed to fetch favourites', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFavourites();
  }, [token]);

  const filtered = filter === 'All' ? questions : questions.filter(q => q.subject === filter);

  async function deleteQ(id) {
    if (!window.confirm('Remove from favourites?')) return;
    try {
      await axios.delete(`${API_BASE}/api/user/favourites/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setQuestions(prev => prev.filter(q => q._id !== id));
    } catch (err) {
      alert('Failed to delete question.');
    }
  }

  function useQ(id) {
    alert('Feature coming soon: Importing questions to the quiz builder!');
  }

  async function saveQ() {
    const { subject, text, opts, correct } = form;
    if (!text.trim() || opts.some(o => !o.trim()) || correct === -1) {
      alert('Please fill all fields and select the correct answer.');
      return;
    }

    try {
      const res = await axios.post(`${API_BASE}/api/user/favourites`, {
        subject, text, options: opts, correct
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setQuestions(prev => [...prev, res.data]);
      setModalOpen(false);
      setForm({ subject: 'Science', text: '', opts: ['', '', '', ''], correct: -1 });
    } catch (err) {
      alert('Failed to save question.');
    }
  }

  function updateOpt(i, val) {
    setForm(f => { const o = [...f.opts]; o[i] = val; return { ...f, opts: o }; });
  }

  const renderMain = () => (
    <>
      <main className="tfq__main" style={contained ? { padding: 0 } : {}}>
        <div className="tfq__topbar">
          <div>
            <div className="tfq__page-title">
               Favourite Questions
              <span className="tfq__count-badge">{questions.length} saved</span>
            </div>
            <div className="tfq__page-sub">Your reusable favourite questions — add to any quiz instantly</div>
          </div>
          <button className="tfq__add-btn" onClick={() => setModalOpen(true)}>+ Add Question</button>
        </div>

        {/* Filters */}
        <div className="tfq__filters">
          {SUBJECTS.map(s => (
            <button
              key={s}
              className={`tfq__chip ${filter === s ? 'tfq__chip--active' : ''}`}
              onClick={() => setFilter(s)}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Question List */}
        <div className="tfq__list">
          {filtered.length === 0 ? (
            <div className="tfq__empty">No questions in this category yet.<br />Click "+ Add Question" to get started.</div>
          ) : filtered.map((q, i) => {
            const tc = TAG_COLORS[q.subject] || TAG_COLORS.Science;
            return (
              <div key={q._id} className="tfq__qcard">
                <div className="tfq__qidx">{String(i + 1).padStart(2, '0')}</div>
                <div className="tfq__qbody">
                  <span className="tfq__qtag" style={{ background: tc.bg, color: tc.color, border: `1px solid ${tc.border}` }}>
                    {q.subject}
                  </span>
                  <div className="tfq__qtext">{q.text}</div>
                  <div className="tfq__qopts">
                    {q.options && q.options.map((o, oi) => (
                      <span key={oi} className={`tfq__qopt ${oi === q.correct ? 'tfq__qopt--correct' : ''}`}>{o}</span>
                    ))}
                  </div>
                </div>
                <div className="tfq__qactions">
                  <button className="tfq__icon-btn tfq__icon-btn--del" onClick={() => deleteQ(q._id)} title="Remove">🗑</button>
                  <button className="tfq__use-btn" onClick={() => useQ(q._id)}>+ Use in Quiz</button>
                  <div className="tfq__uses">vault stored</div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Add Question Modal */}
      {modalOpen && (
        <div className="tfq__modal-bg" onClick={() => setModalOpen(false)}>
          <div className="tfq__modal" onClick={e => e.stopPropagation()}>
            <h3 className="tfq__modal-title">Add Favourite Question</h3>

            <div className="tfq__field">
              <label className="tfq__label">SUBJECT</label>
              <select className="tfq__input" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}>
                {['Science', 'Math', 'English', 'Geography', 'History'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>

            <div className="tfq__field">
              <label className="tfq__label">QUESTION</label>
              <textarea className="tfq__input tfq__textarea" placeholder="Type your question..." value={form.text} onChange={e => setForm(f => ({ ...f, text: e.target.value }))} />
            </div>

            <div className="tfq__field">
              <label className="tfq__label">OPTIONS — check the correct answer</label>
              {form.opts.map((o, i) => (
                <div key={i} className="tfq__opt-row">
                  <input
                    type="radio"
                    name="correct"
                    checked={form.correct === i}
                    onChange={() => setForm(f => ({ ...f, correct: i }))}
                  />
                  <input
                    className="tfq__input tfq__opt-input"
                    placeholder={`Option ${String.fromCharCode(65 + i)}`}
                    value={o}
                    onChange={e => updateOpt(i, e.target.value)}
                  />
                </div>
              ))}
            </div>

            <div className="tfq__modal-actions">
              <button className="tfq__btn-cancel" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="tfq__btn-save" onClick={saveQ}>Save to Vault</button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  if (contained) return renderMain();

  return (
    <div className="tfq">
      {/* Sidebar */}
      <aside className={`tfq__sidebar ${sidebarOpen ? '' : 'tfq__sidebar--collapsed'}`}>
        <div className="tfq__sidebar-header">
          <span className="tfq__sidebar-logo">Quizz</span>
          <button className="tfq__sidebar-toggle" onClick={() => setSidebarOpen(v => !v)}>☰</button>
        </div>
        <div className="tfq__sidebar-section-label">MENU</div>
        <nav className="tfq__sidebar-nav">
          {NAV_ITEMS.map(item => (
            <a
              key={item.id}
              href={item.href}
              className={`tfq__sidebar-item ${item.id === 'favourites' ? 'tfq__sidebar-item--active' : ''}`}
            >
              <span className="tfq__sidebar-item-icon">{item.emoji}</span>
              <span className="tfq__sidebar-item-label">{item.label}</span>
            </a>
          ))}
        </nav>
        <div className="tfq__sidebar-user">
          <div className="tfq__sidebar-avatar">{teacherName[0]}{lastName[0]}</div>
          <div className="tfq__sidebar-user-info">
            <div className="tfq__sidebar-user-name">{teacherName} {lastName}</div>
            <div className="tfq__sidebar-user-role">Teacher</div>
          </div>
        </div>
        <a href="/" className="tfq__logout-btn">
          <span className="tfq__sidebar-item-icon">🚪</span>
          <span className="tfq__sidebar-item-label">Logout</span>
        </a>
      </aside>

      {renderMain()}
    </div>
  );
}
