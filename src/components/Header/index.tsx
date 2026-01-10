import { Sparkles } from 'lucide-react';
import { HamburgerMenu } from '../HamburgerMenu';
import { useAuth } from '../../context/AuthContext';
import styles from './Header.module.css';

export function Header() {
  const { user, login, logout } = useAuth();

  return (
    <header className={styles.header}>
      <div className={styles.headerContent}>
        <div className={styles.left} />
        
        <div className={styles.center}>
          <div className={styles.logo}>
            <div className={styles.logoIcon}>
              <Sparkles size={24} />
            </div>
            <span className={styles.logoText}>TalentLens</span>
          </div>
          <p className={styles.tagline}>AI-Powered Resume Scoring</p>
        </div>

        <div className={styles.right}>
          <HamburgerMenu user={user} onLogin={login} onLogout={logout} />
        </div>
      </div>
    </header>
  );
}
