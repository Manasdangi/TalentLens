import type { VercelRequest, VercelResponse } from '@vercel/node';
import { captureException } from './_lib/sentry.js';
import { renderNotFoundHtml, renderPortfolioHtml } from './_lib/portfolioTemplate.js';
import { loadPublicPortfolio, readSlug, siteOrigin } from './_lib/publicPortfolio.js';

/** Serves a published portfolio as a full HTML page. Reached through the /p/:slug rewrite in vercel.json. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    res.status(405).send('Method not allowed.');
    return;
  }

  const origin = siteOrigin(req);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  const slug = readSlug(req);
  try {
    const portfolio = slug ? await loadPublicPortfolio(slug) : null;
    if (!portfolio) {
      res.setHeader('Cache-Control', 'public, s-maxage=30');
      res.status(404).send(renderNotFoundHtml(origin));
      return;
    }

    const html = renderPortfolioHtml(portfolio.profile, {
      theme: portfolio.theme,
      accent: portfolio.accent,
      github: portfolio.github,
      leetcode: portfolio.leetcode,
      resumePdfUrl: `/p/${portfolio.slug}/resume.pdf`,
      canonicalUrl: `${origin}/p/${portfolio.slug}`,
      homeUrl: origin,
    });
    // Short CDN cache so edits show up within a minute without hammering Firestore.
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=600');
    res.status(200).send(html);
  } catch (error) {
    await captureException(error, 'portfolio');
    console.error('[portfolio] Failed to render portfolio', error);
    res.status(500).send(renderNotFoundHtml(origin));
  }
}
