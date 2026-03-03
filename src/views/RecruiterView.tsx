import { Header } from '../components/Header';
import { JobOpportunityUploader } from '../components/JobOpportunityUploader';
import { JobOpportunitiesScreen } from './JobOpportunitiesScreen';
import { Modal } from '../components/ui/Modal';
import { Footer } from '../components/Footer';
import type { SavedResume } from '../types/resume';
import styles from '../App.module.css';

interface RecruiterViewProps {
  onResumeSelect: (content: string, fileName: string, savedResume?: SavedResume | null) => void;
  currentResumeText: string;
  onScrollToResumeSection: () => void;
  onOpenJobOpportunities: () => void;
  showJobOpportunitiesScreen: boolean;
  onCloseJobOpportunitiesScreen: () => void;
  recruiterId: string;
  recruiterJobsRefreshTrigger: number;
  showPostJobModal: boolean;
  onOpenPostJobModal: () => void;
  onClosePostJobModal: () => void;
  onJobPosted: () => void;
}

export function RecruiterView({
  onResumeSelect,
  currentResumeText,
  onScrollToResumeSection,
  onOpenJobOpportunities,
  showJobOpportunitiesScreen,
  onCloseJobOpportunitiesScreen,
  recruiterId,
  recruiterJobsRefreshTrigger,
  showPostJobModal,
  onOpenPostJobModal,
  onClosePostJobModal,
  onJobPosted,
}: RecruiterViewProps) {
  return (
    <div className={styles.app}>
      <Header
        onResumeSelect={onResumeSelect}
        currentResumeText={currentResumeText}
        onScrollToResumeSection={onScrollToResumeSection}
      />
      <button
        type="button"
        className={styles.postNewJobBtn}
        onClick={onOpenPostJobModal}
        aria-label="Post new job"
      >
        POST NEW JOB
      </button>
      <div className={styles.seeLatestOpeningsBar}>
        <button
          type="button"
          className={styles.seeLatestOpeningsBtn}
          onClick={onOpenJobOpportunities}
          aria-label="See latest openings"
        >
          See latest openings
        </button>
      </div>
      <main className={styles.main}>
        {showJobOpportunitiesScreen ? (
          <JobOpportunitiesScreen
            onBack={onCloseJobOpportunitiesScreen}
            recruiterId={recruiterId}
            refreshTrigger={recruiterJobsRefreshTrigger}
          />
        ) : (
          <p className={styles.recruiterHomeHint}>
            Post a new job above or click “See latest openings” to view your listings.
          </p>
        )}
      </main>
      <Footer />

      <Modal isOpen={showPostJobModal} onClose={onClosePostJobModal}>
        <JobOpportunityUploader onJobPosted={onJobPosted} />
      </Modal>
    </div>
  );
}
