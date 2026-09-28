import type { Metadata } from "next";
import { TasksView } from "./tasks-view";

export const metadata: Metadata = {
  title: "Tasks",
  description: "Search, filter and sort every task.",
};

export default function TasksPage() {
  return <TasksView />;
}
