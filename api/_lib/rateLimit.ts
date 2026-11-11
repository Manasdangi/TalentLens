import type { VercelRequest } from '@vercel/node';

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSeconds: number };

interface Options {
  max: number;
  windowMs: number;
}

// Shared store (Upstash Redis via the Vercel Marketplace). Both naming schemes are supported.
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

// Fallback: per-instance memory. Serverless instances are recycled, so this only
// limits bursts on a warm instance. Configure Redis for a real, global limit.
const memoryStore = new Map<string, { count: number; resetAt: number }>();
let warnedAboutMemoryStore = false;

export function getClientKey(req: VercelRequest): string {
  // Vercel sets these at the edge; they are not client-controlled.
  const vercelForwarded = req.headers['x-vercel-forwarded-for'];
  if (typeof vercelForwarded === 'string' && vercelForwarded) return vercelForwarded.split(',')[0].trim();
  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string' && realIp) return realIp.trim();
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor) return forwardedFor.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

function checkMemory(key: string, { max, windowMs }: Options): RateLimitResult {
  const now = Date.now();
  const current = memoryStore.get(key);

  if (!current || current.resetAt <= now) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }
  if (current.count >= max) {
    return { allowed: false, retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000) };
  }
  current.count += 1;
  return { allowed: true };
}

async function checkRedis(key: string, { max, windowMs }: Options): Promise<RateLimitResult> {
  const response = await fetch(`${REDIS_URL}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([
      ['INCR', key],
      ['PEXPIRE', key, String(windowMs), 'NX'],
      ['PTTL', key],
    ]),
    signal: AbortSignal.timeout(2000),
  });
  if (!response.ok) throw new Error(`Rate limit store responded with ${response.status}`);

  const results = (await response.json()) as Array<{ result?: number; error?: string }>;
  const count = Number(results[0]?.result);
  const ttlMs = Number(results[2]?.result);
  if (!Number.isFinite(count)) throw new Error('Unexpected rate limit store response');

  if (count > max) {
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((ttlMs > 0 ? ttlMs : windowMs) / 1000)) };
  }
  return { allowed: true };
}

export async function checkRateLimit(key: string, options: Options): Promise<RateLimitResult> {
  if (REDIS_URL && REDIS_TOKEN) {
    try {
      return await checkRedis(key, options);
    } catch (error) {
      console.error('[rate-limit] Redis check failed, falling back to memory', error);
      return checkMemory(key, options);
    }
  }

  if (!warnedAboutMemoryStore && process.env.VERCEL_ENV === 'production') {
    warnedAboutMemoryStore = true;
    console.warn('[rate-limit] No Redis store configured; using per-instance memory. Limits are not global.');
  }
  return checkMemory(key, options);
}
