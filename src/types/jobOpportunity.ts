import type { RoleType, ExperienceLevel } from '../components/RoleFilters';

export interface JobOpportunity {
  id: string;
  recruiterId: string;
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
