export interface JobApplication {
  id: string;
  jobId: string;
  candidateId: string;
  candidateEmail: string;
  candidateName: string;
  resumeId: string;
  resumeLabel: string;
  resumeContent: string;
  fileName: string;
  appliedAt: number;
}
