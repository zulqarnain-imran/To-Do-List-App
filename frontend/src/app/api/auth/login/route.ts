import { NextResponse } from "next/server";
import { getUsers } from "@/lib/mongodb";
import { verifyPassword } from "@/lib/password";
import { createSession } from "@/lib/session";
import { handle, fail, json } from "@/lib/api";
import { loginSchema } from "@/lib/validations";
import { DEFAULT_SETTINGS } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Compared against when no account matches, so that a wrong email and a wrong
// password take the same amount of time and cannot be told apart.
const DUMMY_HASH = "$2b$12$abcdefghijklmnopqrstuuKZf4Y3nRJkXBQXqYfCzT0m1sM2vO";

/** POST /api/auth/login */
export async function POST(request: Request) {
  try {
    const body = loginSchema.parse(await request.json());

    const users = await getUsers();
    const user = await users.findOne({ email: body.email });

    const valid = await verifyPassword(
      body.password,
      user?.passwordHash ?? DUMMY_HASH,
    );

    if (!user || !valid) {
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

    return json({ user: sessionUser });
  } catch (error) {
    return handle(error, "auth/login");
  }
}

export async function GET() {
  return NextResponse.json({ error: "Use POST" }, { status: 405 });
}
