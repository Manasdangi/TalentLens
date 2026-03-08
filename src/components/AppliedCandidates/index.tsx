import { useState, useEffect } from 'react';
import { UserCheck, Mail, ChevronDown, ChevronUp, Loader2, FileText } from 'lucide-react';
import { getApplicationsByJob } from '../../services/applicationService';
import type { JobApplication } from '../../types/jobApplication';
import type { JobOpportunity } from '../../types/jobOpportunity';
import styles from './AppliedCandidates.module.css';

interface AppliedCandidatesProps {
  job: JobOpportunity;
}

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AppliedCandidates({ job }: AppliedCandidatesProps) {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        const list = await getApplicationsByJob(job.id);
        if (!cancelled) setApplications(list);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [job.id]);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className={styles.section}>
      <h4 className={styles.sectionTitle}>
        <UserCheck size={18} />
        Applied candidates
      </h4>
      <p className={styles.sectionDesc}>
        Candidates who applied for this job through TalentLens.
      </p>

      {isLoading && (
        <div className={styles.loading}>
          <Loader2 size={18} className={styles.spinner} />
          <span>Loading applications…</span>
        </div>
      )}

      {!isLoading && applications.length === 0 && (
        <p className={styles.empty}>No applications yet.</p>
      )}

      {!isLoading && applications.length > 0 && (
        <div className={styles.list}>
          {applications.map((app) => {
            const isExpanded = expandedId === app.id;
            return (
              <div key={app.id} className={styles.card}>
                <div
                  className={styles.cardHeader}
                  onClick={() => toggleExpand(app.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && toggleExpand(app.id)}
                  aria-expanded={isExpanded}
                >
                  <div className={styles.cardMeta}>
                    <span className={styles.candidateName}>{app.candidateName || 'Candidate'}</span>
                    <span className={styles.candidateEmail}>
                      <Mail size={12} />
                      {app.candidateEmail}
                    </span>
                    <span className={styles.resumeLabel}>
                      <FileText size={12} />
                      {app.resumeLabel} · {app.fileName}
                    </span>
                  </div>
                  <div className={styles.appliedDate}>
                    Applied {formatDate(app.appliedAt)}
                  </div>
                  {isExpanded ? (
                    <ChevronUp size={20} className={styles.chevron} />
                  ) : (
                    <ChevronDown size={20} className={styles.chevron} />
                  )}
                </div>
                {isExpanded && (
                  <div className={styles.resumeContent}>
                    <pre>{app.resumeContent}</pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
