import { useState } from 'react';
import { Users, Loader2, ChevronDown, ChevronUp, Award, Mail } from 'lucide-react';
import { getResumesByRole } from '../../services/resumeByRoleService';
import { scoreResume } from '../../utils/llmScorer';
import type { JobOpportunity } from '../../types/jobOpportunity';
import type { ResumeByRoleDoc } from '../../types/resumeByRole';
import type { ScoringResult } from '../../utils/llmScorer';
import type { RoleType, ExperienceLevel } from '../RoleFilters';
import styles from './RankedCandidates.module.css';

const MAX_CANDIDATES_TO_RANK = 20;

interface RankedEntry {
  resume: ResumeByRoleDoc;
  result: ScoringResult;
}

interface RankedCandidatesProps {
  job: JobOpportunity;
}

const scoreLabels: Record<string, string> = {
  poor: 'Poor',
  average: 'Average',
  good: 'Good',
  very_good: 'Very Good',
  excellent: 'Excellent',
};

export function RankedCandidates({ job }: RankedCandidatesProps) {
  const [ranked, setRanked] = useState<RankedEntry[] | null>(null);
  const [isRanking, setIsRanking] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleRankCandidates = async () => {
    setIsRanking(true);
    setError(null);
    setRanked(null);

    try {
      const resumes = await getResumesByRole(job.role, job.experienceLevel);

      if (resumes.length === 0) {
        setError('No candidates have uploaded resumes for this role yet.');
        return;
      }

      const toScore = resumes.slice(0, MAX_CANDIDATES_TO_RANK);
      setProgress({ current: 0, total: toScore.length });

      const results: RankedEntry[] = [];
      for (let i = 0; i < toScore.length; i++) {
        setProgress({ current: i + 1, total: toScore.length });
        const resume = toScore[i];
        const result = await scoreResume(
          resume.content,
          job.description,
          job.role as RoleType,
          job.experienceLevel as ExperienceLevel
        );
        results.push({ resume, result });
      }

      results.sort((a, b) => b.result.percentage - a.result.percentage);
      setRanked(results);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to rank candidates';
      setError(message);
      console.error('Rank candidates error:', err);
    } finally {
      setIsRanking(false);
    }
  };

  const toggleExpand = (resumeId: string) => {
    setExpandedId(expandedId === resumeId ? null : resumeId);
  };

  return (
    <div className={styles.section}>
      <h4 className={styles.sectionTitle}>
        <Users size={18} />
        AI candidate ranking
      </h4>
      <p className={styles.sectionDesc}>
        Rank candidates who have saved a resume for this role, scored against this job description.
      </p>

      {!ranked && !isRanking && (
        <button
          type="button"
          className={styles.rankBtn}
          onClick={handleRankCandidates}
          aria-label="Rank candidates for this job"
        >
          <Award size={18} />
          Rank candidates
        </button>
      )}

      {isRanking && (
        <div className={styles.progress}>
          <Loader2 size={24} className={styles.spinner} />
          <span>
            Ranking {progress.current}/{progress.total}…
          </span>
        </div>
      )}

      {error && (
        <div className={styles.error}>{error}</div>
      )}

      {ranked && ranked.length > 0 && (
        <>
          <button
            type="button"
            className={styles.rankAgainBtn}
            onClick={() => { setRanked(null); setError(null); }}
            aria-label="Rank candidates again"
          >
            Rank again
          </button>
          <div className={styles.rankedList}>
          {ranked.map((entry, index) => {
            const isExpanded = expandedId === entry.resume.resumeId;
            const scoreClass = styles[entry.result.score.replace('_', '')] || '';
            return (
              <div key={entry.resume.resumeId} className={styles.card}>
                <div
                  className={styles.cardHeader}
                  onClick={() => toggleExpand(entry.resume.resumeId)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && toggleExpand(entry.resume.resumeId)}
                  aria-expanded={isExpanded}
                >
                  <span className={styles.rank}>#{index + 1}</span>
                  <div className={styles.cardMeta}>
                    <span className={styles.candidateName}>
                      {entry.resume.userName || entry.resume.label || 'Candidate'}
                    </span>
                    {entry.resume.userEmail && (
                      <span className={styles.candidateEmail}>
                        <Mail size={12} />
                        {entry.resume.userEmail}
                      </span>
                    )}
                  </div>
                  <div className={`${styles.scoreBadge} ${scoreClass}`}>
                    {entry.result.percentage}%
                  </div>
                  {isExpanded ? (
                    <ChevronUp size={20} className={styles.chevron} />
                  ) : (
                    <ChevronDown size={20} className={styles.chevron} />
                  )}
                </div>
                {isExpanded && (
                  <div className={styles.cardDetails}>
                    <p className={styles.summary}>{entry.result.summary}</p>
                    <p className={styles.scoreLabel}>
                      {scoreLabels[entry.result.score] || entry.result.score}
                    </p>
                    <div className={styles.detailGrid}>
                      <div>
                        <h5>Strengths</h5>
                        <ul>
                          {entry.result.strengths.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h5>Improvements</h5>
                        <ul>
                          {entry.result.improvements.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          </div>
        </>
      )}

      {ranked && ranked.length === 0 && !error && (
        <p className={styles.empty}>No candidates have uploaded resumes for this role yet.</p>
      )}
    </div>
  );
}
