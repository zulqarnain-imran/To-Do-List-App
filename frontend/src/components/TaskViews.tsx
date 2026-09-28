"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import { useStore } from "./store";
import { categoryFor, gradientFor, tintFor } from "@/lib/categories";
import { humanDue } from "@/lib/date";
import { isOverdue } from "@/lib/task-utils";
import type { Task } from "@/lib/types";

const PRIORITY_MARK = {
  high: { className: "text-danger", icon: "flag" },
  medium: { className: "text-[#fb6617]", icon: "flag" },
  low: { className: "text-muted", icon: "flag" },
} as const;

function RowMenu({ task }: { task: Task }) {
  const { openComposer, duplicateTask, archiveTask, removeTask } = useStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        aria-label={`Actions for ${task.title}`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="btn btn-quiet"
      >
        <Icon name="sliders" size={17} />
      </button>

      {open && (
        <div
          role="menu"
          className="animate-rise absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-[14px] border border-line bg-raised py-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              openComposer(task);
            }}
            className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm transition-colors hover:bg-sunken"
          >
            <Icon name="pencil" size={16} /> Edit
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              void duplicateTask(task);
            }}
            className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm transition-colors hover:bg-sunken"
          >
            <Icon name="copy" size={16} /> Duplicate
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              void archiveTask(task);
            }}
            className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm transition-colors hover:bg-sunken"
          >
            <Icon name="archive" size={16} /> Archive
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              if (window.confirm("Delete this task? This cannot be undone.")) {
                void removeTask(task);
              }
            }}
            className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-danger transition-colors hover:bg-danger/8"
          >
            <Icon name="trash" size={16} /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

export function TaskRow({ task }: { task: Task }) {
  const { state, today, toggleTask, openComposer } = useStore();
  const category = categoryFor(task, state.categories);
  const done = task.status === "done";
  const overdue = isOverdue(task, today);
  const priority = PRIORITY_MARK[task.priority];
  const steps = task.subtasks.length;
  const stepsDone = task.subtasks.filter((step) => step.completed).length;

  return (
    <li
      className={`card animate-rise flex items-start gap-3 p-3 transition-opacity ${
        done ? "opacity-60" : ""
      }`}
    >
      <button
        type="button"
        onClick={() => void toggleTask(task)}
        aria-pressed={done}
        aria-label={done ? `Mark ${task.title} as not done` : `Mark ${task.title} as done`}
        className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition-all"
        style={
          done
            ? {
                background: category ? gradientFor(category.color) : "var(--accent)",
                borderColor: category ? category.color : "var(--accent)",
                color: "#fff",
              }
            : { borderColor: category?.color ?? "var(--line)" }
        }
      >
        {done && <Icon name="check" size={14} />}
      </button>

      <button
        type="button"
        onClick={() => openComposer(task)}
        className="min-w-0 flex-1 text-left"
      >
        <p
          className={`text-[15px] leading-snug font-medium ${
            done ? "text-faint line-through" : ""
          }`}
        >
          {task.title}
        </p>

        {task.description && (
          <p className="mt-0.5 line-clamp-2 text-[13px] text-muted">
            {task.description}
          </p>
        )}

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
          {category && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium"
              style={{ background: tintFor(category.color, 16), color: category.color }}
            >
              <Icon name={category.icon} size={12} />
              {category.name}
            </span>
          )}

          {task.dueDate && (
            <span
              className={`inline-flex items-center gap-1 ${
                overdue ? "font-semibold text-danger" : "text-muted"
              }`}
            >
              <Icon name={overdue ? "warning" : "clock"} size={12} />
              {humanDue(task.dueDate, task.status)}
              {task.dueTime && !overdue && !done && ` · ${task.dueTime}`}
            </span>
          )}

          {task.isImportant && !done && (
            <span className="inline-flex items-center gap-1 font-medium text-danger">
              <Icon name="flag" size={12} />
              Important
            </span>
          )}

          {!done && task.priority !== "medium" && (
            <span
              className={`inline-flex items-center gap-1 ${priority.className}`}
            >
              <Icon name={priority.icon} size={12} />
              {task.priority}
            </span>
          )}

          {steps > 0 && (
            <span className="inline-flex items-center gap-1 text-muted">
              <Icon name="check" size={12} />
              {stepsDone}/{steps}
            </span>
          )}

          {task.recurrence !== "none" && (
            <span className="inline-flex items-center gap-1 text-muted">
              <Icon name="refresh" size={12} />
              {task.recurrence}
            </span>
          )}

          {task.tags.map((tag) => (
            <span key={tag} className="text-faint">
              #{tag}
            </span>
          ))}
        </div>
      </button>

      <RowMenu task={task} />
    </li>
  );
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[16px] border border-dashed border-line px-6 py-12 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-sunken text-faint">
        <Icon name="inbox" size={26} />
      </span>
      <div>
        <p className="font-semibold">{title}</p>
        {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
      </div>
      {action}
    </div>
  );
}

export function TaskList({
  tasks,
  empty,
}: {
  tasks: Task[];
  empty?: React.ReactNode;
}) {
  if (tasks.length === 0) {
    return (
      <>
        {empty ?? (
          <EmptyState
            title="Nothing here yet"
            hint="Tasks you add will show up in this list."
          />
        )}
      </>
    );
  }

  return (
    <ul className="space-y-2.5">
      {tasks.map((task) => (
        <TaskRow key={task.id} task={task} />
      ))}
    </ul>
  );
}
