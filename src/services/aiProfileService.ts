import type { ResumeProfile } from '../../api/_lib/profile';
import type { TailorResult } from '../../api/_lib/tailor';
import type { RoleType, ExperienceLevel } from '../constants';

export type { TailorResult, TailoredBullet } from '../../api/_lib/tailor';

const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

async function postJson<T>(path: string, body: unknown, fallback: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('Could not reach the server. Please check your connection and try again.');
  }
  const payload = (await response.json().catch(() => ({}))) as T | { error?: string };
  if (!response.ok) {
    const message = payload && typeof payload === 'object' && 'error' in payload ? payload.error : undefined;
    throw new Error(message || fallback);
  }
  return payload as T;
}

/** Turns resume (or LinkedIn PDF) text into a structured profile for the portfolio editor. */
export function parseResumeToProfile(resumeText: string): Promise<ResumeProfile> {
  return postJson<ResumeProfile>('/api/parse-resume', { resumeText }, 'Failed to import resume');
}

/** Rewrites resume bullets for one job description without inventing experience. */
export function tailorResume(
  resumeText: string,
  jobDescription: string,
  roleType: RoleType,
  experienceLevel: ExperienceLevel,
): Promise<TailorResult> {
  return postJson<TailorResult>(
    '/api/tailor-resume',
    { resumeText, jobDescription, roleType, experienceLevel },
    'Failed to tailor resume',
  );
}
