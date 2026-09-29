import { ObjectId } from "mongodb";
import { getUsers } from "@/lib/mongodb";
import { handle, json, requireUser, fail , readJson} from "@/lib/api";
import { settingsUpdateSchema } from "@/lib/validations";
import { syncSessionIdentity } from "@/lib/session";
import { DEFAULT_SETTINGS } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PATCH /api/settings
 *
 * Preferences live on the user document, not the session, so a device that
 * signs in tomorrow picks up the same settings.
 */
export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    const body = settingsUpdateSchema.parse(await readJson(request));

    if (Object.keys(body).length === 0) {
      return fail("No valid fields to update", 400);
    }

    // Dotted paths merge each preference individually, so the client can send
    // one key without overwriting the rest.
    const set: Record<string, unknown> = { updatedAt: new Date() };
    for (const [key, value] of Object.entries(body)) {
      set[`settings.${key}`] = value;
    }

    const users = await getUsers();
    const updated = await users.findOneAndUpdate(
      { _id: new ObjectId(user.id), email: user.email },
      { $set: set },
      { returnDocument: "after" },
    );

    if (!updated) return fail("Account not found", 404);

    const settings = { ...DEFAULT_SETTINGS, ...updated.settings };

    await syncSessionIdentity(user.id, { settings });

    return json({ settings });
  } catch (error) {
    return handle(error, "settings/update");
  }
}
