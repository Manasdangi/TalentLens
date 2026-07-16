import dotenv from 'dotenv';
import * as Sentry from '@sentry/node';

dotenv.config();

function parseSampleRate(value: string | undefined, fallback: number) {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : fallback;
}

const dsn = process.env.SENTRY_DSN || process.env.BACKEND_SENTRY_DSN;
const isMockMode = process.env.MOCK_SCORE_RESUME === 'true';

if (dsn && !isMockMode) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
    release: process.env.SENTRY_RELEASE,
    sendDefaultPii: false,
    tracesSampleRate: parseSampleRate(process.env.SENTRY_TRACES_SAMPLE_RATE, 0.1),
    enableLogs: process.env.SENTRY_ENABLE_LOGS === 'true',
    beforeSend(event) {
      if (event.request) {
        delete event.request.cookies;
      }
      return event;
    },
  });
}

export { Sentry };
