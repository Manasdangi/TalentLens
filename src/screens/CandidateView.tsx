import { lazy, Suspense, useRef, useEffect, useState } from 'react';
import { Globe } from 'lucide-react';
import { Header } from '../components/Header';
import { InputSection } from '../components/InputSection';
import { AnalysisResults } from '../components/AnalysisResults';
import { Footer } from '../components/Footer';
import type { SavedResume } from '../types/resume';
import type { ScoringResult } from '../services/llmScorer';
import type { RoleType, ExperienceLevel } from '../constants';
import { useAuth } from '../context/AppStore';
import styles from '../App.module.css';

const JobOpportunitiesScreen = lazy(() =>
  import('./JobOpportunitiesScreen').then((module) => ({ default: module.JobOpportunitiesScreen }))
);
const PortfolioScreen = lazy(() =>
  import('./PortfolioScreen').then((module) => ({ default: module.PortfolioScreen }))
);

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
  const { user } = useAuth();
  const [showPortfolio, setShowPortfolio] = useState(false);

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
        {!showPortfolio && !showJobOpportunitiesScreen && user && (
          <button
            type="button"
            className={`${styles.seeLatestOpeningsBtn} ${styles.portfolioBtn}`}
            onClick={() => setShowPortfolio(true)}
          >
            <Globe size={15} /> My portfolio
          </button>
        )}
        <button
          type="button"
          className={styles.seeLatestOpeningsBtn}
          onClick={() => {
            setShowPortfolio(false);
            if (showJobOpportunitiesScreen) onCloseJobOpportunitiesScreen();
            else onOpenJobOpportunities();
          }}
          aria-label={showJobOpportunitiesScreen ? 'Score resume' : 'See latest openings'}
        >
          {showJobOpportunitiesScreen ? 'Score resume' : 'See latest openings'}
        </button>
      </div>

      <main className={styles.main}>
        {showPortfolio && user ? (
          <Suspense fallback={<div className={styles.loading}>Loading portfolio builder...</div>}>
            <PortfolioScreen
              userId={user.id}
              userName={user.name}
              currentResumeText={resumeText}
              onBack={() => setShowPortfolio(false)}
            />
          </Suspense>
        ) : showJobOpportunitiesScreen ? (
          <Suspense fallback={<div className={styles.loading}>Loading job opportunities...</div>}>
            <JobOpportunitiesScreen onBack={onCloseJobOpportunitiesScreen} />
          </Suspense>
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
                <AnalysisResults
                  result={result}
                  resumeText={resumeText}
                  jobDescription={jobDescription}
                  role={selectedRole}
                  experience={selectedExperience}
                />
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
