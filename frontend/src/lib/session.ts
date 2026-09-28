import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { getSessions, insertDoc } from "./mongodb";
import { DEFAULT_SETTINGS, type SessionUser, type Settings } from "./types";

/**
 * Server-side sessions.
 *
 * A random 32-byte token is stored in an HttpOnly cookie; only its SHA-256
 * digest is written to Mongo. A database dump therefore cannot be replayed as
 * a login, and a stolen cookie is useless without the matching digest row.
 *
 * Sessions are revocable, which is why they live server-side rather than in a
 * stateless JWT: logout, a password change and "sign out everywhere" all
 * delete rows and take effect immediately.
 *
 * Identity is denormalised onto the session row so authenticating a request
 * costs one database read. It is re-synced whenever the profile or settings
 * change, so it never goes stale.
 */

const COOKIE_NAME = "todo_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function cookieOptions(expires: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires,
    maxAge: SESSION_TTL_SECONDS,
  };
}

export async function createSession(user: {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  settings: Settings;
}): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000);

  const sessions = await getSessions();
  const headerList = await headers();
  const userAgent = headerList.get("user-agent");

  await insertDoc(sessions, {
    userId: user.id,
    tokenHash: hashToken(token),
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    settings: user.settings ?? DEFAULT_SETTINGS,
    createdAt: now,
    expiresAt,
    lastUsedAt: now,
    userAgent: userAgent ? userAgent.slice(0, 200) : null,
  });

  const store = await cookies();
  store.set(COOKIE_NAME, token, cookieOptions(expiresAt));
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const sessions = await getSessions();
  const session = await sessions.findOne({ tokenHash: hashToken(token) });

  // The TTL index reaps expired rows in the background; this check closes the
  // window between a row's expiry and Mongo actually removing it.
  if (!session || session.expiresAt.getTime() < Date.now()) {
    if (session) await sessions.deleteOne({ _id: session._id });
    return null;
  }

  return {
    id: session.userId,
    name: session.name,
    email: session.email,
    avatar: session.avatar,
    settings: { ...DEFAULT_SETTINGS, ...session.settings },
  };
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;

  if (token) {
    const sessions = await getSessions();
    await sessions.deleteOne({ tokenHash: hashToken(token) });
  }

  store.set(COOKIE_NAME, "", { ...cookieOptions(new Date(0)), maxAge: 0 });
}

/**
 * Invalidates other devices; used after a password change. Returns how many
 * sessions were revoked so the UI can confirm it.
 */
export async function destroyAllSessions(
  userId: string,
  exceptCurrent = true,
): Promise<number> {
  const sessions = await getSessions();

  if (exceptCurrent) {
    const store = await cookies();
    const token = store.get(COOKIE_NAME)?.value;
    const result = await sessions.deleteMany(
      token ? { userId, tokenHash: { $ne: hashToken(token) } } : { userId },
    );
    return result.deletedCount;
  }

  const result = await sessions.deleteMany({ userId });
  return result.deletedCount;
}

/**
 * Keeps denormalised identity on live sessions in step with a profile or
 * settings change, so the user sees their new name without re-logging in.
 */
export async function syncSessionIdentity(
  userId: string,
  patch: { name?: string; email?: string; avatar?: string | null; settings?: Settings },
): Promise<void> {
  const sessions = await getSessions();
  const set: Record<string, unknown> = {};
  if (patch.name !== undefined) set.name = patch.name;
  if (patch.email !== undefined) set.email = patch.email;
  if (patch.avatar !== undefined) set.avatar = patch.avatar;
  if (patch.settings !== undefined) set.settings = patch.settings;
  if (Object.keys(set).length === 0) return;
  await sessions.updateMany({ userId }, { $set: set });
}
