import { X, LogOut, User, FileText, Building2, LogIn } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import styles from './Sidebar.module.css';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  user: { name: string; email: string; picture?: string } | null;
  onLogin: (credentialResponse: { credential?: string }) => void;
  onLogout: () => void;
}

export function Sidebar({ isOpen, onClose, user, onLogin, onLogout }: SidebarProps) {
  return (
    <>
      {/* Backdrop */}
      <div 
        className={`${styles.backdrop} ${isOpen ? styles.open : ''}`} 
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
        <div className={styles.header}>
          <h2 className={styles.title}>Menu</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {user ? (
          <div className={styles.userSection}>
            <div className={styles.userInfo}>
              {user.picture ? (
                <img src={user.picture} alt={user.name} className={styles.avatar} />
              ) : (
                <div className={styles.avatarPlaceholder}>
                  <User size={24} />
                </div>
              )}
              <div className={styles.userDetails}>
                <span className={styles.userName}>{user.name}</span>
                <span className={styles.userEmail}>{user.email}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.loginSection}>
            <div className={styles.loginPrompt}>
              <LogIn size={20} />
              <span>Sign in to save your data</span>
            </div>
            <div className={styles.googleBtn}>
              <GoogleLogin
                onSuccess={onLogin}
                onError={() => console.error('Login Failed')}
                theme="filled_black"
                shape="rectangular"
                text="signin_with"
                width="280"
              />
            </div>
          </div>
        )}

        <nav className={styles.nav}>
          <div className={styles.navSection}>
            <h3 className={styles.navTitle}>Your Data</h3>
            
            <button className={styles.navItem}>
              <FileText size={20} />
              <span>Resumes Uploaded</span>
              <span className={styles.badge}>0</span>
            </button>
            
            <button className={styles.navItem}>
              <Building2 size={20} />
              <span>Applied Companies</span>
              <span className={styles.badge}>0</span>
            </button>
          </div>
        </nav>

        {user && (
          <div className={styles.footer}>
            <button className={styles.logoutBtn} onClick={onLogout}>
              <LogOut size={18} />
              Sign Out
            </button>
          </div>
        )}
      </aside>
    </>
  );
}

