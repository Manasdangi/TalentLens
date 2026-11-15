import type { VercelRequest, VercelResponse } from '@vercel/node';
import { checkRateLimit, getClientKey } from './_lib/rateLimit.js';
import { DEFAULT_CLAUDE_MODEL, askClaude, extractJsonObject } from './_lib/claude.js';
import { EXPERIENCE_LABELS, ROLE_LABELS } from './_lib/scoring.js';
import { getTailorPrompt, normalizeTailorResult, type TailorResult } from './_lib/tailor.js';
import { isMockAi, sendClaudeError } from './_lib/aiHandler.js';

const RATE_LIMIT_WINDOW_MS = Number(process.env.TAILOR_RATE_LIMIT_WINDOW_MS || 60 * 60 * 1000);
const RATE_LIMIT_MAX = Number(process.env.TAILOR_RATE_LIMIT_MAX || 10);
const MAX_RESUME_CHARS = 40_000;
const MAX_JOB_DESCRIPTION_CHARS = 20_000;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  const rateLimit = await checkRateLimit(`rl:tailor:${getClientKey(req)}`, { max: RATE_LIMIT_MAX, windowMs: RATE_LIMIT_WINDOW_MS });
  if (!rateLimit.allowed) {
    res.status(429).setHeader('Retry-After', String(rateLimit.retryAfterSeconds))
      .json({ error: 'Too many tailoring requests. Please wait before trying again.' });
    return;
  }

  const { resumeText, jobDescription, roleType = '', experienceLevel = '' } = (req.body ?? {}) as Record<string, unknown>;
  if (typeof resumeText !== 'string' || !resumeText.trim()) {
    res.status(400).json({ error: 'Resume text is required.' });
    return;
  }
  if (typeof jobDescription !== 'string' || !jobDescription.trim()) {
    res.status(400).json({ error: 'Paste a job description to tailor your resume.' });
    return;
  }
  if (typeof roleType !== 'string' || typeof experienceLevel !== 'string') {
    res.status(400).json({ error: 'Invalid tailoring request.' });
    return;
  }
  if (resumeText.length > MAX_RESUME_CHARS || jobDescription.length > MAX_JOB_DESCRIPTION_CHARS) {
    res.status(413).json({ error: 'Resume or job description is too long.' });
    return;
  }

  const role = ROLE_LABELS[roleType] || roleType.slice(0, 100) || 'General';
  const experience = EXPERIENCE_LABELS[experienceLevel] || experienceLevel.slice(0, 100) || 'Not specified';

  if (isMockAi()) {
    const firstLine = resumeText.split('\n').map((l) => l.trim()).find((l) => l.length > 20) ?? resumeText.slice(0, 80);
    res.json({
      headline: `${role} focused on the skills this job asks for`,
      summary: `Mock tailored summary for ${role} at ${experience}.`,
      bullets: [{ original: firstLine, improved: `**Mock** rewrite: ${firstLine}`, keywordsUsed: ['React'] }],
      unsupportedKeywords: ['CI/CD'],
      tips: ['Mention testing ownership if you have it.'],
    } satisfies TailorResult);
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'The tailoring service is not configured on the server.' });
    return;
  }

  try {
    const text = await askClaude({
      apiKey,
      model: process.env.ANTHROPIC_TAILOR_MODEL || process.env.ANTHROPIC_MODEL || DEFAULT_CLAUDE_MODEL,
      system: getTailorPrompt(role, experience),
      user: `<resume>\n${resumeText}\n</resume>\n\n<job_description>\n${jobDescription}\n</job_description>`,
      maxTokens: 6000,
    });
    let parsed: TailorResult | null = null;
    try {
      parsed = normalizeTailorResult(extractJsonObject(text), resumeText);
    } catch {
      console.error('[tailor-resume] Model response was not valid JSON', text.slice(0, 500));
    }
    if (!parsed) {
      res.status(502).json({ error: 'The AI model returned an invalid result. Please try again.' });
      return;
    }
    res.json(parsed);
  } catch (error) {
    await sendClaudeError(res, error, 'tailor-resume', 'Failed to tailor resume.');
  }
}
