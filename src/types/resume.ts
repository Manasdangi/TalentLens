import { ROLES } from '../constants';

export type ResumeCategory =
  | 'frontend'
  | 'backend'
  | 'fullstack'
  | 'react_native'
  | 'ios'
  | 'android'
  | 'flutter'
  | 'devops'
  | 'data'
  | 'ml'
  | 'other';

export interface SavedResume {
  id: string;
  userId: string;
  category: ResumeCategory;
  label: string;
  content: string;
  fileName: string;
  createdAt: number;
  updatedAt: number;
  /** Target role when resume was saved (e.g. frontend, backend). */
  targetRole?: string;
  /** Experience level when resume was saved (e.g. junior, senior). */
  experienceLevel?: string;
  /** Job description text if any was provided when saving. */
  jobDescription?: string;
}

export interface ResumeSlot {
  slotIndex: number;
  resume: SavedResume | null;
}

/** Resume category options derived from shared ROLES (same value/label as role dropdown). */
export const RESUME_CATEGORIES: { value: ResumeCategory; label: string }[] = ROLES.map((r) => ({
  value: r.value as ResumeCategory,
  label: r.label,
}));

export { MAX_SAVED_RESUMES } from '../constants';
