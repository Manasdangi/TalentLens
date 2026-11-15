/**
 * Builds an ATS-friendly, single-column resume PDF (real selectable text, no images)
 * from a ResumeProfile. Runs in the browser (editor download) and in Node (/p/:slug/resume.pdf).
 */
import { jsPDF } from 'jspdf';
import type { ResumeProfile } from './profile.js';

const PAGE = { margin: 48, width: 595.28, height: 841.89 }; // A4 in points
const INK: [number, number, number] = [17, 24, 39];
const MUTED: [number, number, number] = [90, 98, 112];
const RULE: [number, number, number] = [210, 214, 222];

// Built-in PDF fonts only cover Windows-1252. Map common symbols and drop the rest
// so the PDF never shows broken glyphs.
const REPLACEMENTS: Record<string, string> = {
  '→': '->', '←': '<-', '↗': '', '↓': '', '✓': '', '✔': '', '★': '*', '≥': '>=', '≤': '<=', '×': 'x',
  '₹': 'Rs ', ' ': ' ', '​': '',
};
const WIN_1252_EXTRA = new Set('€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ');

export function toPdfText(value: string): string {
  let out = '';
  for (const ch of value) {
    if (ch in REPLACEMENTS) out += REPLACEMENTS[ch];
    else if (ch.charCodeAt(0) <= 0xff || WIN_1252_EXTRA.has(ch)) out += ch;
  }
  return out.replace(/[ \t]+/g, ' ').trim();
}

interface Cursor {
  y: number;
}

interface Word {
  text: string;
  bold: boolean;
  /** True when this word touches the previous one with no space (e.g. "**50%**." -> "50%" + "."). */
  glued: boolean;
}

function splitRich(text: string, forceBold = false): Word[] {
  const words: Word[] = [];
  let prevEndedWithSpace = true;
  toPdfText(text)
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .forEach((part) => {
      const isBoldPart = part.startsWith('**') && part.endsWith('**') && part.length > 4;
      const bold = forceBold || isBoldPart;
      const clean = isBoldPart ? part.slice(2, -2) : part.replace(/\*\*/g, '');
      const startsWithSpace = /^\s/.test(clean);
      clean
        .split(/\s+/)
        .filter(Boolean)
        .forEach((w, i) => words.push({ text: w, bold, glued: i === 0 && words.length > 0 && !startsWithSpace && !prevEndedWithSpace }));
      prevEndedWithSpace = /\s$/.test(clean);
    });
  return words;
}

function ensureSpace(doc: jsPDF, cur: Cursor, needed: number) {
  if (cur.y + needed > PAGE.height - PAGE.margin) {
    doc.addPage();
    cur.y = PAGE.margin;
  }
}

/** Draws wrapped text where **segments** render in bold. Returns nothing; advances the cursor. */
function drawRich(
  doc: jsPDF,
  cur: Cursor,
  text: string,
  opts: { x: number; width: number; size: number; color?: [number, number, number]; bold?: boolean; lineGap?: number },
) {
  const words = splitRich(text, opts.bold);
  if (!words.length) return;
  const lineHeight = opts.size * (opts.lineGap ?? 1.38);
  doc.setFontSize(opts.size);
  doc.setTextColor(...(opts.color ?? INK));

  const measure = (w: Word) => {
    doc.setFont('helvetica', w.bold ? 'bold' : 'normal');
    return doc.getTextWidth(w.text);
  };
  doc.setFont('helvetica', 'normal');
  const space = doc.getTextWidth(' ');

  let line: Word[] = [];
  let lineWidth = 0;
  const flush = () => {
    ensureSpace(doc, cur, lineHeight);
    let x = opts.x;
    line.forEach((w, i) => {
      if (i > 0 && !w.glued) x += space;
      doc.setFont('helvetica', w.bold ? 'bold' : 'normal');
      doc.text(w.text, x, cur.y + opts.size);
      x += doc.getTextWidth(w.text);
    });
    cur.y += lineHeight;
    line = [];
    lineWidth = 0;
  };

  for (const w of words) {
    const width = measure(w);
    const gap = line.length && !w.glued ? space : 0;
    if (line.length && !w.glued && lineWidth + gap + width > opts.width) flush();
    lineWidth = line.length ? lineWidth + (w.glued ? 0 : space) + width : width;
    line.push(w);
  }
  if (line.length) flush();
}

function sectionTitle(doc: jsPDF, cur: Cursor, title: string) {
  ensureSpace(doc, cur, 40);
  cur.y += 12;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...INK);
  doc.text(title.toUpperCase(), PAGE.margin, cur.y + 10.5, { charSpace: 0.6 });
  cur.y += 16;
  doc.setDrawColor(...RULE);
  doc.setLineWidth(0.7);
  doc.line(PAGE.margin, cur.y, PAGE.width - PAGE.margin, cur.y);
  cur.y += 8;
}

/** Title on the left, a short right-aligned note (dates) on the same baseline. */
function titleRow(doc: jsPDF, cur: Cursor, title: string, right: string) {
  const content = PAGE.width - PAGE.margin * 2;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  const rightText = toPdfText(right);
  const rightWidth = rightText ? doc.getTextWidth(rightText) + 12 : 0;
  const startY = cur.y;
  drawRich(doc, cur, title, { x: PAGE.margin, width: content - rightWidth, size: 11, bold: true });
  if (rightText) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...MUTED);
    doc.text(rightText, PAGE.width - PAGE.margin, startY + 11, { align: 'right' });
  }
}

const prettyUrl = (value: string) => value.replace(/^https?:\/\//, '').replace(/^mailto:/, '').replace(/\/$/, '');

export function buildResumePdf(profile: ResumeProfile): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
  const b = profile.basics;
  const content = PAGE.width - PAGE.margin * 2;
  const cur: Cursor = { y: PAGE.margin };

  doc.setProperties({
    title: toPdfText(`${b.name || 'Resume'}${b.headline ? ` - ${b.headline}` : ''}`),
    subject: 'Resume',
    creator: 'TalentLens',
  });

  drawRich(doc, cur, b.name || 'Your Name', { x: PAGE.margin, width: content, size: 22, bold: true, lineGap: 1.15 });
  if (b.headline) drawRich(doc, cur, b.headline, { x: PAGE.margin, width: content, size: 11.5, color: INK });
  const contact = [b.email, b.phone, b.location, ...profile.links.map((l) => prettyUrl(l.url))].filter(Boolean).join('  |  ');
  if (contact) {
    cur.y += 2;
    drawRich(doc, cur, contact, { x: PAGE.margin, width: content, size: 9.5, color: MUTED });
  }

  if (b.summary) {
    sectionTitle(doc, cur, 'Summary');
    b.summary.split(/\n\s*\n/).forEach((p) => drawRich(doc, cur, p, { x: PAGE.margin, width: content, size: 10 }));
  }

  if (profile.experience.length) {
    sectionTitle(doc, cur, 'Experience');
    profile.experience.forEach((e, i) => {
      if (i > 0) cur.y += 8;
      ensureSpace(doc, cur, 44);
      const title = [e.role, e.company].filter(Boolean).join(', ');
      titleRow(doc, cur, title, [e.start, e.end].filter(Boolean).join(' - '));
      if (e.location) drawRich(doc, cur, e.location, { x: PAGE.margin, width: content, size: 9.5, color: MUTED });
      e.bullets.forEach((bullet) => {
        ensureSpace(doc, cur, 14);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(...INK);
        doc.text('•', PAGE.margin + 4, cur.y + 10);
        drawRich(doc, cur, bullet, { x: PAGE.margin + 16, width: content - 16, size: 10 });
      });
    });
  }

  if (profile.projects.length) {
    sectionTitle(doc, cur, 'Projects');
    profile.projects.forEach((p, i) => {
      if (i > 0) cur.y += 6;
      ensureSpace(doc, cur, 36);
      titleRow(doc, cur, p.name, prettyUrl(p.url || p.repo || ''));
      if (p.tech.length) drawRich(doc, cur, p.tech.join(', '), { x: PAGE.margin, width: content, size: 9.5, color: MUTED });
      if (p.description) drawRich(doc, cur, p.description, { x: PAGE.margin, width: content, size: 10 });
    });
  }

  if (profile.skills.length) {
    sectionTitle(doc, cur, 'Skills');
    profile.skills.forEach((s) => {
      drawRich(doc, cur, `${s.group ? `**${s.group}:** ` : ''}${s.items.join(', ')}`, { x: PAGE.margin, width: content, size: 10 });
    });
  }

  if (profile.education.length) {
    sectionTitle(doc, cur, 'Education');
    profile.education.forEach((e) => {
      titleRow(doc, cur, [e.degree, e.school].filter(Boolean).join(', '), e.year);
    });
  }

  return doc;
}

export function resumePdfFileName(profile: ResumeProfile): string {
  const base = (profile.basics.name || 'resume').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${base || 'resume'}-resume.pdf`;
}
