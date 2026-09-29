import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { redact } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/health
 *
 * Answers the one question a Vercel deployment log cannot: can the running
 * function actually reach MongoDB? That separates "the environment is
 * misconfigured" from "the application has a bug" in a single request.
 *
 * Unauthenticated, and deliberately blunt about it. The response carries a
 * verdict and the failing error class only. No hostname, no database name, no
 * connection string, no credentials.
 */
export async function GET() {
  const startedAt = Date.now();

  if (!process.env.MONGODB_URI) {
    return NextResponse.json(
      { ok: false, database: "not-configured", error: "MissingEnv" },
      { status: 503 },
    );
  }

  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    return NextResponse.json(
      { ok: true, database: "reachable", ms: Date.now() - startedAt },
    );
  } catch (error) {
    const name = error instanceof Error ? error.name : "NonError";
    const message = error instanceof Error ? redact(error.message) : "";
    console.error(`[api:health] ${name}: ${message}`);
    return NextResponse.json(
      { ok: false, database: "unreachable", error: name },
      { status: 503 },
    );
  }
}
