"use client";

import { Icon } from "./Icon";
import { useStore } from "./store";
import { NAV_ITEMS, isActive } from "./nav";
import Link from "next/link";
import { usePathname } from "next/navigation";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Avatar.
 *
 * Falls back to initials so a profile always has an identity, even with no
 * image, and so the initials are the same component used in the sidebar, the
 * header and the profile screen.
 */
export function Avatar({
  name,
  avatar,
  size = 40,
  className = "",
}: {
  name: string;
  avatar?: string | null;
  size?: number;
  className?: string;
}) {
  if (avatar) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatar}
        alt=""
        width={size}
        height={size}
        className={`shrink-0 rounded-full object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-full bg-white/20 font-semibold text-white ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials(name) || "?"}
    </span>
  );
}

/**
 * Desktop sidebar.
 *
 * The shell grid is locked to one viewport and clips its overflow, so this only
 * needs to fill that height and never scroll. It stays put on every route while
 * the main column scrolls on its own.
 */
export function Sidebar() {
  const pathname = usePathname();
  const { state, signOut } = useStore();

  return (
    <aside className="app-canvas relative hidden h-dvh flex-col text-white lg:flex">
      <div className="dot-grid pointer-events-none absolute inset-0 opacity-70" />

      <div className="relative flex items-center gap-3 px-6 pt-7 pb-8">
        <span className="grid h-10 w-10 place-items-center rounded-[14px] bg-white/20 ring-1 ring-white/30">
          <Icon name="check" size={22} />
        </span>
        <div>
          <p className="text-lg leading-tight font-bold">Luma Tasks</p>
          <p className="text-xs text-white/70">Plan, track and finish</p>
        </div>
      </div>

      <nav className="relative flex-1 space-y-1 overflow-y-auto px-3" aria-label="Main">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-[12px] px-3.5 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-white/22 text-white ring-1 ring-white/25"
                  : "text-white/80 hover:bg-white/12 hover:text-white"
              }`}
            >
              <Icon name={item.icon} size={19} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="relative m-3 rounded-[16px] bg-white/12 p-3 ring-1 ring-white/20">
        <div className="flex items-center gap-3">
          <Avatar name={state.user.name} avatar={state.user.avatar} size={38} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{state.user.name}</p>
            <p className="truncate text-xs text-white/70">{state.user.email}</p>
          </div>
          <button
            type="button"
            onClick={signOut}
            title="Sign out"
            aria-label="Sign out"
            className="grid h-8 w-8 place-items-center rounded-full text-white/80 transition-colors hover:bg-white/20 hover:text-white"
          >
            <Icon name="logout" size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
}

/** Phone header: the gradient band with the greeting and the app bar. */
export function MobileHeader({ title }: { title?: string }) {
  const { state } = useStore();
  const firstName = state.user.name.split(" ")[0] ?? state.user.name;

  return (
    <header className="app-canvas relative text-white lg:hidden">
      <div className="dot-grid pointer-events-none absolute inset-0 opacity-60" />
      <div className="relative flex items-center justify-between gap-3 px-4 pt-safe pb-6">
        <div className="min-w-0">
          <p className="text-sm text-white/75">
            {greeting()}, {firstName}
          </p>
          <h1 className="truncate text-2xl font-bold">{title ?? "My Tasks"}</h1>
        </div>
        <Link
          href="/profile"
          aria-label="Your profile"
          className="grid shrink-0 place-items-center rounded-full ring-2 ring-white/40"
        >
          <Avatar name={state.user.name} avatar={state.user.avatar} size={40} />
        </Link>
      </div>
    </header>
  );
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/** Phone bottom bar. */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur lg:hidden"
    >
      <ul className="mx-auto flex max-w-lg items-stretch">
        {NAV_ITEMS.filter((item) => item.primary).map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                  active ? "text-brand-purple dark:text-brand-magenta" : "text-muted"
                }`}
              >
                <span
                  className={`grid h-7 w-12 place-items-center rounded-full transition-colors ${
                    active ? "bg-brand-purple/12" : ""
                  }`}
                >
                  <Icon name={item.icon} size={19} />
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
