import { FileText, Check, Trash2, Loader2, Pencil } from 'lucide-react';
import type { SavedResume } from '../../types/resume';
import styles from './SavedResumes.module.css';

interface SavedResumeCardProps {
  resume: SavedResume;
  isSelected: boolean;
  isDeleting: boolean;
  onSelect: (resume: SavedResume) => void;
  onEdit?: (resume: SavedResume) => void;
  onDelete: (resumeId: string, e: React.MouseEvent) => void;
  getCategoryLabel: (value: string) => string;
  getCategoryColor: (category: string) => string;
}

export function SavedResumeCard({
  resume,
  isSelected,
  isDeleting,
  onSelect,
  onEdit,
  onDelete,
  getCategoryLabel,
  getCategoryColor,
}: SavedResumeCardProps) {
  return (
    <div
      className={`${styles.resumeCard} ${isSelected ? styles.selected : ''}`}
      onClick={() => onSelect(resume)}
    >
      <div
        className={styles.categoryBadge}
        style={{ backgroundColor: getCategoryColor(resume.category) }}
      >
        {getCategoryLabel(resume.category)}
      </div>

      <div className={styles.cardTopActions}>
        {onEdit && (
          <button
            type="button"
            className={styles.editBtnTopRight}
            onClick={(e) => {
              e.stopPropagation();
              onEdit(resume);
            }}
            title="Edit resume"
            aria-label="Edit resume"
          >
            <Pencil size={14} />
          </button>
        )}
        <button
          type="button"
          className={styles.deleteBtnTopRight}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(resume.id, e);
          }}
          disabled={isDeleting}
          title="Delete resume"
          aria-label="Delete resume"
        >
          {isDeleting ? (
            <Loader2 size={14} className={styles.spinner} />
          ) : (
            <Trash2 size={14} />
          )}
        </button>
      </div>

      <div className={styles.cardContent}>
        <FileText size={24} className={styles.fileIcon} />
        <span className={styles.label}>{resume.label}</span>
        <span className={styles.fileName}>{resume.fileName}</span>
      </div>

      <div className={styles.cardActions}>
        {isSelected && (
          <div className={styles.selectedBadge}>
            <Check size={14} />
            Selected
          </div>
        )}
      </div>
    </div>
  );
}
