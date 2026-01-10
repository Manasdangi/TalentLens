import { ScoreDisplay } from '../ScoreDisplay';
import type { ScoringResult } from '../../utils/llmScorer';
import styles from './AnalysisResults.module.css';

interface AnalysisResultsProps {
  result: ScoringResult;
}

export function AnalysisResults({ result }: AnalysisResultsProps) {
  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Analysis Results</h2>
      <ScoreDisplay result={result} />
    </div>
  );
}

