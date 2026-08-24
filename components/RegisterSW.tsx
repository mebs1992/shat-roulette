"use client";

import { useEffect } from "react";

/** Registers the service worker so the app is installable and can receive push. */
export function RegisterSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // If an older worker is already controlling this page, reload once when a
    // new one takes over — that's how a device stuck on a stale cache heals
    // itself without the user clearing anything. First-time visitors have no
    // controller yet, so they get no reload.
    const hadController = !!navigator.serviceWorker.controller;
    let refreshing = false;
    const onChange = () => {
      if (refreshing || !hadController) return;
      refreshing = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onChange);

    const id = setTimeout(() => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => reg.update().catch(() => {})) // force an update check
        .catch(() => {});
    }, 1200); // after first paint, never blocking it

    return () => {
      clearTimeout(id);
      navigator.serviceWorker.removeEventListener("controllerchange", onChange);
    };
  }, []);
  return null;
}
