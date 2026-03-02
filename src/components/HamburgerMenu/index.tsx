import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Sidebar } from '../Sidebar';
import styles from './HamburgerMenu.module.css';

type UserType = 'candidate' | 'recruiter';

interface HamburgerMenuProps {
  user: { name: string; email: string; picture?: string } | null;
  userType?: UserType;
  onLogin: () => Promise<void>;
  onLogout: () => Promise<void>;
  onResumeSelect?: (content: string, fileName: string) => void;
  currentResumeText?: string;
  onScrollToResumeSection?: () => void;
}

export function HamburgerMenu({ user, userType, onLogin, onLogout, onResumeSelect, currentResumeText, onScrollToResumeSection }: HamburgerMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        className={styles.hamburger}
        onClick={() => setIsOpen(true)}
        aria-label="Open menu"
      >
        <Menu size={24} />
      </button>

      <Sidebar
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        user={user}
        userType={userType}
        onLogin={onLogin}
        onLogout={onLogout}
        onResumeSelect={onResumeSelect}
        currentResumeText={currentResumeText}
        onScrollToResumeSection={onScrollToResumeSection}
      />
    </>
  );
}
