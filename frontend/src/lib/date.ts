/**
 * Date helpers.
 *
 * Every due date in this app is a plain "YYYY-MM-DD" string interpreted in the
 * user's local timezone. Storing a Date for a calendar day invites off-by-one
 * bugs across timezones, so we deliberately keep the string form end to end.
 */

export const MS_DAY = 86_400_000;

export function toKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function fromKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function todayKey(): string {
  return toKey(new Date());
}

export function startOfDay(date: Date = new Date()): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function addMonths(date: Date, months: number): Date {
  const copy = new Date(date);
  copy.setMonth(copy.getMonth() + months);
  return copy;
}

export function isToday(key: string | null | undefined): boolean {
  return Boolean(key) && key === todayKey();
}

export function isPastDue(key: string | null | undefined): boolean {
  return Boolean(key) && key! < todayKey();
}

export function startOfWeek(date: Date, weekStartsOn: 0 | 1 = 1): Date {
  const copy = startOfDay(date);
  const diff = (copy.getDay() - weekStartsOn + 7) % 7;
  return addDays(copy, -diff);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((fromKey(b).getTime() - fromKey(a).getTime()) / MS_DAY);
}

const SHORT = new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short" });
const LONG = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  day: "numeric",
  month: "short",
});
const MONTH_YEAR = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});

/** "Due today" / "Due tomorrow" / "Due Fri, 12 Sep" / "3 days overdue" */
export function humanDue(dueDate: string | null, status: string): string {
  if (!dueDate) return "No date";
  if (status === "done") return "Completed";

  const diff = daysBetween(todayKey(), dueDate);

  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "1 day overdue";
  if (diff < -1) return `${Math.abs(diff)} days overdue`;
  if (diff < 7) return LONG.format(fromKey(dueDate));
  return SHORT.format(fromKey(dueDate));
}

export function formatMonthYear(date: Date): string {
  return MONTH_YEAR.format(date);
}

/** Seven days, typed as a tuple so day[0] and day[6] need no guard. */
export type Week = [Date, Date, Date, Date, Date, Date, Date];

/** A six-week month grid, each row a Week. */
export type MonthGrid = [Week, Week, Week, Week, Week, Week];

export function monthMatrix(anchor: Date, weekStartsOn: 0 | 1 = 1): MonthGrid {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const gridStart = startOfWeek(first, weekStartsOn);
  const cell = (offset: number) => addDays(gridStart, offset);
  const row = (week: number): Week => [
    cell(week * 7),
    cell(week * 7 + 1),
    cell(week * 7 + 2),
    cell(week * 7 + 3),
    cell(week * 7 + 4),
    cell(week * 7 + 5),
    cell(week * 7 + 6),
  ];
  return [row(0), row(1), row(2), row(3), row(4), row(5)];
}

export function weekDays(anchor: Date, weekStartsOn: 0 | 1 = 1): Week {
  const start = startOfWeek(anchor, weekStartsOn);
  return [
    start,
    addDays(start, 1),
    addDays(start, 2),
    addDays(start, 3),
    addDays(start, 4),
    addDays(start, 5),
    addDays(start, 6),
  ];
}

export function relativeTime(iso: string | null): string {
  if (!iso) return "never";
  const then = new Date(iso).getTime();
  const seconds = Math.round((Date.now() - then) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

/** ISO timestamp for a due date + time, used for browser notifications. */
export function dueDateToIso(dueDate: string, dueTime: string | null): string | null {
  if (!dueDate) return null;
  const [y, m, d] = dueDate.split("-").map(Number);
  const [hh, mm] = (dueTime ?? "09:00").split(":").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1, hh ?? 9, mm ?? 0).toISOString();
}
