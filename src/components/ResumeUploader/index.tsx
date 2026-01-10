import { useCallback, useState } from 'react';
import { Upload, FileText, X, CheckCircle } from 'lucide-react';
import { extractTextFromPDF } from '../../utils/pdfExtractor';
import styles from './ResumeUploader.module.css';

interface ResumeUploaderProps {
  onTextExtracted: (text: string) => void;
  extractedText: string;
}

export function ResumeUploader({ onTextExtracted, extractedText }: ResumeUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(async (file: File) => {
    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file');
      return;
    }

    setIsLoading(true);
    setError(null);
    setFileName(file.name);

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
  }, [onTextExtracted]);

  const hasContent = extractedText.length > 0;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <FileText size={20} />
        <h2>Resume</h2>
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
            <span className={styles.fileName}>{fileName}</span>
            <button onClick={handleClear} className={styles.clearBtn}>
              <X size={16} />
            </button>
          </div>
          <div className={styles.preview}>
            <pre>{extractedText.slice(0, 500)}{extractedText.length > 500 ? '...' : ''}</pre>
          </div>
          <p className={styles.charCount}>{extractedText.length} characters extracted</p>
        </div>
      )}

      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}

