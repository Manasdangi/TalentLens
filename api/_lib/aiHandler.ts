import type { VercelResponse } from '@vercel/node';
import { ClaudeApiError } from './claude.js';
import { captureException, captureMessage } from './sentry.js';

/** Maps Claude API failures to user-facing errors, the same way score-resume does. */
export async function sendClaudeError(res: VercelResponse, error: unknown, tag: string, fallback: string) {
  if (error instanceof ClaudeApiError) {
    await captureMessage('Claude API request failed', tag, {
      upstream_status: error.status,
      body: error.body.slice(0, 1000),
    });
    console.error(`[${tag}] Claude API request failed`, { status: error.status, body: error.body });
    if (error.status === 429) {
      res.status(429).json({ error: 'The AI service is rate limited. Please wait a moment and try again.' });
    } else if (error.status === 529 || error.status >= 500) {
      res.status(503).json({ error: 'The AI service is busy right now. Please try again in a moment.' });
    } else if (error.status === 401 || error.status === 403) {
      res.status(500).json({ error: 'The AI service is misconfigured. Please try again later.' });
    } else {
      res.status(502).json({ error: fallback });
    }
    return;
  }
  await captureException(error, tag);
  console.error(`[${tag}] Unexpected error`, error);
  res.status(500).json({ error: fallback });
}

export function isMockAi() {
  return process.env.MOCK_AI === 'true' || process.env.MOCK_SCORE_RESUME === 'true';
}
