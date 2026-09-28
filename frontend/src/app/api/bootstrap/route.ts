import { getCategories, getTasks } from "@/lib/mongodb";
import { handle, json, requireUser } from "@/lib/api";
import { serializeCategory, serializeTask } from "@/lib/serialize";
import { computeStats } from "@/lib/task-utils";
import { TASK_CAP } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/bootstrap
 *
 * The single call the app makes on load. Folding the session, categories,
 * tasks and statistics into one response means a cold start costs four
 * database operations in total instead of one per feature, which matters a
 * great deal against the Atlas Free tier's 100 operations/second cap.
 *
 * Categories and tasks are read in parallel because they are independent.
 */
export async function GET() {
  try {
    const user = await requireUser();

    const [categories, tasks] = await Promise.all([
      getCategories(),
      getTasks(),
    ]);

    const [categoryDocs, taskDocs] = await Promise.all([
      categories.find({ userId: user.id }).sort({ createdAt: 1 }).toArray(),
      tasks
        .find({ userId: user.id, isArchived: false })
        .sort({ createdAt: -1 })
        .limit(TASK_CAP)
        .toArray(),
    ]);

    const serialized = taskDocs.map(serializeTask);

    return json({
      user,
      categories: categoryDocs.map(serializeCategory),
      tasks: serialized,
      truncated: taskDocs.length >= TASK_CAP,
      stats: computeStats(serialized),
    });
  } catch (error) {
    return handle(error, "bootstrap");
  }
}
