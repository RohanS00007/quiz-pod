import { useNavigate } from 'react-router-dom';
import FeatureCard from './FeatureCard';
import '../styles/LandingPage.css';
import '../styles/QuizzLanding.css';

const FEATURES = [
  {
    id: 1,
    icon: '🎯',
    title: 'Practice Mode',
    description: 'Attempt subject-wise quizzes and improve your understanding.',
  },
  {
    id: 2,
    icon: '🏅',
    title: 'Live Competitions',
    description: 'Compete with others and test your knowledge in real time.',
  },
  {
    id: 3,
    icon: '📊',
    title: 'Track Progress',
    description: 'Monitor scores, strengths, and improvement over time.',
  },
];

const QuizzLanding = ({ onJoinQuiz }) => {
  const navigate = useNavigate();

  const token = localStorage.getItem('token');
  const role = localStorage.getItem('user_role');
  const isAuthenticated = !!token;

  const handleAuth = () => {
    navigate('/auth');
  };

  const goToDashboard = () => {
    if (role === 'teacher') {
      navigate('/teacher');
    } else {
      navigate('/student');
    }
  };

  return (
    <div className="qz-landing">

      {/* ===== Navbar ===== */}
      <nav className="qz-nav">
        <div className="qz-nav__logo">QuizPod</div>
        {isAuthenticated ? (
          <button className="qz-nav__login" onClick={goToDashboard}>Dashboard</button>
        ) : (
          <button className="qz-nav__login" onClick={handleAuth}>Log In</button>
        )}
      </nav>

      {/* ===== Hero ===== */}
      <main className="qz-hero">
        <div className="qz-hero__text">
          <h1 className="qz-hero__title">
            Welcome to QuizPod
            <span className="qz-hero__title-highlight"> Participate, Learn, Groww</span>
          </h1>

          <h2 className="qz-hero__sub">
            Master subjects through Competitive quiz
          </h2>

          <p className="qz-hero__body">
            Practice topic-wise quizzes, challenge friends, climb leaderboards, and track your progress – all in one place.
          </p>

          <div className="qz-hero__actions">
            {isAuthenticated ? (
              <button className="qz-btn" onClick={goToDashboard}>Go to Dashboard</button>
            ) : (
              <>
                <button className="qz-btn" onClick={handleAuth}>Sign Up</button>
              </>
            )}
          </div>
        </div>

        {/* ===== Feature Cards ===== */}
        <div className="qz-features">
          {FEATURES.map((f) => (
            <FeatureCard
              key={f.id}
              icon={f.icon}
              title={f.title}
              description={f.description}
            />
          ))}
        </div>
      </main>

      {/* ===== Footer ===== */}
      <footer className="qz-footer">
        <span className="qz-footer__copy">All Rights Reserved</span>
        <div className="qz-footer__icons" aria-label="Social links">
          <span className="qz-footer__icon" />
          <span className="qz-footer__icon" />
          <span className="qz-footer__icon" />
          <span className="qz-footer__icon" />
        </div>
      </footer>

    </div>
  );
};

export default QuizzLanding;
