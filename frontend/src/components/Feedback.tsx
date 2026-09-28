"use client";

import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import { useStore } from "./store";

const GLYPHS = {
  info: "info",
  success: "circle-check",
  error: "warning",
} as const;

/** Transient feedback for optimistic mutations. */
export function Toaster() {
  const { toast, dismissToast } = useStore();

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(dismissToast, 3800);
    return () => clearTimeout(timer);
  }, [toast, dismissToast]);

  if (!toast) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 lg:bottom-8"
    >
      <div className="animate-float-in pointer-events-auto flex max-w-sm items-center gap-2.5 rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-canvas shadow-lg">
        <Icon
          name={GLYPHS[toast.tone]}
          size={17}
          className={toast.tone === "error" ? "text-danger" : undefined}
        />
        <span>{toast.message}</span>
        <button
          type="button"
          onClick={dismissToast}
          aria-label="Dismiss"
          className="ml-1 opacity-70 transition-opacity hover:opacity-100"
        >
          <Icon name="close" size={15} />
        </button>
      </div>
    </div>
  );
}

/** Theme switch, and the bridge that persists the choice for the pre-paint script. */
export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { state, updateSettings } = useStore();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark =
    mounted &&
    (state.user.settings.theme === "dark" ||
      (state.user.settings.theme === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches));

  function toggle() {
    const next = isDark ? "light" : "dark";
    document.documentElement.classList.toggle("dark", next === "dark");
    localStorage.setItem("todo-theme", next);
    void updateSettings({ theme: next });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
      className={compact ? "btn btn-quiet" : "btn btn-ghost"}
    >
      <Icon name={isDark ? "sun" : "moon"} size={18} />
      {!compact && <span>{isDark ? "Light" : "Dark"}</span>}
    </button>
  );
}

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Install prompt.
 *
 * Shown only when the browser has actually offered installation and the app is
 * not already running standalone, so it can never nag someone who has already
 * installed it or whose browser does not support it.
 */
export function InstallPrompt() {
  const [event, setEvent] = useState<InstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as { standalone?: boolean }).standalone === true;
    if (standalone) {
      setInstalled(true);
      return;
    }

    const onPrompt = (raw: Event) => {
      raw.preventDefault();
      setEvent(raw as InstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!event || dismissed || installed) return null;

  async function install() {
    if (!event) return;
    await event.prompt();
    await event.userChoice;
    setEvent(null);
  }

  return (
    <div className="card animate-rise mb-4 flex items-center gap-3 p-3.5">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-brand-purple/12 text-brand-purple">
        <Icon name="download" size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Install Luma Tasks</p>
        <p className="text-xs text-muted">Add it to your home screen for offline use.</p>
      </div>
      <button type="button" className="btn btn-primary" onClick={install}>
        Install
      </button>
      <button
        type="button"
        className="btn btn-quiet"
        aria-label="Not now"
        onClick={() => setDismissed(true)}
      >
        <Icon name="close" size={16} />
      </button>
    </div>
  );
}
