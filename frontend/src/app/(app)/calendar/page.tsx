import type { Metadata } from "next";
import { CalendarView } from "./calendar-view";

export const metadata: Metadata = {
  title: "Calendar",
  description: "See your month, week and day at a glance.",
};

export default function CalendarPage() {
  return <CalendarView />;
}
