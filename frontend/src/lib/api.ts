import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getSessionUser } from "./session";
import { firstIssue } from "./validations";
import type { SessionUser } from "./types";

/** Error type that carries an HTTP status through to the route handler. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
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
 * Returns the signed-in user or throws 401.
 *
 * The identity always comes from the server-side session cookie. No route ever
 * reads a userId from the request body or query string, so a user cannot reach
 * another account's data by editing a payload.
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new ApiError(401, "Unauthorized");
  return user;
}

export function unauthorized(): NextResponse {
  return fail("Unauthorized", 401);
}

function isDuplicateKey(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: number }).code === 11000
  );
}

/** Maps any thrown value onto a safe, actionable JSON response. */
export function handle(error: unknown, context = "request"): NextResponse {
  if (error instanceof ApiError) return fail(error.message, error.status);

  if (error instanceof ZodError) {
    return fail(firstIssue(error), 400);
  }

  const message = error instanceof Error ? error.message : String(error);

  if (isDuplicateKey(error)) {
    return fail("That value is already taken", 409);
  }

  if (/bad auth|auth failed|authentication failed/i.test(message)) {
    console.error(`[api:${context}] database auth failed`);
    return fail("Database authentication failed. Check MONGODB_URI.", 503);
  }

  if (/server selection|ECONNREFUSED|ENOTFOUND|getaddrinfo|MongoNotConnected/i.test(message)) {
    console.error(`[api:${context}] database unreachable`);
    return fail("Could not reach the database. Try again shortly.", 503);
  }

  console.error(`[api:${context}]`, error);
  return fail("Something went wrong handling that request.", 500);
}
