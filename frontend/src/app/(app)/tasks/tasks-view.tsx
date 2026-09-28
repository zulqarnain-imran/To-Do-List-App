"use client";

import { EmptyState, TaskList } from "@/components/TaskViews";
import { FilterBar, SectionHeading } from "@/components/Controls";
import { useStore } from "@/components/store";
import { selectTasks } from "@/lib/task-utils";
import type { TaskFilter } from "@/lib/types";

/**
 * Keyed by TaskFilter so the compiler requires an entry for every filter, and
 * a lookup can never come back undefined.
 */
const HEADINGS: Record<TaskFilter, string> = {
  all: "All tasks",
  today: "Due today",
  upcoming: "Upcoming",
  overdue: "Overdue",
  important: "Important",
  completed: "Completed",
  archived: "Archived",
};

const EMPTY_COPY: Record<TaskFilter, { title: string; hint: string }> = {
  all: {
    title: "No tasks yet",
    hint: "Tap the + button to add your first task.",
  },
  today: { title: "Nothing due today", hint: "Enjoy the quiet, or plan ahead." },
  upcoming: { title: "Nothing upcoming", hint: "Give a task a future date to see it here." },
  overdue: { title: "Nothing overdue", hint: "You are completely up to date." },
  important: { title: "No important tasks", hint: "Mark a task important to pin it here." },
  completed: { title: "Nothing completed yet", hint: "Finished work will collect here." },
  archived: { title: "Archive is empty", hint: "Archived tasks are kept out of the way here." },
};

export function TasksView() {
  const { state, stats, today } = useStore();
  const { query } = state;

  const visible = selectTasks(state.tasks, query, today);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">Tasks</h1>
        <p className="mt-0.5 text-sm text-muted">
          {stats.remaining} open · {stats.completed} completed
        </p>
      </div>

      <FilterBar />

      <section>
        <SectionHeading title={HEADINGS[query.filter]} count={visible.length} />
        <TaskList
          tasks={visible}
          empty={
            <EmptyState
              title={EMPTY_COPY[query.filter].title}
              hint={EMPTY_COPY[query.filter].hint}
            />
          }
        />
      </section>

      {state.tasks.length === 0 && (
        <p className="text-center text-xs text-faint">
          Searching and filtering run on this device, so results are instant.
        </p>
      )}
    </div>
  );
}
