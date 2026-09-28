import type { Metadata } from "next";
import { CategoriesView } from "./categories-view";

export const metadata: Metadata = {
  title: "Categories",
  description: "Organise your tasks into categories.",
};

export default function CategoriesPage() {
  return <CategoriesView />;
}
