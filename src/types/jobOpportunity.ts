import type { RoleType, ExperienceLevel } from '../components/RoleFilters';

export interface JobOpportunity {
  id: string;
  recruiterId: string;
  /** Recruiter's email; required for new postings, may be missing on older records. */
  recruiterEmail?: string;
  title: string;
  company: string;
  description: string;
  role: RoleType;
  experienceLevel: ExperienceLevel;
  location?: string;
  salaryRange?: string;
  requirements: string[];
  benefits?: string[];
  applicationLink?: string;
  createdAt: number;
  updatedAt: number;
  isActive: boolean;
}

export interface JobOpportunityFormData {
  recruiterEmail: string;
  title: string;
  company: string;
  description: string;
  role: RoleType;
  experienceLevel: ExperienceLevel;
  location?: string;
  salaryRange?: string;
  requirements: string;
  benefits?: string;
  applicationLink?: string;
}
