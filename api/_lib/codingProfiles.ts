/**
 * Fetches public GitHub and LeetCode profiles and builds stable verification codes.
 * Ownership is proven by putting a per-user code in the profile bio (GitHub "Bio", LeetCode "Summary").
 */
import { createHmac } from 'node:crypto';
import type { GithubStats, LeetcodeStats } from './profile.js';
import { getServiceAccount } from './firebaseServer.js';

export type Platform = 'github' | 'leetcode';

export class ProfileNotFoundError extends Error {}
export class UpstreamError extends Error {}

function verificationSecret(): string | null {
  return process.env.VERIFICATION_SECRET || getServiceAccount()?.private_key || null;
}

/** Same user + platform + username always gets the same code, so nothing has to be stored. */
export function verificationCode(uid: string, platform: Platform, username: string): string | null {
  const secret = verificationSecret();
  if (!secret) return null;
  const digest = createHmac('sha256', secret).update(`${uid}:${platform}:${username.toLowerCase()}`).digest('hex');
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += alphabet[parseInt(digest.slice(i * 2, i * 2 + 2), 16) % alphabet.length];
  return `TL-${code}`;
}

export function bioContainsCode(bio: string | null | undefined, code: string): boolean {
  return typeof bio === 'string' && bio.toUpperCase().includes(code.toUpperCase());
}

// ---------- GitHub ----------

function githubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'TalentLens',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return headers;
}

interface GithubUser {
  login: string;
  html_url: string;
  avatar_url: string;
  bio: string | null;
  public_repos: number;
  followers: number;
}

interface GithubRepo {
  name: string;
  description: string | null;
  stargazers_count: number;
  language: string | null;
  html_url: string;
  homepage: string | null;
  fork: boolean;
  archived: boolean;
}

export async function fetchGithub(username: string): Promise<{ bio: string; stats: Omit<GithubStats, 'verifiedAt' | 'refreshedAt'> }> {
  const userRes = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, {
    headers: githubHeaders(),
    signal: AbortSignal.timeout(8000),
  });
  if (userRes.status === 404) throw new ProfileNotFoundError('GitHub user not found.');
  if (!userRes.ok) throw new UpstreamError(`GitHub responded with ${userRes.status}`);
  const user = (await userRes.json()) as GithubUser;

  const reposRes = await fetch(
    `https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&sort=pushed&type=owner`,
    { headers: githubHeaders(), signal: AbortSignal.timeout(8000) },
  );
  const repos = reposRes.ok ? ((await reposRes.json()) as GithubRepo[]).filter((r) => !r.fork) : [];

  const languageCounts = new Map<string, number>();
  for (const repo of repos) {
    if (repo.language) languageCounts.set(repo.language, (languageCounts.get(repo.language) ?? 0) + 1);
  }

  return {
    bio: user.bio ?? '',
    stats: {
      username: user.login,
      url: user.html_url,
      avatarUrl: user.avatar_url,
      publicRepos: user.public_repos,
      followers: user.followers,
      totalStars: repos.reduce((sum, r) => sum + r.stargazers_count, 0),
      topLanguages: [...languageCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([lang]) => lang),
      topRepos: repos
        .filter((r) => !r.archived)
        .sort((a, b) => b.stargazers_count - a.stargazers_count)
        .slice(0, 4)
        .map((r) => ({
          name: r.name,
          description: (r.description ?? '').slice(0, 200),
          stars: r.stargazers_count,
          language: r.language ?? '',
          url: r.html_url,
          homepage: r.homepage && /^https?:\/\//.test(r.homepage) ? r.homepage : '',
        })),
    },
  };
}

// ---------- LeetCode (unofficial public GraphQL endpoint; may change without notice) ----------

const LEETCODE_QUERY = `query talentlensProfile($username: String!) {
  matchedUser(username: $username) {
    username
    profile { aboutMe ranking }
    submitStatsGlobal { acSubmissionNum { difficulty count } }
  }
  userContestRanking(username: $username) { rating attendedContestsCount topPercentage }
}`;

interface LeetcodeResponse {
  data?: {
    matchedUser: null | {
      username: string;
      profile: { aboutMe: string | null; ranking: number | null };
      submitStatsGlobal: { acSubmissionNum: { difficulty: string; count: number }[] };
    };
    userContestRanking: null | { rating: number; attendedContestsCount: number; topPercentage: number | null };
  };
  errors?: { message: string }[];
}

export async function fetchLeetcode(username: string): Promise<{ bio: string; stats: Omit<LeetcodeStats, 'verifiedAt' | 'refreshedAt'> }> {
  const response = await fetch('https://leetcode.com/graphql/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Referer: `https://leetcode.com/u/${encodeURIComponent(username)}/`,
      Origin: 'https://leetcode.com',
      'User-Agent': 'Mozilla/5.0 (compatible; TalentLens/1.0)',
    },
    body: JSON.stringify({ query: LEETCODE_QUERY, variables: { username } }),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new UpstreamError(`LeetCode responded with ${response.status}`);
  const json = (await response.json()) as LeetcodeResponse;
  const user = json.data?.matchedUser;
  if (!user) throw new ProfileNotFoundError('LeetCode user not found.');

  const count = (difficulty: string) =>
    user.submitStatsGlobal.acSubmissionNum.find((s) => s.difficulty.toLowerCase() === difficulty)?.count ?? 0;
  const contest = json.data?.userContestRanking;

  return {
    bio: user.profile.aboutMe ?? '',
    stats: {
      username: user.username,
      url: `https://leetcode.com/u/${encodeURIComponent(user.username)}/`,
      solved: { all: count('all'), easy: count('easy'), medium: count('medium'), hard: count('hard') },
      ranking: user.profile.ranking ?? null,
      contestRating: contest?.attendedContestsCount ? contest.rating : null,
      contestsAttended: contest?.attendedContestsCount ?? 0,
      topPercentage: contest?.attendedContestsCount ? contest.topPercentage : null,
    },
  };
}
