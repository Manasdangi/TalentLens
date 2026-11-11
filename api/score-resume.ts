import type { VercelRequest, VercelResponse } from '@vercel/node';
import { captureException, captureMessage } from './_lib/sentry.js';
import { checkRateLimit, getClientKey } from './_lib/rateLimit.js';
import { ClaudeApiError, DEFAULT_CLAUDE_MODEL, askClaude, extractJsonObject } from './_lib/claude.js';
import {
  EXPERIENCE_LABELS,
  ROLE_LABELS,
  getScorePrompt,
  normalizeScoringResult,
  type ScoringResult,
} from './_lib/scoring.js';

const RATE_LIMIT_WINDOW_MS = Number(process.env.SCORE_RATE_LIMIT_WINDOW_MS || 60 * 60 * 1000);
const RATE_LIMIT_MAX = Number(process.env.SCORE_RATE_LIMIT_MAX || 10);

// Input caps protect the Claude API budget from oversized or abusive payloads.
const MAX_RESUME_CHARS = 40_000;
const MAX_JOB_DESCRIPTION_CHARS = 20_000;
const MAX_LABEL_CHARS = 100;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  const rateLimit = await checkRateLimit(`rl:score:${getClientKey(req)}`, {
    max: RATE_LIMIT_MAX,
    windowMs: RATE_LIMIT_WINDOW_MS,
  });
  if (!rateLimit.allowed) {
    res
      .status(429)
      .setHeader('Retry-After', String(rateLimit.retryAfterSeconds))
      .json({ error: 'Too many resume analyses. Please wait before trying again.' });
    return;
  }

  const {
    resumeText,
    jobDescription = '',
    roleType = '',
    experienceLevel = '',
  } = (req.body ?? {}) as {
    resumeText?: unknown;
    jobDescription?: unknown;
    roleType?: unknown;
    experienceLevel?: unknown;
  };

  if (typeof resumeText !== 'string' || resumeText.trim().length === 0) {
    res.status(400).json({ error: 'Resume text is required.' });
    return;
  }
  if (typeof jobDescription !== 'string' || typeof roleType !== 'string' || typeof experienceLevel !== 'string') {
    res.status(400).json({ error: 'Invalid scoring request.' });
    return;
  }
  if (
    resumeText.length > MAX_RESUME_CHARS ||
    jobDescription.length > MAX_JOB_DESCRIPTION_CHARS ||
    roleType.length > MAX_LABEL_CHARS ||
    experienceLevel.length > MAX_LABEL_CHARS
  ) {
    res.status(413).json({ error: 'Resume or job description is too long.' });
    return;
  }

  const role = ROLE_LABELS[roleType] || roleType || 'General';
  const experience = EXPERIENCE_LABELS[experienceLevel] || experienceLevel || 'Not specified';
  const hasJobDescription = jobDescription.trim().length > 0;

  if (process.env.MOCK_SCORE_RESUME === 'true') {
    res.json({
      score: 'very_good',
      percentage: 78,
      summary: `Mock scoring result for ${role} at ${experience}.`,
      strengths: ['Relevant technical skills', 'Clear project experience'],
      improvements: ['Add more quantified impact'],
      keywordMatches: ['React', 'TypeScript', 'Testing'],
      missingKeywords: hasJobDescription ? ['CI/CD'] : [],
    } satisfies ScoringResult);
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('[score-resume] ANTHROPIC_API_KEY is not configured');
    res.status(500).json({ error: 'The scoring service is not configured on the server.' });
    return;
  }

  const userContent = hasJobDescription
    ? `<resume>\n${resumeText}\n</resume>\n\n<job_description>\n${jobDescription}\n</job_description>`
    : `<resume>\n${resumeText}\n</resume>\n\nNote: No specific job description was provided. Please evaluate the resume based on general best practices for a ${role} at ${experience} level.`;

  try {
    const text = await askClaude({
      apiKey,
      model: process.env.ANTHROPIC_MODEL || DEFAULT_CLAUDE_MODEL,
      system: getScorePrompt(role, experience, hasJobDescription),
      user: userContent,
    });

    if (!text) {
      res.status(502).json({ error: 'No response from the AI model.' });
      return;
    }

    let parsed: ScoringResult | null = null;
    try {
      parsed = normalizeScoringResult(extractJsonObject(text));
    } catch {
      console.error('[score-resume] Model response was not valid JSON', text.slice(0, 500));
    }
    if (!parsed) {
      res.status(502).json({ error: 'The AI model returned an invalid scoring result.' });
      return;
    }

    res.json(parsed);
  } catch (error) {
    if (error instanceof ClaudeApiError) {
      await captureMessage('Claude API request failed', 'score-resume', {
        upstream_status: error.status,
        body: error.body.slice(0, 1000),
      });
      console.error('[score-resume] Claude API request failed', { status: error.status, body: error.body });

      if (error.status === 429) {
        res.status(429).json({ error: 'The AI service is rate limited. Please wait a moment and try again.' });
      } else if (error.status === 529 || error.status >= 500) {
        res.status(503).json({ error: 'The AI service is busy right now. Please try again in a moment.' });
      } else if (error.status === 401 || error.status === 403) {
        res.status(500).json({ error: 'The scoring service is misconfigured. Please try again later.' });
      } else {
        res.status(502).json({ error: 'Failed to analyze resume.' });
      }
      return;
    }

    await captureException(error, 'score-resume');
    console.error('[score-resume] Unexpected scoring error', error);
    res.status(500).json({ error: 'Failed to analyze resume.' });
  }
}
