import { useEffect, useState } from 'react';
import { BadgeCheck, Github, Code2, Loader2, RefreshCw, Copy, Check, AlertCircle } from 'lucide-react';
import {
  callVerifyProfile,
  getVerifiedProfiles,
  type GithubStats,
  type LeetcodeStats,
  type Platform,
  type VerifiedProfiles,
} from '../../services/verificationService';
import { getErrorMessage } from '../../utils/getErrorMessage';
import styles from './VerifiedProfilesPanel.module.css';

interface Props {
  userId: string;
  onChange?: (profiles: VerifiedProfiles | null) => void;
}

const META: Record<Platform, { name: string; where: string; howTo: string; placeholder: string }> = {
  github: {
    name: 'GitHub',
    where: 'GitHub bio',
    howTo: 'github.com → your avatar → Settings → Public profile → Bio',
    placeholder: 'GitHub username',
  },
  leetcode: {
    name: 'LeetCode',
    where: 'LeetCode Summary',
    howTo: 'leetcode.com → your avatar → Settings → Basic Info → Summary',
    placeholder: 'LeetCode username',
  },
};

function statsLine(platform: Platform, stats: GithubStats | LeetcodeStats) {
  if (platform === 'github') {
    const s = stats as GithubStats;
    return `${s.publicRepos} repos · ${s.totalStars} stars${s.topLanguages.length ? ` · ${s.topLanguages.slice(0, 3).join(', ')}` : ''}`;
  }
  const s = stats as LeetcodeStats;
  return `${s.solved.all} solved (E ${s.solved.easy} · M ${s.solved.medium} · H ${s.solved.hard})${s.contestRating ? ` · rating ${Math.round(s.contestRating)}` : ''}`;
}

function PlatformRow({ platform, stats, onUpdated }: { platform: Platform; stats?: GithubStats | LeetcodeStats; onUpdated: () => void }) {
  const meta = META[platform];
  const Icon = platform === 'github' ? Github : Code2;
  const [username, setUsername] = useState('');
  const [code, setCode] = useState<string | null>(null);
  const [busy, setBusy] = useState<'code' | 'verify' | 'refresh' | 'remove' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const run = async (action: 'code' | 'verify' | 'refresh' | 'remove') => {
    setBusy(action);
    setError(null);
    try {
      const res = await callVerifyProfile(platform, action, username);
      if (action === 'code' && res.code) setCode(res.code);
      if (action === 'verify' || action === 'refresh' || action === 'remove') {
        setCode(null);
        onUpdated();
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Verification failed.'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className={styles.row}>
      <div className={styles.rowHead}>
        <Icon size={18} />
        <strong>{meta.name}</strong>
        {stats ? (
          <a className={styles.verified} href={stats.url} target="_blank" rel="noopener noreferrer">
            <BadgeCheck size={16} /> Verified @{stats.username}
          </a>
        ) : (
          <span className={styles.unverified}>Not verified</span>
        )}
      </div>

      {stats ? (
        <>
          <p className={styles.stats}>{statsLine(platform, stats)}</p>
          <div className={styles.actions}>
            <button type="button" className={styles.smallBtn} onClick={() => run('refresh')} disabled={!!busy}>
              {busy === 'refresh' ? <Loader2 size={14} className={styles.spin} /> : <RefreshCw size={14} />} Refresh stats
            </button>
            <button type="button" className={`${styles.smallBtn} ${styles.danger}`} onClick={() => run('remove')} disabled={!!busy}>
              Remove
            </button>
          </div>
        </>
      ) : (
        <>
          <div className={styles.inputRow}>
            <label className={styles.srOnly} htmlFor={`verify-${platform}`}>{meta.placeholder}</label>
            <input
              id={`verify-${platform}`}
              className={styles.input}
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setCode(null);
              }}
              placeholder={meta.placeholder}
              autoComplete="off"
            />
            <button type="button" className={styles.smallBtn} onClick={() => run('code')} disabled={!username.trim() || !!busy}>
              {busy === 'code' ? <Loader2 size={14} className={styles.spin} /> : null} Get code
            </button>
          </div>
          {code && (
            <div className={styles.codeBox}>
              <p>
                Add this code anywhere in your <strong>{meta.where}</strong>, save, then click Verify. You can remove it
                afterwards.
              </p>
              <div className={styles.codeRow}>
                <code className={styles.code}>{code}</code>
                <button
                  type="button"
                  className={styles.smallBtn}
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(code);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1500);
                    } catch {
                      setCopied(false);
                    }
                  }}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy'}
                </button>
                <button type="button" className={styles.primaryBtn} onClick={() => run('verify')} disabled={!!busy}>
                  {busy === 'verify' ? <Loader2 size={14} className={styles.spin} /> : <BadgeCheck size={14} />} Verify
                </button>
              </div>
              <p className={styles.howTo}>Where: {meta.howTo}</p>
            </div>
          )}
        </>
      )}
      {error && (
        <p className={styles.error} role="alert">
          <AlertCircle size={14} /> {error}
        </p>
      )}
    </div>
  );
}

/** Lets a candidate prove they own their GitHub and LeetCode accounts. */
export function VerifiedProfilesPanel({ userId, onChange }: Props) {
  const [profiles, setProfiles] = useState<VerifiedProfiles | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getVerifiedProfiles(userId, { fresh: reload > 0 }).then((p) => {
      if (cancelled) return;
      setProfiles(p);
      onChange?.(p);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, reload, onChange]);

  return (
    <div className={styles.panel}>
      <h3 className={styles.title}>
        <BadgeCheck size={18} /> Verified coding profiles
      </h3>
      <p className={styles.desc}>
        Prove these accounts are yours. Recruiters on TalentLens and visitors to your portfolio see a verified badge with
        live stats.
      </p>
      <PlatformRow platform="github" stats={profiles?.github} onUpdated={() => setReload((n) => n + 1)} />
      <PlatformRow platform="leetcode" stats={profiles?.leetcode} onUpdated={() => setReload((n) => n + 1)} />
    </div>
  );
}
