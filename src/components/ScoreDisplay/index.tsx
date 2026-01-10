import { CheckCircle, AlertTriangle, Tag, Search, TrendingUp, Award } from 'lucide-react';
import type { ScoringResult, ScoreLevel } from '../../utils/llmScorer';
import styles from './ScoreDisplay.module.css';

interface ScoreDisplayProps {
  result: ScoringResult;
}

const scoreLabels: Record<ScoreLevel, string> = {
  poor: 'Poor',
  average: 'Average',
  good: 'Good',
  very_good: 'Very Good',
  excellent: 'Excellent'
};

const scoreEmoji: Record<ScoreLevel, string> = {
  poor: '😟',
  average: '😐',
  good: '🙂',
  very_good: '😊',
  excellent: '🌟'
};

export function ScoreDisplay({ result }: ScoreDisplayProps) {
  const scoreClass = styles[result.score.replace('_', '')] || '';

  return (
    <div className={styles.container}>
      <div className={styles.scoreHeader}>
        <div className={`${styles.scoreBadge} ${scoreClass}`}>
          <Award size={28} />
          <span className={styles.scoreLabel}>{scoreLabels[result.score]}</span>
          <span className={styles.scoreEmoji}>{scoreEmoji[result.score]}</span>
        </div>
        <div className={styles.percentageWrapper}>
          <div className={styles.percentageRing}>
            <svg viewBox="0 0 100 100">
              <circle
                className={styles.ringBg}
                cx="50"
                cy="50"
                r="45"
              />
              <circle
                className={`${styles.ringProgress} ${scoreClass}`}
                cx="50"
                cy="50"
                r="45"
                style={{
                  strokeDasharray: `${result.percentage * 2.83} 283`
                }}
              />
            </svg>
            <span className={styles.percentageText}>{result.percentage}%</span>
          </div>
          <p className={styles.matchLabel}>Match Score</p>
        </div>
      </div>

      <div className={styles.summary}>
        <TrendingUp size={18} />
        <p>{result.summary}</p>
      </div>

      <div className={styles.grid}>
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>
            <CheckCircle size={18} className={styles.successIcon} />
            Strengths
          </h3>
          <ul className={styles.list}>
            {result.strengths.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>
            <AlertTriangle size={18} className={styles.warningIcon} />
            Areas to Improve
          </h3>
          <ul className={styles.list}>
            {result.improvements.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className={styles.keywords}>
        <div className={styles.keywordSection}>
          <h4 className={styles.keywordTitle}>
            <Tag size={16} />
            Keywords Found
          </h4>
          <div className={styles.tags}>
            {result.keywordMatches.map((kw, i) => (
              <span key={i} className={`${styles.tag} ${styles.tagSuccess}`}>{kw}</span>
            ))}
          </div>
        </div>

        <div className={styles.keywordSection}>
          <h4 className={styles.keywordTitle}>
            <Search size={16} />
            Missing Keywords
          </h4>
          <div className={styles.tags}>
            {result.missingKeywords.map((kw, i) => (
              <span key={i} className={`${styles.tag} ${styles.tagWarning}`}>{kw}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

