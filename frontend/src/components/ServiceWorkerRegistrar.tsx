"use client";

import { useEffect } from "react";

/**
 * Registers the service worker that backs offline support and installability.
 *
 * Only registered in production: a service worker caching the dev build causes
 * stale-module confusion that is very hard to debug.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Offline support is an enhancement; a failure here must never break
        // the app, so it is swallowed deliberately.
      });
    };

    // Registering after load keeps the worker off the critical path.
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}
