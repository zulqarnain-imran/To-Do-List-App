"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { ThemeToggle } from "@/components/Feedback";
import { Avatar } from "@/components/Shell";
import { useStore } from "@/components/store";
import type { Priority, Theme, WeekStart } from "@/lib/types";

const THEMES: { value: Theme; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

function Row({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-4">
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 rounded-full transition-colors ${
        checked ? "bg-brand-purple" : "bg-line"
      }`}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-[left] ${
          checked ? "left-6" : "left-1"
        }`}
      />
    </button>
  );
}

export function SettingsView() {
  const { state, updateSettings, signOut } = useStore();
  const settings = state.user.settings;
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // "System" resolves live, so the label reflects reality once mounted.
  const systemIsDark =
    mounted && window.matchMedia("(prefers-color-scheme: dark)").matches;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Settings</h1>
        <p className="mt-0.5 text-sm text-muted">
          Preferences are saved to your account and follow you between devices.
        </p>
      </div>

      <section className="card divide-y divide-[var(--line)] overflow-hidden">
        <div className="flex items-center gap-3 p-4">
          <Avatar name={state.user.name} avatar={state.user.avatar} size={44} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{state.user.name}</p>
            <p className="truncate text-xs text-muted">{state.user.email}</p>
          </div>
          <Link href="/profile" className="btn btn-ghost shrink-0">
            Edit
          </Link>
        </div>
      </section>

      <section>
        <h2 className="mb-2 px-1 text-xs font-semibold tracking-wide text-muted uppercase">
          Appearance
        </h2>
        <div className="card divide-y divide-[var(--line)] overflow-hidden">
          <div className="p-4">
            <p className="text-sm font-medium">Theme</p>
            <p className="mt-0.5 mb-3 text-xs text-muted">
              {settings.theme === "system"
                ? `Following your device (${systemIsDark ? "dark" : "light"})`
                : `Always ${settings.theme}`}
            </p>
            <div className="flex gap-2">
              {THEMES.map((option) => {
                const active = settings.theme === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      const dark =
                        option.value === "dark" ||
                        (option.value === "system" && systemIsDark);
                      document.documentElement.classList.toggle("dark", dark);
                      localStorage.setItem("todo-theme", option.value);
                      void updateSettings({ theme: option.value });
                    }}
                    aria-pressed={active}
                    className={`flex-1 rounded-[12px] px-3 py-2 text-sm font-medium transition-colors ${
                      active ? "bg-brand-purple text-white" : "bg-sunken text-muted"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <Row title="Quick toggle" hint="Flip between light and dark">
            <ThemeToggle compact />
          </Row>
        </div>
      </section>

      <section>
        <h2 className="mb-2 px-1 text-xs font-semibold tracking-wide text-muted uppercase">
          Tasks
        </h2>
        <div className="card divide-y divide-[var(--line)] overflow-hidden">
          <Row title="Default priority" hint="Used when adding a task">
            <select
              className="field w-auto py-1.5"
              value={settings.defaultPriority}
              onChange={(event) =>
                void updateSettings({ defaultPriority: event.target.value as Priority })
              }
              aria-label="Default priority"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </Row>

          <Row title="Default category" hint="Pre-selected in the task form">
            <select
              className="field w-auto py-1.5"
              value={settings.defaultCategory ?? ""}
              onChange={(event) =>
                void updateSettings({ defaultCategory: event.target.value || null })
              }
              aria-label="Default category"
            >
              <option value="">None</option>
              {state.categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </Row>

          <Row title="Week starts on" hint="Used by the calendar">
            <select
              className="field w-auto py-1.5"
              value={settings.weekStartsOn}
              onChange={(event) =>
                void updateSettings({ weekStartsOn: Number(event.target.value) as WeekStart })
              }
              aria-label="Week starts on"
            >
              <option value={1}>Monday</option>
              <option value={0}>Sunday</option>
            </select>
          </Row>
        </div>
      </section>

      <section>
        <h2 className="mb-2 px-1 text-xs font-semibold tracking-wide text-muted uppercase">
          Reminders
        </h2>
        <div className="card divide-y divide-[var(--line)] overflow-hidden">
          <Row
            title="Due date notifications"
            hint="Ask the browser to remind you about tasks due today"
          >
            <Switch
              checked={settings.notifications}
              onChange={(value) => void updateSettings({ notifications: value })}
              label="Due date notifications"
            />
          </Row>
        </div>
        <p className="mt-2 flex items-start gap-1.5 px-1 text-xs text-muted">
          <Icon name="info" size={13} className="mt-0.5 shrink-0" />
          Browsers only allow notifications after you grant permission for this
          site. You will be asked the first time.
        </p>
      </section>

      <section>
        <h2 className="mb-2 px-1 text-xs font-semibold tracking-wide text-muted uppercase">
          App
        </h2>
        <div className="card divide-y divide-[var(--line)] overflow-hidden">
          <Link href="/profile" className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-sunken">
            <div className="flex items-center gap-3">
              <Icon name="user" size={18} className="text-muted" />
              <span className="text-sm font-medium">Profile and password</span>
            </div>
            <Icon name="chevron-right" size={16} className="text-muted" />
          </Link>

          <Link href="/categories" className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-sunken">
            <div className="flex items-center gap-3">
              <Icon name="tag" size={18} className="text-muted" />
              <span className="text-sm font-medium">Manage categories</span>
            </div>
            <Icon name="chevron-right" size={16} className="text-muted" />
          </Link>

          <button
            type="button"
            onClick={() => void signOut()}
            className="flex w-full items-center justify-between gap-4 p-4 text-left transition-colors hover:bg-sunken"
          >
            <div className="flex items-center gap-3">
              <Icon name="logout" size={18} className="text-danger" />
              <span className="text-sm font-medium text-danger">Sign out</span>
            </div>
          </button>
        </div>
      </section>

      <p className="pb-2 text-center text-xs text-faint">
        Luma Tasks · data stored in your own MongoDB database
      </p>
    </div>
  );
}
