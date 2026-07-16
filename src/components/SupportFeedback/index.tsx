import { useEffect, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle, Mail, Send, X } from 'lucide-react';
import styles from './SupportFeedback.module.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

interface SupportFeedbackProps {
  user?: {
    name?: string;
    email?: string;
  } | null;
}

export function SupportFeedback({ user }: SupportFeedbackProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [contact, setContact] = useState(user?.email ?? '');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    setContact(user?.email ?? '');
  }, [user?.email]);

  const closeModal = () => {
    setIsOpen(false);
    setStatus(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/support-feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: user?.name,
          contact,
          message,
          pageUrl: window.location.href,
        }),
      });

      const payload = await response.json() as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to send support request.');
      }

      setMessage('');
      setStatus({ type: 'success', message: 'Sent. Thanks for the feedback.' });
    } catch (error) {
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to send support request.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const modal = (
    <div className={styles.overlay} role="presentation" onMouseDown={closeModal}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="support-feedback-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button type="button" className={styles.closeBtn} onClick={closeModal} aria-label="Close help form">
          <X size={20} />
        </button>

        <div className={styles.header}>
          <h2 className={styles.title} id="support-feedback-title">
            <Mail size={22} />
            Get help
          </h2>
          <p className={styles.subtitle}>
            Share a complaint, bug, or suggestion. It will be addressed to the website owner.
          </p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label htmlFor="support-contact">Your email or phone</label>
            <input
              id="support-contact"
              className={styles.input}
              value={contact}
              onChange={(event) => setContact(event.target.value)}
              placeholder="So we can follow up"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="support-message">Complaint or suggestion</label>
            <textarea
              id="support-message"
              className={styles.textarea}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Tell us what happened or what should be improved..."
              required
            />
          </div>

          <p className={styles.hint}>
            This sends directly through TalentLens support email.
          </p>

          {status && (
            <p className={`${styles.status} ${status.type === 'error' ? styles.statusError : ''}`}>
              {status.message}
            </p>
          )}

          <div className={styles.actions}>
            <button type="button" className={styles.secondaryBtn} onClick={closeModal}>
              Cancel
            </button>
            <button type="submit" className={styles.submitBtn} disabled={!message.trim() || isSubmitting}>
              <Send size={18} />
              {isSubmitting ? 'Sending...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <>
      <button type="button" className={styles.helpButton} onClick={() => setIsOpen(true)}>
        <HelpCircle size={19} />
        Get help
      </button>
      {isOpen && createPortal(modal, document.body)}
    </>
  );
}
