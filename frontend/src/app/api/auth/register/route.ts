import { ObjectId } from "mongodb";
import { getCategories, getUsers, insertDoc } from "@/lib/mongodb";
import { hashPassword } from "@/lib/password";
import { createSession } from "@/lib/session";
import { handle, fail, json , readJson, enforceRateLimit} from "@/lib/api";
import { clientIp, RULES } from "@/lib/rate-limit";
import { registerSchema } from "@/lib/validations";
import { DEFAULT_CATEGORIES } from "@/lib/categories";
import { DEFAULT_SETTINGS } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/auth/register */
export async function POST(request: Request) {
  try {
    // Caps automated account creation. The ceiling is per address and
    // deliberately loose, because mobile carrier NAT in Pakistan puts a great
    // many genuine users behind a single public IP and a tight limit here would
    // lock out real sign-ups rather than bots.
    const blocked = await enforceRateLimit(
      "register:ip",
      clientIp(request),
      RULES.registerPerIp,
      "Too many accounts created from this network. Please try again later.",
    );
    if (blocked) return blocked;

    const body = registerSchema.parse(await readJson(request));

    const users = await getUsers();

    // Cheap pre-check for a friendly message. The unique index on email is
    // still the real guarantee; a race between two registrations is caught
    // by handle() mapping duplicate-key errors to 409.
    const existing = await users.findOne({ email: body.email });
    if (existing) {
      return fail("An account with that email already exists", 409);
    }

    const now = new Date();
    const passwordHash = await hashPassword(body.password);
    const userId = await insertDoc(users, {
      name: body.name,
      email: body.email,
      passwordHash,
      avatar: null,
      settings: { ...DEFAULT_SETTINGS, defaultCategory: null },
      createdAt: now,
      updatedAt: now,
    });

    // Seed the three design-system categories. One insertMany, so a new
    // account costs three documents total regardless of how many categories
    // ship later.
    const categories = await getCategories();
    await categories.insertMany(
      DEFAULT_CATEGORIES.map((category) => ({
        _id: new ObjectId(),
        userId: userId.toHexString(),
        name: category.name,
        color: category.color,
        icon: category.icon,
        isDefault: true,
        createdAt: now,
        updatedAt: now,
      })),
    );

    const user = {
      id: userId.toHexString(),
      name: body.name,
      email: body.email,
      avatar: null,
      settings: { ...DEFAULT_SETTINGS, defaultCategory: null },
    };

    await createSession(user);

    return json({ user }, 201);
  } catch (error) {
    return handle(error, "auth/register");
  }
}

export async function GET() {
  return fail("Use POST", 405);
}
