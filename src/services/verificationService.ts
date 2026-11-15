import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { isE2EMode } from '../utils/e2eMode';
import type { GithubStats, LeetcodeStats, VerifiedProfiles } from '../../api/_lib/profile';

export type { GithubStats, LeetcodeStats, VerifiedProfiles } from '../../api/_lib/profile';
export type Platform = 'github' | 'leetcode';

const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const cache = new Map<string, Promise<VerifiedProfiles | null>>();

/** Public read; cached per page load because recruiter lists ask for the same candidates repeatedly. */
export function getVerifiedProfiles(userId: string, { fresh = false } = {}): Promise<VerifiedProfiles | null> {
  if (isE2EMode()) return Promise.resolve(null);
  if (!fresh && cache.has(userId)) return cache.get(userId)!;
  const promise = getDoc(doc(db, 'VerifiedProfiles', userId))
    .then((snapshot) => (snapshot.exists() ? (snapshot.data() as VerifiedProfiles) : null))
    .catch((error) => {
      console.warn('Failed to load verified profiles', error);
      cache.delete(userId);
      return null;
    });
  cache.set(userId, promise);
  return promise;
}

type VerifyAction = 'code' | 'verify' | 'refresh' | 'remove';

interface VerifyResponse {
  code?: string;
  stats?: GithubStats | LeetcodeStats;
  ok?: boolean;
  error?: string;
}

export async function callVerifyProfile(platform: Platform, action: VerifyAction, username = ''): Promise<VerifyResponse> {
  const user = auth.currentUser;
  if (!user) throw new Error('Please sign in again.');
  const token = await user.getIdToken();

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/verify-profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ platform, action, username }),
    });
  } catch {
    throw new Error('Could not reach the server. Please check your connection and try again.');
  }
  const payload = (await response.json().catch(() => ({}))) as VerifyResponse;
  if (!response.ok) throw new Error(payload.error || 'Verification failed.');
  cache.delete(user.uid);
  return payload;
}
