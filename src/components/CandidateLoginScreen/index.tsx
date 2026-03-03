import { useState } from 'react';
import { Sparkles, LogIn, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import styles from './CandidateLoginScreen.module.css';

export function CandidateLoginScreen() {
  const { login, isLoading: authLoading } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleLogin = async () => {
    setIsSigningIn(true);
    try {
      await login();
    } catch {
      // Error is logged in AuthContext
    } finally {
      setIsSigningIn(false);
    }
  };

  if (authLoading) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.card}>
          <Loader2 size={32} className={styles.spinner} />
          <p className={styles.loadingText}>Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>
            <Sparkles size={32} />
          </div>
          <h1 className={styles.title}>TalentLens</h1>
          <p className={styles.tagline}>AI-Powered Resume Scoring</p>
        </div>

        <div className={styles.loginBlock}>
          <div className={styles.loginPrompt}>
            <LogIn size={22} />
            <span>Sign in to browse jobs and get AI resume feedback</span>
          </div>
          <button
            type="button"
            className={styles.googleBtn}
            onClick={handleLogin}
            disabled={isSigningIn}
            aria-label="Sign in with Google"
          >
            {isSigningIn ? (
              <Loader2 size={20} className={styles.btnSpinner} />
            ) : (
              <svg width="20" height="20" viewBox="0 0 18 18" aria-hidden>
                <path
                  fill="#4285F4"
                  d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
                />
                <path
                  fill="#34A853"
                  d="M9 18c2.43 0 4.467-.806 5.965-2.184l-2.908-2.258c-.806.54-1.837.86-3.057.86-2.35 0-4.34-1.587-5.052-3.72H.957v2.332C2.438 15.983 5.482 18 9 18z"
                />
                <path
                  fill="#FBBC05"
                  d="M3.948 10.698c-.18-.54-.282-1.117-.282-1.698s.102-1.158.282-1.698V4.97H.957C.348 6.175 0 7.55 0 9s.348 2.825.957 4.03l2.991-2.332z"
                />
                <path
                  fill="#EA4335"
                  d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.582C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.97L3.948 7.302C4.66 5.167 6.65 3.58 9 3.58z"
                />
              </svg>
            )}
            <span>{isSigningIn ? 'Signing in…' : 'Sign in with Google'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
