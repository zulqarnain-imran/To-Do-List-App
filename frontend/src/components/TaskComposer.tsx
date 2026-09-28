"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import { useStore, type TaskInput } from "./store";
import { gradientFor } from "@/lib/categories";
import { todayKey } from "@/lib/date";
import type { Priority, Recurrence, Task } from "@/lib/types";

const PRIORITIES: Priority[] = ["low", "medium", "high"];
const RECURRENCES: { value: Recurrence; label: string }[] = [
  { value: "none", label: "Never" },
  { value: "daily", label: "Every day" },
  { value: "weekly", label: "Every week" },
  { value: "monthly", label: "Every month" },
  { value: "yearly", label: "Every year" },
];

/**
 * Create / edit sheet.
 *
 * One component serves both cases. When `editing` is set it pre-fills from the
 * task and offers delete, which keeps the form definition in one place instead
 * of two near-identical dialogs drifting apart.
 */
export function TaskComposer() {
  const { state, closeComposer, createTask, updateTask, removeTask } = useStore();
  const editing = state.composer.editing;
  const prefill = state.composer.prefill;
  const isOpen = state.composer.open;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [recurrence, setRecurrence] = useState<Recurrence>("none");
  const [tags, setTags] = useState("");
  const [isImportant, setIsImportant] = useState(false);
  const [subtasks, setSubtasks] = useState<Task["subtasks"]>([]);
  const [newSubtask, setNewSubtask] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const titleRef = useRef<HTMLInputElement>(null);

  // Re-seed the form each time the sheet opens, so it never shows the last
  // task's values.
  useEffect(() => {
    if (!isOpen) return;
    setTitle(editing?.title ?? "");
    setDescription(editing?.description ?? "");
    setCategoryId(
      editing?.categoryId ?? prefill?.categoryId ?? state.user.settings.defaultCategory ?? "",
    );
    setPriority(
      editing?.priority ?? prefill?.priority ?? state.user.settings.defaultPriority,
    );
    setDueDate(editing?.dueDate ?? prefill?.dueDate ?? "");
    setDueTime(editing?.dueTime ?? prefill?.dueTime ?? "");
    setRecurrence(editing?.recurrence ?? prefill?.recurrence ?? "none");
    setTags(editing?.tags.join(", ") ?? "");
    setIsImportant(editing?.isImportant ?? false);
    setSubtasks(editing?.subtasks ?? []);
    setNewSubtask("");
    setError(null);
    setBusy(false);
    // Focus lands on the title, which is what the user came here to type.
    const timer = setTimeout(() => titleRef.current?.focus(), 60);
    return () => clearTimeout(timer);
  }, [isOpen, editing, prefill, state.user.settings]);

  // Escape closes, and the page behind must not scroll while the sheet is up.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeComposer();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [isOpen, closeComposer]);

  if (!isOpen) return null;

  function addSubtask() {
    const value = newSubtask.trim();
    if (!value) return;
    setSubtasks((current) => [
      ...current,
      { id: crypto.randomUUID(), title: value, completed: false },
    ]);
    setNewSubtask("");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;

    if (!title.trim()) {
      setError("Give the task a title");
      titleRef.current?.focus();
      return;
    }

    const payload: TaskInput = {
      title: title.trim(),
      description: description.trim(),
      categoryId: categoryId || null,
      priority,
      // Dates are interpreted as calendar days, so send null rather than "".
      dueDate: dueDate || null,
      dueTime: dueTime || null,
      recurrence,
      tags: tags
        .split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 10),
      subtasks,
      isImportant,
    };

    setBusy(true);
    setError(null);
    try {
      if (editing) await updateTask(editing.id, payload);
      else await createTask(payload);
    } catch {
      setError("Could not save. Check your connection and try again.");
      setBusy(false);
    }
  }

  async function destroy() {
    if (!editing || busy) return;
    if (!window.confirm("Delete this task? This cannot be undone.")) return;
    setBusy(true);
    try {
      await removeTask(editing);
      closeComposer();
    } catch {
      setError("Could not delete. Check your connection and try again.");
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="composer-title"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={closeComposer}
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
      />

      <div className="animate-float-in relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[26px] bg-surface shadow-2xl sm:rounded-[26px]">
        <div className="sheet-handle mx-auto mt-3 shrink-0 opacity-40 sm:hidden" />

        <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3">
          <h2 id="composer-title" className="text-lg font-bold">
            {editing ? "Edit task" : "New task"}
          </h2>
          <button
            type="button"
            onClick={closeComposer}
            aria-label="Close"
            className="btn btn-quiet"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <form
          onSubmit={submit}
          className="sheet-scroll flex-1 space-y-4 overflow-y-auto px-5 pb-4"
        >
          <div>
            <label htmlFor="task-title" className="sr-only">
              Title
            </label>
            <input
              id="task-title"
              ref={titleRef}
              className="field text-base font-medium"
              placeholder="What needs doing?"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={140}
            />
          </div>

          <div>
            <label htmlFor="task-description" className="sr-only">
              Notes
            </label>
            <textarea
              id="task-description"
              className="field min-h-[76px] resize-y"
              placeholder="Add notes, links or context (optional)"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={2000}
              rows={3}
            />
          </div>

          <fieldset>
            <legend className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">
              Category
            </legend>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCategoryId("")}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  categoryId === ""
                    ? "bg-brand-purple text-white"
                    : "bg-sunken text-muted"
                }`}
              >
                None
              </button>
              {state.categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setCategoryId(category.id)}
                  className={`flex items-center gap-1.5 rounded-full py-1.5 pr-3 pl-2 text-sm font-medium transition-all ${
                    categoryId === category.id
                      ? "text-white ring-2"
                      : "bg-sunken text-muted"
                  }`}
                  style={
                    categoryId === category.id
                      ? { background: gradientFor(category.color), boxShadow: `0 0 0 2px ${category.color}` }
                      : undefined
                  }
                >
                  <Icon name={category.icon} size={15} />
                  {category.name}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="task-priority" className="mb-1.5 block text-xs font-semibold tracking-wide text-muted uppercase">
                Priority
              </label>
              <select
                id="task-priority"
                className="field"
                value={priority}
                onChange={(event) => setPriority(event.target.value as Priority)}
              >
                {PRIORITIES.map((value) => (
                  <option key={value} value={value} className="capitalize">
                    {value}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="task-recurrence" className="mb-1.5 block text-xs font-semibold tracking-wide text-muted uppercase">
                Repeat
              </label>
              <select
                id="task-recurrence"
                className="field"
                value={recurrence}
                onChange={(event) => setRecurrence(event.target.value as Recurrence)}
              >
                {RECURRENCES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="task-due" className="mb-1.5 block text-xs font-semibold tracking-wide text-muted uppercase">
                Due date
              </label>
              <input
                id="task-due"
                type="date"
                className="field"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />
            </div>
            <div>
              <label htmlFor="task-time" className="mb-1.5 block text-xs font-semibold tracking-wide text-muted uppercase">
                Time
              </label>
              <input
                id="task-time"
                type="time"
                className="field"
                value={dueTime}
                disabled={!dueDate}
                onChange={(event) => setDueTime(event.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setDueDate(todayKey())}
              className="btn btn-ghost"
            >
              <Icon name="calendar" size={15} /> Today
            </button>
            <button
              type="button"
              onClick={() => setDueDate("")}
              className="btn btn-ghost"
            >
              Clear date
            </button>
            <button
              type="button"
              onClick={() => setIsImportant((value) => !value)}
              aria-pressed={isImportant}
              className={`btn ${isImportant ? "btn-primary" : "btn-ghost"}`}
            >
              <Icon name="flag" size={15} /> Important
            </button>
          </div>

          <div>
            <label htmlFor="task-tags" className="mb-1.5 block text-xs font-semibold tracking-wide text-muted uppercase">
              Tags
            </label>
            <input
              id="task-tags"
              className="field"
              placeholder="work, deep-work (comma separated)"
              value={tags}
              onChange={(event) => setTags(event.target.value)}
            />
          </div>

          <fieldset>
            <legend className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">
              Subtasks
            </legend>
            {subtasks.length > 0 && (
              <ul className="mb-2 space-y-1.5">
                {subtasks.map((subtask, index) => (
                  <li key={subtask.id} className="flex items-center gap-2 rounded-[10px] bg-sunken px-3 py-2">
                    <input
                      type="checkbox"
                      checked={subtask.completed}
                      onChange={(event) =>
                        setSubtasks((current) =>
                          current.map((item, i) =>
                            i === index ? { ...item, completed: event.target.checked } : item,
                          ),
                        )
                      }
                      className="h-4 w-4 accent-[var(--accent)]"
                    />
                    <span
                      className={`flex-1 text-sm ${
                        subtask.completed ? "text-faint line-through" : ""
                      }`}
                    >
                      {subtask.title}
                    </span>
                    <button
                      type="button"
                      aria-label={`Remove ${subtask.title}`}
                      onClick={() =>
                        setSubtasks((current) => current.filter((_, i) => i !== index))
                      }
                      className="text-faint transition-colors hover:text-danger"
                    >
                      <Icon name="close" size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-2">
              <input
                className="field"
                placeholder="Add a step"
                value={newSubtask}
                onChange={(event) => setNewSubtask(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addSubtask();
                  }
                }}
                maxLength={140}
              />
              <button
                type="button"
                onClick={addSubtask}
                className="btn btn-ghost shrink-0"
                aria-label="Add step"
              >
                <Icon name="plus" size={16} />
              </button>
            </div>
          </fieldset>

          {error && (
            <p role="alert" className="flex items-center gap-2 text-sm font-medium text-danger">
              <Icon name="warning" size={16} />
              {error}
            </p>
          )}
        </form>

        <div className="flex shrink-0 items-center gap-2 border-t border-line px-5 py-4">
          {editing && (
            <button
              type="button"
              onClick={destroy}
              disabled={busy}
              className="btn btn-danger"
            >
              <Icon name="trash" size={16} /> Delete
            </button>
          )}
          <div className="flex-1" />
          <button
            type="button"
            onClick={closeComposer}
            disabled={busy}
            className="btn btn-ghost"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={submit}
            disabled={busy}
            className="btn btn-primary"
          >
            {busy ? "Saving…" : editing ? "Save changes" : "Add task"}
          </button>
        </div>
      </div>
    </div>
  );
}
