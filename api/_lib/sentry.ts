import * as Sentry from '@sentry/node';

function parseSampleRate(value: string | undefined, fallback: number) {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : fallback;
}

const dsn = process.env.SENTRY_DSN || process.env.BACKEND_SENTRY_DSN;

if (dsn && process.env.MOCK_SCORE_RESUME !== 'true') {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
    release: process.env.SENTRY_RELEASE || process.env.VERCEL_GIT_COMMIT_SHA,
    sendDefaultPii: false,
    tracesSampleRate: parseSampleRate(process.env.SENTRY_TRACES_SAMPLE_RATE, 0.1),
    beforeSend(event) {
      if (event.request) {
        delete event.request.cookies;
        delete event.request.data;
      }
      return event;
    },
  });
}

/**
 * Serverless functions can be frozen right after the response is sent, so
 * events must be flushed before returning.
 */
export async function captureException(error: unknown, route: string) {
  Sentry.captureException(error, { tags: { route } });
  await Sentry.flush(2000);
}

export async function captureMessage(message: string, route: string, extra: Record<string, unknown>) {
  Sentry.captureMessage(message, { level: 'error', tags: { route }, extra });
  await Sentry.flush(2000);
}
