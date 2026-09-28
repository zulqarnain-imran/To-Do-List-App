import type { Metadata } from "next";
import { ProgressView } from "./progress-view";

export const metadata: Metadata = {
  title: "Progress",
  description: "Your completion rate, streak and category breakdown.",
};

export default function ProgressPage() {
  return <ProgressView />;
}
