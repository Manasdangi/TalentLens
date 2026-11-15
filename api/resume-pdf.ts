import type { VercelRequest, VercelResponse } from '@vercel/node';
import { captureException } from './_lib/sentry.js';
import { buildResumePdf, resumePdfFileName } from './_lib/resumePdf.js';
import { loadPublicPortfolio, readSlug } from './_lib/publicPortfolio.js';

/** Resume PDF generated from a published portfolio, so it always matches the live page. Route: /p/:slug/resume.pdf */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    res.status(405).send('Method not allowed.');
    return;
  }

  const slug = readSlug(req);
  try {
    const portfolio = slug ? await loadPublicPortfolio(slug) : null;
    if (!portfolio) {
      res.status(404).json({ error: 'Portfolio not found.' });
      return;
    }
    const pdf = Buffer.from(buildResumePdf(portfolio.profile).output('arraybuffer'));
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${resumePdfFileName(portfolio.profile)}"`);
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=600');
    res.status(200).send(pdf);
  } catch (error) {
    await captureException(error, 'resume-pdf');
    console.error('[resume-pdf] Failed to build PDF', error);
    res.status(500).json({ error: 'Failed to build the resume PDF.' });
  }
}
