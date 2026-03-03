import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import type { SavedResume, ResumeCategory } from '../types/resume';
import {
  getUserResumes,
  saveResume as saveResumeToDb,
  deleteResume as deleteResumeFromDb,
} from '../services/resumeService';

interface ResumeContextType {
  savedResumes: SavedResume[];
  isLoading: boolean;
  error: string | null;
  saveResume: (
    category: ResumeCategory,
    label: string,
    content: string,
    fileName: string,
    existingId?: string,
    options?: { targetRole?: string; experienceLevel?: string; jobDescription?: string; userEmail?: string; userName?: string }
  ) => Promise<SavedResume | null>;
  deleteResume: (resumeId: string) => Promise<void>;
  refreshResumes: () => Promise<void>;
  selectResume: (resume: SavedResume | null) => void;
  selectedResume: SavedResume | null;
}

const ResumeContext = createContext<ResumeContextType | null>(null);

export function ResumeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [savedResumes, setSavedResumes] = useState<SavedResume[]>([]);
  const [selectedResume, setSelectedResume] = useState<SavedResume | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshResumes = useCallback(async () => {
    if (!user) {
      setSavedResumes([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const resumes = await getUserResumes(user.id);
      setSavedResumes(resumes);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load resumes';
      setError(message);
      console.error('Failed to load resumes:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshResumes();
  }, [refreshResumes]);

  const saveResume = useCallback(
    async (
      category: ResumeCategory,
      label: string,
      content: string,
      fileName: string,
      existingId?: string,
      options?: { targetRole?: string; experienceLevel?: string; jobDescription?: string; userEmail?: string; userName?: string }
    ): Promise<SavedResume | null> => {
      if (!user) {
        setError('Please log in to save resumes');
        return null;
      }

      setError(null);

      try {
        const savedResume = await saveResumeToDb(
          user.id,
          category,
          label,
          content,
          fileName,
          existingId,
          { ...options, userEmail: user.email, userName: user.name }
        );
        await refreshResumes();
        return savedResume;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save resume';
        setError(message);
        console.error('Failed to save resume:', err);
        return null;
      }
    },
    [user, refreshResumes]
  );

  const deleteResume = useCallback(
    async (resumeId: string): Promise<void> => {
      if (!user) {
        setError('Please log in to delete resumes');
        return;
      }

      setError(null);

      try {
        await deleteResumeFromDb(user.id, resumeId);
        if (selectedResume?.id === resumeId) {
          setSelectedResume(null);
        }
        await refreshResumes();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete resume';
        setError(message);
        console.error('Failed to delete resume:', err);
      }
    },
    [user, selectedResume, refreshResumes]
  );

  const selectResume = useCallback((resume: SavedResume | null) => {
    setSelectedResume(resume);
  }, []);

  return (
    <ResumeContext.Provider
      value={{
        savedResumes,
        isLoading,
        error,
        saveResume,
        deleteResume,
        refreshResumes,
        selectResume,
        selectedResume,
      }}
    >
      {children}
    </ResumeContext.Provider>
  );
}

export function useResumes() {
  const context = useContext(ResumeContext);
  if (!context) {
    throw new Error('useResumes must be used within a ResumeProvider');
  }
  return context;
}
