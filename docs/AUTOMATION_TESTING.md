# Automation Testing

This project now has an automation suite for the main API and browser workflows.

## Commands

- `yarn test:unit` checks frontend service behavior.
- `yarn test:e2e` starts the backend and frontend, then runs Playwright API and browser tests.
- `yarn test:automation` runs both.

`yarn test:e2e` automatically checks whether Playwright Chromium is installed and installs it if it is missing.

## What It Covers

- Backend API checks:
  - `GET /health`
  - `GET /auth/me`
  - `POST /api/score-resume` validation
  - `POST /api/score-resume` success contract in mock mode
- Candidate workflow:
  - sign in through the E2E login path
  - choose candidate/recruiter account type during onboarding
  - open app as a candidate
  - open menu
  - select saved resume
  - analyze resume
  - navigate to job openings
  - expand a job
  - apply with a saved resume
  - return home
- Recruiter workflow:
  - open app as a recruiter
  - post a job
  - view listings
  - edit a job
  - delete a job

## How Errors Are Reported

Playwright keeps traces, screenshots, and videos for failed browser tests. After a failure, run:

```sh
yarn playwright show-report
```

The report shows the exact step, console output, request failures, and the page state at the failure point.

## Test-Only Mode

The E2E suite runs the frontend with `VITE_E2E_MODE=true`. That bypasses Google/Firebase auth and uses local browser storage fixtures, so tests are stable and do not change production data.

The backend runs with `MOCK_SCORE_RESUME=true`, so scoring tests do not call Groq or spend API quota.
