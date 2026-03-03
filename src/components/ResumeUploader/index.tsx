import { useCallback, useState } from 'react';
import { Upload, FileText, X, CheckCircle, Save, Loader2 } from 'lucide-react';
import { extractTextFromPDF } from '../../utils/pdfExtractor';
import { useResumes } from '../../context/ResumeContext';
import { useAuth } from '../../context/AuthContext';
import { MAX_SAVED_RESUMES } from '../../types/resume';
import type { ResumeCategory } from '../../types/resume';
import { ROLES, EXPERIENCE_LEVELS, type RoleType, type ExperienceLevel } from '../RoleFilters';
import { getErrorMessage } from '../../utils/getErrorMessage';
import styles from './ResumeUploader.module.css';

interface ResumeUploaderProps {
  onTextExtracted: (text: string) => void;
  extractedText: string;
  selectedRole?: RoleType;
  selectedExperience?: ExperienceLevel;
  jobDescription?: string;
}

export function ResumeUploader({ onTextExtracted, extractedText, selectedRole, selectedExperience, jobDescription }: ResumeUploaderProps) {
  const { user } = useAuth();
  const { savedResumes, saveResume, selectedResume } = useResumes();
  
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Save modal state
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveLabel, setSaveLabel] = useState('');
  const [saveRole, setSaveRole] = useState<RoleType>('');
  const [saveExperience, setSaveExperience] = useState<ExperienceLevel>('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file');
      return;
    }

    setIsLoading(true);
    setError(null);
    setFileName(file.name);
    setSaveSuccess(false);

    try {
      const text = await extractTextFromPDF(file);
      onTextExtracted(text);
    } catch (err) {
      setError('Failed to extract text from PDF');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [onTextExtracted]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleClear = useCallback(() => {
    setFileName(null);
    onTextExtracted('');
    setError(null);
    setSaveSuccess(false);
  }, [onTextExtracted]);

  const handleOpenSaveModal = () => {
    setSaveLabel(fileName?.replace('.pdf', '') || 'My Resume');
    setSaveRole(selectedRole ?? '');
    setSaveExperience(selectedExperience ?? '');
    setShowSaveModal(true);
  };

  const handleSaveResume = async () => {
    if (!saveLabel.trim() || !fileName) return;
    
    setIsSaving(true);
    setError(null);
    
    try {
      // Use target role as category (same set of values)
      const category = (saveRole || 'other') as ResumeCategory;
      const result = await saveResume(
        category,
        saveLabel.trim(),
        extractedText,
        fileName,
        undefined,
        {
          targetRole: saveRole || undefined,
          experienceLevel: saveExperience || undefined,
          jobDescription: jobDescription?.trim() || undefined,
        }
      );
      
      if (result) {
        setShowSaveModal(false);
        setSaveSuccess(true);
      }
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to save resume');
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const hasContent = extractedText.length > 0;
  const canSave = user && savedResumes.length < MAX_SAVED_RESUMES && !selectedResume;
  const isFromSaved = selectedResume !== null;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <FileText size={20} />
        <h2>Resume</h2>
        {isFromSaved && (
          <span className={styles.savedBadge}>From Saved</span>
        )}
      </div>

      {!hasContent ? (
        <label
          className={`${styles.dropzone} ${isDragging ? styles.dragging : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <input
            type="file"
            accept=".pdf"
            onChange={handleInputChange}
            className={styles.input}
          />
          <div className={styles.dropContent}>
            {isLoading ? (
              <>
                <div className={styles.spinner} />
                <p>Extracting text...</p>
              </>
            ) : (
              <>
                <Upload size={32} className={styles.uploadIcon} />
                <p className={styles.dropText}>
                  Drag & drop your resume here
                </p>
                <span className={styles.dropHint}>or click to browse (PDF only)</span>
              </>
            )}
          </div>
        </label>
      ) : (
        <div className={styles.uploaded}>
          <div className={styles.fileInfo}>
            <CheckCircle size={20} className={styles.successIcon} />
            <span className={styles.fileName}>{fileName || selectedResume?.fileName}</span>
            <button onClick={handleClear} className={styles.clearBtn}>
              <X size={16} />
            </button>
          </div>
          <div className={styles.preview}>
            <pre>{extractedText.slice(0, 500)}{extractedText.length > 500 ? '...' : ''}</pre>
          </div>
          <div className={styles.footer}>
            <p className={styles.charCount}>{extractedText.length} characters extracted</p>
            
            {canSave && !saveSuccess && (
              <button 
                className={styles.saveBtn}
                onClick={handleOpenSaveModal}
              >
                <Save size={14} />
                Save to Account
              </button>
            )}
            
            {saveSuccess && (
              <span className={styles.saveSuccessMsg}>
                <CheckCircle size={14} />
                Saved!
              </span>
            )}
          </div>
        </div>
      )}

      {error && <p className={styles.error}>{error}</p>}

      {/* Save Modal */}
      {showSaveModal && (
        <div className={styles.modalOverlay} onClick={() => setShowSaveModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Save Resume</h3>
            
            <div className={styles.formGroup}>
              <label>Label</label>
              <input
                type="text"
                value={saveLabel}
                onChange={(e) => setSaveLabel(e.target.value)}
                placeholder="e.g., Frontend Resume v2"
                className={styles.textInput}
                maxLength={50}
              />
            </div>
            
            <div className={styles.formGroup}>
              <label>Target Role</label>
              <select
                value={saveRole}
                onChange={(e) => setSaveRole(e.target.value as RoleType)}
                className={styles.selectInput}
              >
                <option value="">Select Role</option>
                {ROLES.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Experience Level</label>
              <select
                value={saveExperience}
                onChange={(e) => setSaveExperience(e.target.value as ExperienceLevel)}
                className={styles.selectInput}
              >
                <option value="">Select Experience</option>
                {EXPERIENCE_LEVELS.map((exp) => (
                  <option key={exp.value} value={exp.value}>
                    {exp.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div className={styles.modalActions}>
              <button 
                className={styles.cancelBtn}
                onClick={() => setShowSaveModal(false)}
              >
                Cancel
              </button>
              <button 
                className={styles.confirmSaveBtn}
                onClick={handleSaveResume}
                disabled={isSaving || !saveLabel.trim()}
              >
                {isSaving ? (
                  <>
                    <Loader2 size={14} className={styles.spinnerSmall} />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    Save Resume
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
