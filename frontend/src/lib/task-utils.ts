import type { Task, TaskFilter, TaskSort, UserStats, Priority } from "./types";
import { todayKey, toKey, startOfWeek, addDays, fromKey, MS_DAY } from "./date";

/**
 * Filtering, sorting and statistics all run on the client against the task
 * list already fetched by /api/bootstrap.
 *
 * This is deliberate. A personal task list is small (hundreds of rows, well
 * under a megabyte), so round-tripping to MongoDB on every keystroke or every
 * filter change would burn the Atlas Free tier's 100 operations/second for no
 * perceptible gain. The server is only asked for data it does not already
 * have: the initial page, and explicit date ranges for the calendar.
 */

const PRIORITY_WEIGHT: Record<Priority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export function isOverdue(task: Task, today: string): boolean {
  return task.status !== "done" && Boolean(task.dueDate) && task.dueDate! < today;
}

export function matchesFilter(task: Task, filter: TaskFilter, today: string): boolean {
  switch (filter) {
    case "all":
      return !task.isArchived;
    case "today":
      return !task.isArchived && task.dueDate === today;
    case "upcoming":
      return !task.isArchived && task.status !== "done" && Boolean(task.dueDate) && task.dueDate! > today;
    case "overdue":
      return isOverdue(task, today);
    case "completed":
      return task.status === "done";
    case "important":
      return task.isImportant && task.status !== "done" && !task.isArchived;
    case "archived":
      return task.isArchived;
    default:
      return !task.isArchived;
  }
}

export function matchesSearch(task: Task, term: string): boolean {
  if (!term) return true;
  const needle = term.toLowerCase();
  return (
    task.title.toLowerCase().includes(needle) ||
    task.description.toLowerCase().includes(needle) ||
    task.tags.some((tag) => tag.toLowerCase().includes(needle))
  );
}

export interface Query {
  filter: TaskFilter;
  search: string;
  categoryId: string | null;
  priority: Priority | null;
  tag: string | null;
  sort: TaskSort;
}

export function selectTasks(tasks: Task[], query: Query, today: string): Task[] {
  const result = tasks.filter((task) => {
    if (!matchesFilter(task, query.filter, today)) return false;
    if (query.categoryId && task.categoryId !== query.categoryId) return false;
    if (query.priority && task.priority !== query.priority) return false;
    if (query.tag && !task.tags.includes(query.tag)) return false;
    return matchesSearch(task, query.search);
  });

  return sortTasks(result, query.sort);
}

export function sortTasks(tasks: Task[], sort: TaskSort): Task[] {
  const sorted = [...tasks];

  // Done tasks always sink to the bottom regardless of sort, because a mixed
  // list with completed work interleaved reads as noise.
  const byStatus = (a: Task, b: Task) =>
    a.status === b.status ? 0 : a.status === "done" ? 1 : -1;

  switch (sort) {
    case "alphabetical":
      return sorted.sort(
        (a, b) => byStatus(a, b) || a.title.localeCompare(b.title),
      );

    case "priority":
      return sorted.sort(
        (a, b) =>
          byStatus(a, b) ||
          PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority] ||
          (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"),
      );

    case "createdAt":
      return sorted.sort(
        (a, b) => byStatus(a, b) || b.createdAt.localeCompare(a.createdAt),
      );

    case "updatedAt":
      return sorted.sort(
        (a, b) => byStatus(a, b) || b.updatedAt.localeCompare(a.updatedAt),
      );

    case "dueDate":
    default:
      return sorted.sort((a, b) => {
        if (a.status !== b.status) return byStatus(a, b);
        // Undated tasks trail dated ones rather than jumping to the top.
        if (!a.dueDate && !b.dueDate) return PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        if (a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
        if (a.dueTime && b.dueTime && a.dueTime !== b.dueTime) {
          return a.dueTime.localeCompare(b.dueTime);
        }
        return PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
      });
  }
}

/** Consecutive days, counting back from today, with at least one completion. */
export function computeStreak(completedAtDates: string[], today: string): number {
  if (completedAtDates.length === 0) return 0;

  const days = new Set(
    completedAtDates.map((iso) => toKey(new Date(iso))),
  );

  let cursor = fromKey(today);
  // A streak survives until the end of today, so start from today if it is
  // already done, otherwise allow yesterday to be the most recent day.
  if (!days.has(toKey(cursor))) {
    cursor = addDays(cursor, -1);
    if (!days.has(toKey(cursor))) return 0;
  }

  let streak = 0;
  while (days.has(toKey(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function computeStats(tasks: Task[], today = todayKey()): UserStats {
  const live = tasks.filter((task) => !task.isArchived);
  const completed = live.filter((task) => task.status === "done");

  const weekStart = startOfWeek(fromKey(today), 1);
  const weekEnd = addDays(weekStart, 7);

  let todayTotal = 0;
  let todayCompleted = 0;
  let overdue = 0;
  let important = 0;

  for (const task of live) {
    if (task.dueDate === today) {
      todayTotal += 1;
      if (task.status === "done") todayCompleted += 1;
    }
    if (isOverdue(task, today)) overdue += 1;
    if (task.isImportant && task.status !== "done") important += 1;
  }

  const completedThisWeek = completed.filter((task) => {
    if (!task.completedAt) return false;
    const time = new Date(task.completedAt).getTime();
    return time >= weekStart.getTime() && time < weekEnd.getTime();
  }).length;

  return {
    total: live.length,
    completed: completed.length,
    remaining: live.length - completed.length,
    overdue,
    todayTotal,
    todayCompleted,
    important,
    streak: computeStreak(
      completed.map((task) => task.completedAt ?? "").filter(Boolean),
      today,
    ),
    completedThisWeek,
    completionRate: live.length ? Math.round((completed.length / live.length) * 100) : 0,
  };
}

/** Every distinct tag in the list, for the tag filter. */
export function allTags(tasks: Task[]): string[] {
  const set = new Set<string>();
  for (const task of tasks) for (const tag of task.tags) set.add(tag);
  return [...set].sort();
}

export function completionPercent(done: number, total: number): number {
  if (!total) return 0;
  return Math.min(100, Math.round((done / total) * 100));
}

export { MS_DAY };
