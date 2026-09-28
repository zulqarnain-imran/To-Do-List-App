import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { AuthForm } from "@/components/AuthForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Luma Tasks account.",
};

export default async function LoginPage() {
  // No point showing a sign-in form to someone already holding a session.
  if (await getSessionUser()) redirect("/");

  return <AuthForm mode="login" />;
}
