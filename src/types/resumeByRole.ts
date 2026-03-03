/**
 * Document in ResumeByRole collection: resumes indexed by target role
 * so recruiters can query candidates for a given job role and run AI ranking.
 */
export interface ResumeByRoleDoc {
  userId: string;
  resumeId: string;
  targetRole: string;
  experienceLevel?: string;
  content: string;
  label: string;
  /** Candidate email for recruiter display (optional, set when saving). */
  userEmail?: string;
  /** Candidate name for recruiter display (optional, set when saving). */
  userName?: string;
  updatedAt: number;
}
