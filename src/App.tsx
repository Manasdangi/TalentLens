import { useState, useEffect } from 'react';
import { UserTypeSelection } from './components/UserTypeSelection';
import { CandidateLoginScreen } from './components/CandidateLoginScreen';
import { RESUME_INPUT_SECTION_ID } from './components/InputSection';
import { useAuth } from './context/AppStore';
import { scoreResume, type ScoringResult } from './utils/llmScorer';
import { getErrorMessage } from './utils/getErrorMessage';
import type { RoleType, ExperienceLevel } from './constants';
import type { SavedResume } from './types/resume';
import { CandidateView, RecruiterView } from './screens';
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
  const [recruiterJobsRefreshTrigger, setRecruiterJobsRefreshTrigger] = useState(0);
  const [showPostJobModal, setShowPostJobModal] = useState(false);
  const [showJobOpportunitiesScreen, setShowJobOpportunitiesScreen] = useState(false);

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
      setError(getErrorMessage(err, 'Failed to analyze resume'));
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResumeSelect = (content: string, _fileName: string, savedResume?: SavedResume | null) => {
    setResumeText(content);
    if (savedResume) {
      setSelectedRole((savedResume.targetRole ?? '') as RoleType);
      setSelectedExperience((savedResume.experienceLevel ?? '') as ExperienceLevel);
      setJobDescription(savedResume.jobDescription ?? '');
    }
  };

  const scrollToResumeSection = () => {
    document.getElementById(RESUME_INPUT_SECTION_ID)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const openJobOpportunitiesScreen = () => setShowJobOpportunitiesScreen(true);
  const closeJobOpportunitiesScreen = () => setShowJobOpportunitiesScreen(false);

  const handleUserTypeSelect = async (userType: 'candidate' | 'recruiter') => {
    try {
      await setUserType(userType);
      setShowUserTypeModal(false);
    } catch (err) {
      console.error('Failed to set user type:', err);
      setError(getErrorMessage(err, 'Failed to set user type. Please try again.'));
    }
  };

  // Show login screen when candidate is not logged in
  if (!user) {
    return (
      <div className={styles.app}>
        <CandidateLoginScreen />
      </div>
    );
  }

  // Show user type selection modal
  if (showUserTypeModal) {
    return (
      <div className={styles.app}>
        <UserTypeSelection
          userName={user.name}
          onSelect={handleUserTypeSelect}
        />
      </div>
    );
  }

  if (user.userType === 'recruiter') {
    return (
      <RecruiterView
        onResumeSelect={handleResumeSelect}
        currentResumeText={resumeText}
        onScrollToResumeSection={scrollToResumeSection}
        onOpenJobOpportunities={openJobOpportunitiesScreen}
        showJobOpportunitiesScreen={showJobOpportunitiesScreen}
        onCloseJobOpportunitiesScreen={closeJobOpportunitiesScreen}
        recruiterId={user.id}
        recruiterJobsRefreshTrigger={recruiterJobsRefreshTrigger}
        showPostJobModal={showPostJobModal}
        onOpenPostJobModal={() => setShowPostJobModal(true)}
        onClosePostJobModal={() => setShowPostJobModal(false)}
        onJobPosted={() => {
          setRecruiterJobsRefreshTrigger((t) => t + 1);
          setShowPostJobModal(false);
        }}
      />
    );
  }

  return (
    <CandidateView
      resumeText={resumeText}
      jobDescription={jobDescription}
      selectedRole={selectedRole}
      selectedExperience={selectedExperience}
      result={result}
      isLoading={isLoading}
      error={error}
      onResumeSelect={handleResumeSelect}
      onResumeChange={setResumeText}
      onJobDescriptionChange={setJobDescription}
      onRoleChange={setSelectedRole}
      onExperienceChange={setSelectedExperience}
      onAnalyze={handleAnalyze}
      scrollToResumeSection={scrollToResumeSection}
      showJobOpportunitiesScreen={showJobOpportunitiesScreen}
      onOpenJobOpportunities={openJobOpportunitiesScreen}
      onCloseJobOpportunitiesScreen={closeJobOpportunitiesScreen}
    />
  );
}

export default App;
