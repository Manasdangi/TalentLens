# TalentLens

TalentLens is a resume–job fit analysis platform that helps **candidates** improve their applications and **recruiters** manage job opportunities. It uses AI to score resumes against role, experience level, and optional job descriptions, with actionable feedback.

## What it does

- **Candidates**: Upload a resume (PDF), optionally link or paste a job description, choose role and experience level, and get an AI-powered fit score with strengths, improvements, and keyword match/missing analysis.
- **Recruiters**: Sign in as a recruiter to upload and manage job opportunities that candidates can use for analysis.
- **Tailor resume to a job**: after scoring against a job description, Claude rewrites the candidate's strongest bullets in that job's language. It only uses what the resume already shows, drops any rewrite whose original bullet isn't in the resume, and lists job keywords the resume can't back up.
- **Portfolio from resume**: candidates import a resume or LinkedIn "Save to PDF" export, edit it, pick one of 12 themes and publish it at `/p/<their-name>`. Each portfolio also serves a matching ATS-friendly resume PDF at `/p/<their-name>/resume.pdf`, and the editor can download it too.
- **Verified GitHub + LeetCode**: candidates prove they own an account by putting a short code (`TL-XXXXXX`) in their GitHub bio or LeetCode Summary. Live stats then show as verified badges on their portfolio and in recruiters' ranked and applied candidate lists.

Analysis is powered by an LLM (Claude, via the Anthropic API) that acts like an ATS/HR expert: it returns a score (poor → excellent), percentage, summary, strengths, improvements, keyword matches, and missing keywords.

## Tech stack

- **Frontend**: React 19, TypeScript, Vite, CSS Modules, Firebase (auth), Google OAuth (`@react-oauth/google`), PDF.js for resume parsing.
- **Backend**: Node.js, Express, Passport (Google OAuth), sessions, CORS, Claude API proxy for AI scoring (local dev; production uses Vercel Functions).

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
- An [Anthropic API key](https://console.anthropic.com/) for resume scoring
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

Used for server-side Google OAuth, sessions, and AI scoring. The Anthropic API key must live here, not in the frontend.

1. Go to the backend folder and install dependencies:

   ```bash
   cd backend
   yarn install
   ```

2. Copy `.env.example` to `.env` and set:

   - `PORT`, `SESSION_SECRET`
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
   - `FRONTEND_URL` (e.g. `http://localhost:5173`)
   - `ANTHROPIC_API_KEY`
   - `ANTHROPIC_MODEL` (optional, defaults to `claude-haiku-5-5`)

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

- `ANTHROPIC_API_KEY` (required for scoring); `ANTHROPIC_MODEL` is optional (defaults to `claude-haiku-5-5`; `claude-sonnet-5-5` gives deeper feedback at a higher cost)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM_EMAIL`, `SUPPORT_EMAIL` (support form)
- `SENTRY_DSN` (optional)
- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` (or `KV_REST_API_URL` + `KV_REST_API_TOKEN`) for a global rate limit. Without them the limit is per serverless instance only. Add Upstash Redis from the Vercel Marketplace.
- `SCORE_RATE_LIMIT_MAX` / `SCORE_RATE_LIMIT_WINDOW_MS` (default 10 per hour per IP), `SUPPORT_RATE_LIMIT_MAX` (default 5 per hour per IP)
- `FIREBASE_SERVICE_ACCOUNT` (required for GitHub/LeetCode verification): the Firebase service-account JSON, raw or base64. Create it in Firebase console → Project settings → Service accounts → Generate new private key. Only `api/verify-profile` uses it, to write `VerifiedProfiles/{uid}`.
- `VERIFICATION_SECRET` (optional): secret for the `TL-XXXXXX` codes. Defaults to the service-account key.
- `GITHUB_TOKEN` (optional): a read-only token so GitHub lookups get 5,000 requests/hour instead of 60 per IP.
- `FIREBASE_PROJECT_ID` (optional, defaults to `talentlens-13926`).
- `TAILOR_RATE_LIMIT_MAX`, `PARSE_RATE_LIMIT_MAX` (default 10 per hour per IP), `VERIFY_RATE_LIMIT_MAX` (default 30 per hour per user).

After merging, deploy the Firestore rules (`firebase deploy --only firestore:rules`). They add the public-read `Portfolios` and server-only `VerifiedProfiles` collections.

Portfolio pages (`/p/:slug`) are rendered by `api/portfolio.ts` through the rewrites in `vercel.json`. The page is cached on Vercel's CDN for 60 seconds, so edits show up within about a minute. LeetCode has no official API: stats come from its public GraphQL endpoint and may break if LeetCode changes it.

`backend/` is the original Express server. It is still used for local development and the Playwright e2e tests, but it is not deployed. It only implements scoring and support: to try tailoring, portfolio import, portfolio pages or verification locally, run `vercel dev`.

## License

Private project. All rights reserved.
