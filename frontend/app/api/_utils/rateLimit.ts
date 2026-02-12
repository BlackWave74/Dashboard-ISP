type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

const WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS ?? "60000");
const LIMIT = Number(process.env.RATE_LIMIT_LIMIT ?? "60");

export function rateLimit(key: string) {
  if (process.env.RATE_LIMIT_DISABLED === "1") {
    return { allowed: true, retryAfter: 0 };
  }

  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfter: 0 };
  }

  if (bucket.count >= LIMIT) {
    return { allowed: false, retryAfter: Math.max(0, bucket.resetAt - now) };
  }

  bucket.count += 1;
  return { allowed: true, retryAfter: 0 };
}
