import type { VercelRequest, VercelResponse } from '@vercel/node';
import { captureException, captureMessage } from './_lib/sentry.js';
import { checkRateLimit, getClientKey } from './_lib/rateLimit.js';
import {
  EXPERIENCE_LABELS,
  ROLE_LABELS,
  getScorePrompt,
  isScoringResult,
  type ScoringResult,
} from './_lib/scoring.js';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const RATE_LIMIT_WINDOW_MS = Number(process.env.SCORE_RATE_LIMIT_WINDOW_MS || 60 * 60 * 1000);
const RATE_LIMIT_MAX = Number(process.env.SCORE_RATE_LIMIT_MAX || 10);

// Input caps protect the Groq quota from oversized or abusive payloads.
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

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error('[score-resume] GROQ_API_KEY is not configured');
    res.status(500).json({ error: 'Groq API key is not configured on the server.' });
    return;
  }

  const userContent = hasJobDescription
    ? `RESUME:\n${resumeText}\n\n---\n\nJOB DESCRIPTION:\n${jobDescription}`
    : `RESUME:\n${resumeText}\n\n---\n\nNote: No specific job description was provided. Please evaluate the resume based on general best practices for a ${role} at ${experience} level.`;

  try {
    const groqResponse = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: getScorePrompt(role, experience, hasJobDescription) },
          { role: 'user', content: userContent },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      }),
      signal: AbortSignal.timeout(50_000),
    });

    if (!groqResponse.ok) {
      const errorBody = await groqResponse.text();
      await captureMessage('Groq request failed', 'score-resume', {
        upstream_status: groqResponse.status,
        body: errorBody.slice(0, 1000),
      });
      console.error('[score-resume] Groq request failed', { status: groqResponse.status, body: errorBody });
      res.status(groqResponse.status).json({
        error:
          groqResponse.status === 429
            ? 'Rate limit exceeded. Please wait a moment and try again.'
            : groqResponse.status === 401
              ? 'Invalid Groq API key. Please check the server configuration.'
              : 'Failed to analyze resume.',
      });
      return;
    }

    const data = (await groqResponse.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      res.status(502).json({ error: 'No response from LLM.' });
      return;
    }

    const parsed = JSON.parse(content) as unknown;
    if (!isScoringResult(parsed)) {
      res.status(502).json({ error: 'LLM returned an invalid scoring result.' });
      return;
    }

    res.json(parsed);
  } catch (error) {
    await captureException(error, 'score-resume');
    console.error('[score-resume] Unexpected scoring error', error);
    res.status(500).json({ error: 'Failed to analyze resume.' });
  }
}
