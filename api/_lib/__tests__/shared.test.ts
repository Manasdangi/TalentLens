// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { isValidSlug, normalizeProfile, slugify, suggestSlugs } from '../profile';
import { renderPortfolioHtml, safeHref, PORTFOLIO_THEMES } from '../portfolioTemplate';
import { buildResumePdf, toPdfText } from '../resumePdf';
import { normalizeTailorResult } from '../tailor';
import { bioContainsCode, verificationCode } from '../codingProfiles';
import { fromFirestoreFields, toFirestoreValue } from '../firebaseServer';

const profile = normalizeProfile({
  basics: { name: 'Malika Sinha', headline: 'Frontend Engineer', email: 'malika@example.com', summary: 'Builds **fast** UIs.\n\nLoves design systems.' },
  links: [{ label: 'GitHub', url: 'github.com/malika' }, { label: 'Bad', url: 'javascript:alert(1)' }],
  experience: [{ company: 'Acme <Corp>', role: 'SDE-II', start: 'Jan 2024', end: 'Present', bullets: ['Cut LCP by **40%** → faster pages', '<img src=x onerror=alert(1)>'] }],
  projects: [{ name: 'TalentLens', description: 'AI resume scoring', tech: 'React, TypeScript', url: 'https://talentlens.app' }],
  skills: [{ group: 'Frontend', items: ['React', 'TypeScript'] }],
  education: [{ school: 'MNIT Jaipur', degree: 'B.Tech', year: 2023 }],
})!;

describe('profile helpers', () => {
  it('normalizes loose model output', () => {
    expect(profile.projects[0].tech).toEqual(['React', 'TypeScript']);
    expect(profile.education[0].year).toBe('2023');
    expect(normalizeProfile('nope')).toBeNull();
  });

  it('builds valid, non-reserved slugs', () => {
    expect(slugify('Malika Sinha!')).toBe('malika-sinha');
    expect(slugify('Ánanya  Rao')).toBe('ananya-rao');
    expect(isValidSlug('api')).toBe(false);
    expect(isValidSlug('-bad')).toBe(false);
    expect(suggestSlugs('Malika Sinha', 'Frontend Developer')).toEqual(
      expect.arrayContaining(['malika-sinha', 'malikasinha', 'malika-sinha-dev', 'malika-sinha-developer']),
    );
  });
});

describe('portfolio template', () => {
  it('escapes user content and drops unsafe links', () => {
    const html = renderPortfolioHtml(profile, { theme: 'night', accent: '#ff0000' });
    expect(html).toContain('Acme &lt;Corp&gt;');
    expect(html).not.toContain('<img src=x');
    expect(html).not.toContain('javascript:');
    expect(html).toContain('<strong>40%</strong>');
    expect(html).toContain('href="https://github.com/malika"');
    expect(html).toContain('--accent:#ff0000');
  });

  it('falls back to the default theme and ignores bad colours', () => {
    const html = renderPortfolioHtml(profile, { theme: 'nope', accent: 'red;}' });
    expect(html).toContain(`--accent:${PORTFOLIO_THEMES.ledger.accent}`);
  });

  it('renders verified coding stats', () => {
    const html = renderPortfolioHtml(profile, {
      leetcode: { username: 'malika', url: 'https://leetcode.com/u/malika/', solved: { all: 412, easy: 150, medium: 220, hard: 42 }, ranking: 1, contestRating: 1850.4, contestsAttended: 12, topPercentage: 8.2, verifiedAt: 1, refreshedAt: 1 },
    });
    expect(html).toContain('Coding profiles');
    expect(html).toContain('412');
    expect(html).toContain('Top 8.2%');
  });

  it('only allows http(s) and mailto links', () => {
    expect(safeHref('data:text/html,hi')).toBe('');
    expect(safeHref('me@x.io')).toBe('mailto:me@x.io');
  });
});

describe('resume pdf', () => {
  it('produces a PDF with selectable text', () => {
    const bytes = new Uint8Array(buildResumePdf(profile).output('arraybuffer'));
    expect(String.fromCharCode(...bytes.slice(0, 5))).toBe('%PDF-');
    expect(bytes.length).toBeGreaterThan(1500);
  });

  it('maps characters the built-in fonts cannot draw', () => {
    expect(toPdfText('A → B ✓ ₹500 – “ok”')).toBe('A -> B Rs 500 – “ok”');
    expect(toPdfText('नमस्ते Manas')).toBe('Manas');
  });
});

describe('tailoring guard', () => {
  it('drops bullets that are not in the resume', () => {
    const result = normalizeTailorResult(
      {
        headline: 'Frontend Engineer',
        summary: 'x',
        bullets: [
          { original: 'Cut LCP by 40% on product pages', improved: 'Cut **LCP** by 40%', keywordsUsed: ['Core Web Vitals'] },
          { original: 'Led a team of 50 at Google', improved: 'Led 50', keywordsUsed: [] },
        ],
        unsupportedKeywords: ['GraphQL'],
      },
      'Experience\n- Cut LCP by 40% on product pages\n',
    );
    expect(result?.bullets).toHaveLength(1);
    expect(result?.unsupportedKeywords).toEqual(['GraphQL']);
  });
});

describe('verification + firestore helpers', () => {
  it('makes stable per-user codes', () => {
    process.env.VERIFICATION_SECRET = 'test-secret';
    const a = verificationCode('user-1', 'github', 'Malika');
    expect(a).toMatch(/^TL-[A-Z2-9]{6}$/);
    expect(verificationCode('user-1', 'github', 'malika')).toBe(a);
    expect(verificationCode('user-2', 'github', 'malika')).not.toBe(a);
    expect(verificationCode('user-1', 'leetcode', 'malika')).not.toBe(a);
    delete process.env.VERIFICATION_SECRET;
  });

  it('finds the code case-insensitively', () => {
    expect(bioContainsCode('Frontend dev · tl-abc234', 'TL-ABC234')).toBe(true);
    expect(bioContainsCode(null, 'TL-ABC234')).toBe(false);
  });

  it('round-trips firestore values', () => {
    const data = { a: 1, b: 1.5, c: 'x', d: true, e: null, f: [1, 'y'], g: { h: 2 } };
    const encoded = toFirestoreValue(data) as { mapValue: { fields: Record<string, never> } };
    expect(fromFirestoreFields(encoded.mapValue.fields)).toEqual(data);
  });
});
