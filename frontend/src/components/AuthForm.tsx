"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "./Icon";
import { apiFetch } from "@/lib/client";
import type { SessionUser } from "@/lib/types";

/**
 * Combined sign-in and sign-up form.
 *
 * One component with a `mode` prop rather than two near-identical screens, so
 * the validation, error handling and layout cannot drift apart.
 */
export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const isRegister = mode === "register";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError(null);

    // Checked here as well as on the server so the user gets an answer without
    // a round trip; the API validates regardless.
    if (isRegister && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setBusy(true);
    try {
      await apiFetch<{ user: SessionUser }>(
        isRegister ? "/api/auth/register" : "/api/auth/login",
        {
          method: "POST",
          json: isRegister
            ? { name, email, password, confirmPassword }
            : { email, password },
        },
      );
      // A full navigation, not a client push: the server layout has to read
      // the freshly set session cookie before it will render the app.
      router.replace("/");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <div className="app-canvas relative flex min-h-dvh items-center justify-center p-5">
      <div className="dot-grid pointer-events-none absolute inset-0 opacity-50" />

      <div className="animate-float-in relative w-full max-w-sm">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-[18px] bg-white/20 text-white ring-1 ring-white/30">
            <Icon name="check" size={28} />
          </span>
          <h1 className="text-2xl font-bold text-white">
            {isRegister ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mt-1 text-sm text-white/75">
            {isRegister
              ? "Start planning your day in a minute"
              : "Sign in to pick up where you left off"}
          </p>
        </div>

        <form
          onSubmit={submit}
          className="space-y-3.5 rounded-[22px] bg-surface p-5 shadow-xl"
        >
          {isRegister && (
            <div>
              <label htmlFor="auth-name" className="mb-1.5 block text-xs font-semibold tracking-wide text-muted uppercase">
                Name
              </label>
              <input
                id="auth-name"
                className="field"
                placeholder="Alex Rivera"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                maxLength={60}
                required
              />
            </div>
          )}

          <div>
            <label htmlFor="auth-email" className="mb-1.5 block text-xs font-semibold tracking-wide text-muted uppercase">
              Email
            </label>
            <input
              id="auth-email"
              type="email"
              className="field"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label htmlFor="auth-password" className="mb-1.5 block text-xs font-semibold tracking-wide text-muted uppercase">
              Password
            </label>
            <div className="relative">
              <input
                id="auth-password"
                type={showPassword ? "text" : "password"}
                className="field pr-11"
                placeholder={isRegister ? "At least 8 characters" : "Your password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={isRegister ? "new-password" : "current-password"}
                minLength={isRegister ? 8 : undefined}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-2 grid w-9 place-items-center text-muted transition-colors hover:text-ink"
              >
                <Icon name={showPassword ? "eye-off" : "eye"} size={17} />
              </button>
            </div>
          </div>

          {isRegister && (
            <div>
              <label htmlFor="auth-confirm" className="mb-1.5 block text-xs font-semibold tracking-wide text-muted uppercase">
                Confirm password
              </label>
              <input
                id="auth-confirm"
                type={showPassword ? "text" : "password"}
                className="field"
                placeholder="Type it again"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>
          )}

          {error && (
            <p
              role="alert"
              className="flex items-center gap-2 rounded-[10px] bg-danger/10 px-3 py-2 text-sm font-medium text-danger"
            >
              <Icon name="warning" size={16} className="shrink-0" />
              {error}
            </p>
          )}

          <button type="submit" disabled={busy} className="btn btn-primary w-full">
            {busy
              ? isRegister
                ? "Creating account…"
                : "Signing in…"
              : isRegister
                ? "Create account"
                : "Sign in"}
          </button>

          <p className="text-center text-sm text-muted">
            {isRegister ? "Already have an account?" : "New here?"}{" "}
            <Link
              href={isRegister ? "/login" : "/register"}
              className="font-semibold text-brand-purple hover:underline dark:text-brand-magenta"
            >
              {isRegister ? "Sign in" : "Create an account"}
            </Link>
          </p>
        </form>

        <p className="mt-4 text-center text-xs text-white/60">
          Your tasks are private to your account.
        </p>
      </div>
    </div>
  );
}
