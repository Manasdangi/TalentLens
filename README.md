# TalentLens

TalentLens is a resume–job fit analysis platform that helps **candidates** improve their applications and **recruiters** manage job opportunities. It uses AI to score resumes against role, experience level, and optional job descriptions, with actionable feedback.

## What it does

- **Candidates**: Upload a resume (PDF), optionally link or paste a job description, choose role and experience level, and get an AI-powered fit score with strengths, improvements, and keyword match/missing analysis.
- **Recruiters**: Sign in as a recruiter to upload and manage job opportunities that candidates can use for analysis.

Analysis is powered by an LLM (Groq) that acts like an ATS/HR expert: it returns a score (poor → excellent), percentage, summary, strengths, improvements, keyword matches, and missing keywords.

## Tech stack

- **Frontend**: React 19, TypeScript, Vite, CSS Modules, Firebase (auth), Google OAuth (`@react-oauth/google`), Groq SDK, OpenAI, PDF.js for resume parsing.
- **Backend**: Node.js, Express, Passport (Google OAuth), sessions, CORS. Optional for auth/session handling.

## Project structure

```
TalentLens/
├── src/                    # Frontend (React + Vite)
│   ├── components/         # UI (Header, InputSection, AnalysisResults, etc.)
│   ├── context/            # AppStore (single store), slices (UserSlice, ResumeSlice)
│   ├── services/           # resumeService, jobOpportunityService, userService
│   ├── utils/              # llmScorer, pdfExtractor
│   ├── types/              # resume, jobOpportunity
│   └── config/             # Firebase
├── backend/                # Express API (Google OAuth, sessions)
│   └── src/
│       └── index.ts
├── firestore.rules         # Firestore security rules
└── README.md
```

## Getting started

### Prerequisites

- Node.js (v18+)
- A [Groq](https://console.groq.com/) API key for resume scoring
- Firebase project (for auth and optional Firestore)
- Optional: Google OAuth credentials for the backend

### Frontend

1. Clone the repo and install dependencies:

   ```bash
   cd TalentLens
   npm install
   ```

2. Create a `.env` (or `.env.local`) in the project root with:

   ```env
   VITE_GROQ_API_KEY=your-groq-api-key
   # Plus any Firebase / Google OAuth vars your app uses (e.g. VITE_FIREBASE_*)
   ```

3. Run the dev server:

   ```bash
   npm run dev
   ```

4. Build for production:

   ```bash
   npm run build
   npm run preview   # optional: preview production build
   ```

### Backend (optional)

Used for server-side Google OAuth and sessions.

1. Go to the backend folder and install dependencies:

   ```bash
   cd backend
   yarn install
   ```

2. Copy `.env.example` to `.env` and set:

   - `PORT`, `SESSION_SECRET`
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
   - `FRONTEND_URL` (e.g. `http://localhost:5173`)

3. Run the server:

   ```bash
   yarn dev
   ```

## Scripts

| Command     | Description                |
|------------|----------------------------|
| `npm run dev`     | Start Vite dev server      |
| `npm run build`   | TypeScript build + Vite build |
| `npm run preview` | Preview production build   |
| `npm run lint`    | Run ESLint                 |

## License

Private project. All rights reserved.
