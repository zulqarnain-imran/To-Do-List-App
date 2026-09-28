import type { MetadataRoute } from "next";

/**
 * PWA manifest.
 *
 * Served from the app router so it always matches the current build. Standalone
 * display plus maskable icons are what make the app installable on Android;
 * the maskable icon is inset further so the launcher can crop it to any shape.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Luma Tasks — plan, track and finish",
    short_name: "Luma Tasks",
    description:
      "Plan your day, organise work, meetings and learning, and see your progress in one calm place.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#7a5cfb",
    theme_color: "#7a5cfb",
    categories: ["productivity", "utilities"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "Today", url: "/", description: "Tasks due today" },
      { name: "Calendar", url: "/calendar", description: "See your schedule" },
      { name: "Add task", url: "/?new=1", description: "Create a task" },
    ],
  };
}
