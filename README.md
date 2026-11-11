# TalentLens

TalentLens is a resume–job fit analysis platform that helps **candidates** improve their applications and **recruiters** manage job opportunities. It uses AI to score resumes against role, experience level, and optional job descriptions, with actionable feedback.

## What it does

- **Candidates**: Upload a resume (PDF), optionally link or paste a job description, choose role and experience level, and get an AI-powered fit score with strengths, improvements, and keyword match/missing analysis.
- **Recruiters**: Sign in as a recruiter to upload and manage job opportunities that candidates can use for analysis.

Analysis is powered by an LLM (Groq) that acts like an ATS/HR expert: it returns a score (poor → excellent), percentage, summary, strengths, improvements, keyword matches, and missing keywords.

## Tech stack

- **Frontend**: React 19, TypeScript, Vite, CSS Modules, Firebase (auth), Google OAuth (`@react-oauth/google`), PDF.js for resume parsing.
- **Backend**: Node.js, Express, Passport (Google OAuth), sessions, CORS, Groq API proxy for AI scoring.

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
   # VITE_API_URL is optional: /api is proxied to the local backend (port 3001) in dev
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

### Backend

Used for server-side Google OAuth, sessions, and AI scoring. The Groq API key must live here, not in the frontend.

1. Go to the backend folder and install dependencies:

   ```bash
   cd backend
   yarn install
   ```

2. Copy `.env.example` to `.env` and set:

   - `PORT`, `SESSION_SECRET`
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
   - `FRONTEND_URL` (e.g. `http://localhost:5173`)
   - `GROQ_API_KEY`
   - `GROQ_MODEL` (optional, defaults to `llama-3.3-70b-versatile`)

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

## Deployment notes

The frontend and the API deploy together on Vercel. The API lives in `api/` as Vercel Functions and is served from the same origin (`/api/score-resume`, `/api/support-feedback`, `/api/health`), so no CORS setup or backend URL is needed.

Set these environment variables in the Vercel project (Production and Preview):

- `GROQ_API_KEY` (required for scoring); `GROQ_MODEL` is optional
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM_EMAIL`, `SUPPORT_EMAIL` (support form)
- `SENTRY_DSN` (optional)
- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` (or `KV_REST_API_URL` + `KV_REST_API_TOKEN`) for a global rate limit. Without them the limit is per serverless instance only. Add Upstash Redis from the Vercel Marketplace.
- `SCORE_RATE_LIMIT_MAX` / `SCORE_RATE_LIMIT_WINDOW_MS` (default 10 per hour per IP), `SUPPORT_RATE_LIMIT_MAX` (default 5 per hour per IP)

`backend/` is the original Express server. It is still used for local development and the Playwright e2e tests, but it is not deployed.

## License

Private project. All rights reserved.
