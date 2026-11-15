import { useState } from 'react';
import { Wand2, Loader2, Copy, Check, AlertCircle, Lightbulb, ArrowRight } from 'lucide-react';
import { tailorResume, type TailorResult } from '../../services/aiProfileService';
import { getErrorMessage } from '../../utils/getErrorMessage';
import { RichText } from '../ui/RichText';
import { stripBold } from '../../utils/stripBold';
import type { RoleType, ExperienceLevel } from '../../constants';
import styles from './TailorResume.module.css';

interface TailorResumeProps {
  resumeText: string;
  jobDescription: string;
  role: RoleType;
  experience: ExperienceLevel;
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={styles.copyBtn}
      aria-label={label}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          setCopied(false);
        }
      }}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

export function TailorResume({ resumeText, jobDescription, role, experience }: TailorResumeProps) {
  const [result, setResult] = useState<TailorResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasJobDescription = jobDescription.trim().length > 0;

  const run = async () => {
    setIsLoading(true);
    setError(null);
    try {
      setResult(await tailorResume(resumeText, jobDescription, role, experience));
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to tailor resume'));
    } finally {
      setIsLoading(false);
    }
  };

  const allText = result
    ? [
        result.headline,
        '',
        result.summary,
        '',
        ...result.bullets.map((b) => `• ${stripBold(b.improved)}`),
      ].join('\n')
    : '';

  return (
    <section className={styles.card} aria-labelledby="tailor-title">
      <div className={styles.head}>
        <div>
          <h3 id="tailor-title" className={styles.title}>
            <Wand2 size={20} /> Tailor your resume for this job
          </h3>
          <p className={styles.desc}>
            Rewrites your strongest bullets in this job's language. It only uses what's already in your resume, and
            lists the keywords you can't honestly claim yet.
          </p>
        </div>
        {!result && (
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={run}
            disabled={!hasJobDescription || isLoading || !resumeText}
          >
            {isLoading ? <Loader2 size={18} className={styles.spin} /> : <Wand2 size={18} />}
            {isLoading ? 'Tailoring…' : 'Tailor resume'}
          </button>
        )}
      </div>

      {!hasJobDescription && (
        <p className={styles.hint}>Paste a job description above and analyze again to tailor your resume for it.</p>
      )}
      {error && (
        <p className={styles.error} role="alert">
          <AlertCircle size={16} /> {error}
        </p>
      )}

      {result && (
        <div className={styles.result}>
          <div className={styles.toolbar}>
            <CopyButton text={allText} label="Copy all tailored content" />
            <button type="button" className={styles.ghostBtn} onClick={run} disabled={isLoading}>
              {isLoading ? <Loader2 size={14} className={styles.spin} /> : <Wand2 size={14} />} Try again
            </button>
          </div>

          {(result.headline || result.summary) && (
            <div className={styles.block}>
              <div className={styles.blockHead}>
                <h4>Headline &amp; summary</h4>
                <CopyButton text={`${result.headline}\n\n${result.summary}`} label="Copy headline and summary" />
              </div>
              {result.headline && <p className={styles.headline}>{result.headline}</p>}
              {result.summary && <p className={styles.summary}>{result.summary}</p>}
            </div>
          )}

          {result.bullets.length > 0 && (
            <div className={styles.block}>
              <h4>Rewritten bullets</h4>
              <ul className={styles.bullets}>
                {result.bullets.map((b, i) => (
                  <li key={i} className={styles.bullet}>
                    <p className={styles.before}>{b.original}</p>
                    <div className={styles.afterRow}>
                      <ArrowRight size={16} className={styles.arrow} aria-hidden="true" />
                      <p className={styles.after}>
                        <RichText text={b.improved} />
                      </p>
                      <CopyButton text={stripBold(b.improved)} label={`Copy bullet ${i + 1}`} />
                    </div>
                    {b.keywordsUsed.length > 0 && (
                      <div className={styles.chips}>
                        {b.keywordsUsed.map((k) => (
                          <span key={k} className={styles.chipGood}>{k}</span>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.unsupportedKeywords.length > 0 && (
            <div className={`${styles.block} ${styles.warnBlock}`}>
              <h4>Keywords your resume doesn't back up yet</h4>
              <p className={styles.smallNote}>Add these only if you've really done them, and say where.</p>
              <div className={styles.chips}>
                {result.unsupportedKeywords.map((k) => (
                  <span key={k} className={styles.chipWarn}>{k}</span>
                ))}
              </div>
            </div>
          )}

          {result.tips.length > 0 && (
            <div className={styles.block}>
              <h4><Lightbulb size={16} /> Tips</h4>
              <ul className={styles.tips}>
                {result.tips.map((tip, i) => <li key={i}>{tip}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
