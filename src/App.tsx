import { useState, useRef, useEffect } from 'react';
import { Header } from './components/Header';
import { InputSection } from './components/InputSection';
import { AnalysisResults } from './components/AnalysisResults';
import { Footer } from './components/Footer';
import { JobOpportunityUploader } from './components/JobOpportunityUploader';
import { JobOpportunitiesList } from './components/JobOpportunitiesList';
import { UserTypeSelection } from './components/UserTypeSelection';
import { useAuth } from './context/AuthContext';
import { scoreResume, type ScoringResult } from './utils/llmScorer';
import type { RoleType, ExperienceLevel } from './components/RoleFilters';
import styles from './App.module.css';

function App() {
  const { user, setUserType } = useAuth();
  const [resumeText, setResumeText] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [selectedRole, setSelectedRole] = useState<RoleType>('');
  const [selectedExperience, setSelectedExperience] = useState<ExperienceLevel>('');
  const [result, setResult] = useState<ScoringResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUserTypeModal, setShowUserTypeModal] = useState(false);

  const resultsRef = useRef<HTMLDivElement>(null);

  // Scroll to results when they're ready
  useEffect(() => {
    if (result && resultsRef.current) {
      resultsRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
  }, [result]);

  // Show user type selection modal if user is logged in but doesn't have a userType
  useEffect(() => {
    if (user && !user.userType) {
      setShowUserTypeModal(true);
    } else {
      setShowUserTypeModal(false);
    }
  }, [user]);

  const handleAnalyze = async () => {
    if (resumeText.length === 0) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const scoringResult = await scoreResume(
        resumeText,
        jobDescription,
        selectedRole,
        selectedExperience
      );
      setResult(scoringResult);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to analyze resume';
      setError(message);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResumeSelect = (content: string, _fileName: string) => {
    setResumeText(content);
  };

  const handleUserTypeSelect = async (userType: 'candidate' | 'recruiter') => {
    try {
      await setUserType(userType);
      setShowUserTypeModal(false);
    } catch (error) {
      console.error('Failed to set user type:', error);
      setError('Failed to set user type. Please try again.');
    }
  };

  // Show user type selection modal
  if (showUserTypeModal && user) {
    return (
      <div className={styles.app}>
        <UserTypeSelection
          userName={user.name}
          onSelect={handleUserTypeSelect}
        />
      </div>
    );
  }

  // Show recruiter view
  if (user?.userType === 'recruiter') {
    return (
      <div className={styles.app}>
        <Header 
          onResumeSelect={handleResumeSelect}
          currentResumeText={resumeText}
        />
        <main className={styles.main}>
          <JobOpportunityUploader />
        </main>
        <Footer />
      </div>
    );
  }

  // Show candidate view (default)
  return (
    <div className={styles.app}>
      <Header 
        onResumeSelect={handleResumeSelect}
        currentResumeText={resumeText}
      />

      <main className={styles.main}>
        <JobOpportunitiesList />
        
        <InputSection
          resumeText={resumeText}
          jobDescription={jobDescription}
          selectedRole={selectedRole}
          selectedExperience={selectedExperience}
          isLoading={isLoading}
          error={error}
          onResumeChange={setResumeText}
          onJobDescriptionChange={setJobDescription}
          onRoleChange={setSelectedRole}
          onExperienceChange={setSelectedExperience}
          onAnalyze={handleAnalyze}
        />

        {result && (
          <div ref={resultsRef}>
            <AnalysisResults result={result} />
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default App;
