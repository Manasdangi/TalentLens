import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Sidebar } from '../Sidebar';
import styles from './HamburgerMenu.module.css';

interface HamburgerMenuProps {
  user: { name: string; email: string; picture?: string } | null;
  onLogin: (credentialResponse: { credential?: string }) => void;
  onLogout: () => void;
}

export function HamburgerMenu({ user, onLogin, onLogout }: HamburgerMenuProps) {
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
        onLogin={onLogin}
        onLogout={onLogout}
      />
    </>
  );
}
