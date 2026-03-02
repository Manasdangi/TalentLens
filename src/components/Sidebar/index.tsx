import { X, LogOut, User, FileText, Building2, LogIn } from 'lucide-react';
import { useResumes } from '../../context/ResumeContext';
import { SavedResumes } from '../SavedResumes';
import styles from './Sidebar.module.css';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  user: { name: string; email: string; picture?: string } | null;
  onLogin: () => Promise<void>;
  onLogout: () => Promise<void>;
  onResumeSelect?: (content: string, fileName: string) => void;
  currentResumeText?: string;
}

export function Sidebar({ isOpen, onClose, user, onLogin, onLogout, onResumeSelect, currentResumeText }: SidebarProps) {
  const { savedResumes } = useResumes();
  
  const handleResumeSelect = (content: string, fileName: string) => {
    if (onResumeSelect) {
      onResumeSelect(content, fileName);
      onClose(); // Close sidebar after selecting a resume
    }
  };
  
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
            <button 
              className={styles.googleBtn}
              onClick={async () => {
                try {
                  await onLogin();
                } catch (error) {
                  // Error is already logged in AuthContext
                }
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" style={{ marginRight: '8px' }}>
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
              Sign in with Google
            </button>
          </div>
        )}

        <nav className={styles.nav}>
          <div className={styles.navSection}>
            <h3 className={styles.navTitle}>Your Data</h3>
            
            <button className={styles.navItem}>
              <FileText size={20} />
              <span>Resumes Uploaded</span>
              <span className={styles.badge}>{savedResumes.length}</span>
            </button>
            
            <button className={styles.navItem}>
              <Building2 size={20} />
              <span>Applied Companies</span>
              <span className={styles.badge}>0</span>
            </button>
          </div>
        </nav>

        {user && onResumeSelect && (
          <div className={styles.savedResumesSection}>
            <SavedResumes 
              onSelectResume={handleResumeSelect}
              currentResumeText={currentResumeText || ''}
              className="sidebarVariant"
            />
          </div>
        )}

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

