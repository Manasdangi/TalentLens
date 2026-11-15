import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
  Globe, Loader2, Upload, FileText, Sparkles, Copy, Check, ExternalLink, Download, Plus, Trash2,
  ArrowUp, ArrowDown, Monitor, Smartphone, AlertCircle, CheckCircle2, XCircle,
} from 'lucide-react';
import { useResumes } from '../context/AppStore';
import { parseResumeToProfile } from '../services/aiProfileService';
import { checkSlug, getMyPortfolio, portfolioUrl, savePortfolio, type Portfolio, type SlugStatus } from '../services/portfolioService';
import type { VerifiedProfiles } from '../services/verificationService';
import { VerifiedProfilesPanel } from '../components/VerifiedProfilesPanel';
import { getErrorMessage } from '../utils/getErrorMessage';
import { emptyProfile, normalizeProfile, suggestSlugs, type ResumeProfile } from '../../api/_lib/profile';
import { DEFAULT_THEME, PORTFOLIO_THEMES, isThemeId, renderPortfolioHtml } from '../../api/_lib/portfolioTemplate';
import styles from './PortfolioScreen.module.css';

interface PortfolioScreenProps {
  userId: string;
  userName: string;
  currentResumeText: string;
  onBack: () => void;
}

type ListKey = 'links' | 'experience' | 'projects' | 'skills' | 'education';
type Item = Record<string, string | string[]>;
type FieldKind = 'text' | 'textarea' | 'lines' | 'csv';

interface FieldDef {
  key: string;
  label: string;
  placeholder: string;
  kind: FieldKind;
  half?: boolean;
}

const LISTS: Record<ListKey, { title: string; singular: string; blank: () => Item; head: (item: Item) => string; fields: FieldDef[] }> = {
  experience: {
    title: 'Experience',
    singular: 'role',
    blank: () => ({ company: '', role: '', location: '', start: '', end: '', bullets: [] }),
    head: (i) => [i.role, i.company].filter(Boolean).join(' · ') || 'New role',
    fields: [
      { key: 'role', label: 'Title', placeholder: 'Frontend Engineer', kind: 'text', half: true },
      { key: 'company', label: 'Company', placeholder: 'Acme', kind: 'text', half: true },
      { key: 'start', label: 'Start', placeholder: 'Jan 2024', kind: 'text', half: true },
      { key: 'end', label: 'End', placeholder: 'Present', kind: 'text', half: true },
      { key: 'location', label: 'Location', placeholder: 'Bengaluru', kind: 'text' },
      { key: 'bullets', label: 'Highlights, one per line', placeholder: 'Cut page load time by **40%** with code splitting', kind: 'lines' },
    ],
  },
  projects: {
    title: 'Projects',
    singular: 'project',
    blank: () => ({ name: '', description: '', tech: [], url: '', repo: '' }),
    head: (i) => (i.name as string) || 'New project',
    fields: [
      { key: 'name', label: 'Name', placeholder: 'My App', kind: 'text' },
      { key: 'description', label: 'What it does', placeholder: 'One line on what it does and for whom', kind: 'textarea' },
      { key: 'tech', label: 'Tech, comma separated', placeholder: 'React, TypeScript', kind: 'csv' },
      { key: 'url', label: 'Live URL', placeholder: 'myapp.vercel.app', kind: 'text', half: true },
      { key: 'repo', label: 'Code URL', placeholder: 'github.com/you/my-app', kind: 'text', half: true },
    ],
  },
  skills: {
    title: 'Skills',
    singular: 'group',
    blank: () => ({ group: '', items: [] }),
    head: (i) => (i.group as string) || 'New group',
    fields: [
      { key: 'group', label: 'Group', placeholder: 'Frontend', kind: 'text' },
      { key: 'items', label: 'Skills, comma separated', placeholder: 'React, TypeScript, CSS', kind: 'csv' },
    ],
  },
  education: {
    title: 'Education',
    singular: 'entry',
    blank: () => ({ school: '', degree: '', year: '' }),
    head: (i) => (i.school as string) || 'New entry',
    fields: [
      { key: 'school', label: 'School', placeholder: 'University', kind: 'text' },
      { key: 'degree', label: 'Degree', placeholder: 'B.Tech, Computer Science', kind: 'text', half: true },
      { key: 'year', label: 'Year', placeholder: '2023', kind: 'text', half: true },
    ],
  },
  links: {
    title: 'Links',
    singular: 'link',
    blank: () => ({ label: '', url: '' }),
    head: (i) => (i.label as string) || (i.url as string) || 'New link',
    fields: [
      { key: 'label', label: 'Label', placeholder: 'GitHub', kind: 'text', half: true },
      { key: 'url', label: 'URL', placeholder: 'github.com/you', kind: 'text', half: true },
    ],
  },
};

const LIST_ORDER: ListKey[] = ['experience', 'projects', 'skills', 'education', 'links'];
const ACCENTS = ['#2851e6', '#0f8a5f', '#d9480f', '#c2255c', '#7048e8', '#0a0a0a'];

/** Light clean-up while typing; keeps a trailing dash so "malika-" can become "malika-sinha". */
function cleanSlugInput(value: string): string {
  return value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-{2,}/g, '-').replace(/^-/, '').slice(0, 40);
}

function fieldValue(item: Item, field: FieldDef): string {
  const v = item[field.key];
  if (field.kind === 'lines') return Array.isArray(v) ? v.join('\n') : '';
  if (field.kind === 'csv') return Array.isArray(v) ? v.join(',') : '';
  return typeof v === 'string' ? v : '';
}

function parseField(value: string, kind: FieldKind): string | string[] {
  if (kind === 'lines') return value.split('\n');
  if (kind === 'csv') return value.split(',');
  return value;
}

// ---------- Import step ----------

function ImportPanel({
  currentResumeText,
  onImported,
  onBlank,
}: {
  currentResumeText: string;
  onImported: (profile: ResumeProfile) => void;
  onBlank: () => void;
}) {
  const { savedResumes } = useResumes();
  const [source, setSource] = useState<string>(currentResumeText ? 'current' : savedResumes[0]?.id ?? 'upload');
  const [uploadText, setUploadText] = useState('');
  const [uploadName, setUploadName] = useState('');
  const [busy, setBusy] = useState<'reading' | 'importing' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const textFor = () => {
    if (source === 'current') return currentResumeText;
    if (source === 'upload') return uploadText;
    return savedResumes.find((r) => r.id === source)?.content ?? '';
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setBusy('reading');
    try {
      const { extractTextFromPDF } = await import('../utils/pdfExtractor');
      const text = await extractTextFromPDF(file);
      if (text.length < 40) throw new Error('No text found in that PDF. Is it a scanned image?');
      setUploadText(text);
      setUploadName(file.name);
      setSource('upload');
    } catch (err) {
      setError(getErrorMessage(err, 'Could not read that PDF.'));
    } finally {
      setBusy(null);
    }
  };

  const runImport = async () => {
    const text = textFor();
    if (!text.trim()) {
      setError('Pick a resume or upload a PDF first.');
      return;
    }
    setError(null);
    setBusy('importing');
    try {
      onImported(await parseResumeToProfile(text));
    } catch (err) {
      setError(getErrorMessage(err, 'Import failed.'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className={styles.importCard}>
      <h2 className={styles.importTitle}>
        <Sparkles size={22} /> Build your portfolio from a resume
      </h2>
      <p className={styles.muted}>
        Pick a resume and we'll fill in your experience, projects and skills. You can edit everything before it goes live.
      </p>

      <div className={styles.sources} role="radiogroup" aria-label="Resume source">
        {currentResumeText && (
          <label className={styles.source}>
            <input type="radio" name="source" checked={source === 'current'} onChange={() => setSource('current')} />
            <FileText size={16} /> Resume currently loaded on the scoring page
          </label>
        )}
        {savedResumes.map((r) => (
          <label key={r.id} className={styles.source}>
            <input type="radio" name="source" checked={source === r.id} onChange={() => setSource(r.id)} />
            <FileText size={16} /> {r.label || r.fileName}
            <span className={styles.sourceMeta}>{r.fileName}</span>
          </label>
        ))}
        <label className={`${styles.source} ${styles.uploadSource}`}>
          <input type="radio" name="source" checked={source === 'upload'} onChange={() => setSource('upload')} />
          <Upload size={16} />
          {uploadName ? uploadName : 'Upload a PDF (resume or LinkedIn profile)'}
          <input
            className={styles.fileInput}
            type="file"
            accept="application/pdf"
            aria-label="Upload resume or LinkedIn PDF"
            onChange={(e) => void onFile(e.target.files?.[0])}
          />
        </label>
      </div>
      <p className={styles.tip}>
        LinkedIn tip: open your LinkedIn profile, click <strong>More → Save to PDF</strong>, and upload that file here.
      </p>

      {error && (
        <p className={styles.error} role="alert">
          <AlertCircle size={16} /> {error}
        </p>
      )}

      <div className={styles.importActions}>
        <button type="button" className={styles.primaryBtn} onClick={runImport} disabled={!!busy}>
          {busy ? <Loader2 size={18} className={styles.spin} /> : <Sparkles size={18} />}
          {busy === 'reading' ? 'Reading PDF…' : busy === 'importing' ? 'Building your portfolio…' : 'Import with AI'}
        </button>
        <button type="button" className={styles.ghostBtn} onClick={onBlank} disabled={!!busy}>
          Start blank
        </button>
      </div>
    </div>
  );
}

// ---------- Editor ----------

export function PortfolioScreen({ userId, userName, currentResumeText, onBack }: PortfolioScreenProps) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saved, setSaved] = useState<Portfolio | null>(null);
  const [profile, setProfile] = useState<ResumeProfile | null>(null);
  const [reimporting, setReimporting] = useState(false);
  const [theme, setTheme] = useState<string>(DEFAULT_THEME);
  const [accent, setAccent] = useState('');
  const [slug, setSlug] = useState('');
  const [slugStatus, setSlugStatus] = useState<SlugStatus | 'checking' | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [published, setPublished] = useState(true);
  const [showVerified, setShowVerified] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [verified, setVerified] = useState<VerifiedProfiles | null>(null);
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [copied, setCopied] = useState(false);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['basics', 'experience']));
  const slugTouched = useRef(false);

  useEffect(() => {
    let cancelled = false;
    getMyPortfolio(userId)
      .then((p) => {
        if (cancelled || !p) return;
        setSaved(p);
        setProfile(p.profile);
        setTheme(isThemeId(p.theme) ? p.theme : DEFAULT_THEME);
        setAccent(p.accent);
        setSlug(p.slug);
        setPublished(p.published);
        setShowVerified(p.showVerified);
        slugTouched.current = true;
      })
      .catch((err) => !cancelled && setLoadError(getErrorMessage(err, 'Failed to load your portfolio')))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Check that the link is free, a moment after typing stops.
  useEffect(() => {
    if (!slug) {
      setSlugStatus(null);
      return;
    }
    setSlugStatus('checking');
    const handle = setTimeout(() => {
      checkSlug(slug, userId).then(setSlugStatus).catch(() => setSlugStatus('taken'));
    }, 400);
    return () => clearTimeout(handle);
  }, [slug, userId]);

  const pickFreeSlug = useCallback(
    async (p: ResumeProfile) => {
      const options = suggestSlugs(p.basics.name || userName, p.basics.headline);
      const free: string[] = [];
      for (const option of options) {
        const status = await checkSlug(option, userId);
        if (status === 'available' || status === 'yours') free.push(option);
        if (free.length >= 3) break;
      }
      setSuggestions(free);
      if (!slugTouched.current && free[0]) setSlug(free[0]);
    },
    [userId, userName],
  );

  const startWith = (p: ResumeProfile) => {
    const next = { ...p, basics: { ...p.basics, name: p.basics.name || userName } };
    setProfile(next);
    setDirty(true);
    setReimporting(false);
    setOpenSections(new Set(['basics', 'experience']));
    void pickFreeSlug(next);
  };

  const update = (fn: (p: ResumeProfile) => ResumeProfile) => {
    setProfile((p) => (p ? fn(p) : p));
    setDirty(true);
    setNotice(null);
  };

  const setBasic = (key: keyof ResumeProfile['basics'], value: string) =>
    update((p) => ({ ...p, basics: { ...p.basics, [key]: value } }));

  const listOf = (p: ResumeProfile, key: ListKey) => p[key] as unknown as Item[];
  const setList = (key: ListKey, fn: (items: Item[]) => Item[]) =>
    update((p) => ({ ...p, [key]: fn([...listOf(p, key)]) }) as ResumeProfile);

  const normalized = useMemo(() => (profile ? normalizeProfile(profile) : null), [profile]);
  const previewHtml = useMemo(
    () =>
      normalized
        ? renderPortfolioHtml(normalized, {
            theme,
            accent,
            github: showVerified ? verified?.github : undefined,
            leetcode: showVerified ? verified?.leetcode : undefined,
          })
        : '',
    [normalized, theme, accent, showVerified, verified],
  );
  const deferredHtml = useDeferredValue(previewHtml);

  const canSave = !!profile && !saving && (slugStatus === 'available' || slugStatus === 'yours');

  const save = async () => {
    if (!profile || !canSave) return;
    setSaving(true);
    setNotice(null);
    try {
      const result = await savePortfolio({
        userId,
        slug,
        previousSlug: saved?.slug,
        theme,
        accent,
        profile,
        published,
        showVerified,
        createdAt: saved?.createdAt,
      });
      setSaved(result);
      setProfile(result.profile);
      setDirty(false);
      setSlugStatus('yours');
      setNotice({
        kind: 'ok',
        text: published ? 'Published. Your portfolio is live at the link above.' : 'Draft saved. Turn on "Public" when you want it live.',
      });
    } catch (err) {
      setNotice({ kind: 'err', text: getErrorMessage(err, 'Failed to save portfolio') });
    } finally {
      setSaving(false);
    }
  };

  const downloadPdf = async () => {
    if (!normalized) return;
    const { buildResumePdf, resumePdfFileName } = await import('../../api/_lib/resumePdf');
    buildResumePdf(normalized).save(resumePdfFileName(normalized));
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(portfolioUrl(saved?.slug ?? slug));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  const toggleSection = (key: string, open: boolean) =>
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (open) next.add(key);
      else next.delete(key);
      return next;
    });

  const onVerifiedChange = useCallback((p: VerifiedProfiles | null) => setVerified(p), []);

  const back = (
    <button type="button" className={styles.backBtn} onClick={onBack} aria-label="Back to resume scoring">
      ← Back to resume scoring
    </button>
  );

  if (loading) {
    return (
      <div className={styles.screen}>
        {back}
        <p className={styles.loading}>
          <Loader2 size={18} className={styles.spin} /> Loading your portfolio…
        </p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={styles.screen}>
        {back}
        <p className={styles.error} role="alert">
          <AlertCircle size={16} /> {loadError}
        </p>
      </div>
    );
  }

  if (!profile || reimporting) {
    return (
      <div className={styles.screen}>
        {back}
        <ImportPanel currentResumeText={currentResumeText} onImported={startWith} onBlank={() => startWith(emptyProfile())} />
        {reimporting && (
          <button type="button" className={styles.linkBtn} onClick={() => setReimporting(false)}>
            Cancel and keep my current content
          </button>
        )}
      </div>
    );
  }

  const isLive = !!saved?.published;
  const liveUrl = saved ? portfolioUrl(saved.slug) : '';
  const statusPill = isLive ? (dirty ? 'Live · unsaved changes' : 'Live') : saved ? 'Draft' : 'Not saved yet';

  return (
    <div className={styles.screen}>
      {back}
      <div className={styles.titleRow}>
        <div>
          <h1 className={styles.title}>
            <Globe size={24} /> Your portfolio
          </h1>
          <p className={styles.muted}>Edit on the left, see it live on the right. Publish to get a shareable link.</p>
        </div>
        <span className={`${styles.pill} ${isLive ? styles.pillLive : ''}`}>{statusPill}</span>
      </div>

      <div className={styles.layout}>
        <div className={styles.editor}>
          {/* Link + publish */}
          <div className={styles.card}>
            <label className={styles.label} htmlFor="portfolio-slug">Your link</label>
            <div className={styles.slugRow}>
              <span className={styles.slugPrefix}>{window.location.host}/p/</span>
              <input
                id="portfolio-slug"
                className={styles.slugInput}
                value={slug}
                onChange={(e) => {
                  slugTouched.current = true;
                  setSlug(cleanSlugInput(e.target.value));
                  setDirty(true);
                }}
                placeholder="your-name"
                spellCheck={false}
              />
            </div>
            <p className={styles.slugStatus} aria-live="polite">
              {slugStatus === 'checking' && <><Loader2 size={14} className={styles.spin} /> Checking…</>}
              {slugStatus === 'available' && <><CheckCircle2 size={14} className={styles.ok} /> Available</>}
              {slugStatus === 'yours' && <><CheckCircle2 size={14} className={styles.ok} /> This is your link</>}
              {slugStatus === 'taken' && <><XCircle size={14} className={styles.bad} /> Taken. Try one of these:</>}
              {slugStatus === 'invalid' && <><XCircle size={14} className={styles.bad} /> Use 3–40 lowercase letters, numbers or dashes.</>}
            </p>
            {(slugStatus === 'taken' || slugStatus === 'invalid') && suggestions.length > 0 && (
              <div className={styles.chips}>
                {suggestions.filter((s) => s !== slug).map((s) => (
                  <button key={s} type="button" className={styles.chip} onClick={() => setSlug(s)}>
                    {s}
                  </button>
                ))}
              </div>
            )}

            <label className={styles.toggle}>
              <input type="checkbox" checked={published} onChange={(e) => { setPublished(e.target.checked); setDirty(true); }} />
              <span>Public: anyone with the link can view it</span>
            </label>
            <label className={styles.toggle}>
              <input type="checkbox" checked={showVerified} onChange={(e) => { setShowVerified(e.target.checked); setDirty(true); }} />
              <span>Show my verified GitHub and LeetCode stats</span>
            </label>

            <div className={styles.actions}>
              <button type="button" className={styles.primaryBtn} onClick={save} disabled={!canSave || (!dirty && !!saved)}>
                {saving ? <Loader2 size={16} className={styles.spin} /> : <Globe size={16} />}
                {saving ? 'Saving…' : published && !isLive ? 'Publish' : 'Save changes'}
              </button>
              <button type="button" className={styles.ghostBtn} onClick={downloadPdf}>
                <Download size={16} /> Resume PDF
              </button>
            </div>
            {isLive && (
              <div className={styles.liveRow}>
                <a href={liveUrl} target="_blank" rel="noopener noreferrer" className={styles.liveLink}>
                  {liveUrl.replace(/^https?:\/\//, '')} <ExternalLink size={14} />
                </a>
                <button type="button" className={styles.smallBtn} onClick={copyLink}>
                  {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy link'}
                </button>
              </div>
            )}
            {notice && (
              <p className={notice.kind === 'ok' ? styles.success : styles.error} role="status">
                {notice.kind === 'ok' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />} {notice.text}
              </p>
            )}
          </div>

          {/* Content */}
          <details className={styles.section} open={openSections.has('basics')} onToggle={(e) => toggleSection('basics', e.currentTarget.open)}>
            <summary>Basics</summary>
            <div className={styles.sectionBody}>
              <div className={styles.row2}>
                <Field id="b-name" label="Full name" value={profile.basics.name} onChange={(v) => setBasic('name', v)} placeholder="Malika Sinha" />
                <Field id="b-headline" label="Headline" value={profile.basics.headline} onChange={(v) => setBasic('headline', v)} placeholder="Frontend Engineer" />
              </div>
              <div className={styles.row2}>
                <Field id="b-location" label="Location" value={profile.basics.location} onChange={(v) => setBasic('location', v)} placeholder="Gurgaon, India" />
                <Field id="b-email" label="Email (shown on the page)" value={profile.basics.email} onChange={(v) => setBasic('email', v)} placeholder="you@example.com" />
              </div>
              <Field id="b-phone" label="Phone (resume PDF only)" value={profile.basics.phone} onChange={(v) => setBasic('phone', v)} placeholder="Optional" />
              <Field id="b-summary" label="About (blank line = new paragraph)" value={profile.basics.summary} onChange={(v) => setBasic('summary', v)} placeholder="A few lines about you" area />
              <p className={styles.hint}>Wrap words in **double asterisks** to make them bold.</p>
            </div>
          </details>

          {LIST_ORDER.map((key) => {
            const def = LISTS[key];
            const items = listOf(profile, key);
            return (
              <details key={key} className={styles.section} open={openSections.has(key)} onToggle={(e) => toggleSection(key, e.currentTarget.open)}>
                <summary>
                  {def.title} <span className={styles.count}>{items.length}</span>
                </summary>
                <div className={styles.sectionBody}>
                  {items.map((item, index) => (
                    <div key={index} className={styles.item}>
                      <div className={styles.itemHead}>
                        <strong>{def.head(item)}</strong>
                        <button type="button" className={styles.iconBtn} aria-label="Move up" disabled={index === 0}
                          onClick={() => setList(key, (l) => { [l[index - 1], l[index]] = [l[index], l[index - 1]]; return l; })}>
                          <ArrowUp size={14} />
                        </button>
                        <button type="button" className={styles.iconBtn} aria-label="Move down" disabled={index === items.length - 1}
                          onClick={() => setList(key, (l) => { [l[index + 1], l[index]] = [l[index], l[index + 1]]; return l; })}>
                          <ArrowDown size={14} />
                        </button>
                        <button type="button" className={`${styles.iconBtn} ${styles.danger}`} aria-label={`Remove ${def.singular}`}
                          onClick={() => setList(key, (l) => l.filter((_, i) => i !== index))}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className={styles.fields}>
                        {def.fields.map((field) => (
                          <div key={field.key} className={field.half ? styles.half : styles.full}>
                            <Field
                              id={`${key}-${index}-${field.key}`}
                              label={field.label}
                              placeholder={field.placeholder}
                              area={field.kind === 'textarea' || field.kind === 'lines'}
                              rows={field.kind === 'lines' ? 5 : 2}
                              value={fieldValue(item, field)}
                              onChange={(v) =>
                                setList(key, (l) => l.map((it, i) => (i === index ? { ...it, [field.key]: parseField(v, field.kind) } : it)))
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  <button type="button" className={styles.addBtn} onClick={() => setList(key, (l) => [...l, def.blank()])}>
                    <Plus size={16} /> Add {def.singular}
                  </button>
                </div>
              </details>
            );
          })}

          <div className={styles.card}>
            <VerifiedProfilesPanel userId={userId} onChange={onVerifiedChange} />
          </div>

          <button type="button" className={styles.linkBtn} onClick={() => setReimporting(true)}>
            Replace content with a new resume import
          </button>
        </div>

        {/* Preview */}
        <div className={styles.previewCol}>
          <div className={styles.previewTools}>
            <div className={styles.themes} role="group" aria-label="Theme">
              {Object.entries(PORTFOLIO_THEMES).map(([id, t]) => (
                <button
                  key={id}
                  type="button"
                  className={styles.themeChip}
                  aria-pressed={theme === id}
                  onClick={() => { setTheme(id); setAccent(''); setDirty(true); }}
                >
                  <span className={styles.themeDot} style={{ background: t.c.bg, boxShadow: `inset -6px 0 0 ${t.accent}, 0 0 0 1px ${t.c.line}` }} />
                  {t.label}
                </button>
              ))}
            </div>
            <div className={styles.toolRow}>
              <div className={styles.swatches} role="group" aria-label="Accent colour">
                {ACCENTS.map((c) => (
                  <button key={c} type="button" className={styles.swatch} style={{ background: c }} aria-label={`Accent ${c}`}
                    aria-pressed={accent.toLowerCase() === c} onClick={() => { setAccent(c); setDirty(true); }} />
                ))}
                <label className={styles.customSwatch} title="Custom colour">
                  <input type="color" aria-label="Custom accent colour"
                    value={accent || PORTFOLIO_THEMES[isThemeId(theme) ? theme : DEFAULT_THEME].accent}
                    onChange={(e) => { setAccent(e.target.value); setDirty(true); }} />
                </label>
              </div>
              <div className={styles.deviceToggle} role="group" aria-label="Preview size">
                <button type="button" aria-pressed={device === 'desktop'} onClick={() => setDevice('desktop')} aria-label="Desktop preview">
                  <Monitor size={16} />
                </button>
                <button type="button" aria-pressed={device === 'mobile'} onClick={() => setDevice('mobile')} aria-label="Mobile preview">
                  <Smartphone size={16} />
                </button>
              </div>
            </div>
          </div>
          <div className={styles.previewStage}>
            <iframe
              title="Portfolio preview"
              className={`${styles.preview} ${device === 'mobile' ? styles.previewMobile : ''}`}
              srcDoc={deferredHtml}
              sandbox="allow-popups allow-popups-to-escape-sandbox"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  id, label, value, onChange, placeholder, area, rows = 3,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  area?: boolean;
  rows?: number;
}) {
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      {area ? (
        <textarea id={id} value={value} rows={rows} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input id={id} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}
