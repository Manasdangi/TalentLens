import * as Sentry from '@sentry/react';

function parseSampleRate(value: string | undefined, fallback: number) {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : fallback;
}

const dsn = import.meta.env.VITE_SENTRY_DSN;
const isE2E = import.meta.env.VITE_E2E_MODE === 'true';

if (dsn && !isE2E) {
  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE,
    release: import.meta.env.VITE_SENTRY_RELEASE,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    sendDefaultPii: false,
    tracesSampleRate: parseSampleRate(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE, 0.1),
    tracePropagationTargets: [
      /^\//,
      import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001',
    ],
    replaysSessionSampleRate: parseSampleRate(
      import.meta.env.VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE,
      0
    ),
    replaysOnErrorSampleRate: parseSampleRate(
      import.meta.env.VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE,
      1
    ),
  });
}

export function setSentryUserContext(user: { id: string; userType?: string } | null) {
  if (!dsn || isE2E) return;

  Sentry.setUser(user ? { id: user.id } : null);
  Sentry.setTag('user.type', user?.userType ?? 'signed-out');
}

export { Sentry };
