import { ScoreDisplay } from '../ScoreDisplay';
import { TailorResume } from '../TailorResume';
import type { ScoringResult } from '../../services/llmScorer';
import type { RoleType, ExperienceLevel } from '../../constants';
import styles from './AnalysisResults.module.css';

interface AnalysisResultsProps {
  result: ScoringResult;
  resumeText: string;
  jobDescription: string;
  role: RoleType;
  experience: ExperienceLevel;
}

export function AnalysisResults({ result, resumeText, jobDescription, role, experience }: AnalysisResultsProps) {
  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Analysis Results</h2>
      <ScoreDisplay result={result} />
      <TailorResume resumeText={resumeText} jobDescription={jobDescription} role={role} experience={experience} />
    </div>
  );
}
