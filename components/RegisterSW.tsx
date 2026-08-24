"use client";

import { useEffect } from "react";

/** Registers the service worker so the app is installable and can receive push. */
export function RegisterSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const id = setTimeout(() => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }, 1200); // after first paint, never blocking it
    return () => clearTimeout(id);
  }, []);
  return null;
}
