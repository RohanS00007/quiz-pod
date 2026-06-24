import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext.jsx";
import { API_BASE } from "../config.js";
import "../styles/AuthPage.css";

const AuthPage = ({ onAuthSuccess }) => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isLogin, setIsLogin] = useState(false);
  const [role, setRole] = useState("student"); // 'student' | 'teacher'
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    rollNo: "",
  });
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";

    try {
      const response = await axios.post(`${API_BASE}${endpoint}`, {
        role,
        ...formData,
      });

      login(response.data);

      if (onAuthSuccess) {
        onAuthSuccess(response.data);
      } else {
        if (response.data.role === "teacher") {
          navigate("/teacher");
        } else {
          navigate("/student");
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || "Authentication failed");
    }
  };

  return (
    <div className="auth-page">
      {/* Animated binary rain background */}
      <div className="auth-page__bg" aria-hidden="true">
        {Array.from({ length: 14 }).map((_, i) => (
          <div key={i} className="auth-page__rain-col">
            {Array.from({ length: 18 }).map((_, j) => (
              <span key={j} className="auth-page__rain-char">
                {Math.random() > 0.5 ? "1" : "0"}
              </span>
            ))}
          </div>
        ))}
      </div>

      {/* Top bar */}
      <header className="auth-page__header">
        <div className="auth-page__logo">QuizPod</div>
      </header>

      {/* Center card */}
      <main className="auth-page__main">
        <div className="auth-card">
          <h2 className="auth-card__title">
            {isLogin ? "Welcome Back" : "Welcome to QuizPod"}
          </h2>
          {error && (
            <p
              className="auth-card__error"
              style={{
                color: "#ff4d4d",
                textAlign: "center",
                marginBottom: "1rem",
                fontSize: "0.9rem",
              }}
            >
              {error}
            </p>
          )}

          {/* Role toggle */}
          <div
            className="auth-card__toggle"
            role="group"
            aria-label="Select role"
          >
            <button
              className={`auth-card__toggle-btn ${role === "student" ? "auth-card__toggle-btn--active" : ""}`}
              onClick={() => setRole("student")}
              type="button"
            >
              Student
            </button>
            <button
              className={`auth-card__toggle-btn ${role === "teacher" ? "auth-card__toggle-btn--active" : ""}`}
              onClick={() => {
                setRole("teacher");
                setFormData((prev) => ({ ...prev, rollNo: "" }));
              }}
              type="button"
            >
              Teacher
            </button>
          </div>

          {/* Form */}
          <form className="auth-card__form" onSubmit={handleSubmit} noValidate>
            {!isLogin && (
              <div className="auth-card__field">
                <label className="auth-card__label" htmlFor="name">
                  Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  className="auth-card__input"
                  placeholder="Your Name..."
                  value={formData.name}
                  onChange={handleChange}
                  required={!isLogin}
                />
              </div>
            )}

            {!isLogin && role === "student" && (
              <div className="auth-card__field">
                <label className="auth-card__label" htmlFor="rollNo">
                  Roll Number
                </label>
                <input
                  id="rollNo"
                  name="rollNo"
                  type="text"
                  className="auth-card__input"
                  placeholder="Roll Number"
                  value={formData.rollNo}
                  onChange={handleChange}
                  required={!isLogin && role === "student"}
                />
              </div>
            )}

            <div className="auth-card__field">
              <label className="auth-card__label" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                className="auth-card__input"
                placeholder="Email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="auth-card__field">
              <label className="auth-card__label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                className="auth-card__input"
                placeholder="Password..."
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>

            <button type="submit" className="auth-card__submit">
              {isLogin ? "Login" : "Sign up"}
            </button>

            <p
              style={{
                textAlign: "center",
                marginTop: "1rem",
                cursor: "pointer",
                color: "rgba(255,255,255,0.7)",
                fontSize: "0.9rem",
              }}
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
              }}
            >
              {isLogin
                ? "Don't have an account? Sign up"
                : "Already have an account? Login"}
            </p>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="auth-page__footer">
        <span>All Rights Reserved</span>
        <div className="auth-page__footer-icons" aria-label="Social links">
          <span className="auth-page__icon" />
          <span className="auth-page__icon" />
          <span className="auth-page__icon" />
          <span className="auth-page__icon" />
        </div>
      </footer>
    </div>
  );
};

export default AuthPage;
