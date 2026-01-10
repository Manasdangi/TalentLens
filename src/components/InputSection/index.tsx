import { ResumeUploader } from '../ResumeUploader';
import { JobDescriptionInput } from '../JobDescriptionInput';
import { RoleFilters, type RoleType, type ExperienceLevel } from '../RoleFilters';
import { AnalyzeButton } from '../AnalyzeButton';
import { ErrorMessage } from '../ErrorMessage';
import styles from './InputSection.module.css';

interface InputSectionProps {
  resumeText: string;
  jobDescription: string;
  selectedRole: RoleType;
  selectedExperience: ExperienceLevel;
  isLoading: boolean;
  error: string | null;
  onResumeChange: (text: string) => void;
  onJobDescriptionChange: (text: string) => void;
  onRoleChange: (role: RoleType) => void;
  onExperienceChange: (exp: ExperienceLevel) => void;
  onAnalyze: () => void;
}

export function InputSection({
  resumeText,
  jobDescription,
  selectedRole,
  selectedExperience,
  isLoading,
  error,
  onResumeChange,
  onJobDescriptionChange,
  onRoleChange,
  onExperienceChange,
  onAnalyze,
}: InputSectionProps) {
  const canAnalyze = resumeText.length > 0 && jobDescription.length > 0 && selectedRole && selectedExperience;

  return (
    <div className={styles.section}>
      <RoleFilters
        selectedRole={selectedRole}
        selectedExperience={selectedExperience}
        onRoleChange={onRoleChange}
        onExperienceChange={onExperienceChange}
      />

      <div className={styles.columns}>
        <ResumeUploader
          onTextExtracted={onResumeChange}
          extractedText={resumeText}
        />
        <JobDescriptionInput
          value={jobDescription}
          onChange={onJobDescriptionChange}
        />
      </div>

      <AnalyzeButton
        onClick={onAnalyze}
        disabled={!canAnalyze}
        isLoading={isLoading}
      />

      {error && <ErrorMessage message={error} />}
    </div>
  );
}

