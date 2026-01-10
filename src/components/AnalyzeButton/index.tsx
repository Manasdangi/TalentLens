import { Zap, Loader2 } from 'lucide-react';
import styles from './AnalyzeButton.module.css';

interface AnalyzeButtonProps {
  onClick: () => void;
  disabled: boolean;
  isLoading: boolean;
}

export function AnalyzeButton({ onClick, disabled, isLoading }: AnalyzeButtonProps) {
  return (
    <button
      className={styles.btn}
      onClick={onClick}
      disabled={disabled || isLoading}
    >
      {isLoading ? (
        <>
          <Loader2 size={20} className={styles.spinner} />
          Analyzing...
        </>
      ) : (
        <>
          <Zap size={20} />
          Analyze Resume
        </>
      )}
    </button>
  );
}

