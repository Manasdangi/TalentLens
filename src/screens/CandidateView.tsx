import { useRef, useEffect } from 'react';
import { Header } from '../components/Header';
import { InputSection } from '../components/InputSection';
import { AnalysisResults } from '../components/AnalysisResults';
import { JobOpportunitiesScreen } from './JobOpportunitiesScreen';
import { Footer } from '../components/Footer';
import type { SavedResume } from '../types/resume';
import type { ScoringResult } from '../services/llmScorer';
import type { RoleType, ExperienceLevel } from '../constants';
import styles from '../App.module.css';

interface CandidateViewProps {
  resumeText: string;
  jobDescription: string;
  selectedRole: RoleType;
  selectedExperience: ExperienceLevel;
  result: ScoringResult | null;
  isLoading: boolean;
  error: string | null;
  onResumeSelect: (content: string, fileName: string, savedResume?: SavedResume | null) => void;
  onResumeChange: (text: string) => void;
  onJobDescriptionChange: (text: string) => void;
  onRoleChange: (role: RoleType) => void;
  onExperienceChange: (exp: ExperienceLevel) => void;
  onAnalyze: () => void;
  scrollToResumeSection: () => void;
  showJobOpportunitiesScreen: boolean;
  onOpenJobOpportunities: () => void;
  onCloseJobOpportunitiesScreen: () => void;
}

export function CandidateView({
  resumeText,
  jobDescription,
  selectedRole,
  selectedExperience,
  result,
  isLoading,
  error,
  onResumeSelect,
  onResumeChange,
  onJobDescriptionChange,
  onRoleChange,
  onExperienceChange,
  onAnalyze,
  scrollToResumeSection,
  showJobOpportunitiesScreen,
  onOpenJobOpportunities,
  onCloseJobOpportunitiesScreen,
}: CandidateViewProps) {
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (result && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [result]);

  return (
    <div className={styles.app}>
      <Header
        onResumeSelect={onResumeSelect}
        currentResumeText={resumeText}
        onScrollToResumeSection={scrollToResumeSection}
      />

      <div className={styles.seeLatestOpeningsBar}>
        <button
          type="button"
          className={styles.seeLatestOpeningsBtn}
          onClick={showJobOpportunitiesScreen ? onCloseJobOpportunitiesScreen : onOpenJobOpportunities}
          aria-label={showJobOpportunitiesScreen ? 'Score resume' : 'See latest openings'}
        >
          {showJobOpportunitiesScreen ? 'Score resume' : 'See latest openings'}
        </button>
      </div>

      <main className={styles.main}>
        {showJobOpportunitiesScreen ? (
          <JobOpportunitiesScreen onBack={onCloseJobOpportunitiesScreen} />
        ) : (
          <>
            <InputSection
              resumeText={resumeText}
              jobDescription={jobDescription}
              selectedRole={selectedRole}
              selectedExperience={selectedExperience}
              isLoading={isLoading}
              error={error}
              onResumeChange={onResumeChange}
              onJobDescriptionChange={onJobDescriptionChange}
              onRoleChange={onRoleChange}
              onExperienceChange={onExperienceChange}
              onAnalyze={onAnalyze}
            />
            {result && (
              <div ref={resultsRef}>
                <AnalysisResults result={result} />
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
