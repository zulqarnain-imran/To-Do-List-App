"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { useStore } from "@/components/store";
import {
  CATEGORY_ICONS,
  CATEGORY_PALETTE,
  DEFAULT_CATEGORY_COLOR,
  gradientFor,
  tintFor,
} from "@/lib/categories";
import type { Category } from "@/lib/types";

export function CategoriesView() {
  const { state, createCategory, updateCategory, removeCategory, setQuery } = useStore();
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(DEFAULT_CATEGORY_COLOR);
  const [icon, setIcon] = useState<string>("Sparkle");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (!name.trim()) {
      setError("Give the category a name");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createCategory({ name: name.trim(), color, icon });
      setName("");
      setCreating(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create category");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Categories</h1>
          <p className="mt-0.5 text-sm text-muted">
            {state.categories.length} in total
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating((value) => !value)}
          className="btn btn-primary"
        >
          <Icon name="plus" size={16} />
          New
        </button>
      </div>

      {creating && (
        <form onSubmit={submit} className="card animate-rise space-y-4 p-4">
          <div>
            <label htmlFor="category-name" className="mb-1.5 block text-xs font-semibold tracking-wide text-muted uppercase">
              Name
            </label>
            <input
              id="category-name"
              className="field"
              placeholder="Deep work"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={30}
              autoFocus
            />
          </div>

          <div>
            <p className="mb-1.5 text-xs font-semibold tracking-wide text-muted uppercase">
              Colour
            </p>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_PALETTE.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  onClick={() => setColor(swatch)}
                  aria-label={`Colour ${swatch}`}
                  aria-pressed={color === swatch}
                  className="h-8 w-8 rounded-full ring-offset-2 ring-offset-[var(--surface)] transition-transform"
                  style={{
                    background: swatch,
                    boxShadow: color === swatch ? `0 0 0 2px var(--surface), 0 0 0 4px ${swatch}` : undefined,
                  }}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-semibold tracking-wide text-muted uppercase">
              Icon
            </p>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_ICONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setIcon(option)}
                  aria-label={option}
                  aria-pressed={icon === option}
                  className={`grid h-9 w-9 place-items-center rounded-[10px] transition-colors ${
                    icon === option ? "text-white" : "bg-sunken text-muted"
                  }`}
                  style={icon === option ? { background: gradientFor(color) } : undefined}
                >
                  <Icon name={option} size={17} />
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p role="alert" className="text-sm font-medium text-danger">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <button type="submit" disabled={busy} className="btn btn-primary">
              {busy ? "Creating…" : "Create category"}
            </button>
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="btn btn-ghost"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <ul className="grid gap-2.5 sm:grid-cols-2">
        {state.categories.map((category) => (
          <CategoryCard
            key={category.id}
            category={category}
            taskCount={
              state.tasks.filter((task) => task.categoryId === category.id).length
            }
            onRename={(next) => void updateCategory(category.id, { name: next })}
            onRecolor={(next) => void updateCategory(category.id, { color: next })}
            onDelete={() => {
              if (
                window.confirm(
                  `Delete "${category.name}"? Its tasks will be kept and become uncategorised.`,
                )
              ) {
                void removeCategory(category);
              }
            }}
            onView={() => {
              setQuery({ categoryId: category.id, filter: "all" });
              router.push("/tasks");
            }}
          />
        ))}
      </ul>
    </div>
  );
}

function CategoryCard({
  category,
  taskCount,
  onRename,
  onRecolor,
  onDelete,
  onView,
}: {
  category: Category;
  taskCount: number;
  onRename: (name: string) => void;
  onRecolor: (color: string) => void;
  onDelete: () => void;
  onView: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);

  return (
    <li className="card overflow-hidden">
      <div
        className="flex items-center gap-3 p-3.5"
        style={{ background: tintFor(category.color, 12) }}
      >
        <span
          className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] text-white"
          style={{ background: gradientFor(category.color) }}
        >
          <Icon name={category.icon} size={20} />
        </span>

        <div className="min-w-0 flex-1">
          {editing ? (
            <input
              className="field py-1.5"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={30}
              autoFocus
              onKeyDown={(event) => {
                if (event.key === "Enter" && name.trim()) {
                  onRename(name.trim());
                  setEditing(false);
                }
                if (event.key === "Escape") setEditing(false);
              }}
            />
          ) : (
            <>
              <p className="truncate font-semibold">{category.name}</p>
              <p className="text-xs text-muted">
                {taskCount} {taskCount === 1 ? "task" : "tasks"}
                {category.isDefault && " · built in"}
              </p>
            </>
          )}
        </div>

        <div className="flex shrink-0 gap-0.5">
          <button
            type="button"
            onClick={onView}
            aria-label={`View ${category.name} tasks`}
            className="btn btn-quiet"
          >
            <Icon name="chevron-right" size={16} />
          </button>
          <button
            type="button"
            onClick={() => {
              if (editing) {
                const trimmed = name.trim();
                if (trimmed && trimmed !== category.name) onRename(trimmed);
                setEditing(false);
              } else {
                setName(category.name);
                setEditing(true);
              }
            }}
            aria-label={`Rename ${category.name}`}
            className="btn btn-quiet"
          >
            <Icon name="pencil" size={16} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label={`Delete ${category.name}`}
            className="btn btn-quiet text-danger"
          >
            <Icon name="trash" size={16} />
          </button>
        </div>
      </div>

      {!editing && (
        <div className="flex flex-wrap gap-1.5 p-3">
          {CATEGORY_PALETTE.map((swatch) => (
            <button
              key={swatch}
              type="button"
              onClick={() => onRecolor(swatch)}
              aria-label={`Recolour ${category.name} ${swatch}`}
              className="h-6 w-6 rounded-full transition-transform hover:scale-110"
              style={{
                background: swatch,
                boxShadow: category.color === swatch ? `0 0 0 2px var(--surface), 0 0 0 3px ${swatch}` : undefined,
              }}
            />
          ))}
        </div>
      )}
    </li>
  );
}
