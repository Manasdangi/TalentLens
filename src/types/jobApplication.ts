export interface JobApplication {
  id: string;
  jobId: string;
  candidateId: string;
  candidateEmail: string;
  candidateName: string;
  resumeId: string;
  resumeLabel: string;
  /** Legacy field from before applications referenced Resumes/{resumeId}. */
  resumeContent?: string;
  fileName: string;
  appliedAt: number;
}
