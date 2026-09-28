import { z } from "zod";

/* ------------------------------ auth ------------------------------ */

const password = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(200, "Password must be 200 characters or fewer");

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(60, "Name must be 60 characters or fewer"),
  email: z.email("Please enter a valid email address").max(200).toLowerCase(),
  password,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const loginSchema = z.object({
  email: z.email("Please enter a valid email address").max(200).toLowerCase(),
  password: z.string().min(1, "Password is required").max(200),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: password,
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from the current one",
    path: ["newPassword"],
  });

/* ------------------------------ tasks ----------------------------- */

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a YYYY-MM-DD date");

const timeString = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use a HH:MM time");

const tags = z
  .array(z.string().trim().min(1).max(24))
  .max(10, "A task can have at most 10 tags")
  .transform((list) => [...new Set(list.map((tag) => tag.toLowerCase()))]);

export const subtaskSchema = z.object({
  id: z.string().min(1).max(40),
  title: z.string().trim().min(1).max(140),
  completed: z.boolean(),
});

export const taskCreateSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(140),
  description: z.string().trim().max(2000).default(""),
  categoryId: z.string().max(40).nullable().default(null),
  // Deliberately no .default(): the create route has to be able to tell
  // "caller did not choose" apart from "caller chose medium", so it can fall
  // back to the account's settings.defaultPriority.
  priority: z.enum(["low", "medium", "high"]).optional(),
  status: z.enum(["todo", "done"]).default("todo"),
  dueDate: dateString.nullable().default(null),
  dueTime: timeString.nullable().default(null),
  reminder: timeString.nullable().default(null),
  tags: tags.default([]),
  subtasks: z.array(subtaskSchema).max(50).default([]),
  isImportant: z.boolean().default(false),
  recurrence: z
    .enum(["none", "daily", "weekly", "monthly", "yearly"])
    .default("none"),
});

/**
 * PATCH accepts any subset. Every key is optional, and an absent key is never
 * written, so partial updates cannot blank out fields.
 */
export const taskUpdateSchema = taskCreateSchema
  .partial()
  .extend({ isArchived: z.boolean().optional() });

/* --------------------------- categories --------------------------- */

export const categoryCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(30),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Use a #RRGGBB colour")
    .default("#7a5cfb"),
  icon: z.string().trim().min(1).max(24).default("Sparkle"),
});

export const categoryUpdateSchema = z.object({
  name: z.string().trim().min(1).max(30).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Use a #RRGGBB colour")
    .optional(),
  icon: z.string().trim().min(1).max(24).optional(),
});

/* ---------------------------- profile ----------------------------- */

export const profileUpdateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60).optional(),
  avatar: z
    .string()
    .trim()
    .max(500_000, "Image is too large")
    .refine(
      (value) =>
        value === "" || /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(value),
      "Avatar must be a base64 PNG, JPEG, WEBP or GIF image",
    )
    // null and "" are both accepted, because both mean "remove the photo".
    .nullable()
    .optional(),
});

export const settingsUpdateSchema = z.object({
  theme: z.enum(["light", "dark", "system"]).optional(),
  notifications: z.boolean().optional(),
  defaultPriority: z.enum(["low", "medium", "high"]).optional(),
  defaultCategory: z.string().max(40).nullable().optional(),
  weekStartsOn: z.union([z.literal(0), z.literal(1)]).optional(),
});

/* ----------------------------- types ------------------------------ */

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type TaskCreateInput = z.infer<typeof taskCreateSchema>;
export type TaskUpdateInput = z.infer<typeof taskUpdateSchema>;
export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type SettingsUpdateInput = z.infer<typeof settingsUpdateSchema>;

/** Flattens a ZodError into a single readable string for API responses. */
export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid request";
}
