/**
 * Brute-force protection for the login endpoint.
 * After MAX_FAILURES wrong passwords for the same account (from any IP) within WINDOW_MS, or IP_MAX_FAILURES from
 * one IP across any accounts, further attempts are refused for LOCK_MS. In-memory, per server process.
 */
const WINDOW_MS = 15 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;
const MAX_FAILURES = 10;
const IP_MAX_FAILURES = 30;

interface Bucket { failures: number[]; lockedUntil: number }
const buckets = new Map<string, Bucket>();

function bucket(key: string): Bucket {
  let b = buckets.get(key);
  if (!b) { b = { failures: [], lockedUntil: 0 }; buckets.set(key, b); }
  return b;
}

function keys(ip: string, identifier: string) {
  return { account: `acct:${String(identifier || '').trim().toLowerCase()}`, ip: `ip:${ip}` };
}

/** Seconds until the caller may try again, or 0 when allowed. */
export function loginRetryAfter(ip: string, identifier: string, now = Date.now()): number {
  const k = keys(ip, identifier);
  const wait = Math.max(bucket(k.account).lockedUntil, bucket(k.ip).lockedUntil) - now;
  return wait > 0 ? Math.ceil(wait / 1000) : 0;
}

export function recordLoginFailure(ip: string, identifier: string, now = Date.now()): void {
  const k = keys(ip, identifier);
  for (const [key, max] of [[k.account, MAX_FAILURES], [k.ip, IP_MAX_FAILURES]] as const) {
    const b = bucket(key);
    b.failures = b.failures.filter((t) => now - t < WINDOW_MS);
    b.failures.push(now);
    if (b.failures.length >= max) {
      b.lockedUntil = now + LOCK_MS;
      b.failures = [];
    }
  }
}

export function recordLoginSuccess(ip: string, identifier: string): void {
  buckets.delete(keys(ip, identifier).account);
}

// Drop stale entries so the map cannot grow without bound
setInterval(() => {
  const now = Date.now();
  for (const [key, b] of buckets) {
    if (b.lockedUntil < now && b.failures.every((t) => now - t >= WINDOW_MS)) buckets.delete(key);
  }
}, 10 * 60 * 1000).unref?.();
