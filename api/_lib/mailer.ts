import nodemailer from 'nodemailer';

export function getSmtpTransport() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = Number(process.env.SMTP_PORT || 587);

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export function isSmtpAuthError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'EAUTH'
  );
}

export function getSupportEmailErrorMessage(error: unknown) {
  return isSmtpAuthError(error)
    ? 'Support email is not available right now. Please try again later.'
    : 'Failed to send support request.';
}
