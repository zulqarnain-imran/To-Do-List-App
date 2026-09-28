"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { EmptyState, TaskList } from "@/components/TaskViews";
import { SectionHeading } from "@/components/Controls";
import { useStore } from "@/components/store";
import { apiFetch } from "@/lib/client";
import {
  addDays,
  formatMonthYear,
  fromKey,
  monthMatrix,
  toKey,
  weekDays,
} from "@/lib/date";
import type { Task, WeekStart } from "@/lib/types";

type View = "month" | "week" | "day";

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Calendar.
 *
 * Unlike every other screen, this one asks the server for data. It renders a
 * window, so it fetches exactly the window it renders via /api/tasks/range,
 * which is a single bounded range query against the { userId, dueDate } index.
 * Moving from month to month transfers a few kilobytes rather than the user's
 * entire history.
 */
export function CalendarView() {
  const { state, today, openComposer } = useStore();
  const weekStartsOn = state.user.settings.weekStartsOn as WeekStart;

  const [view, setView] = useState<View>("month");
  const [anchor, setAnchor] = useState(() => fromKey(today));
  const [selected, setSelected] = useState(today);
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState({ from: "", to: "" });

  /** The exact span the current view needs. */
  const span = useMemo(() => {
    if (view === "day") {
      const key = toKey(anchor);
      return { from: key, to: key };
    }
    if (view === "week") {
      const days = weekDays(anchor, weekStartsOn);
      return { from: toKey(days[0]), to: toKey(days[6]) };
    }
    // A month grid always covers six weeks, so fetch all of it.
    const grid = monthMatrix(anchor, weekStartsOn);
    return { from: toKey(grid[0][0]), to: toKey(grid[5][6]) };
  }, [view, anchor, weekStartsOn]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    apiFetch<{ tasks: Task[] }>(
      `/api/tasks/range?from=${span.from}&to=${span.to}`,
    )
      .then((data) => {
        if (cancelled) return;
        setTasks(data.tasks);
        setRange(span);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        // Fall back to the tasks already in the store so the calendar still
        // works, just without a fresh read.
        setTasks(
          state.tasks.filter(
            (task) => task.dueDate && task.dueDate >= span.from && task.dueDate <= span.to,
          ),
        );
        setRange(span);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // state.tasks is intentionally excluded: re-running on every store change
    // would refetch on each checkbox toggle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [span.from, span.to]);

  const byDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of tasks ?? []) {
      if (!task.dueDate) continue;
      const list = map.get(task.dueDate);
      if (list) list.push(task);
      else map.set(task.dueDate, [task]);
    }
    return map;
  }, [tasks]);

  const selectedTasks = byDate.get(selected) ?? [];

  const step = useCallback(
    (direction: 1 | -1) => {
      setAnchor((current) => {
        if (view === "day") return addDays(current, direction);
        if (view === "week") return addDays(current, 7 * direction);
        return new Date(
          current.getFullYear(),
          current.getMonth() + direction,
          1,
        );
      });
    },
    [view],
  );

  const heading =
    view === "day"
      ? fromKey(selected).toLocaleDateString("en-US", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })
      : view === "week"
        ? `${formatMonthYear(anchor)}`
        : formatMonthYear(anchor);

  const weekdays = [...WEEKDAY_SHORT.slice(weekStartsOn), ...WEEKDAY_SHORT.slice(0, weekStartsOn)];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">{heading}</h1>

        <div className="flex items-center gap-1.5">
          <div className="flex overflow-hidden rounded-full bg-sunken p-1">
            {(["month", "week", "day"] as View[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setView(option)}
                aria-pressed={view === option}
                className={`rounded-full px-3 py-1 text-xs font-semibold capitalize transition-colors ${
                  view === option
                    ? "bg-surface text-ink shadow-sm"
                    : "text-muted hover:text-ink"
                }`}
              >
                {option}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              const now = fromKey(today);
              setAnchor(now);
              setSelected(today);
            }}
            className="btn btn-ghost"
          >
            Today
          </button>

          <div className="flex overflow-hidden rounded-full bg-sunken p-1">
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Previous"
              className="grid h-8 w-8 place-items-center rounded-full text-muted transition-colors hover:text-ink"
            >
              <Icon name="chevron-left" size={17} />
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Next"
              className="grid h-8 w-8 place-items-center rounded-full text-muted transition-colors hover:text-ink"
            >
              <Icon name="chevron-right" size={17} />
            </button>
          </div>
        </div>
      </div>

      {view === "month" && (
        <div className="card p-2 sm:p-3">
          <div className="grid grid-cols-7 gap-1 pb-1">
            {weekdays.map((label) => (
              <div key={label} className="py-1 text-center text-[11px] font-semibold text-muted">
                {label}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {monthMatrix(anchor, weekStartsOn).flat().map((date) => {
              const key = toKey(date);
              const dayTasks = byDate.get(key) ?? [];
              const inMonth = date.getMonth() === anchor.getMonth();
              const isToday = key === today;
              const isSelected = key === selected;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setSelected(key);
                    if (view === "month" && !inMonth) setAnchor(new Date(date.getFullYear(), date.getMonth(), 1));
                  }}
                  aria-label={`${key}, ${dayTasks.length} tasks`}
                  aria-current={isToday ? "date" : undefined}
                  className={`relative flex aspect-square flex-col items-center justify-center rounded-[10px] text-sm transition-colors ${
                    isSelected
                      ? "bg-brand-purple text-white"
                      : inMonth
                        ? "text-ink hover:bg-sunken"
                        : "text-faint"
                  }`}
                >
                  <span
                    className={`grid h-7 w-7 place-items-center rounded-full text-[13px] ${
                      isToday && !isSelected
                        ? "bg-brand-purple/15 font-bold text-brand-purple"
                        : ""
                    }`}
                  >
                    {date.getDate()}
                  </span>
                  {dayTasks.length > 0 && (
                    <span className="mt-0.5 flex gap-0.5">
                      {dayTasks.slice(0, 3).map((task) => {
                        const color =
                          state.categories.find((c) => c.id === task.categoryId)?.color ??
                          "currentColor";
                        return (
                          <span
                            key={task.id}
                            className="h-1 w-1 rounded-full"
                            style={{ background: isSelected ? "#fff" : color }}
                          />
                        );
                      })}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {view === "week" && (
        <div className="card p-2 sm:p-3">
          <div className="grid grid-cols-7 gap-1">
            {weekDays(anchor, weekStartsOn).map((date) => {
              const key = toKey(date);
              const dayTasks = byDate.get(key) ?? [];
              const isToday = key === today;
              const isSelected = key === selected;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelected(key)}
                  aria-current={isToday ? "date" : undefined}
                  className={`flex flex-col items-center gap-1.5 rounded-[12px] py-2.5 transition-colors ${
                    isSelected ? "bg-brand-purple text-white" : "hover:bg-sunken"
                  }`}
                >
                  <span className="text-[11px] font-semibold text-muted">
                    {WEEKDAY_SHORT[date.getDay()]}
                  </span>
                  <span
                    className={`grid h-8 w-8 place-items-center rounded-full text-sm ${
                      isToday && !isSelected
                        ? "bg-brand-purple/15 font-bold text-brand-purple"
                        : ""
                    }`}
                  >
                    {date.getDate()}
                  </span>
                  <span className="flex h-1.5 gap-0.5">
                    {dayTasks.slice(0, 3).map((task) => (
                      <span
                        key={task.id}
                        className="h-1.5 w-1.5 rounded-full"
                        style={{
                          background: isSelected
                            ? "#fff"
                            : state.categories.find((c) => c.id === task.categoryId)?.color ??
                              "var(--faint)",
                        }}
                      />
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <section>
        <SectionHeading
          title={
            view === "month"
              ? fromKey(selected).toLocaleDateString("en-US", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })
              : "Tasks"
          }
          count={selectedTasks.length}
          action={
            <button
              type="button"
              onClick={() => {
                setView("day");
                setAnchor(fromKey(selected));
                openComposer(undefined, { dueDate: selected });
              }}
              className="btn btn-quiet text-sm"
            >
              <Icon name="plus" size={15} /> Add
            </button>
          }
        />

        {loading ? (
          <div className="space-y-2.5">
            {[0, 1, 2].map((index) => (
              <div key={index} className="card h-[74px] animate-pulse opacity-60" />
            ))}
          </div>
        ) : selectedTasks.length > 0 ? (
          <TaskList tasks={selectedTasks} />
        ) : (
          <EmptyState
            title="Nothing on this day"
            hint={loading ? "" : "Pick another date, or add a task."}
          />
        )}
      </section>

      {range.from && (
        <p className="text-center text-[11px] text-faint">
          Showing {range.from} to {range.to}
        </p>
      )}
    </div>
  );
}
