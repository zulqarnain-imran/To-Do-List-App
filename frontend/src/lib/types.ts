import type { ObjectId } from "mongodb";

/* ------------------------------------------------------------------ */
/* Shared value types                                                  */
/* ------------------------------------------------------------------ */

export type Priority = "low" | "medium" | "high";
export type TaskStatus = "todo" | "done";
export type Recurrence = "none" | "daily" | "weekly" | "monthly" | "yearly";
export type Theme = "light" | "dark" | "system";
export type WeekStart = 0 | 1;

export interface Settings {
  theme: Theme;
  notifications: boolean;
  defaultPriority: Priority;
  defaultCategory: string | null;
  weekStartsOn: WeekStart;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: "system",
  notifications: true,
  defaultPriority: "medium",
  defaultCategory: null,
  weekStartsOn: 1,
};

/* ------------------------------------------------------------------ */
/* Mongo documents (ObjectId ids)                                      */
/* ------------------------------------------------------------------ */

export interface UserDocument {
  _id: ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  avatar: string | null;
  settings: Settings;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskDocument {
  _id: ObjectId;
  userId: string;
  title: string;
  description: string;
  categoryId: string | null;
  priority: Priority;
  status: TaskStatus;
  dueDate: string | null;
  dueTime: string | null;
  reminder: string | null;
  tags: string[];
  subtasks: Subtask[];
  isImportant: boolean;
  recurrence: Recurrence;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}

export interface CategoryDocument {
  _id: ObjectId;
  userId: string;
  name: string;
  color: string;
  icon: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * A rolling-window request counter.
 *
 * One document per (bucket, identifier). The window slides: every attempt
 * pushes `expiresAt` out, so `count` is always "attempts in the last N seconds".
 * A TTL index on `expiresAt` reaps the document once the window has been idle
 * for long enough that the counter is irrelevant.
 *
 * The identifier is a truncated SHA-256 digest, never the raw email or IP, so
 * this collection cannot become a list of who tried to sign in.
 */
export interface RateLimitDocument {
  _id: string;
  bucket: string;
  count: number;
  expiresAt: Date;
}

export interface SessionDocument {
  _id: ObjectId;
  userId: string;
  /** sha256 of the cookie token; the raw token is never stored */
  tokenHash: string;
  // Identity is denormalised onto the session so that authenticating a request
  // costs exactly one database read instead of two.
  name: string;
  email: string;
  avatar: string | null;
  settings: Settings;
  createdAt: Date;
  expiresAt: Date;
  lastUsedAt: Date;
  userAgent: string | null;
}

/* ------------------------------------------------------------------ */
/* Client-safe shapes (string ids, safe to pass to client components)   */
/* ------------------------------------------------------------------ */

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  settings: Settings;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  categoryId: string | null;
  priority: Priority;
  status: TaskStatus;
  dueDate: string | null;
  dueTime: string | null;
  reminder: string | null;
  tags: string[];
  subtasks: Subtask[];
  isImportant: boolean;
  recurrence: Recurrence;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  isDefault: boolean;
}

export interface UserStats {
  total: number;
  completed: number;
  remaining: number;
  overdue: number;
  todayTotal: number;
  todayCompleted: number;
  important: number;
  streak: number;
  completedThisWeek: number;
  completionRate: number;
}

export interface Bootstrap {
  user: SessionUser;
  categories: Category[];
  tasks: Task[];
  /** true when the task list was truncated by the server cap */
  truncated: boolean;
  stats: UserStats;
}

/* ------------------------------------------------------------------ */
/* Filters and sorting                                                 */
/* ------------------------------------------------------------------ */

export type TaskFilter =
  | "all"
  | "today"
  | "upcoming"
  | "overdue"
  | "completed"
  | "important"
  | "archived";

export type TaskSort = "dueDate" | "priority" | "createdAt" | "alphabetical" | "updatedAt";
