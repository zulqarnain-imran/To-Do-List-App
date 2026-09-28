import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/Icon";

export const metadata: Metadata = {
  title: "Offline",
  description: "You are offline.",
};

export default function OfflinePage() {
  return (
    <div className="app-canvas relative grid min-h-dvh place-items-center p-6">
      <div className="dot-grid pointer-events-none absolute inset-0 opacity-50" />
      <div className="relative w-full max-w-sm rounded-[22px] bg-surface p-6 text-center shadow-xl">
        <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-sunken text-muted">
          <Icon name="cloud-off" size={26} />
        </span>
        <h1 className="text-xl font-bold">You are offline</h1>
        <p className="mt-2 text-sm text-muted">
          Luma Tasks needs a connection to reach your account. The page you were
          on will load again once you are back online.
        </p>
        <Link href="/" className="btn btn-primary mt-5 w-full">
          Try again
        </Link>
      </div>
    </div>
  );
}
