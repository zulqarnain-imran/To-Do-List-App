import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { getCategories, getTasks } from "@/lib/mongodb";
import { TASK_CAP } from "@/lib/constants";
import { serializeCategory, serializeTask } from "@/lib/serialize";
import { StoreProvider } from "@/components/store";
import { AppShell } from "@/components/AppShell";

export const dynamic = "force-dynamic";

/**
 * Authenticated layout.
 *
 * The session check lives here rather than in middleware because the session
 * lookup needs the MongoDB driver, and middleware runs on the Edge runtime.
 * One authoritative check at the top of the tree is also easier to reason about
 * than a cookie-presence fast path that could disagree with the real answer.
 *
 * The initial data is fetched here and handed to the store, so the first paint
 * is already complete: no client fetch waterfall, no loading spinner.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [categoryCollection, taskCollection] = await Promise.all([
    getCategories(),
    getTasks(),
  ]);

  // Independent reads, issued together: three operations for the whole page.
  const [categoryDocs, taskDocs] = await Promise.all([
    categoryCollection.find({ userId: user.id }).sort({ createdAt: 1 }).toArray(),
    taskCollection
      .find({ userId: user.id, isArchived: false })
      .sort({ createdAt: -1 })
      .limit(TASK_CAP)
      .toArray(),
  ]);

  return (
    <StoreProvider
      initial={{
        user,
        categories: categoryDocs.map(serializeCategory),
        tasks: taskDocs.map(serializeTask),
      }}
    >
      <AppShell>{children}</AppShell>
    </StoreProvider>
  );
}
