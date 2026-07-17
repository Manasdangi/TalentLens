# Sentry

Sentry is integrated for both the Vite/React frontend and the Express backend.

## Frontend

Set these in the root `.env` file:

```sh
VITE_SENTRY_DSN=your_frontend_sentry_dsn
VITE_SENTRY_ENVIRONMENT=production
VITE_SENTRY_RELEASE=talentlens@1.0.0
VITE_SENTRY_TRACES_SAMPLE_RATE=0.1
VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE=0
VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE=1
```

The frontend integration:

- captures uncaught React 19 errors through `createRoot` error handlers
- captures selected handled errors, such as resume scoring and user type failures
- tracks performance traces
- enables Session Replay only for error sessions by default
- masks text and blocks media in replays
- stores only the internal user id and user type, not email or name

## Backend

Set these in `backend/.env`:

```sh
SENTRY_DSN=your_backend_sentry_dsn
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=talentlens-backend@1.0.0
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_ENABLE_LOGS=false
```

The backend integration:

- initializes before Express imports for auto-instrumentation
- installs Sentry's Express error handler after all routes
- captures scoring route exceptions
- reports failed Groq upstream responses as Sentry messages
- avoids sending default PII
- removes request cookies from events

## Local And Automation Behavior

Sentry is disabled when DSNs are blank. E2E automation also keeps Sentry disabled because the backend runs with `MOCK_SCORE_RESUME=true` and the frontend runs with `VITE_E2E_MODE=true`.

## Optional Backend Verification Route

To test backend issue capture, set:

```sh
SENTRY_TEST_ROUTE_ENABLED=true
```

Then call:

```sh
curl http://localhost:3001/debug-sentry
```

Turn this route off after verification.

## Daily Automated Issue Review

The optional 12:20 PM IST Sentry-to-Codex combined draft PR workflow is documented in [SENTRY_AUTOFIX.md](./SENTRY_AUTOFIX.md). It queries Sentry directly and does not require Gmail access or a backend webhook.
