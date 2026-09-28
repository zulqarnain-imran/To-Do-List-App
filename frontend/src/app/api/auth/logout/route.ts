import { destroySession } from "@/lib/session";
import { handle, fail, json } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/auth/logout — destroys the server-side session row. */
export async function POST() {
  try {
    await destroySession();
    return json({ ok: true });
  } catch (error) {
    return handle(error, "auth/logout");
  }
}

export async function GET() {
  return fail("Use POST", 405);
}
