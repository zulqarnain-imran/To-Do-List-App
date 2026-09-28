"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { StatCard } from "@/components/Controls";
import { useStore } from "@/components/store";
import { addDays, fromKey, toKey, todayKey, humanDue } from "@/lib/date";
import { gradientFor, tintFor } from "@/lib/categories";

const WEEKDAY = ["S", "M", "T", "W", "T", "F", "S"];

export function ProgressView() {
  const { state, stats } = useStore();
  const today = todayKey();

  /** Completions per day for the last seven days. */
  const week = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, index) =>
      addDays(fromKey(today), index - 6),
    );
    const counts = days.map((day) => {
      const key = toKey(day);
      return state.tasks.filter(
        (task) => task.status === "done" && task.completedAt?.slice(0, 10) === key,
      ).length;
    });
    return { days, counts };
  }, [state.tasks, today]);

  const { days, counts } = week;
  const peak = Math.max(1, ...counts);

  /** Task totals per category, for the breakdown bars. */
  const breakdown = useMemo(() => {
    return state.categories
      .map((category) => {
        const tasks = state.tasks.filter((task) => task.categoryId === category.id);
        const done = tasks.filter((task) => task.status === "done").length;
        return {
          category,
          total: tasks.length,
          done,
          percent: tasks.length ? Math.round((done / tasks.length) * 100) : 0,
        };
      })
      .filter((entry) => entry.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [state.categories, state.tasks]);

  const recentDone = state.tasks
    .filter((task) => task.status === "done")
    .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""))
    .slice(0, 6);

  if (state.tasks.length === 0) {
    return (
      <div className="space-y-5">
        <h1 className="text-xl font-bold">Progress</h1>
        <div className="card flex flex-col items-center gap-3 p-10 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-sunken text-faint">
            <Icon name="chart" size={26} />
          </span>
          <p className="font-semibold">Nothing to measure yet</p>
          <p className="max-w-xs text-sm text-muted">
            Complete a few tasks and your completion rate, streak and category
            breakdown will appear here.
          </p>
          <Link href="/" className="btn btn-primary">
            Go to Today
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Progress</h1>
        <p className="mt-0.5 text-sm text-muted">
          How your work is going at a glance.
        </p>
      </div>

      <section className="banner-gradient relative overflow-hidden rounded-[20px] p-5 text-white">
        <div className="dot-grid pointer-events-none absolute inset-0 opacity-40" />
        <div className="relative flex items-center gap-5">
          <div
            className="grid shrink-0 place-items-center rounded-full"
            style={{
              width: 104,
              height: 104,
              background: `conic-gradient(#fff ${stats.completionRate * 3.6}deg, rgba(255,255,255,0.28) 0deg)`,
            }}
            role="img"
            aria-label={`${stats.completionRate}% of all tasks completed`}
          >
            <div className="grid h-[84px] w-[84px] place-items-center rounded-full text-center leading-none">
              <span>
                <span className="block text-2xl font-bold">{stats.completionRate}%</span>
                <span className="block text-[10px] text-white/75">complete</span>
              </span>
            </div>
          </div>

          <div className="min-w-0">
            <p className="text-lg font-bold">
              {stats.streak > 0
                ? `${stats.streak} day streak`
                : "Start a streak today"}
            </p>
            <p className="mt-1 text-sm text-white/85">
              {stats.completed} of {stats.total} tasks completed
              {stats.overdue > 0 && ` · ${stats.overdue} overdue`}
            </p>
            <p className="mt-2 text-xs text-white/70">
              {stats.completedThisWeek} finished this week
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Completed" value={stats.completed} tone="success" />
        <StatCard label="Open" value={stats.remaining} />
        <StatCard label="Overdue" value={stats.overdue} tone={stats.overdue > 0 ? "danger" : undefined} />
      </div>

      <section className="card p-4">
        <h2 className="mb-4 text-sm font-semibold">Last 7 days</h2>
        <div className="flex h-32 items-end gap-2">
          {days.map((day, index) => {
            const key = toKey(day);
            const count = counts[index] ?? 0;
            const isToday = key === today;
            return (
              <div key={key} className="flex flex-1 flex-col items-center gap-1.5">
                <span className="text-[11px] font-medium text-muted">{count}</span>
                <div
                  className="w-full rounded-t-[6px] transition-all"
                  style={{
                    height: `${Math.max(4, (count / peak) * 100)}%`,
                    background: count
                      ? "var(--accent)"
                      : "color-mix(in srgb, var(--ink) 10%, transparent)",
                  }}
                  title={`${count} completed on ${key}`}
                />
                <span
                  className={`text-[11px] ${isToday ? "font-bold text-ink" : "text-muted"}`}
                >
                  {WEEKDAY[day.getDay()]}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {breakdown.length > 0 && (
        <section>
          <h2 className="mb-3 text-base font-bold">By category</h2>
          <ul className="space-y-2.5">
            {breakdown.map(({ category, total, done, percent }) => (
              <li key={category.id} className="card p-3.5">
                <div className="flex items-center gap-3">
                  <span
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] text-white"
                    style={{ background: gradientFor(category.color) }}
                  >
                    <Icon name={category.icon} size={17} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate font-medium">{category.name}</span>
                      <span className="shrink-0 text-xs text-muted">
                        {done}/{total}
                      </span>
                    </div>
                    <div
                      className="mt-1.5 h-1.5 overflow-hidden rounded-full"
                      style={{ background: tintFor(category.color, 16) }}
                    >
                      <div
                        className="h-full rounded-full transition-[width] duration-500"
                        style={{ width: `${percent}%`, background: category.color }}
                      />
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {recentDone.length > 0 && (
        <section>
          <h2 className="mb-3 text-base font-bold">Recently completed</h2>
          <ul className="space-y-2">
            {recentDone.map((task) => {
              const category = state.categories.find(
                (c) => c.id === task.categoryId,
              );
              return (
                <li
                  key={task.id}
                  className="card flex items-center gap-3 p-3 text-sm"
                >
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-success/15 text-success">
                    <Icon name="check" size={14} />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-faint line-through">
                    {task.title}
                  </span>
                  {category && (
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium"
                      style={{
                        background: tintFor(category.color, 16),
                        color: category.color,
                      }}
                    >
                      {category.name}
                    </span>
                  )}
                  <span className="shrink-0 text-[11px] text-faint">
                    {task.dueDate ? humanDue(task.dueDate, "done") : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
