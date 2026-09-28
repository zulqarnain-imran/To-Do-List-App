import type {
  Task,
  TaskDocument,
  Category,
  CategoryDocument,
  Settings,
  UserDocument,
} from "./types";

/**
 * Mongo documents carry ObjectId, which React Server Components cannot
 * serialise. Every value crossing to the client goes through here first.
 */

function iso(value: Date | null | undefined): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

export function serializeTask(doc: TaskDocument): Task {
  return {
    id: doc._id.toHexString(),
    title: doc.title,
    description: doc.description ?? "",
    categoryId: doc.categoryId ?? null,
    priority: doc.priority,
    status: doc.status,
    dueDate: doc.dueDate ?? null,
    dueTime: doc.dueTime ?? null,
    reminder: doc.reminder ?? null,
    tags: doc.tags ?? [],
    subtasks: doc.subtasks ?? [],
    isImportant: Boolean(doc.isImportant),
    recurrence: doc.recurrence ?? "none",
    isArchived: Boolean(doc.isArchived),
    createdAt: iso(doc.createdAt) ?? "",
    updatedAt: iso(doc.updatedAt) ?? "",
    completedAt: iso(doc.completedAt),
  };
}

export function serializeCategory(doc: CategoryDocument): Category {
  return {
    id: doc._id.toHexString(),
    name: doc.name,
    color: doc.color,
    icon: doc.icon,
    isDefault: Boolean(doc.isDefault),
  };
}

export function serializeSettings(user: UserDocument): Settings {
  return user.settings;
}
