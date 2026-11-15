import { useEffect, useState, type SyntheticEvent } from 'react';
import { BadgeCheck, Globe } from 'lucide-react';
import { getVerifiedProfiles, type VerifiedProfiles } from '../../services/verificationService';
import { getPublishedSlugForUser } from '../../services/portfolioService';
import styles from './VerifiedBadges.module.css';

/** Compact verified GitHub/LeetCode stats and portfolio link for a candidate, shown to recruiters. */
export function VerifiedBadges({ userId }: { userId: string }) {
  const [profiles, setProfiles] = useState<VerifiedProfiles | null>(null);
  const [slug, setSlug] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getVerifiedProfiles(userId).then((p) => !cancelled && setProfiles(p));
    getPublishedSlugForUser(userId)
      .then((s) => !cancelled && setSlug(s))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const gh = profiles?.github;
  const lc = profiles?.leetcode;
  if (!gh && !lc && !slug) return null;

  // Badges live inside clickable card headers; keep link clicks from toggling the card.
  const stop = (e: SyntheticEvent) => e.stopPropagation();

  return (
    <span className={styles.badges} onClick={stop} onKeyDown={stop}>
      {gh && (
        <a className={styles.badge} href={gh.url} target="_blank" rel="noopener noreferrer" title="Verified GitHub account">
          <BadgeCheck size={13} /> GitHub · {gh.publicRepos} repos{gh.topLanguages[0] ? ` · ${gh.topLanguages[0]}` : ''}
        </a>
      )}
      {lc && (
        <a className={styles.badge} href={lc.url} target="_blank" rel="noopener noreferrer" title="Verified LeetCode account">
          <BadgeCheck size={13} /> LeetCode · {lc.solved.all} solved{lc.contestRating ? ` · ${Math.round(lc.contestRating)}` : ''}
        </a>
      )}
      {slug && (
        <a className={`${styles.badge} ${styles.portfolio}`} href={`/p/${slug}`} target="_blank" rel="noopener noreferrer">
          <Globe size={13} /> Portfolio
        </a>
      )}
    </span>
  );
}
