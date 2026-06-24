import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE } from '../config.js';
import '../styles/QuizArena.css';

const MAX_WARNINGS = 3;

function getStatusColor(status) {
  if (status === 'answered') return 'answered';
  if (status === 'review')   return 'review';
  return 'not-visited';
}

// ── Mini Calculator ────────────────────────────────────────────────────────
const Calculator = () => {
  const [display, setDisplay] = useState('');
  const press = (val) => {
    if (val === 'C')  { setDisplay(''); return; }
    if (val === '=')  {
      try { 
        // Use a safe Function constructor instead of direct eval
        // This avoids strict mode violations and eval warnings in modern bundlers
        const result = new Function(`return ( ${display} )`)();
        setDisplay(String(result));
      } 
      catch { setDisplay('Err'); }
      return;
    }
    if (val === '←')  { setDisplay(d => d.slice(0, -1)); return; }
    setDisplay(d => d + val);
  };
  const KEYS = [['7','8','9','×'],['4','5','6','−'],['1','2','3','+'],['0','.','←','=']];
  const normalize = (v) => v === '×' ? '*' : v === '−' ? '-' : v;
  return (
    <div className="calc">
      <div className="calc__display">{display || '0'}</div>
      <div className="calc__grid">
        <button className="calc__key calc__key--clear" onClick={() => press('C')}>C</button>
        {KEYS.flat().map((k, i) => (
          <button key={i} className={`calc__key ${k === '=' ? 'calc__key--eq' : ''}`} onClick={() => press(normalize(k))}>{k}</button>
        ))}
      </div>
    </div>
  );
};

// ── Warning Modal ──────────────────────────────────────────────────────────
const WarningModal = ({ count, reason, onDismiss, autoSubmit }) => (
  <div className="sec-overlay">
    <div className="sec-modal">
      <div className="sec-modal__icon">⚠️</div>
      <h2 className="sec-modal__title">
        {autoSubmit ? 'Test Submitted' : `Warning ${count} of ${MAX_WARNINGS}`}
      </h2>
      <p className="sec-modal__reason">{reason}</p>
      {autoSubmit ? (
        <p className="sec-modal__final">Your test has been auto-submitted due to repeated violations.</p>
      ) : (
        <>
          <p className="sec-modal__note">
            {MAX_WARNINGS - count} warning(s) remaining before auto-submit.
          </p>
          <button className="sec-modal__btn" onClick={onDismiss}>I Understand</button>
        </>
      )}
    </div>
  </div>
);

// ── Fullscreen Prompt ──────────────────────────────────────────────────────
const FullscreenPrompt = ({ onEnter }) => (
  <div className="sec-overlay">
    <div className="sec-modal">
      <div className="sec-modal__icon">🖥️</div>
      <h2 className="sec-modal__title">Fullscreen Required</h2>
      <p className="sec-modal__reason">
        This test must be taken in fullscreen mode. Please click below to enter fullscreen and begin.
      </p>
      <button className="sec-modal__btn" onClick={onEnter}>Enter Fullscreen & Start Test</button>
    </div>
  </div>
);

// ── Main Component ─────────────────────────────────────────────────────────
const QuizArena = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const quizId = searchParams.get('quizId');

  // Quiz data from API
  const [quizData, setQuizData] = useState(null);
  const [quizLoading, setQuizLoading] = useState(true);
  const [quizError, setQuizError] = useState('');

  const [current, setCurrent]     = useState(0);
  const [answers, setAnswers]     = useState({});
  const [statuses, setStatuses]   = useState({});
  const [timeLeft, setTimeLeft]   = useState(0);
  const [showCalc, setShowCalc]   = useState(false);

  // Security state
  const [isFullscreen, setIsFullscreen]       = useState(false);
  const [showFsPrompt, setShowFsPrompt]       = useState(true);
  const [warningCount, setWarningCount]       = useState(0);
  const [warningModal, setWarningModal]       = useState(null);
  const [submitted, setSubmitted]             = useState(false);
  const [blackout, setBlackout]               = useState(false);
  const warningCountRef = useRef(0);
  const startTimeRef = useRef(null);

  const token = localStorage.getItem('token');
  const authHeader = { Authorization: `Bearer ${token}` };

  // ── Load quiz from API ──────────────────────────────────────────────────
  useEffect(() => {
    if (!quizId) {
      setQuizError('No quiz ID provided. Please join a quiz from My Quizzes.');
      setQuizLoading(false);
      return;
    }

    const loadQuiz = async () => {
      try {
        const response = await axios.get(`${API_BASE}/api/quiz/${quizId}/take`, {
          headers: authHeader,
        });
        const data = response.data;
        setQuizData(data);
        setTimeLeft(data.timeLimit || 600);
        setStatuses(Object.fromEntries(data.questions.map((_, i) => [i, 'not-visited'])));
      } catch (err) {
        setQuizError(err?.response?.data?.message || 'Failed to load quiz.');
      } finally {
        setQuizLoading(false);
      }
    };

    loadQuiz();
  }, [quizId]); // eslint-disable-line react-hooks/exhaustive-deps

  const questions = quizData?.questions || [];

  // ── Submit to API ───────────────────────────────────────────────────────
  const doSubmit = useCallback(async () => {
    if (submitted || !quizId) return;
    setSubmitted(true);

    const elapsed = startTimeRef.current
      ? Math.round((Date.now() - startTimeRef.current) / 1000)
      : 0;

    const answerList = Object.entries(answers).map(([qIdx, optIdx]) => ({
      questionIndex: Number(qIdx),
      selectedOption: optIdx,
    }));

    try {
      await axios.post(
        `${API_BASE}/api/quiz/${quizId}/submit`,
        { answers: answerList, warnings: warningCountRef.current, timeTaken: elapsed },
        { headers: authHeader }
      );
      // Navigate to results page
      navigate(`/student/quizdetail?quizId=${quizId}`);
    } catch (err) {
      // If already submitted, just go to results
      if (err?.response?.status === 400) {
        navigate(`/student/quizdetail?quizId=${quizId}`);
      } else {
        alert(err?.response?.data?.message || 'Failed to submit quiz.');
        setSubmitted(false);
      }
    }
  }, [submitted, quizId, answers, navigate, authHeader]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto submit ──────────────────────────────────────────────────────────
  const handleAutoSubmit = useCallback(() => {
    setSubmitted(true);
    setWarningModal({ reason: 'Maximum violations reached.', autoSubmit: true });
    setTimeout(() => doSubmit(), 2000);
  }, [doSubmit]);

  // ── Trigger a warning ────────────────────────────────────────────────────
  const triggerWarning = useCallback((reason) => {
    if (submitted) return;
    warningCountRef.current += 1;
    const newCount = warningCountRef.current;
    setWarningCount(newCount);
    if (newCount >= MAX_WARNINGS) {
      handleAutoSubmit();
    } else {
      setWarningModal({ reason, autoSubmit: false, count: newCount });
    }
  }, [submitted, handleAutoSubmit]);

  // ── 1. FULLSCREEN ────────────────────────────────────────────────────────
  const enterFullscreen = () => {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    else if (el.mozRequestFullScreen) el.mozRequestFullScreen();
    setIsFullscreen(true);
    setShowFsPrompt(false);
    startTimeRef.current = Date.now();
  };

  useEffect(() => {
    const handleFsChange = () => {
      const inFs = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement
      );
      setIsFullscreen(inFs);
      if (!inFs && !showFsPrompt && !submitted) {
        triggerWarning('You exited fullscreen mode. Please return to fullscreen.');
        setTimeout(() => {
          const el = document.documentElement;
          if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
        }, 500);
      }
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    document.addEventListener('mozfullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
      document.removeEventListener('mozfullscreenchange', handleFsChange);
    };
  }, [showFsPrompt, submitted, triggerWarning]);

  // ── 2. TAB SWITCHING + BLACKOUT ON FOCUS LOSS ────────────────────────────
  useEffect(() => {
    if (showFsPrompt || submitted) return;
    const handleVisibility = () => {
      if (document.hidden) {
        setBlackout(true);
        triggerWarning('You switched tabs or minimized the window. This has been recorded.');
      } else {
        setBlackout(false);
      }
    };
    const handleBlur = () => {
      setBlackout(true);
      setTimeout(() => {
        if (!submitted && !document.hidden) {
          triggerWarning('You switched away from the test window. This has been recorded.');
        }
      }, 300);
    };
    const handleFocus = () => {
      setBlackout(false);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, [showFsPrompt, submitted, triggerWarning]);

  // ── 3. DISABLE COPY / PASTE / RIGHT CLICK / SELECTION ───────────────────
  useEffect(() => {
    if (showFsPrompt) return;
    const block = (e) => e.preventDefault();
    const blockKey = (e) => {
      const ctrl = e.ctrlKey;
      const meta = e.metaKey;
      const shift = e.shiftKey;
      const key = e.key.toLowerCase();

      if (e.key === 'PrintScreen') { e.preventDefault(); e.stopPropagation(); return; }
      if (e.key === 'ScreenShotKey') { e.preventDefault(); e.stopPropagation(); return; }
      if (shift && key === 's' && !ctrl && !meta) { e.preventDefault(); e.stopPropagation(); return; }
      if (meta && shift && ['3','4','5','6'].includes(key)) { e.preventDefault(); e.stopPropagation(); return; }
      if (meta && ctrl && shift && ['3','4'].includes(key)) { e.preventDefault(); e.stopPropagation(); return; }
      if (e.key === 'F12') { e.preventDefault(); e.stopPropagation(); return; }
      if (ctrl && shift && ['i','j','c','k'].includes(key)) { e.preventDefault(); e.stopPropagation(); return; }
      if (meta && shift && ['i','j','c'].includes(key))     { e.preventDefault(); e.stopPropagation(); return; }
      if (ctrl && key === 'u') { e.preventDefault(); e.stopPropagation(); return; }
      if (meta && key === 'u') { e.preventDefault(); e.stopPropagation(); return; }
      if ((ctrl || meta) && ['c','v','a','x','p'].includes(key)) { e.preventDefault(); e.stopPropagation(); return; }
    };

    document.addEventListener('copy', block);
    document.addEventListener('cut', block);
    document.addEventListener('paste', block);
    document.addEventListener('contextmenu', block);
    document.addEventListener('selectstart', block);
    document.addEventListener('keydown', blockKey);
    return () => {
      document.removeEventListener('copy', block);
      document.removeEventListener('cut', block);
      document.removeEventListener('paste', block);
      document.removeEventListener('contextmenu', block);
      document.removeEventListener('selectstart', block);
      document.removeEventListener('keydown', blockKey);
    };
  }, [showFsPrompt]);

  // ── 4. SCREENSHOT PREVENTION — keyup to catch PrintScreen + Mac combos ───
  useEffect(() => {
    if (showFsPrompt || submitted) return;
    const handleKeyUp = (e) => {
      const meta = e.metaKey;
      const shift = e.shiftKey;
      const key = e.key.toLowerCase();

      if (e.key === 'PrintScreen') {
        e.preventDefault();
        triggerWarning('Screenshot attempt detected. This has been recorded.');
        return;
      }
      if (meta && shift && ['3','4','5','6'].includes(key)) {
        triggerWarning('Screenshot attempt detected. This has been recorded.');
        return;
      }
      if (shift && key === 's' && !e.ctrlKey && !meta) {
        triggerWarning('Snipping Tool shortcut detected. This has been recorded.');
      }
    };
    document.addEventListener('keyup', handleKeyUp);
    return () => document.removeEventListener('keyup', handleKeyUp);
  }, [showFsPrompt, submitted, triggerWarning]);

  // ── Timer ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (showFsPrompt || submitted || quizLoading) return;
    if (timeLeft === 0) { handleAutoSubmit(); return; }
    const t = setInterval(() => setTimeLeft(s => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [showFsPrompt, submitted, timeLeft, handleAutoSubmit, quizLoading]);

  const mm = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const ss2 = String(timeLeft % 60).padStart(2, '0');

  const goTo = useCallback((idx) => {
    setCurrent(idx);
    setStatuses(prev => ({ ...prev, [idx]: prev[idx] === 'not-visited' ? 'not-visited' : prev[idx] }));
  }, []);

  const selectOption = (optIdx) => {
    setAnswers(prev => ({ ...prev, [current]: optIdx }));
    setStatuses(prev => ({ ...prev, [current]: 'answered' }));
  };

  const handlePrev = () => { if (current > 0) goTo(current - 1); };
  const handleNext = () => { if (current < questions.length - 1) goTo(current + 1); };
  const handleMarkReview = () => {
    setStatuses(prev => ({ ...prev, [current]: prev[current] === 'review' ? 'not-visited' : 'review' }));
  };

  // ── Loading / Error states ──────────────────────────────────────────────
  if (quizLoading) {
    return (
      <div className="qa-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <p style={{ color: '#94a3b8', fontSize: '1.2rem' }}>Loading quiz...</p>
      </div>
    );
  }

  if (quizError) {
    return (
      <div className="qa-page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '1rem' }}>
        <p style={{ color: '#f87171', fontSize: '1.2rem' }}>{quizError}</p>
        <button onClick={() => navigate('/student')} style={{ padding: '10px 24px', borderRadius: '8px', background: '#a78bfa', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '1rem' }}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  const q = questions[current];
  if (!q) return null;

  return (
    <div className="qa-page sec-protected">

      {/* Fullscreen prompt - shown before test starts */}
      {showFsPrompt && <FullscreenPrompt onEnter={enterFullscreen} />}

      {/* Warning modal */}
      {warningModal && (
        <WarningModal
          count={warningModal.count}
          reason={warningModal.reason}
          autoSubmit={warningModal.autoSubmit}
          onDismiss={() => setWarningModal(null)}
        />
      )}

      {/* Blackout overlay — shown when window loses focus (screenshot prevention) */}
      {blackout && !showFsPrompt && (
        <div className="sec-blackout">
          <div className="sec-blackout__msg">
            🔒 Return to the test window to continue
          </div>
        </div>
      )}

      {/* Warning badge */}
      {warningCount > 0 && !submitted && (
        <div className="sec-badge">
          ⚠️ Violations: {warningCount}/{MAX_WARNINGS}
        </div>
      )}

      {/* ── Navbar ── */}
      <nav className="qa-nav">
        <div className="qa-nav__brand">
          <span className="qa-nav__check">✔</span>
          <span className="qa-nav__quiz">Quiz</span>
          <span className="qa-nav__arena"> Arena</span>
        </div>
        <div className="qa-nav__section">{quizData?.title || 'Quiz'}</div>
        <div className="qa-nav__right">
          <span className="qa-nav__theme" title="Toggle theme">☀</span>
          <div className={`qa-nav__timer ${timeLeft < 60 ? 'qa-nav__timer--urgent' : ''}`}>
            {mm}:{ss2}
          </div>
        </div>
      </nav>

      {/* ── Body ── */}
      <div className="qa-body">

        {/* ── Question Panel ── */}
        <div className="qa-question-panel">
          <div className="qa-question-card">
            <p className="qa-question__text">
              <strong>{current + 1}.</strong> {q.text}
            </p>
            <ul className="qa-options">
              {q.options.map((opt, i) => (
                <li key={i}>
                  <label className={`qa-option ${answers[current] === i ? 'qa-option--selected' : ''}`}>
                    <input
                      type="radio"
                      name={`q-${current}`}
                      checked={answers[current] === i}
                      onChange={() => selectOption(i)}
                      className="qa-option__radio"
                    />
                    <span className="qa-option__circle" />
                    <span className="qa-option__text">{opt}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Navigation ── */}
          <div className="qa-nav-actions">
            <button className="qa-action-btn" onClick={handlePrev} disabled={current === 0}>← Previous</button>
            <button className="qa-action-btn" onClick={handleMarkReview}>
              {statuses[current] === 'review' ? '★ Marked' : '☆ Mark for Review'}
            </button>
            <button
              className="qa-action-btn qa-action-btn--next"
              onClick={current === questions.length - 1 ? doSubmit : handleNext}
              disabled={submitted}
            >
              {current === questions.length - 1 ? 'Submit ✓' : 'Next →'}
            </button>
          </div>
        </div>

        {/* ── Status Panel ── */}
        <aside className="qa-status-panel">
          <h3 className="qa-status__heading">Question Status</h3>
          <div className="qa-status__legend">
            <span className="qa-legend-dot qa-legend-dot--review" /> Marked for Review
            <span className="qa-legend-dot qa-legend-dot--answered" /> Answered
            <span className="qa-legend-dot qa-legend-dot--not-visited" /> Not Visited
          </div>
          <div className="qa-status__grid">
            {questions.map((_, i) => (
              <button
                key={i}
                className={`qa-status__btn qa-status__btn--${getStatusColor(statuses[i])} ${i === current ? 'qa-status__btn--current' : ''}`}
                onClick={() => goTo(i)}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <button className="qa-calc-toggle" onClick={() => setShowCalc(v => !v)}>▦ Calculator</button>
          {showCalc && <Calculator />}
        </aside>

      </div>
    </div>
  );
};

export default QuizArena;
