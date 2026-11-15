/**
 * Structured resume profile shared by the browser app and the Vercel functions.
 * Keep this file free of Node-only and browser-only imports: both sides import it.
 */

export interface ProfileLink {
  label: string;
  url: string;
}

export interface ProfileExperience {
  company: string;
  role: string;
  location: string;
  start: string;
  end: string;
  /** One achievement per entry. Key words may be wrapped in **double asterisks** for bold. */
  bullets: string[];
}

export interface ProfileProject {
  name: string;
  description: string;
  tech: string[];
  url: string;
  repo: string;
}

export interface ProfileSkillGroup {
  group: string;
  items: string[];
}

export interface ProfileEducation {
  school: string;
  degree: string;
  year: string;
}

export interface ResumeProfile {
  basics: {
    name: string;
    headline: string;
    location: string;
    email: string;
    phone: string;
    summary: string;
  };
  links: ProfileLink[];
  experience: ProfileExperience[];
  projects: ProfileProject[];
  skills: ProfileSkillGroup[];
  education: ProfileEducation[];
}

export function emptyProfile(): ResumeProfile {
  return {
    basics: { name: '', headline: '', location: '', email: '', phone: '', summary: '' },
    links: [],
    experience: [],
    projects: [],
    skills: [],
    education: [],
  };
}

const MAX_ITEMS = 30;

function str(value: unknown, max = 600): string {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function strList(value: unknown, max = 600): string[] {
  if (typeof value === 'string') {
    return value
      .split(/\n|,(?![^(]*\))/)
      .map((item) => item.replace(/^\s*[-•*]\s+/, '').trim())
      .filter(Boolean)
      .slice(0, MAX_ITEMS)
      .map((item) => item.slice(0, max));
  }
  if (!Array.isArray(value)) return [];
  return value.map((item) => str(item, max)).filter(Boolean).slice(0, MAX_ITEMS);
}

function objList<T>(value: unknown, map: (item: Record<string, unknown>) => T, keep: (item: T) => boolean): T[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map(map)
    .filter(keep)
    .slice(0, MAX_ITEMS);
}

/** Coerces model output or stored JSON into a valid ResumeProfile. Returns null if it isn't an object. */
export function normalizeProfile(value: unknown): ResumeProfile | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const basics = (raw.basics && typeof raw.basics === 'object' ? raw.basics : {}) as Record<string, unknown>;

  return {
    basics: {
      name: str(basics.name, 120),
      headline: str(basics.headline ?? basics.role, 160),
      location: str(basics.location, 120),
      email: str(basics.email, 200),
      phone: str(basics.phone, 60),
      summary: str(basics.summary ?? basics.about, 1500),
    },
    links: objList(
      raw.links,
      (item) => ({ label: str(item.label, 60), url: str(item.url, 300) }),
      (item) => !!item.url,
    ),
    experience: objList(
      raw.experience,
      (item) => ({
        company: str(item.company, 120),
        role: str(item.role ?? item.title, 120),
        location: str(item.location, 120),
        start: str(item.start, 40),
        end: str(item.end, 40),
        bullets: strList(item.bullets),
      }),
      (item) => !!(item.company || item.role),
    ),
    projects: objList(
      raw.projects,
      (item) => ({
        name: str(item.name, 120),
        description: str(item.description, 600),
        tech: strList(item.tech, 60),
        url: str(item.url ?? item.live, 300),
        repo: str(item.repo, 300),
      }),
      (item) => !!item.name,
    ),
    skills: objList(
      raw.skills,
      (item) => ({ group: str(item.group, 60), items: strList(item.items, 60) }),
      (item) => item.items.length > 0,
    ),
    education: objList(
      raw.education,
      (item) => ({ school: str(item.school, 160), degree: str(item.degree, 160), year: str(item.year, 40) }),
      (item) => !!item.school,
    ),
  };
}

// ---------- Portfolio links (slugs) ----------

export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;

/** Paths that must never become a portfolio link. Keep in sync with firestore.rules. */
export const RESERVED_SLUGS = new Set([
  'admin', 'api', 'app', 'assets', 'auth', 'dashboard', 'help', 'jobs', 'login', 'logout',
  'p', 'portfolio', 'recruiter', 'settings', 'signup', 'support', 'talentlens', 'www',
]);

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');
}

export function isValidSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug) && !RESERVED_SLUGS.has(slug);
}

/** Candidate links to try, best first: "malika-sinha", "malikasinha", "malika-sinha-dev", … */
export function suggestSlugs(name: string, headline = ''): string[] {
  const base = slugify(name);
  if (!base) return [];
  const compact = base.replace(/-/g, '');
  const role = slugify(headline).split('-').find((part) => ['dev', 'developer', 'engineer', 'designer'].includes(part));
  const options = [
    base,
    compact,
    `${base}-dev`,
    role ? `${base}-${role}` : '',
    `${base}-portfolio`,
    `${base}-${new Date().getFullYear() % 100}`,
  ];
  return [...new Set(options)].filter(isValidSlug);
}

// ---------- Verified coding profiles ----------

export interface GithubStats {
  username: string;
  url: string;
  avatarUrl: string;
  publicRepos: number;
  followers: number;
  totalStars: number;
  topLanguages: string[];
  topRepos: { name: string; description: string; stars: number; language: string; url: string; homepage: string }[];
  verifiedAt: number;
  refreshedAt: number;
}

export interface LeetcodeStats {
  username: string;
  url: string;
  solved: { all: number; easy: number; medium: number; hard: number };
  ranking: number | null;
  contestRating: number | null;
  contestsAttended: number;
  topPercentage: number | null;
  verifiedAt: number;
  refreshedAt: number;
}

export interface VerifiedProfiles {
  userId: string;
  github?: GithubStats;
  leetcode?: LeetcodeStats;
  updatedAt: number;
}

export const GITHUB_USERNAME_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
export const LEETCODE_USERNAME_PATTERN = /^[A-Za-z0-9_-]{1,30}$/;
