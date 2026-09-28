import { getTasks } from "@/lib/mongodb";
import { handle, json, requireUser, fail } from "@/lib/api";
import { serializeTask } from "@/lib/serialize";
import { MAX_RANGE_DAYS, RANGE_CAP } from "@/lib/constants";
import { daysBetween } from "@/lib/date";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * GET /api/tasks/range?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * The calendar asks only for the window it is displaying. Serving a month view
 * as roughly 31 date-equality checks against a bounded range query, rather
 * than shipping the user's entire history, is the difference between a few
 * kilobytes and a few hundred on every calendar navigation.
 *
 * Hit by the { userId, dueDate } compound index.
 */
export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const url = new URL(request.url);

    const from = url.searchParams.get("from") ?? "";
    const to = url.searchParams.get("to") ?? "";

    if (!DATE.test(from) || !DATE.test(to)) {
      return fail("from and to must be YYYY-MM-DD");
    }
    if (from > to) {
      return fail("from must be on or before to");
    }
    if (daysBetween(from, to) > MAX_RANGE_DAYS) {
      return fail(`Range cannot exceed ${MAX_RANGE_DAYS} days`);
    }

    const tasks = await getTasks();
    const docs = await tasks
      .find({
        userId: user.id,
        isArchived: false,
        dueDate: { $gte: from, $lte: to },
      })
      .sort({ dueDate: 1, dueTime: 1 })
      .limit(RANGE_CAP)
      .toArray();

    return json({ tasks: docs.map(serializeTask), truncated: docs.length >= RANGE_CAP });
  } catch (error) {
    return handle(error, "tasks/range");
  }
}
