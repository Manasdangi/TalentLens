import type { VercelRequest } from '@vercel/node';
import { getDocument } from './firebaseServer.js';
import { isValidSlug, normalizeProfile, type GithubStats, type LeetcodeStats, type ResumeProfile } from './profile.js';

export interface PublicPortfolio {
  slug: string;
  userId: string;
  theme: string;
  accent: string;
  profile: ResumeProfile;
  github?: GithubStats;
  leetcode?: LeetcodeStats;
}

export function readSlug(req: VercelRequest): string | null {
  const raw = Array.isArray(req.query.slug) ? req.query.slug[0] : req.query.slug;
  const slug = typeof raw === 'string' ? raw.toLowerCase() : '';
  return isValidSlug(slug) ? slug : null;
}

export function siteOrigin(req: VercelRequest): string {
  const host = (req.headers['x-forwarded-host'] as string | undefined) || req.headers.host || 'talentlens-gamma.vercel.app';
  return `https://${host.split(',')[0].trim()}`;
}

/**
 * Loads a published portfolio with anonymous Firestore access, so security rules guarantee
 * only published documents are ever served.
 */
export async function loadPublicPortfolio(slug: string): Promise<PublicPortfolio | null> {
  const doc = await getDocument(`Portfolios/${slug}`);
  if (!doc || doc.published !== true || typeof doc.profileJson !== 'string' || typeof doc.userId !== 'string') return null;

  let profile: ResumeProfile | null = null;
  try {
    profile = normalizeProfile(JSON.parse(doc.profileJson));
  } catch {
    profile = null;
  }
  if (!profile) return null;

  let github: GithubStats | undefined;
  let leetcode: LeetcodeStats | undefined;
  if (doc.showVerified !== false) {
    try {
      const verified = await getDocument(`VerifiedProfiles/${doc.userId}`);
      github = (verified?.github as GithubStats | undefined) ?? undefined;
      leetcode = (verified?.leetcode as LeetcodeStats | undefined) ?? undefined;
    } catch (error) {
      console.warn('[portfolio] Could not load verified profiles', error);
    }
  }

  return {
    slug,
    userId: doc.userId,
    theme: typeof doc.theme === 'string' ? doc.theme : '',
    accent: typeof doc.accent === 'string' ? doc.accent : '',
    profile,
    github,
    leetcode,
  };
}
