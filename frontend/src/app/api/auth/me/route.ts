import { getSessionUser } from "@/lib/session";
import { handle, json } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/auth/me
 *
 * Returns the signed-in identity straight from the session row, so the client
 * never has to guess whether it is authenticated.
 */
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return json({ user: null });
    return json({ user });
  } catch (error) {
    return handle(error, "auth/me");
  }
}
