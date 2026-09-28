import type { Metadata } from "next";
import { TodayView } from "./today-view";

export const metadata: Metadata = {
  title: "Today",
  description: "Everything due today, and what slipped.",
};

export default function TodayPage() {
  return <TodayView />;
}
