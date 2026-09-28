import type { Category, Task } from "./types";

/**
 * Category identity, carried over from the original Figma design and matched
 * to the product spec: Design = coral pink, Meeting = turquoise green,
 * Learning = tangerine orange.
 *
 * Only a single `color` is stored per category. Every gradient in the UI is
 * derived from it with color-mix(), so a user-created category looks correct
 * with no extra columns and no client-side special casing.
 */
export interface DefaultCategory {
  name: string;
  color: string;
  icon: string;
}

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  { name: "Design", color: "#ff6489", icon: "PaintBrush" },
  { name: "Meeting", color: "#2bd2ab", icon: "GroupDiscussion" },
  { name: "Learning", color: "#f09819", icon: "MachineLearning" },
];

/** Offered in the category editor as a curated, on-brand palette. */
export const CATEGORY_PALETTE = [
  "#ff6489", // coral pink
  "#f09819", // tangerine
  "#2bd2ab", // turquoise
  "#7a5cfb", // brand purple
  "#3c8aff", // brand blue
  "#ea52f8", // magenta
  "#3aaa35", // green
  "#e8402a", // red
] as const;

/** Used as the initial pick in the category editor. */
export const DEFAULT_CATEGORY_COLOR = "#7a5cfb";

export const CATEGORY_ICONS = [
  "PaintBrush",
  "GroupDiscussion",
  "MachineLearning",
  "Sparkle",
  "Calendar",
  "Book",
  "Rocket",
  "Heart",
] as const;

export type CategoryIconName = (typeof CATEGORY_ICONS)[number];

const FALLBACK_COLOR = "#7a5cfb";

export function colorFor(task: Task, categories: Category[]): string {
  if (!task.categoryId) return FALLBACK_COLOR;
  return (
    categories.find((category) => category.id === task.categoryId)?.color ??
    FALLBACK_COLOR
  );
}

export function categoryFor(
  task: Task,
  categories: Category[],
): Category | null {
  if (!task.categoryId) return null;
  return categories.find((category) => category.id === task.categoryId) ?? null;
}

/** 135-degree brand gradient derived from the category's base colour. */
export function gradientFor(color: string): string {
  return `linear-gradient(135deg, ${color}, color-mix(in srgb, ${color} 52%, white))`;
}

/** Translucent tint used behind icons and badges. */
export function tintFor(color: string, percent = 24): string {
  return `color-mix(in srgb, ${color} ${percent}%, transparent)`;
}
