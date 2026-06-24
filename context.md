# QuizPod — Project Context

## Stack
- **Frontend**: React + Vite, vanilla CSS, React Router v6
- **Backend**: Node.js, Express, MongoDB (Mongoose), JWT auth, Gemini AI
- **DB Models**: `User`, `Quiz`, `Classroom`

---

## ✅ Implemented

### Backend
- JWT-based auth (register + login) with role: `student` / `teacher`
- Student registration requires `rollNo`
- Auth middleware: `protect` (JWT verify) + `requireTeacher` (role guard)
- `POST /api/quiz` — create quiz (teacher only), generates unique 6-char join code + join link
- `POST /api/quiz/generate` — AI-generated quiz via Gemini 2.5 Flash (teacher only), supports prompt, tags, difficulty, numQuestions (1–30)

### Frontend
- `QuizzLanding` — home page with "Go to Dashboard" for logged-in users
- `AuthPage` — login / signup with role selection; students asked for roll no
- `ProtectedRoute` — role-based route guard (redirects to `/auth` if unauthorized)
- `StudentDashboardV2` — student home (streak, rank display)
- `TeacherDashboard` — teacher home
- `CreateQuiz` — manual quiz creation form + Gemini AI generation mode
- `QuizArena` — quiz-taking UI (timer, MCQ flow)
- `MistakeBook` — student's wrong-answer review page
- `StudentPerformanceMetrics` — per-student performance charts
- `QuizDetail` — individual past-quiz detail with fav-question mechanism
- `TeacherFavouriteQuestions` — teacher's saved/favourite questions list
- `MyQuiz` — student's quiz list (past + upcoming)

### Routing (App.jsx)
| Path | Access |
|---|---|
| `/` | Public |
| `/auth` | Public |
| `/student` | Protected (student) |
| `/mistakebook` | Protected (student) |
| `/quizArena` | Protected (student) |
| `/student/performance` | Protected (student) |
| `/student/quizdetail` | Protected (student) |
| `/teacher` | Protected (teacher) |
| `/teacher/create-quiz` | Protected (teacher) |

---

## ❌ Not Yet Implemented

1. **QuizArena ↔ Real Backend** — `QuizArena` is a standalone UI; not wired to actual quiz data from DB. Students can't load/submit a real quiz yet.
2. **Join Quiz via Code** — No API route or UI flow for a student to join a quiz using a join code (validating roll no + email against the associated PDF/roster).
3. **PDF Roster Upload** — Teacher can't upload a student-list PDF; no parsing or DB storage of allowed students per quiz.
4. **Student quiz submission & scoring** — No `POST /api/quiz/:id/submit` endpoint; scores aren't saved to DB.
5. **Past quiz results** — `QuizDetail` & `StudentDashboardV2` use mock data; not fetched from backend.
6. **Teacher's Favourite Questions** — UI exists but favouriting is not persisted to backend.
7. **Anti-Cheat / Proctoring** — Tab-switch detection, copy/paste disable, screenshot block not implemented.
8. **Classroom model** — `Classroom.js` exists but is unused (no routes/controllers).
9. **Student name in dashboard** — Hardcoded as "Bhavya K." / "Sarah M." in `App.jsx`; should come from JWT/auth context.
10. **Coin / XP Mechanism** — Deferred (backseat).
