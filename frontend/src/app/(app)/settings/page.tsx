import type { Metadata } from "next";
import { SettingsView } from "./settings-view";

export const metadata: Metadata = {
  title: "Settings",
  description: "Appearance, reminders and defaults.",
};

export default function SettingsPage() {
  return <SettingsView />;
}
