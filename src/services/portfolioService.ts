import { collection, deleteDoc, doc, getDoc, getDocs, limit, query, setDoc, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { isE2EMode } from '../utils/e2eMode';
import { isValidSlug, normalizeProfile, type ResumeProfile } from '../../api/_lib/profile';

const COLLECTION_NAME = 'Portfolios';
const E2E_KEY = 'talentlens_e2e_portfolios';

/** Firestore shape. The profile is stored as a JSON string so the server can read it over REST easily. */
interface PortfolioDoc {
  slug: string;
  userId: string;
  name: string;
  theme: string;
  accent: string;
  profileJson: string;
  published: boolean;
  showVerified: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Portfolio {
  slug: string;
  userId: string;
  theme: string;
  accent: string;
  profile: ResumeProfile;
  published: boolean;
  showVerified: boolean;
  createdAt: number;
  updatedAt: number;
}

function fromDoc(data: PortfolioDoc): Portfolio | null {
  let profile: ResumeProfile | null = null;
  try {
    profile = normalizeProfile(JSON.parse(data.profileJson));
  } catch {
    profile = null;
  }
  if (!profile) return null;
  return {
    slug: data.slug,
    userId: data.userId,
    theme: data.theme,
    accent: data.accent,
    profile,
    published: data.published,
    showVerified: data.showVerified !== false,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

// ---------- E2E (localStorage) fallback ----------

function readE2E(): PortfolioDoc[] {
  try {
    return JSON.parse(window.localStorage.getItem(E2E_KEY) || '[]') as PortfolioDoc[];
  } catch {
    return [];
  }
}

function writeE2E(docs: PortfolioDoc[]) {
  window.localStorage.setItem(E2E_KEY, JSON.stringify(docs));
}

// ---------- Public API ----------

export function portfolioUrl(slug: string): string {
  return `${window.location.origin}/p/${slug}`;
}

export async function getMyPortfolio(userId: string): Promise<Portfolio | null> {
  if (isE2EMode()) {
    const found = readE2E().find((d) => d.userId === userId);
    return found ? fromDoc(found) : null;
  }
  const snapshot = await getDocs(query(collection(db, COLLECTION_NAME), where('userId', '==', userId), limit(1)));
  const first = snapshot.docs[0];
  return first ? fromDoc(first.data() as PortfolioDoc) : null;
}

/** The published portfolio link for a candidate, for recruiter views. */
export async function getPublishedSlugForUser(userId: string): Promise<string | null> {
  if (isE2EMode()) return readE2E().find((d) => d.userId === userId && d.published)?.slug ?? null;
  const snapshot = await getDocs(
    query(collection(db, COLLECTION_NAME), where('userId', '==', userId), where('published', '==', true), limit(1)),
  );
  return snapshot.docs[0]?.id ?? null;
}

export type SlugStatus = 'available' | 'yours' | 'taken' | 'invalid';

export async function checkSlug(slug: string, userId: string): Promise<SlugStatus> {
  if (!isValidSlug(slug)) return 'invalid';
  if (isE2EMode()) {
    const found = readE2E().find((d) => d.slug === slug);
    return !found ? 'available' : found.userId === userId ? 'yours' : 'taken';
  }
  try {
    const snapshot = await getDoc(doc(db, COLLECTION_NAME, slug));
    if (!snapshot.exists()) return 'available';
    return (snapshot.data() as PortfolioDoc).userId === userId ? 'yours' : 'taken';
  } catch {
    // Someone else's unpublished portfolio can't be read, which also means the link is taken.
    return 'taken';
  }
}

export interface SavePortfolioInput {
  userId: string;
  slug: string;
  previousSlug?: string;
  theme: string;
  accent: string;
  profile: ResumeProfile;
  published: boolean;
  showVerified: boolean;
  createdAt?: number;
}

/** Saves the portfolio under its link. Changing the link moves the document and frees the old one. */
export async function savePortfolio(input: SavePortfolioInput): Promise<Portfolio> {
  if (!isValidSlug(input.slug)) {
    throw new Error('Links can use lowercase letters, numbers and dashes (3-40 characters).');
  }
  const profile = normalizeProfile(input.profile);
  if (!profile) throw new Error('Portfolio content is invalid.');

  const now = Date.now();
  const data: PortfolioDoc = {
    slug: input.slug,
    userId: input.userId,
    name: profile.basics.name,
    theme: input.theme,
    accent: input.accent,
    profileJson: JSON.stringify(profile),
    published: input.published,
    showVerified: input.showVerified,
    createdAt: input.createdAt ?? now,
    updatedAt: now,
  };

  if (isE2EMode()) {
    const docs = readE2E().filter((d) => d.slug !== input.slug && d.slug !== input.previousSlug);
    writeE2E([...docs, data]);
    return fromDoc(data)!;
  }

  try {
    await setDoc(doc(db, COLLECTION_NAME, input.slug), data);
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === 'permission-denied') throw new Error('That link was just taken. Pick another one.');
    throw error;
  }
  if (input.previousSlug && input.previousSlug !== input.slug) {
    await deleteDoc(doc(db, COLLECTION_NAME, input.previousSlug)).catch((error) => {
      console.warn('Could not remove the old portfolio link', error);
    });
  }
  return fromDoc(data)!;
}
