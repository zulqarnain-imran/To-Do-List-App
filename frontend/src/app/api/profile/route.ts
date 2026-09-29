import { ObjectId } from "mongodb";
import { getUsers } from "@/lib/mongodb";
import { handle, json, requireUser, fail , readJson} from "@/lib/api";
import { profileUpdateSchema, changePasswordSchema } from "@/lib/validations";
import { hashPassword, verifyPassword } from "@/lib/password";
import { syncSessionIdentity, destroyAllSessions } from "@/lib/session";
import { DEFAULT_SETTINGS } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/profile */
export async function GET() {
  try {
    const user = await requireUser();
    return json({
      profile: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        settings: user.settings,
      },
    });
  } catch (error) {
    return handle(error, "profile/get");
  }
}

/** PATCH /api/profile — display name and avatar. */
export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    const body = profileUpdateSchema.parse(await readJson(request));

    if (Object.keys(body).length === 0) {
      return fail("No valid fields to update", 400);
    }

    const set: Record<string, unknown> = { updatedAt: new Date() };
    if (body.name !== undefined) set.name = body.name;
    // null or an empty string both mean "clear the avatar", so the UI falls
    // back to initials. The client sends null, the form sends "".
    if (body.avatar !== undefined) set.avatar = body.avatar || null;

    const users = await getUsers();
    const updated = await users.findOneAndUpdate(
      { _id: new ObjectId(user.id), email: user.email },
      { $set: set },
      { returnDocument: "after" },
    );

    if (!updated) return fail("Account not found", 404);

    // The session row caches name/email/avatar so that /api/auth/me costs a
    // single indexed read. Keep that cache in step with the profile.
    const sessionUser = {
      ...user,
      name: updated.name,
      email: updated.email,
      avatar: updated.avatar,
    };
    await syncSessionIdentity(user.id, {
      name: updated.name,
      email: updated.email,
      avatar: updated.avatar,
    });

    return json({
      profile: {
        id: sessionUser.id,
        name: sessionUser.name,
        email: sessionUser.email,
        avatar: sessionUser.avatar,
        settings: { ...DEFAULT_SETTINGS, ...updated.settings },
      },
    });
  } catch (error) {
    return handle(error, "profile/update");
  }
}

/**
 * POST /api/profile/change-password
 *
 * Requires the current password, and signs out every other device on success
 * so a stolen session cannot outlive a credential change.
 */
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = changePasswordSchema.parse(await readJson(request));

    const users = await getUsers();
    const doc = await users.findOne({ email: user.email });
    if (!doc) return fail("Account not found", 404);

    if (!(await verifyPassword(body.currentPassword, doc.passwordHash))) {
      return fail("Your current password is incorrect", 401);
    }

    await users.updateOne(
      { _id: doc._id },
      {
        $set: {
          passwordHash: await hashPassword(body.newPassword),
          updatedAt: new Date(),
        },
      },
    );

    const revoked = await destroyAllSessions(user.id);

    return json({ ok: true, otherSessionsRevoked: revoked });
  } catch (error) {
    return handle(error, "profile/change-password");
  }
}
