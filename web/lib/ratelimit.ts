// Fixed-window request limits, in memory. This app runs as one process (SQLite), so a
// per-process limiter is exact; a multi-instance deployment would move this to shared
// storage. Limits protect the paid AI calls and PayPal order creation from loops/abuse.

export interface Limit {
  max: number;
  windowMs: number;
}

export const LIMITS = {
  search: { max: 20, windowMs: 60_000 }, // each search may call Claude
  cart: { max: 60, windowMs: 60_000 },
  approve: { max: 10, windowMs: 60_000 }, // each approval may create a PayPal order
  paypalReturn: { max: 20, windowMs: 60_000 },
  webhook: { max: 120, windowMs: 60_000 },
  // One server-wide budget for uncached Claude calls, whatever the client address claims to be.
  // Over it, every AI job uses its rule-based fallback, so the store keeps working.
  ai: { max: Number(process.env.AI_MAX_CALLS_PER_HOUR) || 120, windowMs: 3_600_000 },
} satisfies Record<string, Limit>;

export type LimitName = keyof typeof LIMITS;

export class RateLimiter {
  private hits = new Map<string, { start: number; count: number }>();
  constructor(private now: () => number = Date.now) {}

  // true = allowed (and counted); false = over the limit for this window.
  take(name: LimitName, key: string, limit: Limit = LIMITS[name]): boolean {
    const t = this.now();
    const k = `${name}:${key}`;
    const cur = this.hits.get(k);
    if (!cur || t - cur.start >= limit.windowMs) {
      this.hits.set(k, { start: t, count: 1 });
      if (this.hits.size > 10_000) this.prune(t);
      return true;
    }
    if (cur.count >= limit.max) return false;
    cur.count++;
    return true;
  }

  private prune(t: number) {
    const longest = Math.max(...Object.values(LIMITS).map((l) => l.windowMs));
    for (const [k, v] of this.hits) if (t - v.start >= longest) this.hits.delete(k);
  }
}

const g = globalThis as unknown as { __ohcLimiter?: RateLimiter };
export const limiter = (g.__ohcLimiter ??= new RateLimiter());

// The client address as seen by the edge in front of us. Only the first hop is used;
// without a proxy header everything shares one "local" bucket, which is the safe default.
export function clientKey(h: Headers) {
  const fly = h.get("fly-client-ip");
  if (fly) return fly;
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}
