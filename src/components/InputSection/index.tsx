import { ResumeUploader } from '../ResumeUploader';
import { JobDescriptionInput } from '../JobDescriptionInput';
import { RoleFilters, type RoleType, type ExperienceLevel } from '../RoleFilters';
import { AnalyzeButton } from '../AnalyzeButton';
import { ErrorMessage } from '../ErrorMessage';
import { useResumes } from '../../context/ResumeContext';
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
  const { selectResume } = useResumes();
  const canAnalyze = resumeText.length > 0 && selectedRole && selectedExperience;

  const handleResumeChange = (text: string) => {
    // If user clears or uploads a new resume, deselect saved resume
    if (text === '') {
      selectResume(null);
    }
    onResumeChange(text);
  };

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
          onTextExtracted={handleResumeChange}
          extractedText={resumeText}
          selectedRole={selectedRole}
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
