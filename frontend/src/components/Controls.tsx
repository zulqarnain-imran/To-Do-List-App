"use client";

import { Icon } from "./Icon";
import { useStore } from "./store";
import { allTags } from "@/lib/task-utils";
import { gradientFor, tintFor } from "@/lib/categories";
import type { Priority, TaskFilter, TaskSort } from "@/lib/types";

const FILTERS: { value: TaskFilter; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "all", label: "All" },
  { value: "upcoming", label: "Upcoming" },
  { value: "overdue", label: "Overdue" },
  { value: "important", label: "Important" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
];

const SORTS: { value: TaskSort; label: string }[] = [
  { value: "dueDate", label: "Due date" },
  { value: "priority", label: "Priority" },
  { value: "createdAt", label: "Newest" },
  { value: "updatedAt", label: "Recently changed" },
  { value: "alphabetical", label: "A–Z" },
];

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

/** Search, filter chips and sort. All client-side against the loaded list. */
export function FilterBar({
  showFilters = true,
  showSort = true,
}: {
  showFilters?: boolean;
  showSort?: boolean;
}) {
  const { state, setQuery } = useStore();
  const { query } = state;
  const tags = allTags(state.tasks);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-faint">
            <Icon name="search" size={17} />
          </span>
          <label htmlFor="task-search" className="sr-only">
            Search tasks
          </label>
          <input
            id="task-search"
            className="field pl-9"
            placeholder="Search title, notes or tags"
            value={query.search}
            onChange={(event) => setQuery({ search: event.target.value })}
            type="search"
          />
        </div>

        {showSort && (
          <div className="relative shrink-0">
            <label htmlFor="task-sort" className="sr-only">
              Sort tasks
            </label>
            <select
              id="task-sort"
              className="field h-full w-auto py-0 pr-8 pl-3"
              value={query.sort}
              onChange={(event) => setQuery({ sort: event.target.value as TaskSort })}
            >
              {SORTS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {showFilters && (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {FILTERS.map((filter) => {
            const active = query.filter === filter.value;
            return (
              <button
                key={filter.value}
                type="button"
                onClick={() => setQuery({ filter: filter.value })}
                aria-pressed={active}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-brand-purple text-white"
                    : "bg-sunken text-muted hover:text-ink"
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      )}

      {(query.priority || query.tag || query.categoryId) && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted">Filtered by</span>
          {query.priority && (
            <Chip
              label={`${query.priority} priority`}
              onClear={() => setQuery({ priority: null })}
            />
          )}
          {query.tag && (
            <Chip label={`#${query.tag}`} onClear={() => setQuery({ tag: null })} />
          )}
          {query.categoryId && (
            <Chip
              label={
                state.categories.find((c) => c.id === query.categoryId)?.name ??
                "category"
              }
              onClear={() => setQuery({ categoryId: null })}
            />
          )}
          <button
            type="button"
            className="btn btn-quiet"
            onClick={() => setQuery({ priority: null, tag: null, categoryId: null })}
          >
            Clear all
          </button>
        </div>
      )}

      <details className="group">
        <summary className="btn btn-quiet w-fit cursor-pointer list-none text-sm">
          <Icon name="sliders" size={16} />
          More filters
          <Icon
            name="chevron-down"
            size={15}
            className="transition-transform group-open:rotate-180"
          />
        </summary>

        <div className="mt-3 space-y-3">
          <div>
            <p className="mb-1.5 text-xs font-semibold tracking-wide text-muted uppercase">
              Priority
            </p>
            <div className="flex gap-2">
              {PRIORITIES.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={query.priority === option.value}
                  onClick={() =>
                    setQuery({
                      priority: query.priority === option.value ? null : option.value,
                    })
                  }
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                    query.priority === option.value
                      ? "bg-brand-purple text-white"
                      : "bg-sunken text-muted"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {tags.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold tracking-wide text-muted uppercase">
                Tags
              </p>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    aria-pressed={query.tag === tag}
                    onClick={() => setQuery({ tag: query.tag === tag ? null : tag })}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                      query.tag === tag
                        ? "bg-brand-purple text-white"
                        : "bg-sunken text-muted"
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </details>
    </div>
  );
}

function Chip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-sunken px-2.5 py-1 font-medium text-ink">
      {label}
      <button type="button" onClick={onClear} aria-label={`Remove ${label} filter`}>
        <Icon name="close" size={12} />
      </button>
    </span>
  );
}

/**
 * The three category cards from the Figma home screen. Tapping one filters the
 * list to that category, so the cards are navigation rather than decoration.
 */
export function CategoryCards() {
  const { state, setQuery } = useStore();
  const { categories, tasks, query } = state;

  if (categories.length === 0) return null;

  return (
    <div className="grid grid-cols-3 gap-2.5 lg:gap-4">
      {categories.map((category) => {
        const total = tasks.filter(
          (task) =>
            task.categoryId === category.id && task.status !== "done",
        ).length;
        const active = query.categoryId === category.id;

        return (
          <button
            key={category.id}
            type="button"
            onClick={() => setQuery({ categoryId: active ? null : category.id })}
            aria-pressed={active}
            className="animate-float-in relative overflow-hidden rounded-[15px] p-3 text-left text-white transition-transform hover:scale-[1.02] lg:rounded-[18px] lg:p-4"
            style={{ background: gradientFor(category.color) }}
          >
            <span
              className="pointer-events-none absolute -top-6 -right-6 h-20 w-20 rounded-full"
              style={{ background: tintFor("#ffffff", 14) }}
            />
            <span className="relative grid h-9 w-9 place-items-center rounded-[12px] bg-white/25 lg:h-11 lg:w-11">
              <Icon name={category.icon} size={19} />
            </span>
            <p className="relative mt-3 truncate text-[13px] font-semibold lg:text-base">
              {category.name}
            </p>
            <p className="relative text-[11px] text-white/80 lg:text-xs">
              {total} {total === 1 ? "task" : "tasks"}
            </p>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Conic-gradient ring used on the Today and Progress screens.
 *
 * Drawn with a single element and an inset box-shadow rather than a
 * pseudo-element, so the thickness and the centre label stay in one box and
 * scale together.
 */
export function ProgressRing({
  percent,
  size = 92,
  thickness = 10,
  label,
}: {
  percent: number;
  size?: number;
  thickness?: number;
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(100, percent));

  return (
    <div
      className="relative grid shrink-0 place-items-center rounded-full"
      style={{
        width: size,
        height: size,
        background: `conic-gradient(var(--ring-color) ${clamped * 3.6}deg, color-mix(in srgb, var(--ink) 12%, transparent) 0deg)`,
      }}
      role="img"
      aria-label={`${clamped}% complete`}
    >
      <div
        className="grid place-items-center rounded-full bg-surface text-center leading-none"
        style={{ width: size - thickness * 2, height: size - thickness * 2 }}
      >
        <span>
          <span className="block text-lg font-bold">{clamped}%</span>
          {label && <span className="mt-0.5 block text-[10px] text-muted">{label}</span>}
        </span>
      </div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: "danger" | "success";
}) {
  const color =
    tone === "danger"
      ? "text-danger"
      : tone === "success"
        ? "text-success"
        : "text-ink";

  return (
    <div className="card p-4">
      <p className="text-xs font-semibold tracking-wide text-muted uppercase">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function SectionHeading({
  title,
  count,
  action,
}: {
  title: string;
  count?: number;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-base font-bold">
        {title}
        {count !== undefined && (
          <span className="ml-2 text-sm font-medium text-muted">{count}</span>
        )}
      </h2>
      {action}
    </div>
  );
}
