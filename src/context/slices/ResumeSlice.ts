import type { SavedResume, ResumeCategory } from '../../types/resume';

export interface ResumeSlice {
  savedResumes: SavedResume[];
  isLoading: boolean;
  error: string | null;
  saveResume: (
    category: ResumeCategory,
    label: string,
    content: string,
    fileName: string,
    existingId?: string,
    options?: {
      targetRole?: string;
      experienceLevel?: string;
      jobDescription?: string;
      userEmail?: string;
      userName?: string;
    }
  ) => Promise<SavedResume | null>;
  deleteResume: (resumeId: string) => Promise<void>;
  refreshResumes: () => Promise<void>;
  selectResume: (resume: SavedResume | null) => void;
  selectedResume: SavedResume | null;
}
