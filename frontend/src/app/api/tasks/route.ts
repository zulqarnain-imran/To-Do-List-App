import { getTasks, insertDoc } from "@/lib/mongodb";
import { handle, json, requireUser } from "@/lib/api";
import { taskCreateSchema } from "@/lib/validations";
import { serializeTask } from "@/lib/serialize";
import { TASK_CAP } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/tasks — every non-archived task for the signed-in user. */
export async function GET() {
  try {
    const user = await requireUser();
    const tasks = await getTasks();

    const docs = await tasks
      .find({ userId: user.id, isArchived: false })
      .sort({ createdAt: -1 })
      .limit(TASK_CAP)
      .toArray();

    return json({
      tasks: docs.map(serializeTask),
      truncated: docs.length >= TASK_CAP,
    });
  } catch (error) {
    return handle(error, "tasks/list");
  }
}

/** POST /api/tasks */
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = taskCreateSchema.parse(await request.json());

    // The defaults already travel on the session, so choosing one is free.
    // "Add a task" therefore needs no extra database round trip.
    const categoryId =
      body.categoryId ?? user.settings?.defaultCategory ?? null;
    const priority =
      body.priority ?? user.settings?.defaultPriority ?? "medium";

    const now = new Date();

    const document = {
      userId: user.id,
      title: body.title,
      description: body.description,
      categoryId,
      priority,
      status: body.status,
      dueDate: body.dueDate,
      dueTime: body.dueTime,
      reminder: body.reminder,
      tags: body.tags,
      subtasks: body.subtasks,
      isImportant: body.isImportant,
      recurrence: body.recurrence,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
      completedAt: body.status === "done" ? now : null,
    };

    const tasks = await getTasks();
    const taskId = await insertDoc(tasks, document);

    return json({ task: serializeTask({ _id: taskId, ...document }) }, 201);
  } catch (error) {
    return handle(error, "tasks/create");
  }
}
