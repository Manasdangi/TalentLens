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

export const RESUME_CATEGORIES: { value: ResumeCategory; label: string }[] = [
  { value: 'frontend', label: 'Frontend' },
  { value: 'backend', label: 'Backend' },
  { value: 'fullstack', label: 'Full Stack' },
  { value: 'react_native', label: 'React Native' },
  { value: 'ios', label: 'iOS' },
  { value: 'android', label: 'Android' },
  { value: 'flutter', label: 'Flutter' },
  { value: 'devops', label: 'DevOps' },
  { value: 'data', label: 'Data' },
  { value: 'ml', label: 'ML' },
  { value: 'other', label: 'Other' },
];

export const MAX_SAVED_RESUMES = 4;
