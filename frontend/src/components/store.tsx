"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { apiFetch, ClientError, isOffline } from "@/lib/client";
import { computeStats } from "@/lib/task-utils";
import { todayKey } from "@/lib/date";
import type {
  Category,
  SessionUser,
  Settings,
  Task,
  UserStats,
} from "@/lib/types";
import type { Query } from "@/lib/task-utils";

/**
 * Application state.
 *
 * The server hands the first render a complete snapshot (see the (app) layout),
 * so the app paints fully populated with no client fetch waterfall. After that
 * the store owns the data and every mutation is applied locally first, then
 * reconciled with the API. A personal task list is small enough that shipping
 * the whole thing to the client and filtering there is cheaper than asking the
 * database again on every keystroke.
 */

interface State {
  user: SessionUser;
  categories: Category[];
  tasks: Task[];
  query: Query;
  composer: { open: boolean; editing: Task | null; prefill: Partial<TaskInput> | null };
  pending: Record<string, boolean>;
  offline: boolean;
  booted: boolean;
}

type Action =
  | { type: "query"; patch: Partial<Query> }
  | { type: "task/add"; task: Task }
  | { type: "task/replace"; task: Task }
  | { type: "task/remove"; id: string }
  | { type: "tasks/set"; tasks: Task[] }
  | { type: "category/add"; category: Category }
  | { type: "category/replace"; category: Category }
  | { type: "category/remove"; id: string }
  | { type: "composer"; open: boolean; editing?: Task | null; prefill?: Partial<TaskInput> | null }
  | { type: "user"; user: SessionUser }
  | { type: "pending"; id: string; value: boolean }
  | { type: "offline"; value: boolean }
  | { type: "booted" };

const DEFAULT_QUERY: Query = {
  filter: "today",
  search: "",
  categoryId: null,
  priority: null,
  tag: null,
  sort: "dueDate",
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "query":
      return { ...state, query: { ...state.query, ...action.patch } };

    case "task/add":
      return { ...state, tasks: [action.task, ...state.tasks] };

    case "task/replace":
      return {
        ...state,
        tasks: state.tasks.map((task) =>
          task.id === action.task.id ? action.task : task,
        ),
      };

    case "task/remove":
      return { ...state, tasks: state.tasks.filter((task) => task.id !== action.id) };

    case "tasks/set":
      return { ...state, tasks: action.tasks };

    case "category/add":
      return { ...state, categories: [...state.categories, action.category] };

    case "category/replace":
      return {
        ...state,
        categories: state.categories.map((category) =>
          category.id === action.category.id ? action.category : category,
        ),
      };

    case "category/remove":
      return {
        ...state,
        categories: state.categories.filter((category) => category.id !== action.id),
        // Detach locally too, so a task never keeps a dangling category id.
        tasks: state.tasks.map((task) =>
          task.categoryId === action.id ? { ...task, categoryId: null } : task,
        ),
      };

    case "composer":
      return {
        ...state,
        composer: {
          open: action.open,
          editing: action.editing ?? null,
          prefill: action.prefill ?? null,
        },
      };

    case "user":
      return { ...state, user: action.user };

    case "pending": {
      const pending = { ...state.pending };
      if (action.value) pending[action.id] = true;
      else delete pending[action.id];
      return { ...state, pending };
    }

    case "offline":
      return { ...state, offline: action.value };

    case "booted":
      return { ...state, booted: true };

    default:
      return state;
  }
}

export interface Toast {
  id: number;
  message: string;
  tone: "info" | "success" | "error";
}

interface StoreValue {
  state: State;
  stats: UserStats;
  today: string;
  toast: Toast | null;
  dismissToast: () => void;
  setQuery: (patch: Partial<Query>) => void;
  openComposer: (task?: Task, prefill?: Partial<TaskInput>) => void;
  closeComposer: () => void;
  createTask: (input: TaskInput) => Promise<void>;
  updateTask: (id: string, patch: Partial<TaskInput>) => Promise<void>;
  toggleTask: (task: Task) => Promise<void>;
  removeTask: (task: Task) => Promise<void>;
  archiveTask: (task: Task) => Promise<void>;
  duplicateTask: (task: Task) => Promise<void>;
  createCategory: (input: CategoryInput) => Promise<void>;
  updateCategory: (id: string, patch: Partial<CategoryInput>) => Promise<void>;
  removeCategory: (category: Category) => Promise<void>;
  updateProfile: (patch: { name?: string; avatar?: string | null }) => Promise<void>;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  reload: () => Promise<void>;
  signOut: () => Promise<void>;
}

export interface TaskInput {
  title: string;
  description?: string;
  categoryId?: string | null;
  priority?: Task["priority"];
  status?: Task["status"];
  dueDate?: string | null;
  dueTime?: string | null;
  reminder?: string | null;
  tags?: string[];
  subtasks?: Task["subtasks"];
  isImportant?: boolean;
  recurrence?: Task["recurrence"];
}

export interface CategoryInput {
  name: string;
  color?: string;
  icon?: string;
}

const StoreContext = createContext<StoreValue | null>(null);

export function useStore(): StoreValue {
  const value = useContext(StoreContext);
  if (!value) throw new Error("useStore must be used inside <StoreProvider>");
  return value;
}

export function StoreProvider({
  initial,
  children,
}: {
  initial: { user: SessionUser; categories: Category[]; tasks: Task[] };
  children: ReactNode;
}) {
  const [state, dispatch] = useReducer(reducer, {
    user: initial.user,
    categories: initial.categories,
    tasks: initial.tasks,
    query: DEFAULT_QUERY,
    composer: { open: false, editing: null, prefill: null },
    pending: {},
    offline: false,
    booted: true,
  });

  const [toast, setToast] = useState<Toast | null>(null);
  const toastId = useRef(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep "today" honest: a tab left open overnight must roll over without a
  // reload, or the Today page would quietly go stale.
  const [today, setToday] = useState(todayKey);
  useEffect(() => {
    const tick = () => setToday(todayKey());
    const interval = setInterval(tick, 60_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);

  useEffect(() => {
    const update = () => dispatch({ type: "offline", value: isOffline() });
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  const notify = useCallback((message: string, tone: Toast["tone"] = "info") => {
    toastId.current += 1;
    setToast({ id: toastId.current, message, tone });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3800);
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  const stats = useMemo(() => computeStats(state.tasks, today), [state.tasks, today]);

  const setQuery = useCallback((patch: Partial<Query>) => {
    dispatch({ type: "query", patch });
  }, []);

  const openComposer = useCallback((task?: Task, prefill?: Partial<TaskInput>) => {
    dispatch({ type: "composer", open: true, editing: task ?? null, prefill: prefill ?? null });
  }, []);

  const closeComposer = useCallback(() => {
    dispatch({ type: "composer", open: false, editing: null, prefill: null });
  }, []);

  /**
   * Runs a mutation optimistically. The local change is applied first so the UI
   * responds instantly; if the request fails the snapshot is restored and the
   * reason is surfaced, because silently dropping an edit is worse than a
   * visible error.
   */
  const optimistic = useCallback(
    async <T,>(
      key: string,
      apply: () => void,
      revert: () => void,
      request: () => Promise<T>,
      onDone?: (result: T) => void,
      successMessage?: string,
    ) => {
      apply();
      dispatch({ type: "pending", id: key, value: true });
      try {
        const result = await request();
        onDone?.(result);
        if (successMessage) notify(successMessage, "success");
      } catch (error) {
        revert();
        notify(
          error instanceof ClientError || error instanceof Error
            ? error.message
            : "Something went wrong",
          "error",
        );
        throw error;
      } finally {
        dispatch({ type: "pending", id: key, value: false });
      }
    },
    [notify],
  );

  const createTask = useCallback(
    async (input: TaskInput) => {
      await optimistic(
        "create",
        () => {},
        () => {},
        async () => {
          const { task } = await apiFetch<{ task: Task }>("/api/tasks", {
            method: "POST",
            json: input,
          });
          dispatch({ type: "task/add", task });
        },
        undefined,
        "Task added",
      );
      closeComposer();
    },
    [optimistic, closeComposer],
  );

  const updateTask = useCallback(
    async (id: string, patch: Partial<TaskInput>) => {
      const before = state.tasks.find((task) => task.id === id);
      if (!before) return;

      await optimistic(
        `task:${id}`,
        () => dispatch({ type: "task/replace", task: { ...before, ...patch } as Task }),
        () => dispatch({ type: "task/replace", task: before }),
        async () => {
          const result = await apiFetch<{ task: Task; spawned: Task | null }>(
            `/api/tasks/${id}`,
            { method: "PATCH", json: patch },
          );
          dispatch({ type: "task/replace", task: result.task });
          if (result.spawned) dispatch({ type: "task/add", task: result.spawned });
        },
        undefined,
        "Task updated",
      );
      closeComposer();
    },
    [state.tasks, optimistic, closeComposer],
  );

  const toggleTask = useCallback(
    async (task: Task) => {
      const next = task.status === "done" ? "todo" : "done";
      const optimisticTask: Task = {
        ...task,
        status: next,
        completedAt: next === "done" ? new Date().toISOString() : null,
      };

      await optimistic(
        `task:${task.id}`,
        () => dispatch({ type: "task/replace", task: optimisticTask }),
        () => dispatch({ type: "task/replace", task }),
        async () => {
          const result = await apiFetch<{ task: Task; spawned: Task | null }>(
            `/api/tasks/${task.id}`,
            { method: "PATCH", json: { status: next } },
          );
          dispatch({ type: "task/replace", task: result.task });
          if (result.spawned) dispatch({ type: "task/add", task: result.spawned });
        },
        undefined,
        next === "done" ? "Nice work" : "Moved back to your list",
      );
    },
    [optimistic],
  );

  const removeTask = useCallback(
    async (task: Task) => {
      await optimistic(
        `task:${task.id}`,
        () => dispatch({ type: "task/remove", id: task.id }),
        () => dispatch({ type: "task/add", task }),
        () => apiFetch(`/api/tasks/${task.id}`, { method: "DELETE" }),
        undefined,
        "Task deleted",
      );
    },
    [optimistic],
  );

  const archiveTask = useCallback(
    async (task: Task) => {
      await optimistic(
        `task:${task.id}`,
        () => dispatch({ type: "task/remove", id: task.id }),
        () => dispatch({ type: "task/add", task }),
        () => apiFetch(`/api/tasks/${task.id}?archive=1`, { method: "DELETE" }),
        undefined,
        "Task archived",
      );
    },
    [optimistic],
  );

  const duplicateTask = useCallback(
    async (task: Task) => {
      const copy = await apiFetch<{ task: Task }>("/api/tasks", {
        method: "POST",
        json: {
          title: task.title,
          description: task.description,
          categoryId: task.categoryId,
          priority: task.priority,
          dueDate: task.dueDate,
          dueTime: task.dueTime,
          tags: task.tags,
          subtasks: task.subtasks.map((sub) => ({ ...sub, id: crypto.randomUUID(), completed: false })),
          isImportant: task.isImportant,
          recurrence: task.recurrence,
          status: "todo",
        },
      });
      dispatch({ type: "task/add", task: copy.task });
      notify("Task duplicated", "success");
    },
    [notify],
  );

  const createCategory = useCallback(
    async (input: CategoryInput) => {
      const { category } = await apiFetch<{ category: Category }>("/api/categories", {
        method: "POST",
        json: input,
      });
      dispatch({ type: "category/add", category });
      notify("Category created", "success");
    },
    [notify],
  );

  const updateCategory = useCallback(
    async (id: string, patch: Partial<CategoryInput>) => {
      const before = state.categories.find((category) => category.id === id);
      if (!before) return;
      await optimistic(
        `category:${id}`,
        () =>
          dispatch({
            type: "category/replace",
            category: { ...before, ...patch } as Category,
          }),
        () => dispatch({ type: "category/replace", category: before }),
        async () => {
          const { category } = await apiFetch<{ category: Category }>(
            `/api/categories/${id}`,
            { method: "PATCH", json: patch },
          );
          dispatch({ type: "category/replace", category });
        },
      );
    },
    [state.categories, optimistic],
  );

  const removeCategory = useCallback(
    async (category: Category) => {
      await optimistic(
        `category:${category.id}`,
        () => dispatch({ type: "category/remove", id: category.id }),
        () => dispatch({ type: "category/add", category }),
        () => apiFetch(`/api/categories/${category.id}`, { method: "DELETE" }),
        undefined,
        "Category deleted",
      );
    },
    [optimistic],
  );

  const updateProfile = useCallback(
    async (patch: { name?: string; avatar?: string | null }) => {
      const before = state.user;
      await optimistic(
        "profile",
        () => dispatch({ type: "user", user: { ...before, ...patch } }),
        () => dispatch({ type: "user", user: before }),
        async () => {
          const { profile } = await apiFetch<{ profile: SessionUser }>("/api/profile", {
            method: "PATCH",
            json: patch,
          });
          dispatch({ type: "user", user: profile });
        },
        undefined,
        "Profile saved",
      );
    },
    [state.user, optimistic],
  );

  const updateSettings = useCallback(
    async (patch: Partial<Settings>) => {
      const before = state.user.settings;
      await optimistic(
        "settings",
        () =>
          dispatch({
            type: "user",
            user: { ...state.user, settings: { ...before, ...patch } },
          }),
        () =>
          dispatch({
            type: "user",
            user: { ...state.user, settings: before },
          }),
        async () => {
          const { settings } = await apiFetch<{ settings: Settings }>("/api/settings", {
            method: "PATCH",
            json: patch,
          });
          dispatch({ type: "user", user: { ...state.user, settings } });
        },
      );
    },
    [state.user, optimistic],
  );

  const reload = useCallback(async () => {
    const data = await apiFetch<{ tasks: Task[]; categories: Category[] }>("/api/bootstrap");
    dispatch({ type: "tasks/set", tasks: data.tasks });
    for (const category of data.categories) {
      dispatch({ type: "category/replace", category });
    }
  }, []);

  const signOut = useCallback(async () => {
    await apiFetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }, []);

  const value = useMemo<StoreValue>(
    () => ({
      state,
      stats,
      today,
      toast,
      dismissToast,
      setQuery,
      openComposer,
      closeComposer,
      createTask,
      updateTask,
      toggleTask,
      removeTask,
      archiveTask,
      duplicateTask,
      createCategory,
      updateCategory,
      removeCategory,
      updateProfile,
      updateSettings,
      reload,
      signOut,
    }),
    [
      state, stats, today, toast, dismissToast, setQuery, openComposer, closeComposer,
      createTask, updateTask, toggleTask, removeTask, archiveTask, duplicateTask,
      createCategory, updateCategory, removeCategory, updateProfile, updateSettings,
      reload, signOut,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
