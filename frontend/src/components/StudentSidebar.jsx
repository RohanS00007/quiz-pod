import { useNavigate, useLocation } from 'react-router-dom';
import '../styles/StudentDashboardV2.css';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', emoji: '🏠', href: '/student' },
  { id: 'myquiz', label: 'My Quizzes', emoji: '📋', href: '/student' },
  { id: 'performance', label: 'Performance', emoji: '📊', href: '/student/performance' },
  { id: 'leaderboard', label: 'Leaderboard', emoji: '🏆', href: '#' },
  { id: 'weak', label: 'Weak Topics', emoji: '⚠️', href: '#' },
  { id: 'mistakebook', label: 'Mistake Book', emoji: '📖', href: '/mistakebook' },
  { id: 'settings', label: 'Settings', emoji: '⚙️', href: '#' },
];

export default function StudentSidebar({
  studentName = 'Student',
  lastName = '',
  rank = 0,
  activeId = '',
  isOpen = true,
  onToggle = () => { },
  onLogout = () => { },
  onNavClick = null
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNav = (item) => {
    if (onNavClick) {
      onNavClick(item.id);
    } else if (item.href && item.href !== '#') {
      navigate(item.href);
    }
  };

  const currentActive = activeId ||
    (location.pathname === '/student' ? 'dashboard' :
      location.pathname.includes('performance') ? 'performance' :
        location.pathname.includes('mistakebook') ? 'mistakebook' : '');

  return (
    <aside className={`sd2-sidebar ${isOpen ? '' : 'sd2-sidebar--collapsed'}`}>
      <div className="sd2-sidebar__header">
        <span className="sd2-sidebar__logo">Quizz</span>
        <button
          className="sd2-sidebar__toggle"
          onClick={onToggle}
        >
          ☰
        </button>
      </div>

      <div className="sd2-sidebar__section-label">NAVIGATIONS</div>

      <nav className="sd2-sidebar__nav">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            className={`sd2-sidebar__item ${currentActive === item.id ? 'sd2-sidebar__item--active' : ''}`}
            onClick={() => handleNav(item)}
          >
            <span className="sd2-sidebar__item-icon">{item.emoji}</span>
            <span className="sd2-sidebar__item-label">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* User profile at bottom */}
      <div className="sd2-sidebar__user">
        <div className="sd2-sidebar__avatar">
          {studentName[0]}{lastName[0]}
        </div>
        <div className="sd2-sidebar__user-info">
          <div className="sd2-sidebar__user-name">{studentName} {lastName}</div>
          <div className="sd2-sidebar__user-rank">Rank #{rank}</div>
        </div>
      </div>

      <button
        className="sd2-logout-btn"
        onClick={onLogout}
      >
        <span className="sd2-sidebar__item-icon">🚪</span>
        <span className="sd2-sidebar__item-label">Logout</span>
      </button>
    </aside>
  );
}
