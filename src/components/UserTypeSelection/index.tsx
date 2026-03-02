import { useState } from 'react';
import { Briefcase, User, X } from 'lucide-react';
import type { UserType } from '../../context/AuthContext';
import styles from './UserTypeSelection.module.css';

interface UserTypeSelectionProps {
  userName: string;
  onSelect: (userType: UserType) => void;
  onClose?: () => void;
}

export function UserTypeSelection({ userName, onSelect, onClose }: UserTypeSelectionProps) {
  const [selectedType, setSelectedType] = useState<UserType | null>(null);

  const handleContinue = () => {
    if (selectedType) {
      onSelect(selectedType);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {onClose && (
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        )}
        
        <div className={styles.header}>
          <h2>Welcome, {userName}!</h2>
          <p>Please select your account type to continue</p>
        </div>

        <div className={styles.options}>
          <button
            className={`${styles.option} ${selectedType === 'candidate' ? styles.selected : ''}`}
            onClick={() => setSelectedType('candidate')}
          >
            <div className={styles.iconWrapper}>
              <User size={32} />
            </div>
            <h3>Candidate</h3>
            <p>I'm looking for job opportunities and want to improve my resume</p>
          </button>

          <button
            className={`${styles.option} ${selectedType === 'recruiter' ? styles.selected : ''}`}
            onClick={() => setSelectedType('recruiter')}
          >
            <div className={styles.iconWrapper}>
              <Briefcase size={32} />
            </div>
            <h3>Recruiter</h3>
            <p>I'm hiring and want to post job opportunities</p>
          </button>
        </div>

        <button
          className={styles.continueBtn}
          onClick={handleContinue}
          disabled={!selectedType}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
