import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { AuthForm } from "@/components/AuthForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create a Luma Tasks account.",
};

export default async function RegisterPage() {
  if (await getSessionUser()) redirect("/");

  return <AuthForm mode="register" />;
}
