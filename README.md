<div align="center">

# EXAMORA
### AI-Powered Academic Examination & Rubric Evaluation Platform

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8+-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Cloud_SQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-0.45-C5F74F?style=flat-square&logo=drizzle&logoColor=black)](https://orm.drizzle.team/)
[![Firebase & Password Auth](https://img.shields.io/badge/Auth-Email%20%7C%20Google%20%7C%20GitHub-FFCA28?style=flat-square&logo=firebase&logoColor=black)](https://firebase.google.com/)

**EXAMORA** is a full-stack digital examination system and personal academic evaluator designed for university students and independent scholars. Instead of behaving like an ordinary conversational chatbot, EXAMORA operates as a rigorous examination studio: students upload course documents or specify syllabus topics, generate calibrated question papers across **5 assessment formats**, sit timed examinations with auto-saved state, and receive transparent, criterion-by-criterion rubric evaluations, longitudinal mastery analytics, and complete academic identity management.

</div>

---

## Table of Contents

1. [Core Capabilities](#-core-capabilities)
2. [Workspace Modules](#-workspace-modules)
3. [Five Examination Modes](#-five-examination-modes)
4. [System Architecture](#-system-architecture)
5. [Database Schema (PostgreSQL + Drizzle ORM)](#-database-schema-postgresql--drizzle-orm)
6. [REST API Reference](#-rest-api-reference)
7. [Authentication & DPDP Act 2023 Compliance](#-authentication--dpdp-act-2023-compliance)
8. [Keyboard Shortcuts](#-keyboard-shortcuts)
9. [Local Setup & Installation](#-local-setup--installation)
10. [Security & Engineering Principles](#-security--engineering-principles)

---

## Core Capabilities

- **Flexible Multi-Method Authentication**:
  - Native Email & Password accounts with salted `scrypt` cryptographic hashing (`crypto.scryptSync` + `crypto.timingSafeEqual`).
  - Single Sign-On via Google and GitHub OAuth providers.
  - Zero-friction Interactive Scholar Mode for instant sandbox trials.
  - Mandatory DPDP Act 2023 consent capture on account creation.
- **Academic Identity & Personal Profile Management**:
  - Full scholar personal profile management: custom avatar upload, age, date of birth, gender, institution, department, academic degree tier, target academic goal, preferred difficulty, and personal bio.
  - Deterministic Google-style SVG avatar generation based on email/initials fallback.
- **Document-Based & Topic-Based Paper Synthesis**:
  - Upload study materials (`PDF`, `DOCX`, `PPT`, `TXT`, `MD`) or paste syllabus notes. EXAMORA extracts structured chapters and granular testable subtopics so students can select exact chapters to be tested on.
  - Alternatively, enter any academic subject and select or add custom theorems, algorithms, and subtopics.
- **Granular Examination Calibration**:
  - Configure difficulty tier (`Easy`, `Medium`, `Hard`, `Expert`), examination format (`MCQ`, `Descriptive`, `Coding`, `Mathematics`, `Mixed`), question count (`2–10`), timer duration (`10–90 min`), total marks, and negative marking rules (`0`, `-0.25`, `-0.50`, `-1.00`).
- **Live Timed Examination Player**:
  - Real-time countdown timer with automatic submission upon expiration.
  - Interactive Question Palette showing answered, unanswered, and **Marked for Review** states.
  - Automatic answer persistence across browser refreshes (`sessionStorage` + backend auto-save sync).
- **Zero Fake Telemetry**:
  - Student accounts start with a clean academic ledger (`0` pre-seeded results). Score progression charts, grades, and weak-topic diagnostics are populated strictly after sitting and submitting real examinations.
- **Dual-Storage Engine (PostgreSQL + In-Memory Fallback)**:
  - Connects to PostgreSQL via `DATABASE_URL` or individual host/user credentials.
  - Includes a zero-config in-memory fallback store (`memoryStore`) allowing immediate local evaluation and PaaS preview runs without external database provisioning.
- **Light & Matte Carbon Dark Mode**:
  - High-contrast academic Light Theme and a true neutral Matte Carbon/Zinc Dark Theme (`#09090B` canvas, `#121215` cards, crisp neutral white active controls).

---

## Workspace Modules

| Module | Description |
| :--- | :--- |
| **1. Dedicated Auth Suite** | Clean authentication hub with interactive system architecture visualizer, Login/Register tabs, password visibility toggles, password reset workflow, and DPDP Act 2023 Consent checks. |
| **2. Student Dashboard** | Executive KPI strip (Total Exams Taken, Average Score, Best Score, Study Materials Indexed), Score Progression area chart, Subject-Wise Performance bar chart, Weak Topics requiring revision, and Recent Examination History. |
| **3. Create Examination** | Dual-mode studio (**Topic-Based** vs. **Document-Based**) with interactive syllabus concept tags, difficulty selector, format selector, duration/question sliders, and negative marking configuration. |
| **4. Study Materials** | Document upload & curriculum extraction engine. Extracts chapter trees and subtopics from uploaded files or quick academic templates and launches targeted papers from selected subtopics. |
| **5. Question Bank & Archive** | Dedicated 3-tab repository: **Configured Papers** (searchable/filterable by format & difficulty with resume/start controls), **Graded Answer Scripts** (official transcripts & rubric reports), and **Syllabus Topic Bank** (1-click module drills). |
| **6. Performance Analytics** | Longitudinal topic-wise accuracy distribution chart, subject filter segmented control, Concept Mastery Matrix (`Needs Focus`, `Developing`, `Proficient`, `Mastered`), targeted weakness drills, and time management logs. |
| **7. Personal Information** | Comprehensive academic profile editor with avatar photo upload, age, DOB, gender, affiliated university/institution, department, degree level, target mastery goal, and scholar bio. |
| **8. Privacy & Settings (DPDP 2023)** | DPDP Act 2023 compliance panel: consent logs, complete personal data archive export (JSON), and permanent right-to-be-forgotten account erasure. |

---

## Five Examination Modes

### 1. Multiple-Choice Questions (`MCQ`)
- Calibrated distractors targeting common conceptual misconceptions.
- Deterministic evaluation with optional negative marking (`-0.25`, `-0.50`, `-1.00`).
- Sealed answer keys revealed only after final submission alongside full step-by-step explanations.

### 2. Descriptive & Theoretical Essays (`Descriptive`)
- Long-form written response editor with live word count.
- Evaluated criterion-by-criterion against an explicit multi-point marking rubric.
- Awards partial marks and pinpoints missing theoretical assumptions or conceptual gaps.

### 3. Algorithmic & Systems Programming (`Coding`)
- Integrated code editor supporting **JavaScript (Node.js)**, **Python 3.11**, and **C++20**.
- Includes starter code templates and an isolated sandbox test-case verifier (`Verify Against Sample Test Cases`).
- Combines test-case verification with rubric grading on time/space complexity.

### 4. Mathematical Derivations & Handwritten Vision Grading (`Mathematics`)
- Supports both typed symbolic/LaTeX derivations and **uploaded photographs/scans of handwritten solutions**.
- Uses multimodal vision inspection to read handwritten integrals, matrices, and proofs step-by-step.
- Awards partial credit for valid intermediate steps even if the final arithmetic value is off, and flags ambiguous handwriting for manual review rather than guessing.

### 5. University Mixed Paper (`Mixed`)
- Combines `MCQ`, `Descriptive`, `Coding`, and `Mathematics` questions into a single comprehensive paper.

---

## System Architecture

```text
├── server.ts                         # Express backend + Vite middleware server (Port 3000 / dynamic $PORT)
├── public/                           # Static public web assets
├── src/
│   ├── App.tsx                       # Root application state & unauthenticated/authenticated view router
│   ├── index.css                     # Typography & Matte Carbon dark mode design tokens
│   ├── components/
│   │   ├── layout/AppShell.tsx       # Sidebar, top bar, personal profile CTA & Cmd/Ctrl+F Reading Mode
│   │   └── ui/                       # Reusable Button & Card primitives
│   ├── context/AuthContext.tsx       # Password, Google, GitHub & Scholar session state
│   ├── db/
│   │   ├── drizzle.config.ts         # Drizzle Kit PostgreSQL migration configuration
│   │   ├── index.ts                  # PostgreSQL connection pool with DATABASE_URL & SQL_HOST support
│   │   ├── schema.ts                 # 10 relational PostgreSQL tables & indexes
│   │   └── repository.ts             # Scrypt auth, database queries, and in-memory fallback store
│   ├── lib/
│   │   ├── firebase.ts               # Client-side Firebase SDK initialization
│   │   └── firebase-admin.ts         # Server-side Firebase Admin token verifier
│   ├── middleware/
│   │   ├── auth.ts                   # Bearer token & Scholar session authentication middleware
│   │   └── rateLimit.ts              # Per-user API rate limiter
│   ├── pages/
│   │   ├── LoginPage.tsx             # Interactive authentication suite with system topology diagram
│   │   ├── LandingPage.tsx           # Public academic overview & features showcase
│   │   ├── DashboardPage.tsx         # Student KPI overview & progression charts
│   │   ├── CreateExamPage.tsx        # Examination configuration studio
│   │   ├── DocumentsPage.tsx         # Document upload & AI chapter extraction
│   │   ├── ExamArchivePage.tsx       # Question Bank, Transcripts & Syllabus Vault
│   │   ├── ExamPlayerPage.tsx        # Live timed examination interface
│   │   ├── ExamResultPage.tsx        # Post-submission rubric report & answer key
│   │   ├── PersonalProfilePage.tsx   # Scholar identity, photo upload, and academic metadata
│   │   ├── AnalyticsPage.tsx         # Topic mastery matrix & time management telemetry
│   │   ├── SettingsPrivacyPage.tsx   # DPDP 2023 Consent audit, data export & account deletion
│   │   └── PrivacyPolicyPage.tsx     # Formal privacy policy & grievance redressal details
│   ├── utils/
│   │   ├── avatar.ts                 # Deterministic Google-style initials SVG avatar generator
│   │   └── cn.ts                     # Tailwind class merge utility
│   └── services/
│       ├── api.ts                    # Frontend REST API client with offline resilience
│       └── ai/
│           ├── base.ts               # Provider-independent AI Teacher contract
│           ├── gemini.ts             # Gemini structured JSON & multimodal vision engine
│           └── factory.ts            # Pluggable AI provider factory
```

---

## Database Schema (PostgreSQL + Drizzle ORM)

Defined in `src/db/schema.ts`, all **core tables** use UUID primary keys, foreign key constraints, and B-tree indexes:

| Table | Purpose | Key Attributes |
| :--- | :--- | :--- |
| **`users`** | Student scholar accounts. | `uid`, `email`, `password_hash` (`scrypt`), `full_name`, `avatar_url`, `age`, `date_of_birth`, `gender`, `institution`, `department`, `academic_level`, `target_goal`, `preferred_difficulty`, `bio`. |
| **`consents`** | DPDP Act 2023 consent records. | `user_id`, `consent_given`, `consent_version`, `consent_text`, `ip_address`, `user_agent`, `created_at`. |
| **`documents`** | Uploaded study materials and extracts. | `user_uid`, `title`, `subject`, `file_name`, `raw_text`, `summary`, `chapters_json`. |
| **`topics`** | Syllabus concepts and subtopics. | `subject`, `document_id`, `topic_name`, `subtopics_json`. |
| **`exams`** | Configured question papers. | `difficulty`, `format`, `question_count`, `duration_minutes`, `total_marks`, `negative_marking`. |
| **`questions`** | Generated questions and rubrics. | `question_text`, `options_json`, `marking_rubric_json`, `starter_code`, `test_cases_json`, `correct_answer`, `explanation`. |
| **`attempts`** | Timed examination sittings. | `time_remaining_seconds`, `current_question_index`, `marked_for_review_json`, `status` (`in_progress`, `submitted`). |
| **`answers`** | Student submissions & AI marks. | `student_response`, `handwritten_scan_base64`, `awarded_marks`, `ai_feedback`, `conceptual_mistake`, `requires_manual_review`. |
| **`results`** | Finalized scorecards. | `obtained_marks`, `percentage`, `letter_grade`, `weak_topics_json`, `recommendations_json`, `overall_feedback`. |
| **`topic_performance`** | Longitudinal mastery tracking. | `questions_attempted`, `questions_correct`, `accuracy_percentage`, `mastery_level`, `recommended_difficulty`. |

---

## REST API Reference

All `/api/*` routes are protected by Bearer token / Scholar session verification (`src/middleware/auth.ts`) and security headers:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Health check for cloud load balancers and orchestrators. |
| `POST` | `/api/auth/register` | Creates a new account with email, password (`scrypt`), and records mandatory DPDP consent. |
| `POST` | `/api/auth/login` | Authenticates with email and password, returning user profile and session token. |
| `POST` | `/api/auth/reset-password` | Updates account password securely in the database. |
| `POST` | `/api/auth/sync` | Synchronizes OAuth accounts (Google/GitHub) with student profiles. |
| `PATCH` | `/api/auth/profile` | Updates personal scholar details (name, avatar, age, DOB, institution, bio, goals). |
| `GET` | `/api/dashboard` | Returns student KPI stats, documents, configured exams, recent results, and topic performance. |
| `POST` | `/api/documents/analyze` | Uploads study material text and extracts structured chapters and testable subtopics via AI. |
| `POST` | `/api/exams/generate` | Generates a calibrated question paper with rubrics and answer keys, saving to PostgreSQL. |
| `POST` | `/api/exams/:examId/start` | Starts a new timed attempt or resumes an existing `in_progress` attempt (strips `correctAnswer` before sending to client). |
| `PUT` | `/api/attempts/:attemptId/autosave` | Auto-saves remaining timer seconds, review flags, and the active question's answer. |
| `POST` | `/api/attempts/:attemptId/submit` | Evaluates all answers (deterministic MCQ/coding + AI rubric/vision grading), updates `topic_performance`, and returns the official result report. |
| `GET` | `/api/results/:attemptId` | Retrieves the complete graded answer script, official answer keys, and rubric feedback for a submitted attempt. |
| `POST` | `/api/consents/record` | Records explicit student consent timestamp, version, and IP. |
| `GET` | `/api/consents/history` | Fetches historical consent timeline. |
| `GET` | `/api/account/export-data` | Exports full user data bundle in accordance with DPDP Act 2023 portability requirements. |
| `DELETE` | `/api/account/delete-all` | Permanently deletes student profile, uploaded scans, documents, attempts, and results. |

---

## Authentication & DPDP Act 2023 Compliance

1. **Scrypt Password Security**: Passwords are never stored in plaintext. They are salted with a 16-byte cryptographically secure random salt and hashed using Node.js `crypto.scryptSync`. Comparisons use timing-safe `crypto.timingSafeEqual` to prevent timing side-channel attacks.
2. **Explicit Consent Architecture**: During registration, users must accept the Digital Personal Data Protection (DPDP) Act 2023 terms. Every consent agreement is audited with versioning and timestamps.
3. **Right to Access & Data Portability**: Under `/api/account/export-data`, users can download their complete academic record, answers, documents, and logs as a structured JSON bundle.
4. **Right to Erasure (Forgotten)**: Under `/api/account/delete-all`, users can permanently purge their account, documents, uploaded scans, and test history from the system.

---

## Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| **`Cmd + F`** (macOS) / **`Ctrl + F`** (Windows/Linux) | Toggle **Distraction-Free Reading Mode** in the current view (hides the left navigation sidebar and top header). |
| **`Esc`** | Exit Distraction-Free Reading Mode and restore workspace navigation. |

---

## Local Setup & Installation

### Prerequisites
- **Node.js** `v20+`
- **PostgreSQL** `v15+` (Local instance, Google Cloud SQL, Neon, Supabase, or Render)
- **Gemini API Key** ([Google AI Studio](https://aistudio.google.com/))

### 1. Clone the Repository & Install Packages

```bash
git clone https://github.com/charanx1234/examora.git
cd examora
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and provide your credentials:

```bash
cp .env.example .env
```

```env
# Gemini API Key (Server-side only — never exposed to the client bundle)
GEMINI_API_KEY="your_gemini_api_key"

# Port (Defaults to 3000 if omitted)
PORT=3000

# Application URL
APP_URL="http://localhost:3000"

# PostgreSQL Runtime Connection Option A: Single Connection String
DATABASE_URL="postgresql://user:password@localhost:5432/examora"

# PostgreSQL Runtime Connection Option B: Discrete Parameters
SQL_HOST="localhost"
SQL_DB_NAME="postgres"
SQL_USER="postgres"
SQL_PASSWORD="your_postgres_password"

# PostgreSQL Admin Credentials (used by Drizzle Kit for schema migrations)
SQL_ADMIN_USER="postgres"
SQL_ADMIN_PASSWORD="your_postgres_password"
```

> **Note:** If `DATABASE_URL` or `SQL_HOST` is not set, EXAMORA automatically activates its **In-Memory Store**, allowing immediate local testing and previewing without a live database.

### 3. Push the Database Schema (When using PostgreSQL)

Push the relational tables to your PostgreSQL database using Drizzle Kit:

```bash
npx drizzle-kit push --config=src/db/drizzle.config.ts
```

### 4. Start the Development Server

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

### 5. Typecheck & Build for Production

```bash
# Run TypeScript compiler validation
npm run lint

# Build production frontend bundle
npm run build

# Start production Express + static server
npm start
```

---

## Security & Engineering Principles

1. **Server-Side AI Isolation**: All `@google/genai` calls execute strictly on the Express backend (`src/services/ai/gemini.ts`). API keys are never exposed to client code.
2. **Sealed Answer Keys**: During an active examination (`/api/exams/:examId/start`), `correctAnswer` and `explanation` fields are stripped on the server before questions are returned to the browser.
3. **Provider-Independent AI Contract**: `IAITeacherProvider` (`src/services/ai/base.ts`) decouples examination synthesis and rubric evaluation from any single vendor so OpenAI, Claude, or local models can be plugged in via `src/services/ai/factory.ts`.
4. **Sandboxed Code Verification**: Student code submissions are never executed via `eval` or `child_process` on the host server.
5. **Robust AI & Storage Fallbacks**: Graceful degradation handles missing database credentials and rate-limited API calls cleanly without crashing the user's session.

---

## License

Released under the **Apache-2.0 License**.
