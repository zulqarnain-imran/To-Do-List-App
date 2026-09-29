import { NextResponse } from "next/server";
import { getUsers } from "@/lib/mongodb";
import { verifyPassword } from "@/lib/password";
import { createSession } from "@/lib/session";
import { handle, fail, json , readJson} from "@/lib/api";
import { loginSchema } from "@/lib/validations";
import { DEFAULT_SETTINGS } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A real, valid bcrypt hash of a value nobody knows. It exists so that a login
// for an unknown address still performs a full 12-round comparison and takes
// about as long as a real one. The previous placeholder was not a well-formed
// hash, so bcryptjs bailed out immediately and a wrong address answered far
// faster than a wrong password, which leaks which addresses are registered.
const DUMMY_HASH = "$2b$12$vpUDLr/Si4FKpWnaYYerzOsDNkei9XiH4eBPZr5DD1CByWpbq9wHq";

/** POST /api/auth/login */
export async function POST(request: Request) {
  try {
    const body = loginSchema.parse(await readJson(request));

    const users = await getUsers();
    const user = await users.findOne({ email: body.email });

    // A corrupt or hash-format change in a stored row must read as a failed
    // sign-in, never as a server error. bcryptjs can throw on a malformed hash
    // and an unguarded throw here would turn "wrong password" into a 500.
    let valid = false;
    try {
      valid = await verifyPassword(body.password, user?.passwordHash ?? DUMMY_HASH);
    } catch (cause) {
      console.error(
        "[api:auth/login] password verification threw:",
        cause instanceof Error ? cause.name : "NonError",
      );
    }

    if (!user || !valid) {
      // Outcome only. Deliberately no email, no user id, no cookie value.
      console.error(
        `[api:auth/login] rejected: accountFound=${Boolean(user)} passwordMatch=${valid}`,
      );
      return fail("Incorrect email or password", 401);
    }

    const sessionUser = {
      id: user._id.toHexString(),
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      settings: { ...DEFAULT_SETTINGS, ...user.settings },
    };

    await createSession(sessionUser);
    console.error("[api:auth/login] succeeded");

    return json({ user: sessionUser });
  } catch (error) {
    return handle(error, "auth/login");
  }
}

export async function GET() {
  return NextResponse.json({ error: "Use POST" }, { status: 405 });
}
