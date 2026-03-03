import { useState } from 'react';
import { Header } from '../components/Header';
import { JobOpportunityUploader } from '../components/JobOpportunityUploader';
import { JobOpportunitiesScreen } from './JobOpportunitiesScreen';
import { Modal } from '../components/ui/Modal';
import { Footer } from '../components/Footer';
import type { SavedResume } from '../types/resume';
import type { JobOpportunity } from '../types/jobOpportunity';
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
  const [jobToEdit, setJobToEdit] = useState<JobOpportunity | null>(null);
  const isJobModalOpen = showPostJobModal || !!jobToEdit;

  const closeJobModal = () => {
    onClosePostJobModal();
    setJobToEdit(null);
  };

  const handleJobPosted = () => {
    onJobPosted();
    closeJobModal();
  };

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
      <main className={styles.main}>
        {showJobOpportunitiesScreen ? (
          <JobOpportunitiesScreen
            onBack={onCloseJobOpportunitiesScreen}
            recruiterId={recruiterId}
            refreshTrigger={recruiterJobsRefreshTrigger}
            onEditJob={setJobToEdit}
          />
        ) : (
          <>
            <p className={styles.recruiterHomeHint}>
              Post a new job above or view your listings below.
            </p>
            <button
              type="button"
              className={styles.viewListingsBtn}
              onClick={onOpenJobOpportunities}
              aria-label="View my posted jobs"
            >
              View my listings
            </button>
          </>
        )}
      </main>
      <Footer />

      <Modal isOpen={isJobModalOpen} onClose={closeJobModal}>
        <JobOpportunityUploader
          existingJob={jobToEdit ?? undefined}
          onJobPosted={handleJobPosted}
        />
      </Modal>
    </div>
  );
}
