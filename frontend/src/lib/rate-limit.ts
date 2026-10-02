import { createHash } from "node:crypto";
import { getRateLimits } from "./mongodb";

/**
 * Sliding-window rate limiting, backed by MongoDB.
 *
 * Why the database and not a Map: this app runs on serverless, where every
 * instance is short-lived and there is no shared memory. An in-process counter
 * would give an attacker a fresh allowance on each cold start, which is no
 * protection at all. One atomic `findOneAndUpdate` per attempt buys a limit
 * that every instance honours.
 *
 * Two properties matter for the security of this design:
 *
 *   - The increment and the expiry check happen in the same update pipeline, so
 *     concurrent attempts cannot race past the limit. There is no read-then-write
 *     window for a parallel attacker to exploit.
 *   - Identifiers are hashed before they are used as keys, so the collection
 *     never stores a raw email address or IP. A leaked dump of `rateLimits`
 *     reveals nothing about who has an account.
 */

export interface RateLimitRule {
  /** Attempts permitted inside the window. */
  limit: number;
  /** Length of the rolling window, in seconds. */
  windowSeconds: number;
}

export interface RateLimitResult {
  ok: boolean;
  /** Attempts left in the current window. Never negative. */
  remaining: number;
  /** Seconds until the window frees up a slot. Only meaningful when ok is false. */
  retryAfterSeconds: number;
}

function digest(identifier: string): string {
  return createHash("sha256").update(identifier).digest("hex").slice(0, 32);
}

/**
 * Records one attempt and reports whether it is within the rule.
 *
 * The counter is keyed on the identifier, so each caller chooses its own
 * granularity: an email address for a single account, an IP address for one
 * visitor across all accounts.
 */
export async function rateLimit(
  bucket: string,
  identifier: string,
  rule: RateLimitRule,
): Promise<RateLimitResult> {
  const collection = await getRateLimits();
  const now = new Date();
  const windowMs = rule.windowSeconds * 1000;
  const id = `${bucket}:${digest(identifier)}`;

  // A pipeline update rather than a plain $inc, so the "has this window already
  // lapsed?" test and the increment are one atomic step.
  const doc = await collection.findOneAndUpdate(
    { _id: id },
    [
      {
        $set: {
          bucket,
          count: {
            $cond: [
              { $gt: ["$expiresAt", now] },
              { $add: [{ $ifNull: ["$count", 0] }, 1] },
              1,
            ],
          },
          expiresAt: new Date(now.getTime() + windowMs),
        },
      },
    ],
    { upsert: true, returnDocument: "after" },
  );

  const count = doc?.count ?? 1;

  if (count <= rule.limit) {
    return {
      ok: true,
      remaining: Math.max(0, rule.limit - count),
      retryAfterSeconds: 0,
    };
  }

  // Ask for a slot to free up rather than a whole window. Each further attempt
  // pushes the window on, so this is a floor, not a promise of exactly how long
  // the caller has to wait.
  const windowEndsIn = doc?.expiresAt
    ? Math.ceil((doc.expiresAt.getTime() - now.getTime()) / 1000)
    : rule.windowSeconds;

  return {
    ok: false,
    remaining: 0,
    retryAfterSeconds: Math.max(1, windowEndsIn),
  };
}

/**
 * Checks a rule without recording an attempt.
 *
 * Used to stop an already-throttled client from doing more work per request, and
 * to fail fast on a mutating route before it touches the database.
 */
export async function rateLimitPeek(
  bucket: string,
  identifier: string,
  rule: RateLimitRule,
): Promise<RateLimitResult> {
  const collection = await getRateLimits();
  const doc = await collection.findOne({ _id: `${bucket}:${digest(identifier)}` });

  if (!doc || doc.expiresAt.getTime() <= Date.now()) {
    return { ok: true, remaining: rule.limit, retryAfterSeconds: 0 };
  }

  const count = doc.count;
  if (count < rule.limit) {
    return {
      ok: true,
      remaining: Math.max(0, rule.limit - count),
      retryAfterSeconds: 0,
    };
  }

  return {
    ok: false,
    remaining: 0,
    retryAfterSeconds: Math.max(1, Math.ceil((doc.expiresAt.getTime() - Date.now()) / 1000)),
  };
}

/**
 * Forgets a counter, e.g. after a successful sign-in.
 *
 * Without this a real user who mistypes their password a few times stays
 * throttled for the rest of the window even though they have proved who they
 * are. Throttling should stop an attacker, not punish a typo.
 */
export async function rateLimitReset(
  bucket: string,
  identifier: string,
): Promise<void> {
  const collection = await getRateLimits();
  await collection.deleteOne({ _id: `${bucket}:${digest(identifier)}` });
}

/* ------------------------------------------------------------------ */
/* Rules                                                                */
/* ------------------------------------------------------------------ */

/**
 * Tuned for the audience this app is built for.
 *
 * Pakistani mobile networks put very many subscribers behind a single public
 * address through CGNAT, so an address is not a reliable proxy for "one
 * person". The per-IP rules are therefore set loose enough that a shared
 * carrier NAT will not lock out genuine users, and the tight limits sit on the
 * per-account buckets, which cannot be spoofed by the client at all.
 */
export const RULES = {
  /**
   * One account, five attempts per 15 minutes. This is the rule that actually
   * stops credential stuffing, because it counts attempts against an address
   * the attacker chose, not an address the network handed them.
   */
  loginPerAccount: { limit: 5, windowSeconds: 15 * 60 },
  /** Generous, purely to cap a distributed sweep across many accounts. */
  loginPerIp: { limit: 60, windowSeconds: 15 * 60 },
  /** Caps automated account creation without inconveniencing a shared NAT. */
  registerPerIp: { limit: 20, windowSeconds: 60 * 60 },
  /** An attacker who holds a session should not be able to guess a new password. */
  passwordChangePerUser: { limit: 5, windowSeconds: 15 * 60 },
  /**
   * A ceiling on everything else, so the API cannot be scraped or used to burn
   * the Atlas Free tier's operation quota. Sized far above real client traffic:
   * a full app load is a handful of requests.
   */
  apiPerIp: { limit: 600, windowSeconds: 60 },
} as const satisfies Record<string, RateLimitRule>;

export type RuleName = keyof typeof RULES;

/* ------------------------------------------------------------------ */
/* Client address                                                      */
/* ------------------------------------------------------------------ */

/**
 * The caller's address, from the headers a proxy sets.
 *
 * This is a best-effort value, and that is fine here: it is only ever used for
 * the per-IP buckets, which are deliberately loose. The tight limits are keyed
 * on the account being attacked, which comes from the request body and cannot
 * be forged by the client. A spoofed address can therefore cost an attacker
 * their loose bucket and nothing more.
 */
export function clientIp(request: Request): string {
  const headers = request.headers;
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 45);
  }
  return (
    headers.get("x-real-ip")?.slice(0, 45) ??
    headers.get("cf-connecting-ip")?.slice(0, 45) ??
    "unknown"
  );
}

/* ------------------------------------------------------------------ */
/* In-memory ceiling for ordinary API traffic                          */
/* ------------------------------------------------------------------ */

/**
 * A per-instance request ceiling, deliberately not persisted.
 *
 * The authentication limits above are the ones that stop an attacker, and they
 * are worth a database write each. This one guards a different problem: a
 * runaway client — an optimistic-update refetch loop, a stuck retry, someone
 * dragging through their whole history — quietly burning the Atlas Free tier's
 * operation quota. Capping that in memory costs nothing on the happy path.
 *
 * Being per-instance, it is best effort by design: on serverless the counter
 * resets whenever a cold instance is created. It is a guard rail against waste,
 * not a security boundary, and it is commented as such so no one later mistakes
 * it for one.
 */
const memoryWindows = new Map<string, { count: number; expiresAt: number }>();

/** Bound on tracked keys, so a flood of forged addresses cannot grow this forever. */
const MEMORY_KEY_CAP = 10_000;

function memoryLimit(
  bucket: string,
  identifier: string,
  rule: RateLimitRule,
): RateLimitResult {
  const now = Date.now();
  const key = `${bucket}:${identifier}`;
  const existing = memoryWindows.get(key);

  const count =
    existing && existing.expiresAt > now ? existing.count + 1 : 1;

  if (count <= rule.limit) {
    memoryWindows.set(key, { count, expiresAt: now + rule.windowSeconds * 1000 });
  } else {
    memoryWindows.set(key, { count, expiresAt: existing!.expiresAt });
  }

  // Opportunistic sweep. Cheap, and it only runs when the map has actually
  // grown, which is never on normal traffic.
  if (memoryWindows.size > MEMORY_KEY_CAP) {
    for (const [k, v] of memoryWindows) {
      if (v.expiresAt <= now) memoryWindows.delete(k);
    }
    // Still oversized after dropping expired keys: the remainder are live.
    // Drop the oldest quarter so the map cannot be pinned at the cap.
    if (memoryWindows.size > MEMORY_KEY_CAP) {
      const excess = memoryWindows.size - Math.floor(MEMORY_KEY_CAP * 0.75);
      let removed = 0;
      for (const k of memoryWindows.keys()) {
        memoryWindows.delete(k);
        if (++removed >= excess) break;
      }
    }
  }

  if (count <= rule.limit) {
    return {
      ok: true,
      remaining: Math.max(0, rule.limit - count),
      retryAfterSeconds: 0,
    };
  }

  return {
    ok: false,
    remaining: 0,
    retryAfterSeconds: Math.max(
      1,
      Math.ceil((existing!.expiresAt - now) / 1000),
    ),
  };
}

/** Records one attempt against the in-memory ceiling and reports the verdict. */
export function apiRequestCeiling(
  identifier: string,
  rule: RateLimitRule = RULES.apiPerIp,
): RateLimitResult {
  return memoryLimit("api", identifier, rule);
}