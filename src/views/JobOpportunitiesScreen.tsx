import { JobOpportunitiesList } from '../components/JobOpportunitiesList';
import styles from '../App.module.css';

interface JobOpportunitiesScreenProps {
  onBack: () => void;
  recruiterId?: string;
  refreshTrigger?: number;
}

export function JobOpportunitiesScreen({ onBack, recruiterId, refreshTrigger }: JobOpportunitiesScreenProps) {
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
      <JobOpportunitiesList recruiterId={recruiterId} refreshTrigger={refreshTrigger} />
    </div>
  );
}
