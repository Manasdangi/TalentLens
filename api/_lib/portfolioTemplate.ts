/**
 * Renders a complete, self-contained portfolio HTML page from a ResumeProfile.
 * Used by the public page (/p/:slug, a Vercel function) and the editor's live preview.
 * Every user-supplied string goes through esc(); only **bold** markers become markup.
 */
import type { GithubStats, LeetcodeStats, ResumeProfile } from './profile.js';

interface ThemeDef {
  label: string;
  fonts: string;
  display: string;
  body: string;
  c: { bg: string; surface: string; text: string; muted: string; line: string };
  accent: string;
  nameWeight: string;
  nameTransform: 'none' | 'uppercase';
  radius: string;
  cardBorder: string;
  css?: string;
}

export const PORTFOLIO_THEMES = {
  ledger: {
    label: 'Ledger', fonts: 'family=Instrument+Serif&family=Manrope:wght@400;500;600;700',
    display: "'Instrument Serif', Georgia, serif", body: "'Manrope', system-ui, sans-serif",
    c: { bg: '#fbfbfa', surface: '#ffffff', text: '#16181d', muted: '#5d6470', line: '#e4e5e8' }, accent: '#2851e6',
    nameWeight: '400', nameTransform: 'none', radius: '12px', cardBorder: '1px',
  },
  console: {
    label: 'Console', fonts: 'family=JetBrains+Mono:wght@400;600;700&family=IBM+Plex+Sans:wght@400;500;600',
    display: "'JetBrains Mono', ui-monospace, monospace", body: "'IBM Plex Sans', system-ui, sans-serif",
    c: { bg: '#0f1115', surface: '#151920', text: '#e6e8eb', muted: '#8b93a1', line: '#262c35' }, accent: '#f5a524',
    nameWeight: '700', nameTransform: 'none', radius: '6px', cardBorder: '1px',
    css: 'h2::before{content:"// ";color:var(--accent)}',
  },
  poster: {
    label: 'Poster', fonts: 'family=Archivo:wght@400;500;600;800;900',
    display: "'Archivo', 'Arial Black', sans-serif", body: "'Archivo', system-ui, sans-serif",
    c: { bg: '#eceff3', surface: '#ffffff', text: '#0b0d12', muted: '#4d5562', line: '#0b0d12' }, accent: '#ff4d2e',
    nameWeight: '900', nameTransform: 'uppercase', radius: '0px', cardBorder: '2px',
    css: '.hero,section{border-bottom:2px solid var(--text)} h1{letter-spacing:-.04em} .links a,.chip{border-radius:0} .card{box-shadow:6px 6px 0 var(--text)}',
  },
  night: {
    label: 'Night', fonts: 'family=Sora:wght@300;400;500;600;700',
    display: "'Sora', system-ui, sans-serif", body: "'Sora', system-ui, sans-serif",
    c: { bg: '#0b1220', surface: '#111a2e', text: '#e8ecf4', muted: '#94a0b8', line: '#1f2a44' }, accent: '#5eead4',
    nameWeight: '600', nameTransform: 'none', radius: '16px', cardBorder: '1px',
    css: '.hero{background:radial-gradient(600px 280px at 85% 10%,color-mix(in srgb,var(--accent) 16%,transparent),transparent)}',
  },
  mint: {
    label: 'Mint', fonts: 'family=Plus+Jakarta+Sans:wght@400;500;600;700;800',
    display: "'Plus Jakarta Sans', system-ui, sans-serif", body: "'Plus Jakarta Sans', system-ui, sans-serif",
    c: { bg: '#f2f7f4', surface: '#ffffff', text: '#10231b', muted: '#52685d', line: '#d5e3db' }, accent: '#0f8a5f',
    nameWeight: '800', nameTransform: 'none', radius: '14px', cardBorder: '1px',
  },
  studio: {
    label: 'Studio', fonts: 'family=Syne:wght@600;700;800&family=Karla:wght@400;500;600;700',
    display: "'Syne', system-ui, sans-serif", body: "'Karla', system-ui, sans-serif",
    c: { bg: '#ffffff', surface: '#f6f6f8', text: '#111114', muted: '#5e5e6a', line: '#e6e6ea' }, accent: '#7048e8',
    nameWeight: '800', nameTransform: 'none', radius: '20px', cardBorder: '0px',
    css: '.chip{background:var(--surface);border-color:transparent}',
  },
  grayscale: {
    label: 'Grayscale', fonts: 'family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600;700',
    display: "'DM Sans', system-ui, sans-serif", body: "'DM Sans', system-ui, sans-serif",
    c: { bg: '#fafafa', surface: '#ffffff', text: '#0a0a0a', muted: '#6b6b6b', line: '#e2e2e2' }, accent: '#0a0a0a',
    nameWeight: '700', nameTransform: 'none', radius: '4px', cardBorder: '1px',
    css: "h2,.dates,.tag,.chip,.stat b{font-family:'DM Mono',monospace}",
  },
  blush: {
    label: 'Blush', fonts: 'family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,800',
    display: "'Bricolage Grotesque', system-ui, sans-serif", body: "'Bricolage Grotesque', system-ui, sans-serif",
    c: { bg: '#fff4f2', surface: '#ffffff', text: '#2a1215', muted: '#7a5458', line: '#f2d9d6' }, accent: '#d6336c',
    nameWeight: '800', nameTransform: 'none', radius: '18px', cardBorder: '1px',
  },
  forest: {
    label: 'Forest', fonts: 'family=Lora:ital,wght@0,500;0,600;1,500&family=Work+Sans:wght@400;500;600',
    display: "'Lora', Georgia, serif", body: "'Work Sans', system-ui, sans-serif",
    c: { bg: '#0f1a14', surface: '#15241c', text: '#e6efe9', muted: '#94ab9d', line: '#22362b' }, accent: '#f4c95d',
    nameWeight: '500', nameTransform: 'none', radius: '10px', cardBorder: '1px',
    css: 'h1{font-style:italic}',
  },
  blueprint: {
    label: 'Blueprint', fonts: 'family=IBM+Plex+Mono:wght@400;600;700&family=IBM+Plex+Sans:wght@400;500;600',
    display: "'IBM Plex Mono', monospace", body: "'IBM Plex Sans', system-ui, sans-serif",
    c: { bg: '#0c2b4b', surface: '#10345a', text: '#e7f0fa', muted: '#9db5cf', line: '#2a5583' }, accent: '#ffd43b',
    nameWeight: '700', nameTransform: 'uppercase', radius: '2px', cardBorder: '1px',
    css: '.card{border-style:dashed}',
  },
  editorial: {
    label: 'Editorial', fonts: 'family=Playfair+Display:ital,wght@0,700;1,700&family=Source+Sans+3:wght@400;600;700',
    display: "'Playfair Display', Georgia, serif", body: "'Source Sans 3', system-ui, sans-serif",
    c: { bg: '#ffffff', surface: '#ffffff', text: '#141414', muted: '#5a5a5a', line: '#dcdcdc' }, accent: '#b91c1c',
    nameWeight: '700', nameTransform: 'none', radius: '0px', cardBorder: '1px',
    css: 'h1{font-style:italic} .hero{border-bottom:3px double var(--text)}',
  },
  lavender: {
    label: 'Lavender', fonts: 'family=Nunito:wght@400;600;700;800',
    display: "'Nunito', system-ui, sans-serif", body: "'Nunito', system-ui, sans-serif",
    c: { bg: '#f5f3ff', surface: '#ffffff', text: '#1e1b4b', muted: '#5b5891', line: '#e2defc' }, accent: '#6d28d9',
    nameWeight: '800', nameTransform: 'none', radius: '22px', cardBorder: '1px',
  },
} satisfies Record<string, ThemeDef>;

export type PortfolioThemeId = keyof typeof PORTFOLIO_THEMES;
export const DEFAULT_THEME: PortfolioThemeId = 'ledger';

export function isThemeId(value: unknown): value is PortfolioThemeId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(PORTFOLIO_THEMES, value);
}

export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
}

export interface RenderOptions {
  theme?: string;
  accent?: string;
  github?: GithubStats;
  leetcode?: LeetcodeStats;
  /** Link for the "Download resume" button; omitted in previews. */
  resumePdfUrl?: string;
  /** Absolute URL of this page, for social previews. */
  canonicalUrl?: string;
  /** Where the "Made with TalentLens" credit points. */
  homeUrl?: string;
}

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (c) => ESC[c]);
const rich = (value: string) => esc(value).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
const has = (value: unknown) => String(value ?? '').trim().length > 0;
const plain = (value: string) => value.replace(/\*\*/g, '');

/** Turns user input into a safe link: http(s) and mailto only. Anything else becomes "". */
export function safeHref(value: string): string {
  const v = String(value || '').trim();
  if (!v) return '';
  if (/^https?:\/\//i.test(v)) return v;
  if (/^mailto:[^\s]+$/i.test(v)) return v;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return `mailto:${v}`;
  if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(v)) return `https://${v}`;
  return '';
}

const prettyUrl = (value: string) => value.replace(/^https?:\/\//, '').replace(/^mailto:/, '').replace(/\/$/, '');

function onAccent(hex: string): string {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4]
    .map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? '#0b0d12' : '#ffffff';
}

const ext = 'target="_blank" rel="noopener noreferrer"';
const fmt = (n: number) => n.toLocaleString('en-US');

export function renderPortfolioHtml(profile: ResumeProfile, options: RenderOptions = {}): string {
  const themeId = isThemeId(options.theme) ? options.theme : DEFAULT_THEME;
  const t: ThemeDef = PORTFOLIO_THEMES[themeId];
  const accent = isHexColor(options.accent) ? options.accent : t.accent;
  const b = profile.basics;
  const name = has(b.name) ? b.name : 'Your Name';
  const year = new Date().getFullYear();

  const email = safeHref(b.email);
  const links = profile.links
    .map((l) => ({ label: l.label || prettyUrl(l.url), href: safeHref(l.url) }))
    .filter((l) => l.href);
  const linkHtml = [
    email ? `<a class="primary" href="${esc(email)}">Email me</a>` : '',
    ...links.map(
      (l, i) => `<a class="${!email && i === 0 ? 'primary' : ''}" href="${esc(l.href)}" ${ext}>${esc(l.label)} <span aria-hidden="true">↗</span></a>`,
    ),
    options.resumePdfUrl ? `<a href="${esc(options.resumePdfUrl)}" download>Download resume <span aria-hidden="true">↓</span></a>` : '',
  ].join('');

  const about = String(b.summary || '').split(/\n\s*\n/).filter(has);
  const sec = (id: string, title: string, body: string) =>
    `<section id="${id}"><div class="wrap sec"><h2>${title}</h2><div>${body}</div></div></section>`;

  const expHtml = profile.experience
    .map((e) => {
      const dates = [e.start, e.end].filter(has).join(' – ');
      const bullets = e.bullets.filter(has);
      return `<article class="job"><div class="job-top"><h3>${esc(e.role)}${has(e.role) && has(e.company) ? ' <span class="at">at</span> ' : ''}<span class="co">${esc(e.company)}</span></h3>${dates ? `<span class="dates">${esc(dates)}</span>` : ''}</div>${has(e.location) ? `<div class="loc">${esc(e.location)}</div>` : ''}${bullets.length ? `<ul class="bul">${bullets.map((x) => `<li>${rich(x)}</li>`).join('')}</ul>` : ''}</article>`;
    })
    .join('');

  const projHtml = `<div class="grid">${profile.projects
    .map((p) => {
      const live = safeHref(p.url);
      const repo = safeHref(p.repo);
      const pl = [live ? `<a href="${esc(live)}" ${ext}>Live ↗</a>` : '', repo ? `<a href="${esc(repo)}" ${ext}>Code ↗</a>` : ''].join('');
      return `<article class="card"><h3>${esc(p.name)}</h3>${has(p.description) ? `<p>${rich(p.description)}</p>` : ''}${p.tech.length ? `<div class="tags">${p.tech.map((x) => `<span class="tag">${esc(x)}</span>`).join('')}</div>` : ''}${pl ? `<div class="cl">${pl}</div>` : ''}</article>`;
    })
    .join('')}</div>`;

  const skillHtml = `<div class="skills">${profile.skills
    .map((s) => `<div class="skill-row"><div class="sg">${esc(s.group || 'Skills')}</div><div class="chips">${s.items.map((x) => `<span class="chip">${esc(x)}</span>`).join('')}</div></div>`)
    .join('')}</div>`;

  const eduHtml = profile.education
    .map((e) => `<div class="job"><div class="job-top"><h3>${esc(e.degree)}${has(e.degree) ? ' <span class="at">·</span> ' : ''}<span class="co">${esc(e.school)}</span></h3>${has(e.year) ? `<span class="dates">${esc(e.year)}</span>` : ''}</div></div>`)
    .join('');

  const gh = options.github;
  const lc = options.leetcode;
  const verified = (label: string, href: string, handle: string) =>
    `<a class="vhead" href="${esc(href)}" ${ext}><span class="vtick" title="Verified by TalentLens">✓</span>${label} <span class="handle">@${esc(handle)}</span></a>`;
  const codingHtml = gh || lc
    ? `<div class="vgrid">${gh ? `<div class="card vcard">${verified('GitHub', gh.url, gh.username)}<div class="stats"><div class="stat"><b>${fmt(gh.publicRepos)}</b><span>public repos</span></div><div class="stat"><b>${fmt(gh.totalStars)}</b><span>stars</span></div><div class="stat"><b>${fmt(gh.followers)}</b><span>followers</span></div></div>${gh.topLanguages.length ? `<div class="tags">${gh.topLanguages.map((l) => `<span class="tag">${esc(l)}</span>`).join('')}</div>` : ''}</div>` : ''}${lc ? `<div class="card vcard">${verified('LeetCode', lc.url, lc.username)}<div class="stats"><div class="stat"><b>${fmt(lc.solved.all)}</b><span>solved</span></div>${lc.contestRating ? `<div class="stat"><b>${fmt(Math.round(lc.contestRating))}</b><span>contest rating</span></div>` : ''}${lc.topPercentage ? `<div class="stat"><b>Top ${lc.topPercentage.toFixed(1)}%</b><span>in contests</span></div>` : ''}</div><div class="bars">${(['easy', 'medium', 'hard'] as const).map((k) => `<div class="bar"><span>${k[0].toUpperCase() + k.slice(1)}</span><b>${fmt(lc.solved[k])}</b></div>`).join('')}</div></div>` : ''}</div><p class="vnote">✓ Account ownership verified by TalentLens. Stats come straight from GitHub and LeetCode.</p>`
    : '';

  const contactHref = email || links[0]?.href || '';
  const contactLabel = email ? prettyUrl(email) : links[0] ? prettyUrl(links[0].href) : '';
  const desc = plain(has(b.headline) ? `${name} · ${b.headline}` : name);
  const summaryDesc = plain(about[0] || desc).slice(0, 200);

  const nav = [
    about.length ? '<a class="nl" href="#about">About</a>' : '',
    profile.experience.length ? '<a class="nl" href="#work">Work</a>' : '',
    profile.projects.length ? '<a class="nl" href="#projects">Projects</a>' : '',
    codingHtml ? '<a class="nl" href="#coding">Coding</a>' : '',
    contactHref ? '<a class="nl" href="#contact">Contact</a>' : '',
  ].join('');

  const css = `
:root{--bg:${t.c.bg};--surface:${t.c.surface};--text:${t.c.text};--muted:${t.c.muted};--line:${t.c.line};--accent:${accent};--on-accent:${onAccent(accent)};--display:${t.display};--body:${t.body};--radius:${t.radius};--cb:${t.cardBorder}}
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{background:var(--bg);color:var(--text);font:16px/1.65 var(--body);-webkit-font-smoothing:antialiased}
a{color:inherit}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.wrap{max-width:980px;margin:0 auto;padding:0 24px}
nav{position:sticky;top:0;z-index:5;background:color-mix(in srgb,var(--bg) 88%,transparent);backdrop-filter:blur(8px);border-bottom:1px solid var(--line)}
nav .wrap{display:flex;align-items:center;gap:20px;height:56px}
nav .mark{font-family:var(--display);font-weight:${t.nameWeight};font-size:18px;text-decoration:none;margin-right:auto;text-transform:${t.nameTransform}}
nav a.nl{font-size:14px;color:var(--muted);text-decoration:none}
nav a.nl:hover{color:var(--text)}
.hero{padding:88px 0 64px;border-bottom:1px solid var(--line)}
h1{font-family:var(--display);font-weight:${t.nameWeight};text-transform:${t.nameTransform};font-size:clamp(46px,9vw,96px);line-height:.98;letter-spacing:-.025em;text-wrap:balance}
.role{font-size:clamp(18px,2.6vw,24px);margin-top:18px;font-weight:500}
.role .loc{color:var(--muted);font-weight:400}
.links{display:flex;flex-wrap:wrap;gap:10px;margin-top:32px}
.links a{display:inline-flex;gap:6px;align-items:center;padding:9px 16px;border:var(--cb) solid var(--line);border-radius:999px;text-decoration:none;font-size:14px;font-weight:600;transition:border-color .15s,transform .15s}
.links a:hover{border-color:var(--accent);transform:translateY(-1px)}
.links a.primary{background:var(--accent);border-color:var(--accent);color:var(--on-accent)}
section{padding:64px 0;border-bottom:1px solid var(--line)}
.sec{display:grid;grid-template-columns:170px 1fr;gap:36px}
h2{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);font-weight:600;padding-top:6px}
.about p{font-size:19px;max-width:60ch;text-wrap:pretty}
.about p+p{margin-top:14px}
.job{padding-bottom:30px;margin-bottom:30px;border-bottom:1px dashed var(--line)}
.job:last-child{border-bottom:0;margin-bottom:0;padding-bottom:0}
.job-top{display:flex;justify-content:space-between;align-items:baseline;gap:6px 16px;flex-wrap:wrap}
.job h3{font-size:19px;font-weight:600;line-height:1.35}
.job .at{color:var(--muted);font-weight:400}
.job .co{color:var(--accent)}
.loc{color:var(--muted);font-size:14px}
.dates{color:var(--muted);font-size:14px;font-variant-numeric:tabular-nums;white-space:nowrap}
.bul{padding-left:18px;display:grid;gap:8px;margin-top:12px;max-width:68ch}
.bul li::marker{color:var(--accent)}
strong{font-weight:700}
.grid,.vgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:16px}
.card{background:var(--surface);border:var(--cb) solid var(--line);border-radius:var(--radius);padding:22px;display:flex;flex-direction:column;gap:12px}
.card h3{font-size:18px;font-weight:600;font-family:var(--display)}
.card p{color:var(--muted);font-size:15px}
.tags{display:flex;flex-wrap:wrap;gap:6px}
.tag{font-size:12px;font-weight:500;padding:3px 8px;border-radius:6px;background:color-mix(in srgb,var(--accent) 14%,transparent)}
.cl{margin-top:auto;display:flex;gap:16px;font-size:14px;padding-top:4px}
.cl a{color:var(--accent);text-decoration:none;font-weight:600}
.skills{display:grid;gap:18px}
.skill-row{display:grid;grid-template-columns:150px 1fr;gap:16px;align-items:start}
.sg{font-weight:600;padding-top:4px}
.chips{display:flex;flex-wrap:wrap;gap:8px}
.chip{border:var(--cb) solid var(--line);padding:4px 11px;border-radius:999px;font-size:14px}
.vhead{display:flex;align-items:center;gap:8px;font-weight:700;font-size:17px;text-decoration:none}
.vhead .handle{color:var(--muted);font-weight:500;font-size:14px}
.vtick{display:inline-grid;place-items:center;width:20px;height:20px;border-radius:50%;background:var(--accent);color:var(--on-accent);font-size:12px}
.stats{display:flex;gap:22px;flex-wrap:wrap}
.stat{display:grid}
.stat b{font-size:24px;font-variant-numeric:tabular-nums;line-height:1.1}
.stat span{color:var(--muted);font-size:13px}
.bars{display:flex;gap:8px;flex-wrap:wrap}
.bar{display:flex;gap:6px;font-size:13px;padding:3px 9px;border-radius:6px;background:color-mix(in srgb,var(--accent) 10%,transparent)}
.bar span{color:var(--muted)}
.vnote{color:var(--muted);font-size:13px;margin-top:14px}
footer{padding:80px 0 56px}
.cta{font-family:var(--display);font-weight:${t.nameWeight};text-transform:${t.nameTransform};font-size:clamp(32px,5.5vw,60px);line-height:1.05;letter-spacing:-.02em;text-wrap:balance}
.cta a{color:var(--accent);text-decoration-thickness:2px;text-underline-offset:6px;word-break:break-word}
.fine{display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;color:var(--muted);font-size:13px;margin-top:56px;padding-top:20px;border-top:1px solid var(--line)}
.fine a{color:var(--muted)}
${t.css || ''}
@media(max-width:720px){.sec{grid-template-columns:1fr;gap:18px}.skill-row{grid-template-columns:1fr;gap:8px}.hero{padding:56px 0 48px}section{padding:48px 0}nav a.nl{display:none}}
@media(prefers-reduced-motion:reduce){*{transition:none!important}html{scroll-behavior:auto}}`;

  const og = options.canonicalUrl
    ? `<link rel="canonical" href="${esc(options.canonicalUrl)}">\n<meta property="og:url" content="${esc(options.canonicalUrl)}">`
    : '';
  const credit = options.homeUrl
    ? `<a href="${esc(options.homeUrl)}" ${ext}>Made with TalentLens</a>`
    : '<span>Made with TalentLens</span>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(desc)}</title>
<meta name="description" content="${esc(summaryDesc)}">
<meta property="og:type" content="profile">
<meta property="og:title" content="${esc(desc)}">
<meta property="og:description" content="${esc(summaryDesc)}">
<meta name="twitter:card" content="summary">
${og}
<meta name="theme-color" content="${t.c.bg}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?${t.fonts}&display=swap" rel="stylesheet">
<style>${css}</style>
</head>
<body>
<nav><div class="wrap"><a class="mark" href="#top">${esc(name)}</a>${nav}</div></nav>
<header class="hero" id="top"><div class="wrap">
<h1>${esc(name)}</h1>
${has(b.headline) || has(b.location) ? `<p class="role">${esc(b.headline)}${has(b.location) ? ` <span class="loc">${has(b.headline) ? '· ' : ''}${esc(b.location)}</span>` : ''}</p>` : ''}
${linkHtml ? `<div class="links">${linkHtml}</div>` : ''}
</div></header>
${about.length ? sec('about', 'About', `<div class="about">${about.map((p) => `<p>${rich(p)}</p>`).join('')}</div>`) : ''}
${profile.experience.length ? sec('work', 'Experience', expHtml) : ''}
${profile.projects.length ? sec('projects', 'Projects', projHtml) : ''}
${codingHtml ? sec('coding', 'Coding profiles', codingHtml) : ''}
${profile.skills.length ? sec('skills', 'Skills', skillHtml) : ''}
${profile.education.length ? sec('education', 'Education', eduHtml) : ''}
<footer id="contact"><div class="wrap">
${contactHref ? `<p class="cta">Have a role or project in mind? <a href="${esc(contactHref)}" ${email ? '' : ext}>${esc(contactLabel)}</a></p>` : ''}
<div class="fine"><span>© ${year} ${esc(name)}</span>${credit}</div>
</div></footer>
</body>
</html>`;
}

/** Minimal styled page for missing portfolios. */
export function renderNotFoundHtml(homeUrl: string): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Portfolio not found</title><meta name="robots" content="noindex"><style>body{margin:0;min-height:100vh;display:grid;place-items:center;font:16px/1.6 system-ui,sans-serif;background:#f6f8ff;color:#101828}main{max-width:420px;padding:24px;text-align:center}h1{font-size:28px;margin:0 0 8px}a{color:#4f46e5;font-weight:600}</style></head><body><main><h1>Portfolio not found</h1><p>This link doesn't point to a published portfolio. It may have been renamed or unpublished.</p><p><a href="${esc(homeUrl)}">Make your own portfolio on TalentLens</a></p></main></body></html>`;
}
