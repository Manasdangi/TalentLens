/**
 * Server-side Firebase access without firebase-admin (keeps functions small and Node-version agnostic):
 * - verifies Firebase ID tokens against Google's public keys
 * - reads/writes Firestore over REST, as the public (rules apply) or as the service account (bypasses rules)
 */
import { createRemoteJWKSet, importPKCS8, jwtVerify, SignJWT } from 'jose';

export const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'talentlens-13926';
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

const firebaseKeys = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'),
);

export interface FirebaseCaller {
  uid: string;
  email?: string;
  name?: string;
}

/** Reads "Authorization: Bearer <Firebase ID token>" and returns the signed-in user, or null. */
export async function verifyFirebaseIdToken(authorization: string | undefined): Promise<FirebaseCaller | null> {
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, firebaseKeys, {
      issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
      audience: FIREBASE_PROJECT_ID,
      algorithms: ['RS256'],
    });
    if (typeof payload.sub !== 'string' || !payload.sub) return null;
    return {
      uid: payload.sub,
      email: typeof payload.email === 'string' ? payload.email : undefined,
      name: typeof payload.name === 'string' ? payload.name : undefined,
    };
  } catch {
    return null;
  }
}

// ---------- Service account ----------

interface ServiceAccount {
  client_email: string;
  private_key: string;
}

let cachedAccount: ServiceAccount | null | undefined;

/** FIREBASE_SERVICE_ACCOUNT holds the service-account JSON, raw or base64-encoded. */
export function getServiceAccount(): ServiceAccount | null {
  if (cachedAccount !== undefined) return cachedAccount;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
  cachedAccount = null;
  if (!raw) return null;
  try {
    const json = raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
    const parsed = JSON.parse(json) as Partial<ServiceAccount>;
    if (parsed.client_email && parsed.private_key) {
      cachedAccount = { client_email: parsed.client_email, private_key: parsed.private_key.replace(/\\n/g, '\n') };
    }
  } catch {
    console.error('[firebase] FIREBASE_SERVICE_ACCOUNT is not valid JSON');
  }
  return cachedAccount;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.token;
  const account = getServiceAccount();
  if (!account) throw new Error('FIREBASE_SERVICE_ACCOUNT is not configured');

  const key = await importPKCS8(account.private_key, 'RS256');
  const assertion = await new SignJWT({ scope: 'https://www.googleapis.com/auth/datastore' })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(account.client_email)
    .setAudience('https://oauth2.googleapis.com/token')
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(key);

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`Google token exchange failed with ${response.status}`);
  const data = (await response.json()) as { access_token: string; expires_in: number };
  cachedToken = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

// ---------- Firestore REST value encoding ----------

type FsValue =
  | { nullValue: null }
  | { booleanValue: boolean }
  | { integerValue: string }
  | { doubleValue: number }
  | { stringValue: string }
  | { arrayValue: { values?: FsValue[] } }
  | { mapValue: { fields?: Record<string, FsValue> } }
  | { timestampValue: string };

export function toFirestoreValue(value: unknown): FsValue {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (typeof value === 'string') return { stringValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toFirestoreValue) } };
  if (typeof value === 'object') {
    const fields: Record<string, FsValue> = {};
    for (const [k, v] of Object.entries(value)) if (v !== undefined) fields[k] = toFirestoreValue(v);
    return { mapValue: { fields } };
  }
  return { stringValue: String(value) };
}

export function fromFirestoreValue(value: FsValue): unknown {
  if ('nullValue' in value) return null;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('stringValue' in value) return value.stringValue;
  if ('timestampValue' in value) return value.timestampValue;
  if ('arrayValue' in value) return (value.arrayValue.values ?? []).map(fromFirestoreValue);
  if ('mapValue' in value) return fromFirestoreFields(value.mapValue.fields ?? {});
  return null;
}

export function fromFirestoreFields(fields: Record<string, FsValue>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, fromFirestoreValue(v)]));
}

const docUrl = (path: string) => `${FIRESTORE_BASE}/${path.split('/').map(encodeURIComponent).join('/')}`;

/**
 * Reads a document. Without asAdmin the request is anonymous, so Firestore security rules decide
 * (published portfolios and verified profiles are public). Returns null when missing or not allowed.
 */
export async function getDocument(path: string, asAdmin = false): Promise<Record<string, unknown> | null> {
  const headers: Record<string, string> = {};
  if (asAdmin) headers.Authorization = `Bearer ${await getAccessToken()}`;
  const response = await fetch(docUrl(path), { headers, signal: AbortSignal.timeout(8000) });
  if (response.status === 404 || response.status === 403) return null;
  if (!response.ok) throw new Error(`Firestore read failed with ${response.status}`);
  const data = (await response.json()) as { fields?: Record<string, FsValue> };
  return fromFirestoreFields(data.fields ?? {});
}

/**
 * Merges top-level fields into a document as the service account (creates it if needed).
 * Fields set to undefined are deleted.
 */
export async function mergeDocumentAsAdmin(path: string, data: Record<string, unknown>): Promise<void> {
  const fieldPaths = Object.keys(data);
  const params = new URLSearchParams();
  fieldPaths.forEach((f) => params.append('updateMask.fieldPaths', f));
  const fields: Record<string, FsValue> = {};
  for (const [k, v] of Object.entries(data)) if (v !== undefined) fields[k] = toFirestoreValue(v);

  const response = await fetch(`${docUrl(path)}?${params}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${await getAccessToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`Firestore write failed with ${response.status}: ${(await response.text()).slice(0, 300)}`);
}
