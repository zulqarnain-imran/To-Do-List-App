"use client";

import { Suspense, useEffect } from "react";
import { Sidebar, MobileHeader, BottomNav } from "./Shell";
import { Toaster, InstallPrompt } from "./Feedback";
import { TaskComposer } from "./TaskComposer";
import { Icon } from "./Icon";
import { useStore } from "./store";
import { useSearchParams } from "next/navigation";

/** Floating action button, opening the composer. */
function Fab() {
  const { openComposer } = useStore();

  return (
    <button
      type="button"
      onClick={() => openComposer()}
      aria-label="Add a task"
      className="fixed right-5 bottom-24 z-40 grid h-14 w-14 place-items-center rounded-full bg-fab text-white shadow-lg shadow-fab/35 transition-transform hover:scale-105 active:scale-95 lg:right-8 lg:bottom-8"
    >
      <Icon name="plus" size={26} />
    </button>
  );
}

/** Banner shown whenever the browser reports it is offline. */
function OfflineBanner() {
  const { state } = useStore();
  if (!state.offline) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 bg-ink px-4 py-2 text-xs font-medium text-canvas"
    >
      <Icon name="cloud-off" size={15} />
      You are offline. Changes will fail until you reconnect.
    </div>
  );
}

/**
 * Honours the manifest shortcut "Add task", which navigates to /?new=1.
 * Split out so the shell can render without a search-params bailout.
 */
function NewTaskShortcut() {
  const params = useSearchParams();
  const { openComposer } = useStore();

  useEffect(() => {
    if (params.get("new") === "1") openComposer();
  }, [params, openComposer]);

  return null;
}

/**
 * Application shell.
 *
 * Desktop is a fixed gradient sidebar beside a neutral canvas. Mobile follows the
 * Figma composition: a gradient band on top, a rounded white sheet that
 * overlaps it, and a bottom tab bar cleared of the home indicator.
 *
 * On desktop the shell is height-locked at exactly one viewport: the grid clips
 * its overflow, the sidebar keeps its full height, and <main> becomes the only
 * scroll container. That keeps the gradient and the profile footer pinned on
 * every route instead of ending one screen down. Mobile deliberately keeps the
 * normal document flow so the address bar and safe areas still behave.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas lg:grid lg:h-dvh lg:grid-cols-[264px_minmax(0,1fr)] lg:overflow-hidden">
      <Sidebar />

      <div className="relative flex min-h-dvh flex-col lg:col-start-2 lg:h-dvh lg:min-h-0">
        <Suspense fallback={null}>
          <NewTaskShortcut />
        </Suspense>

        <MobileHeader />

        <main className="sheet flex-1 rounded-t-[28px] px-4 pt-6 pb-28 lg:h-dvh lg:overflow-y-auto lg:overscroll-contain lg:rounded-none lg:px-10 lg:pt-8 lg:pb-12">
          <div className="mx-auto w-full max-w-3xl">
            <InstallPrompt />
            {children}
          </div>
        </main>

        <BottomNav />
        <Fab />
        <OfflineBanner />
        <Toaster />
        <TaskComposer />
      </div>
    </div>
  );
}
