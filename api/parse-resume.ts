import type { VercelRequest, VercelResponse } from '@vercel/node';
import { checkRateLimit, getClientKey } from './_lib/rateLimit.js';
import { DEFAULT_CLAUDE_MODEL, askClaude, extractJsonObject } from './_lib/claude.js';
import { PARSE_PROMPT, normalizeParsedProfile } from './_lib/tailor.js';
import { isMockAi, sendClaudeError } from './_lib/aiHandler.js';
import type { ResumeProfile } from './_lib/profile.js';

const RATE_LIMIT_WINDOW_MS = Number(process.env.PARSE_RATE_LIMIT_WINDOW_MS || 60 * 60 * 1000);
const RATE_LIMIT_MAX = Number(process.env.PARSE_RATE_LIMIT_MAX || 10);
const MAX_RESUME_CHARS = 40_000;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  const rateLimit = await checkRateLimit(`rl:parse:${getClientKey(req)}`, { max: RATE_LIMIT_MAX, windowMs: RATE_LIMIT_WINDOW_MS });
  if (!rateLimit.allowed) {
    res.status(429).setHeader('Retry-After', String(rateLimit.retryAfterSeconds))
      .json({ error: 'Too many imports. Please wait before trying again.' });
    return;
  }

  const { resumeText } = (req.body ?? {}) as { resumeText?: unknown };
  if (typeof resumeText !== 'string' || resumeText.trim().length < 40) {
    res.status(400).json({ error: 'Resume text is required.' });
    return;
  }
  if (resumeText.length > MAX_RESUME_CHARS) {
    res.status(413).json({ error: 'Resume is too long.' });
    return;
  }

  if (isMockAi()) {
    res.json({
      basics: { name: 'E2E Candidate', headline: 'Frontend Engineer', location: 'Remote', email: '', phone: '', summary: 'Mock parsed summary.' },
      links: [],
      experience: [{ company: 'Acme', role: 'Frontend Engineer', location: '', start: 'Jan 2024', end: 'Present', bullets: ['Built **React** dashboards.'] }],
      projects: [],
      skills: [{ group: 'Frontend', items: ['React', 'TypeScript'] }],
      education: [],
    } satisfies ResumeProfile);
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'The import service is not configured on the server.' });
    return;
  }

  try {
    const text = await askClaude({
      apiKey,
      model: process.env.ANTHROPIC_MODEL || DEFAULT_CLAUDE_MODEL,
      system: PARSE_PROMPT,
      user: `<resume>\n${resumeText}\n</resume>`,
      maxTokens: 8000,
    });
    let profile: ResumeProfile | null = null;
    try {
      profile = normalizeParsedProfile(extractJsonObject(text));
    } catch {
      console.error('[parse-resume] Model response was not valid JSON', text.slice(0, 500));
    }
    if (!profile) {
      res.status(502).json({ error: "We couldn't read that resume. Try another file or fill the details in by hand." });
      return;
    }
    res.json(profile);
  } catch (error) {
    await sendClaudeError(res, error, 'parse-resume', 'Failed to import resume.');
  }
}
