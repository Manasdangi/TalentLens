import { JobOpportunitiesList } from '../components/JobOpportunitiesList';
import type { JobOpportunity } from '../types/jobOpportunity';
import styles from '../App.module.css';

interface JobOpportunitiesScreenProps {
  onBack: () => void;
  recruiterId?: string;
  refreshTrigger?: number;
  /** When set (e.g. for recruiter view), list shows Edit/Delete and calls this on Edit. */
  onEditJob?: (job: JobOpportunity) => void;
}

export function JobOpportunitiesScreen({ onBack, recruiterId, refreshTrigger, onEditJob }: JobOpportunitiesScreenProps) {
  return (
    <div className={styles.jobScreen}>
      <button
        type="button"
        className={styles.backToHomeBtn}
        onClick={onBack}
        aria-label="Back to home"
      >
        ← Back to home
      </button>
      <JobOpportunitiesList
        recruiterId={recruiterId}
        refreshTrigger={refreshTrigger}
        onEditJob={onEditJob}
      />
    </div>
  );
}
