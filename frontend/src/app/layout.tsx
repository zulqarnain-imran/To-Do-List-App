import { Inter } from "next/font/google";
import type { Metadata, Viewport } from "next";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Luma Tasks — plan, track and finish",
    template: "%s · Luma Tasks",
  },
  description:
    "Plan your day, organise work, meetings and learning, and see your progress in one calm place.",
  applicationName: "Luma Tasks",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Luma Tasks",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icon-192.png", sizes: "192x192" }],
  },
  other: { "mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // The shell manages its own scrolling, so the page itself should not bounce
  // on overscroll. Maximum scale is deliberately left enabled; blocking zoom
  // breaks accessibility.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#7a5cfb" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b10" },
  ],
};

/**
 * Applies the stored theme before first paint.
 *
 * Rendered in <head> and synchronous on purpose: waiting for React to hydrate
 * would show a white flash for anyone who chose dark mode.
 */
const themeScript = `
(function () {
  try {
    var stored = localStorage.getItem("todo-theme");
    var dark = stored === "dark" ||
      ((!stored || stored === "system") &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${inter.variable} antialiased font-sans`}>
        {children}
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
