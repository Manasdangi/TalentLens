import { useState, useRef, useEffect } from 'react';
import { Header } from './components/Header';
import { InputSection } from './components/InputSection';
import { AnalysisResults } from './components/AnalysisResults';
import { Footer } from './components/Footer';
import { scoreResume, type ScoringResult } from './utils/llmScorer';
import type { RoleType, ExperienceLevel } from './components/RoleFilters';
import styles from './App.module.css';

function App() {
  const [resumeText, setResumeText] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [selectedRole, setSelectedRole] = useState<RoleType>('');
  const [selectedExperience, setSelectedExperience] = useState<ExperienceLevel>('');
  const [result, setResult] = useState<ScoringResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleAnalyze = async () => {
    if (resumeText.length === 0 || jobDescription.length === 0) return;

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

  return (
    <div className={styles.app}>
      <Header />

      <main className={styles.main}>
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
