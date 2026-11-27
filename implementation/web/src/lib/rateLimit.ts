import { ensureSchemaBootstrapped } from "./bootstrapDb.ts";
import { getPool } from "./db.ts";

interface MemoryRateBucket {
  count: number;
  resetAtMs: number;
}

const memoryBuckets = new Map<string, MemoryRateBucket>();

/**
 * Extract trusted client IP from proxy-controlled headers.
 * Prefers Vercel/CDN edge headers that cannot be spoofed by arbitrary X-Forwarded-For chains.
 */
export function getTrustedClientIp(request: Request): string {
  const vercelIp = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
  if (vercelIp) return vercelIp;
  const cfIp = request.headers.get("cf-connecting-ip")?.trim();
  if (cfIp) return cfIp;
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "local";
}

/**
 * Shared, atomic, expiring rate limiter backed by PostgreSQL when DATABASE_URL is configured,
 * with an in-memory fallback for local/no-DB test runs.
 */
export async function checkSharedRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<boolean> {
  const pool = getPool();
  if (!pool) {
    const now = Date.now();
    const existing = memoryBuckets.get(key);
    if (!existing || existing.resetAtMs <= now) {
      memoryBuckets.set(key, { count: 1, resetAtMs: now + windowMs });
      return true;
    }
    if (existing.count >= limit) {
      return false;
    }
    existing.count += 1;
    return true;
  }

  await ensureSchemaBootstrapped(pool);
  const res = await pool.query(
    `INSERT INTO rate_limits (key, count, reset_at)
     VALUES ($1, 1, NOW() + ($2 || ' milliseconds')::interval)
     ON CONFLICT (key) DO UPDATE SET
       count = CASE
         WHEN rate_limits.reset_at <= NOW() THEN 1
         ELSE rate_limits.count + 1
       END,
       reset_at = CASE
         WHEN rate_limits.reset_at <= NOW() THEN NOW() + ($2 || ' milliseconds')::interval
         ELSE rate_limits.reset_at
       END
     RETURNING count`,
    [key, String(windowMs)]
  );
  const count = Number(res.rows[0]?.count ?? 1);
  return count <= limit;
}

export function resetMemoryRateLimitsForTests(): void {
  memoryBuckets.clear();
}
