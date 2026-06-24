# QuizPod — An Intelligent Quiz & Learning Platform

**The quiz platform that actually helps students learn, not just score — and helps teachers teach, not just grade.**

---

## 🎯 Project Overview

QuizPod is a web-based quiz and assessment platform designed to prioritize **learning outcomes** over engagement metrics. Unlike existing platforms (Kahoot, Quizlet, Google Forms), QuizPod provides:

- **Rich, actionable feedback** — Explains why answers are wrong and what to study next
- **Teacher-controlled classrooms** — Prevent unauthorized access with teacher approval queues, roster matching, and auto-expiring join codes
- **Role-based dashboards** — Separate, optimized interfaces for students and teachers
- **Lightweight engagement** — XP and badges focused on mastery, not speed
- **Academic integrity safeguards** — Anti-cheat features including tab-switch detection and screenshot prevention
- **AI-powered personalization** — Generate practice questions targeting each student's weak topics

---

## ✨ Key Features

### For Students
- 📊 **Personal Dashboard** — XP counter, rank, achievements, recent quiz history
- ⏱️ **Interactive Quiz Arena** — Countdown timer, question navigation, mark-for-review, built-in calculator
- 🎖️ **Achievement System** — Earn badges and XP through quiz participation and performance
- 📈 **Performance Tracking** — View detailed analytics and mistake history
- 🧠 **Adaptive Learning** — AI-generated practice questions targeting weak areas

### For Teachers
- 📋 **Quiz Builder** — Create and manage quizzes with flexible question types
- 👥 **Classroom Management** — Create classrooms, manage enrollment, set roster requirements
- ✅ **Enrollment Control** — Teacher approval queue and roster-based access control
- 📊 **Analytics Dashboard** — Class performance metrics, per-concept diagnostics, student tracking
- 📄 **Auto-expiring Join Codes** — Secure classroom access with time-limited codes

### Platform-Wide
- 🔐 **Secure Authentication** — JWT-based auth with role separation (Student/Teacher)
- 📱 **Mobile-Responsive Design** — Works seamlessly on desktop, tablet, and mobile
- ♿ **Component-Based Architecture** — Modular, reusable React components
- 🎨 **Consistent UI** — Tailwind CSS utilities + custom styling for cohesive design

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React 19, Vite, Tailwind CSS, Vanilla CSS | Component-based UI with rapid build times |
| **Backend** | Node.js, Express.js | RESTful API, user management, quiz logic |
| **Database** | MongoDB | User data, quiz content, submissions, classroom rosters |
| **Auth** | JSON Web Tokens (JWT), bcryptjs | Secure user authentication and password hashing |
| **File Handling** | Multer | Roster uploads, PDF parsing for questions |
| **AI Integration** | Google Generative AI API | Question generation and intelligent feedback |
| **Utilities** | Dotenv, CORS | Environment config and cross-origin requests |

---

## 📁 Project Structure

```
quizpod/
├── README.md                    (this file)
├── WebTech_Project/
│   ├── frontend/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── AuthPage.jsx
│   │   │   │   ├── StudentDashboard.jsx
│   │   │   │   ├── TeacherDashboard.jsx
│   │   │   │   ├── QuizArena.jsx
│   │   │   │   ├── QuizzLanding.jsx
│   │   │   │   └── FeatureCard.jsx
│   │   │   ├── styles/
│   │   │   │   ├── AuthPage.css
│   │   │   │   ├── StudentDashboard.css
│   │   │   │   ├── TeacherDashboard.css
│   │   │   │   ├── QuizArena.css
│   │   │   │   └── (other component styles)
│   │   │   ├── App.jsx          (main router)
│   │   │   ├── main.jsx         (entry point)
│   │   │   └── index.css        (global styles)
│   │   ├── package.json
│   │   └── vite.config.js
│   │
│   └── backend/
│       ├── models/
│       │   ├── User.js
│       │   ├── Quiz.js
│       │   ├── Classroom.js
│       │   └── Submission.js
│       ├── controllers/
│       │   ├── authController.js
│       │   ├── quizController.js
│       │   └── userController.js
│       ├── middleware/
│       │   └── authMiddleware.js
│       ├── index.js             (Express server)
│       ├── package.json
│       └── .env.example
│
└── WebTech_Project/
    └── Progress-1_Documentation.md  (detailed project docs)
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v14+)
- npm or yarn
- MongoDB (local or Atlas account)
- Google Cloud API key (for AI question generation)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd quizpod
   ```

2. **Setup Backend**
   ```bash
   cd WebTech_Project/backend
   npm install
   cp .env.example .env
   ```
   
   Update `.env` with:
   ```
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   GOOGLE_API_KEY=your_google_genai_key
   PORT=5000
   ```

3. **Setup Frontend**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Start the Backend**
   ```bash
   cd ../backend
   npm run dev    # uses nodemon for auto-reload
   ```
   Backend runs on `http://localhost:5000`

5. **Start the Frontend (in new terminal)**
   ```bash
   cd ../frontend
   npm run dev
   ```
   Frontend runs on `http://localhost:5173` (Vite default)

---

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/signup` — Register as student or teacher
- `POST /api/auth/login` — Login with email & password
- `POST /api/auth/logout` — Logout (clear JWT)

### User Management
- `GET /api/users/profile` — Get current user profile
- `PUT /api/users/profile` — Update user info
- `GET /api/users/stats` — Get user stats (XP, badges, etc.)

### Quiz Management
- `GET /api/quizzes` — List all available quizzes
- `POST /api/quizzes` — Create new quiz (teacher only)
- `GET /api/quizzes/:id` — Get quiz details
- `PUT /api/quizzes/:id` — Update quiz (teacher only)
- `DELETE /api/quizzes/:id` — Delete quiz (teacher only)

### Quiz Submission
- `POST /api/submissions` — Submit quiz attempt
- `GET /api/submissions/:quizId` — Get submission results
- `GET /api/submissions` — Get user's submission history

### Classroom Management
- `POST /api/classrooms` — Create classroom (teacher only)
- `GET /api/classrooms/:id` — Get classroom details
- `POST /api/classrooms/:id/join` — Request to join classroom
- `POST /api/classrooms/:id/approve` — Approve student (teacher only)
- `POST /api/classrooms/:id/upload-roster` — Upload student roster (teacher only)

---

## 🎮 Components Overview

### Frontend Components

| Component | Purpose | Lines |
|---|---|---|
| **QuizzLanding.jsx** | Landing page with hero section, features, footer | 88 |
| **AuthPage.jsx** | Student/Teacher role toggle, sign-up form, validation | 127 |
| **StudentDashboard.jsx** | Student stats, badges, recent quizzes | 106 |
| **TeacherDashboard.jsx** | Teacher stats, class management, quiz grid | 118 |
| **QuizArena.jsx** | Full quiz-taking experience with timer, calculator | 221 |
| **FeatureCard.jsx** | Reusable card component for feature showcase | — |

### Backend Controllers

| Controller | Functions |
|---|---|
| **authController.js** | signup, login, logout, token validation |
| **quizController.js** | CRUD operations for quizzes, question management |
| **userController.js** | User profile, statistics, badge management |

### Database Models

| Model | Fields |
|---|---|
| **User** | name, email, password (hashed), role, XP, badges, createdAt |
| **Quiz** | title, questions, timeLimit, category, createdBy, createdAt |
| **Classroom** | name, code, teacher, students, roster, createdAt |
| **Submission** | userId, quizId, answers, score, timeSpent, submittedAt |

---

## 🔐 Security Considerations

- ✅ Passwords hashed with **bcryptjs** (rounds: 10)
- ✅ JWT tokens for stateless authentication
- ✅ CORS enabled for frontend-backend communication
- ✅ Role-based access control (RBAC) on all endpoints
- ✅ Roster validation to prevent unauthorized enrollment
- ✅ Auto-expiring join codes (configurable TTL)

---

## 📊 Key Differentiators

| Feature | Kahoot | Quizlet | Google Forms | **QuizPod** |
|---|---|---|---|---|
| Teacher approval for enrollment | ❌ | ❌ | ❌ | ✅ |
| Roster-based access control | ❌ | ❌ | ❌ | ✅ |
| Auto-expiring join codes | ❌ | ❌ | ❌ | ✅ |
| In-quiz calculator | ❌ | ❌ | ❌ | ✅ |
| Role-based dashboards | ❌ | ❌ | ❌ | ✅ |
| Anti-cheat features | ❌ | ❌ | ❌ | ✅ (planned) |
| AI-generated questions | ❌ | ❌ | ❌ | ✅ (planned) |
| Mistake book | ❌ | ❌ | ❌ | ✅ (planned) |
| Free tier (no paywall) | Limited | Paywalled | Basic | **Full access** |

---

## 🛣️ Development Roadmap

### Completed ✅
- Frontend component scaffolding (Landing, Auth, Dashboards, Quiz Arena)
- React + Vite setup with Tailwind CSS
- Interactive Quiz Arena with timer and calculator
- Responsive mobile design

### In Progress 🔄
- Backend API implementation (Express + MongoDB)
- JWT authentication integration
- Database schema validation
- Quiz CRUD operations

### Planned 🎯
| Feature | Priority | Status |
|---|---|---|
| Anti-Cheat Module | High | Design phase |
| AI Question Generation | High | Spec ready |
| Student Analytics | Medium | Backlog |
| Mistake Book | Medium | Backlog |
| XP/Badge System | Low | Backlog |
| Deployment (Vercel/Render) | Critical | Pending |

---

## 🤝 Contributing

This is a team project for Web Technology coursework (6 members). For development:

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Commit changes with clear messages
3. Push to the branch
4. Create a Pull Request
5. Ensure all tests pass (when implemented)

### Code Style
- Use **ESLint** for JavaScript linting
- Follow **Tailwind CSS** conventions for styling
- Keep components focused and single-responsibility
- Document complex logic with brief comments

---

## 📚 Documentation

- **Full Project Docs** — See `WebTech_Project/Progress-1_Documentation.md`
- **Design Wireframes** — See Figma board (link in project board)
- **API Spec** — See backend `README.md` (pending)

---

## 👥 Team

**QuizPod** is developed by 6 team members:

| Role | Members |
|---|---|
| **Research + Documentation** | Dev, Mudit, Payal |
| **Development** | Bhav, Ayush, Rohan |

All team members participate in ideation, code reviews, and feature prioritization.

---

## 📄 License

ISC License — See package.json

---

## 🔗 Useful Links

- **Problem Statement & Research** — `WebTech_Project/Progress-1_Documentation.md`
- **GitHub Repository** — `DevAggarwal03/WebTech_Project`
- **MongoDB Atlas** — https://www.mongodb.com/cloud/atlas
- **Google Generative AI** — https://ai.google.dev
- **Vite Docs** — https://vitejs.dev
- **Express.js Docs** — https://expressjs.com
- **Mongoose Docs** — https://mongoosejs.com

---

## 📞 Support & Questions

For questions about QuizPod, check the project documentation or reach out to the development team through the GitHub repository.

---

*Last updated: June 2026*  
*QuizPod — Learn Better, Teach Better*
