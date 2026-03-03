import { useState } from 'react';
import { FolderOpen, Plus, Loader2 } from 'lucide-react';
import { useResumes } from '../../context/AppStore';
import { useAuth } from '../../context/AppStore';
import { RESUME_CATEGORIES, MAX_SAVED_RESUMES } from '../../types/resume';
import type { SavedResume } from '../../types/resume';
import { SavedResumeCard } from './SavedResumeCard';
import styles from './SavedResumes.module.css';

interface SavedResumesProps {
  onSelectResume: (content: string, fileName: string, savedResume?: SavedResume | null) => void;
  currentResumeText: string;
  className?: string;
  /** Called when edit is clicked; if provided, edit icon is shown. Typically scrolls to resume section. */
  onScrollToResumeSection?: () => void;
}

export function SavedResumes({ onSelectResume, currentResumeText, className, onScrollToResumeSection }: SavedResumesProps) {
  const { user } = useAuth();
  const { savedResumes, isLoading, error, deleteResume, selectedResume, selectResume } = useResumes();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleSelectResume = (resume: SavedResume) => {
    selectResume(resume);
    onSelectResume(resume.content, resume.fileName, resume);
  };

  const handleEditResume = (resume: SavedResume) => {
    handleSelectResume(resume);
    onScrollToResumeSection?.();
  };

  const handleDeleteResume = async (resumeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this resume?')) return;
    
    setDeletingId(resumeId);
    try {
      await deleteResume(resumeId);
    } finally {
      setDeletingId(null);
    }
  };

  const getCategoryLabel = (value: string) => {
    return RESUME_CATEGORIES.find(c => c.value === value)?.label || value;
  };

  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      frontend: '#61dafb',
      backend: '#68a063',
      fullstack: '#6366f1',
      react_native: '#61dafb',
      ios: '#a2aaad',
      android: '#3ddc84',
      flutter: '#02569b',
      devops: '#ff6b35',
      data: '#f59e0b',
      ml: '#a855f7',
      other: '#888',
    };
    return colors[category] || '#888';
  };

  if (!user) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <FolderOpen size={18} />
          <h3>Saved Resumes</h3>
        </div>
        <div className={styles.loginPrompt}>
          <p>Log in to save up to {MAX_SAVED_RESUMES} resumes</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <FolderOpen size={18} />
          <h3>Saved Resumes</h3>
        </div>
        <div className={styles.loading}>
          <Loader2 size={20} className={styles.spinner} />
          <span>Loading resumes...</span>
        </div>
      </div>
    );
  }

  const emptySlots = MAX_SAVED_RESUMES - savedResumes.length;

  const containerClass = className === 'sidebarVariant' 
    ? `${styles.container} ${styles.sidebarVariant}`
    : styles.container;
  
  return (
    <div className={containerClass}>
      <div className={styles.header}>
        <FolderOpen size={18} />
        <h3>Saved Resumes</h3>
        <span className={styles.count}>{savedResumes.length}/{MAX_SAVED_RESUMES}</span>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.grid}>
        {savedResumes.map((resume) => (
          <SavedResumeCard
            key={resume.id}
            resume={resume}
            isSelected={selectedResume?.id === resume.id}
            isDeleting={deletingId === resume.id}
            onSelect={handleSelectResume}
            onEdit={onScrollToResumeSection ? handleEditResume : undefined}
            onDelete={handleDeleteResume}
            getCategoryLabel={getCategoryLabel}
            getCategoryColor={getCategoryColor}
          />
        ))}

        {Array.from({ length: emptySlots }).map((_, index) => (
          <div key={`empty-${index}`} className={styles.emptySlot}>
            <Plus size={24} className={styles.plusIcon} />
            <span>Empty Slot</span>
            <span className={styles.emptyHint}>Upload & save a resume</span>
          </div>
        ))}
      </div>

      {currentResumeText && !selectedResume && savedResumes.length < MAX_SAVED_RESUMES && (
        <div className={styles.saveHint}>
          <span>💡 You have an uploaded resume. Click "Save to Account" to keep it!</span>
        </div>
      )}
    </div>
  );
}
