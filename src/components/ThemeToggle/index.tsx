import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import styles from './ThemeToggle.module.css';

type Theme = 'light' | 'dark';

const STORAGE_KEY = 'talentlens-theme';

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';

  return window.localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light';
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const isDark = theme === 'dark';

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  return (
    <button
      type="button"
      className={`${styles.toggle} ${isDark ? styles.dark : ''}`}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      aria-pressed={isDark}
    >
      <span className={styles.thumb} aria-hidden="true" />
      <Sun className={`${styles.icon} ${!isDark ? styles.activeIcon : styles.inactiveIcon}`} />
      <Moon className={`${styles.icon} ${isDark ? styles.activeIcon : styles.inactiveIcon}`} />
    </button>
  );
}
