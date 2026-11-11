import type { VercelRequest, VercelResponse } from '@vercel/node';
import { captureException } from './_lib/sentry.js';
import { checkRateLimit, getClientKey } from './_lib/rateLimit.js';
import { getSmtpTransport, getSupportEmailErrorMessage, isSmtpAuthError } from './_lib/mailer.js';

const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'manas.raj.freelance@gmail.com';
const RATE_LIMIT_MAX = Number(process.env.SUPPORT_RATE_LIMIT_MAX || 5);
const RATE_LIMIT_WINDOW_MS = Number(process.env.SUPPORT_RATE_LIMIT_WINDOW_MS || 60 * 60 * 1000);

function cleanField(value: unknown, maxLength: number) {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, maxLength) : 'Not provided';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  const rateLimit = await checkRateLimit(`rl:support:${getClientKey(req)}`, {
    max: RATE_LIMIT_MAX,
    windowMs: RATE_LIMIT_WINDOW_MS,
  });
  if (!rateLimit.allowed) {
    res
      .status(429)
      .setHeader('Retry-After', String(rateLimit.retryAfterSeconds))
      .json({ error: 'Too many support requests. Please try again later.' });
    return;
  }

  const { contact, message, pageUrl, name } = (req.body ?? {}) as {
    contact?: unknown;
    message?: unknown;
    pageUrl?: unknown;
    name?: unknown;
  };

  if (typeof message !== 'string' || message.trim().length === 0) {
    res.status(400).json({ error: 'Message is required.' });
    return;
  }
  if (message.length > 5000) {
    res.status(400).json({ error: 'Message is too long.' });
    return;
  }

  const transport = getSmtpTransport();
  const from = process.env.SMTP_FROM_EMAIL;
  if (!transport || !from) {
    console.error('[support-feedback] SMTP is not configured');
    res.status(500).json({ error: 'Support email is not configured on the server.' });
    return;
  }

  const safeContact = cleanField(contact, 200);
  const safeName = cleanField(name, 200);
  const safePageUrl = cleanField(pageUrl, 500);

  try {
    await transport.sendMail({
      from,
      to: SUPPORT_EMAIL,
      replyTo: safeContact.includes('@') ? safeContact : undefined,
      subject: 'TalentLens support request',
      text: [
        'New TalentLens help request',
        '',
        `Name: ${safeName}`,
        `Contact: ${safeContact}`,
        `Page: ${safePageUrl}`,
        '',
        'Message:',
        message.trim(),
      ].join('\n'),
    });

    res.json({ ok: true });
  } catch (error) {
    await captureException(error, 'support-feedback');
    if (isSmtpAuthError(error)) {
      console.warn('[support-feedback] SMTP authentication failed. Regenerate the SMTP credentials and redeploy.');
    } else {
      console.error('[support-feedback] Failed to send support email', error);
    }
    res.status(502).json({ error: getSupportEmailErrorMessage(error) });
  }
}
