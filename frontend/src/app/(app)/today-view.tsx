"use client";

import Link from "next/link";
import { Icon } from "@/components/Icon";
import { EmptyState, TaskList } from "@/components/TaskViews";
import { CategoryCards, ProgressRing, SectionHeading } from "@/components/Controls";
import { useStore } from "@/components/store";
import { isOverdue, sortTasks } from "@/lib/task-utils";

/**
 * Today.
 *
 * Deliberately does not expose the full filter bar: the home screen answers one
 * question, which is what needs doing now. Anything broader is one tap away on
 * the Tasks screen.
 */
export function TodayView() {
  const { state, stats, today, openComposer } = useStore();

  const open = state.tasks.filter((task) => task.status !== "done");
  const overdue = sortTasks(open.filter((task) => isOverdue(task, today)), "priority");
  const dueToday = sortTasks(
    open.filter((task) => task.dueDate === today),
    "priority",
  );
  const someday = sortTasks(
    open.filter((task) => !task.dueDate),
    "priority",
  );
  const doneToday = state.tasks.filter(
    (task) => task.status === "done" && task.completedAt?.slice(0, 10) === today,
  );

  const nothingToDo = overdue.length + dueToday.length + someday.length === 0;

  return (
    <div className="space-y-6">
      <div className="card flex items-center gap-4 p-4">
        <ProgressRing
          percent={stats.todayTotal ? Math.round((stats.todayCompleted / stats.todayTotal) * 100) : 0}
          label="today"
        />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            {stats.todayTotal === 0
              ? "Nothing scheduled for today"
              : `${stats.todayCompleted} of ${stats.todayTotal} done today`}
          </p>
          <p className="mt-0.5 text-sm text-muted">
            {stats.remaining} open · {stats.streak} day streak
            {stats.overdue > 0 && (
              <span className="font-medium text-danger"> · {stats.overdue} overdue</span>
            )}
          </p>
        </div>
        <Link href="/progress" className="btn btn-ghost shrink-0">
          <Icon name="chart" size={16} />
          <span className="hidden sm:inline">Progress</span>
        </Link>
      </div>

      <CategoryCards />

      {nothingToDo ? (
        <EmptyState
          title="Your day is clear"
          hint="Add a task, or take a look at what is coming up."
          action={
            <div className="flex gap-2">
              <button type="button" onClick={() => openComposer()} className="btn btn-primary">
                <Icon name="plus" size={16} /> Add a task
              </button>
              <Link href="/calendar" className="btn btn-ghost">
                <Icon name="calendar" size={16} /> Calendar
              </Link>
            </div>
          }
        />
      ) : (
        <div className="space-y-6">
          {overdue.length > 0 && (
            <section>
              <SectionHeading title="Overdue" count={overdue.length} />
              <TaskList tasks={overdue} />
            </section>
          )}

          <section>
            <SectionHeading
              title="Today"
              count={dueToday.length}
              action={
                <Link href="/tasks" className="btn btn-quiet text-sm">
                  All tasks
                </Link>
              }
            />
            {dueToday.length > 0 ? (
              <TaskList tasks={dueToday} />
            ) : (
              <p className="rounded-[14px] border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
                No tasks due today.
              </p>
            )}
          </section>

          {someday.length > 0 && (
            <section>
              <SectionHeading
                title="No date yet"
                count={someday.length}
                action={
                  <button type="button" onClick={() => openComposer()} className="btn btn-quiet text-sm">
                    <Icon name="plus" size={15} /> Add
                  </button>
                }
              />
              <TaskList tasks={someday} />
            </section>
          )}
        </div>
      )}

      {doneToday.length > 0 && (
        <section>
          <SectionHeading title="Completed today" count={doneToday.length} />
          <TaskList tasks={doneToday} />
        </section>
      )}
    </div>
  );
}
