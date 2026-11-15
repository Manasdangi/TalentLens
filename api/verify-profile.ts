import type { VercelRequest, VercelResponse } from '@vercel/node';
import { captureException } from './_lib/sentry.js';
import { checkRateLimit } from './_lib/rateLimit.js';
import { getDocument, getServiceAccount, mergeDocumentAsAdmin, verifyFirebaseIdToken } from './_lib/firebaseServer.js';
import {
  ProfileNotFoundError,
  bioContainsCode,
  fetchGithub,
  fetchLeetcode,
  verificationCode,
  type Platform,
} from './_lib/codingProfiles.js';
import { GITHUB_USERNAME_PATTERN, LEETCODE_USERNAME_PATTERN } from './_lib/profile.js';

const RATE_LIMIT_MAX = Number(process.env.VERIFY_RATE_LIMIT_MAX || 30);
const RATE_LIMIT_WINDOW_MS = Number(process.env.VERIFY_RATE_LIMIT_WINDOW_MS || 60 * 60 * 1000);
const PLATFORM_NAMES: Record<Platform, string> = { github: 'GitHub', leetcode: 'LeetCode' };
const BIO_FIELD: Record<Platform, string> = { github: 'GitHub bio', leetcode: 'LeetCode profile Summary' };

/**
 * Proves a candidate owns a GitHub or LeetCode account, then stores live stats in
 * VerifiedProfiles/{uid}. Only this function (service account) can write that collection.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  const caller = await verifyFirebaseIdToken(req.headers.authorization);
  if (!caller) {
    res.status(401).json({ error: 'Please sign in again to verify your profiles.' });
    return;
  }
  if (!getServiceAccount()) {
    console.error('[verify-profile] FIREBASE_SERVICE_ACCOUNT is not configured');
    res.status(500).json({ error: 'Profile verification is not configured on the server yet.' });
    return;
  }

  const rateLimit = await checkRateLimit(`rl:verify:${caller.uid}`, { max: RATE_LIMIT_MAX, windowMs: RATE_LIMIT_WINDOW_MS });
  if (!rateLimit.allowed) {
    res.status(429).setHeader('Retry-After', String(rateLimit.retryAfterSeconds))
      .json({ error: 'Too many verification attempts. Please try again later.' });
    return;
  }

  const { platform, username: rawUsername, action } = (req.body ?? {}) as Record<string, unknown>;
  if (platform !== 'github' && platform !== 'leetcode') {
    res.status(400).json({ error: 'Unknown platform.' });
    return;
  }
  if (action !== 'code' && action !== 'verify' && action !== 'refresh' && action !== 'remove') {
    res.status(400).json({ error: 'Unknown action.' });
    return;
  }
  const docPath = `VerifiedProfiles/${caller.uid}`;

  try {
    if (action === 'remove') {
      await mergeDocumentAsAdmin(docPath, { [platform]: undefined, userId: caller.uid, updatedAt: Date.now() });
      res.json({ ok: true });
      return;
    }

    let username = typeof rawUsername === 'string' ? rawUsername.trim().replace(/^@/, '') : '';
    let existing: Record<string, unknown> | null = null;
    if (action === 'refresh') {
      existing = await getDocument(docPath, true);
      const stored = (existing?.[platform] as { username?: string } | undefined)?.username;
      if (!stored) {
        res.status(404).json({ error: `Verify your ${PLATFORM_NAMES[platform]} account first.` });
        return;
      }
      username = stored;
    }

    const pattern = platform === 'github' ? GITHUB_USERNAME_PATTERN : LEETCODE_USERNAME_PATTERN;
    if (!pattern.test(username)) {
      res.status(400).json({ error: `Enter a valid ${PLATFORM_NAMES[platform]} username.` });
      return;
    }

    const code = verificationCode(caller.uid, platform, username);
    if (!code) {
      res.status(500).json({ error: 'Profile verification is not configured on the server yet.' });
      return;
    }
    if (action === 'code') {
      res.json({ code });
      return;
    }

    const fetched = platform === 'github' ? await fetchGithub(username) : await fetchLeetcode(username);
    const previous = existing?.[platform] as { verifiedAt?: number } | undefined;

    if (action === 'verify' && !bioContainsCode(fetched.bio, code)) {
      res.status(409).json({
        error: `We couldn't find ${code} in your ${BIO_FIELD[platform]} yet. Save it there, wait a few seconds, then try again.`,
        code,
      });
      return;
    }

    const now = Date.now();
    const stats = { ...fetched.stats, verifiedAt: previous?.verifiedAt ?? now, refreshedAt: now };
    await mergeDocumentAsAdmin(docPath, { [platform]: stats, userId: caller.uid, updatedAt: now });
    res.json({ stats });
  } catch (error) {
    if (error instanceof ProfileNotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }
    await captureException(error, 'verify-profile');
    console.error('[verify-profile] Failed', error);
    res.status(502).json({ error: `Couldn't reach ${PLATFORM_NAMES[platform]} right now. Please try again in a minute.` });
  }
}
