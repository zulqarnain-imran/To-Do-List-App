import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getSessionUser } from "./session";
import { firstIssue } from "./validations";
import { apiRequestCeiling, clientIp, rateLimit, type RateLimitRule } from "./rate-limit";
import type { SessionUser } from "./types";

/** Error type that carries an HTTP status through to the route handler. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    /** Extra response headers, e.g. Retry-After on a 429. */
    readonly headers?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function json<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function fail(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

/**
 * A 429 with a Retry-After header.
 *
 * The header is the part that matters: it is how a well-behaved client knows
 * when to come back, so the throttle is a pause rather than a dead end.
 */
export function tooMany(retryAfterSeconds: number, message?: string): NextResponse {
  return NextResponse.json(
    { error: message ?? "Too many attempts. Please wait and try again." },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
  );
}

/**
 * Applies a rate limit and reports whether the request may proceed.
 *
 * Returns null when the request is within the rule, so a route reads as
 * `if (const blocked = await enforceRateLimit(...)) return blocked;`. A
 * counter that only moves on attempts that actually reach the rule keeps the
 * check to a single atomic database operation.
 */
export async function enforceRateLimit(
  bucket: string,
  identifier: string,
  rule: RateLimitRule,
  message?: string,
): Promise<NextResponse | null> {
  const verdict = await rateLimit(bucket, identifier, rule);
  if (verdict.ok) return null;
  return tooMany(verdict.retryAfterSeconds, message);
}

/**
 * Returns the signed-in user or throws 401.
 *
 * The identity always comes from the server-side session cookie. No route ever
 * reads a userId from the request body or query string, so a user cannot reach
 * another account's data by editing a payload.
 *
 * When the incoming Request is passed, a cheap in-memory ceiling also applies.
 * That ceiling is a guard against wasted database operations from a runaway
 * client, not an authentication control; the per-request work it adds is a
 * single Map lookup and no query.
 */
export async function requireUser(request?: Request): Promise<SessionUser> {
  if (request) {
    const verdict = apiRequestCeiling(clientIp(request));
    if (!verdict.ok) {
      throw new ApiError(
        429,
        "Too many requests. Please slow down.",
        { "Retry-After": String(verdict.retryAfterSeconds) },
      );
    }
  }

  const user = await getSessionUser();
  if (!user) throw new ApiError(401, "Unauthorized");
  return user;
}

export function unauthorized(): NextResponse {
  return fail("Unauthorized", 401);
}

/**
 * Parses a JSON request body, turning a malformed payload into a 400.
 *
 * Without this, a truncated or non-JSON body makes request.json() throw a
 * SyntaxError, which is not a ZodError, so it would be reported as a server
 * fault. A bad request is the caller's problem, not the server's.
 */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ApiError(400, "Request body must be valid JSON");
  }
}

function isDuplicateKey(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: number }).code === 11000
  );
}

/**
 * Removes anything credential-shaped before a value reaches a log line.
 *
 * A MongoParseError or a driver error can echo the connection string back, and
 * that string contains the database password. Logs on Vercel are not a place to
 * keep credentials, so every message and stack frame is scrubbed first.
 */
export function redact(input: string): string {
  return input
    .replace(/mongodb(\+srv)?:\/\/\S+/gi, "mongodb://[redacted]")
    .replace(/:\/\/[^@\s/]+:[^@\s/]+@/g, "://[redacted]@")
    .replace(/([?&](?:password|passwd|pwd)=)[^&\s]+/gi, "$1[redacted]");
}

function describe(error: unknown): { name: string; message: string; stack: string } {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: redact(error.message),
      stack: redact(error.stack ?? "").split("\n").slice(0, 5).join(" | "),
    };
  }
  return { name: "NonError", message: redact(String(error)), stack: "" };
}

/** True for the driver's own error classes, matched by name rather than instanceof. */
function isMongoError(error: unknown, ...names: string[]): boolean {
  if (!(error instanceof Error)) return false;
  return names.includes(error.name);
}

/**
 * Maps any thrown value onto a safe, actionable JSON response.
 *
 * Genuine faults are logged with the exception class, a redacted message and a
 * short redacted stack, so a Vercel runtime log identifies the real cause
 * instead of a generic 500. The browser only ever sees a generic message:
 * stack traces and driver internals stay server side.
 */
export function handle(error: unknown, context = "request"): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status, headers: error.headers },
    );
  }

  if (error instanceof ZodError) {
    return fail(firstIssue(error), 400);
  }

  if (isDuplicateKey(error)) {
    return fail("That value is already taken", 409);
  }

  const { name, message, stack } = describe(error);

  // One greppable line first, so the failure is easy to find in Vercel logs.
  console.error(`[api:${context}] ${name}: ${message}`);
  if (stack) console.error(`[api:${context}] at ${stack}`);

  if (/MONGODB_URI is not set/.test(message)) {
    return fail("The server is not configured. Contact support.", 500);
  }

  if (isMongoError(error, "MongoParseError", "MongoInvalidURIError")) {
    return fail("The server is not configured. Contact support.", 500);
  }

  if (isMongoError(error, "MongoServerError") || /auth failed|authentication failed|bad auth/i.test(message)) {
    return fail("Database authentication failed. Check MONGODB_URI.", 503);
  }

  if (
    isMongoError(
      error,
      "MongoServerSelectionError",
      "MongoNetworkError",
      "MongoNotConnectedError",
      "MongoTopologyClosedError",
    ) ||
    /server selection|ECONNREFUSED|ENOTFOUND|getaddrinfo|ETIMEDOUT|connection .* timed out/i.test(message)
  ) {
    return fail("Could not reach the database. Try again shortly.", 503);
  }

  return fail("Something went wrong handling that request.", 500);
}
