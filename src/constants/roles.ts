/**
 * Single source for role and experience level options and types.
 * Used by RoleFilters, job/resume forms, and ResumeByRole queries.
 */

export const ROLES = [
  { value: 'frontend', label: 'Frontend Developer' },
  { value: 'backend', label: 'Backend Developer' },
  { value: 'fullstack', label: 'Full Stack Developer' },
  { value: 'react_native', label: 'React Native Developer' },
  { value: 'ios', label: 'iOS Developer' },
  { value: 'android', label: 'Android Developer' },
  { value: 'flutter', label: 'Flutter Developer' },
  { value: 'devops', label: 'DevOps Engineer' },
  { value: 'data', label: 'Data Engineer' },
  { value: 'ml', label: 'ML Engineer' },
  { value: 'other', label: 'Other' },
] as const;

export const EXPERIENCE_LEVELS = [
  { value: 'fresher', label: 'Fresher (0-1 years)' },
  { value: 'junior', label: 'Junior (1-2 years)' },
  { value: 'mid', label: 'Mid-Level (2-4 years)' },
  { value: 'senior', label: 'Senior (4-7 years)' },
  { value: 'lead', label: 'Lead (7-10 years)' },
  { value: 'principal', label: 'Principal (10+ years)' },
] as const;

export type RoleType = (typeof ROLES)[number]['value'] | '';
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number]['value'] | '';

/** Role values as strings for Firestore document IDs (ResumeByRole/{roleId}) */
export const ROLE_IDS: string[] = ROLES.map((r) => r.value);
