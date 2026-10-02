import { ObjectId } from "mongodb";
import { getTasks } from "@/lib/mongodb";
import { handle, json, requireUser, fail, readJson } from "@/lib/api";
import { taskUpdateSchema } from "@/lib/validations";
import { serializeTask } from "@/lib/serialize";
import { addDays, addMonths, fromKey, todayKey, toKey } from "@/lib/date";
import type { Recurrence, TaskDocument } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function objectId(id: string): ObjectId | null {
  return ObjectId.isValid(id) && String(new ObjectId(id)) === id
    ? new ObjectId(id)
    : null;
}

/** The next due date for a repeating task, or null when it cannot advance. */
function nextOccurrence(
  dueDate: string | null,
  recurrence: Recurrence,
): string | null {
  if (recurrence === "none" || !dueDate) return null;

  const base = fromKey(dueDate);
  let next: Date;

  switch (recurrence) {
    case "daily":
      next = addDays(base, 1);
      break;
    case "weekly":
      next = addDays(base, 7);
      break;
    case "monthly":
      next = addMonths(base, 1);
      break;
    case "yearly":
      next = addMonths(base, 12);
      break;
    default:
      return null;
  }

  // Skip ahead if the user let a repeating task lapse, so the series does not
  // spawn a backlog of dates that are all already in the past.
  const today = fromKey(todayKey());
  let guard = 0;
  while (next < today && guard < 365) {
    next =
      recurrence === "monthly"
        ? addMonths(next, 1)
        : recurrence === "yearly"
          ? addMonths(next, 12)
          : addDays(next, recurrence === "daily" ? 1 : 7);
    guard += 1;
  }

  return toKey(next);
}

/** PATCH /api/tasks/:id â€” partial update, only the keys that were sent. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser(request);
    const { id } = await params;

    const _id = objectId(id);
    if (!_id) return fail("Task not found", 404);

    const body = taskUpdateSchema.parse(await readJson(request));
    if (Object.keys(body).length === 0) {
      return fail("No valid fields to update", 400);
    }

    const tasks = await getTasks();

    // The userId guard is the authorisation boundary: even a correctly formed
    // ObjectId belonging to someone else simply will not match.
    const existing = await tasks.findOne({ _id, userId: user.id });
    if (!existing) return fail("Task not found", 404);

    const now = new Date();
    const set: Record<string, unknown> = { ...body, updatedAt: now };

    if (body.status !== undefined) {
      set.completedAt = body.status === "done" ? (existing.completedAt ?? now) : null;
    }

    const updated = await tasks.findOneAndUpdate(
      { _id, userId: user.id },
      { $set: set },
      { returnDocument: "after" },
    );

    if (!updated) return fail("Task not found", 404);

    // Completing a repeating task spawns its next occurrence, so the series
    // continues without the user having to create anything by hand.
    let spawned: TaskDocument | null = null;
    if (
      body.status === "done" &&
      existing.status !== "done" &&
      existing.recurrence !== "none"
    ) {
      const nextDate = nextOccurrence(existing.dueDate, existing.recurrence);
      spawned = {
        _id: new ObjectId(),
        userId: user.id,
        title: existing.title,
        description: existing.description,
        categoryId: existing.categoryId,
        priority: existing.priority,
        status: "todo",
        dueDate: nextDate,
        dueTime: existing.dueTime,
        reminder: null,
        tags: existing.tags,
        subtasks: existing.subtasks.map((sub) => ({ ...sub, completed: false })),
        isImportant: existing.isImportant,
        recurrence: existing.recurrence,
        isArchived: false,
        createdAt: now,
        updatedAt: now,
        completedAt: null,
      };
      await tasks.insertOne(spawned);
    }

    return json({
      task: serializeTask(updated),
      spawned: spawned ? serializeTask(spawned) : null,
    });
  } catch (error) {
    return handle(error, "tasks/update");
  }
}

/**
 * DELETE /api/tasks/:id
 *
 * A hard delete by default. `?archive=1` archives instead, which is what the
 * UI's archive action uses so nothing is lost to a mis-click.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser(request);
    const { id } = await params;

    const _id = objectId(id);
    if (!_id) return fail("Task not found", 404);

    const archive = new URL(request.url).searchParams.get("archive") === "1";
    const tasks = await getTasks();

    if (archive) {
      const result = await tasks.updateOne(
        { _id, userId: user.id },
        { $set: { isArchived: true, updatedAt: new Date() } },
      );
      if (result.matchedCount === 0) return fail("Task not found", 404);
      return json({ ok: true, archived: true });
    }

    const result = await tasks.deleteOne({ _id, userId: user.id });
    if (result.deletedCount === 0) return fail("Task not found", 404);

    return json({ ok: true, archived: false });
  } catch (error) {
    return handle(error, "tasks/delete");
  }
}
