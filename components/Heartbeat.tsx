"use client";

import { useEffect } from "react";

/** Roughly how often we tell the server we are around. */
const INTERVAL_MS = 90_000;

/**
 * Tells the server the app is open, so friends can see who is around rather
 * than only who is mid-shit. Pauses when the tab is hidden — a backgrounded
 * tab should not keep someone looking available all day.
 */
export function Heartbeat() {
  useEffect(() => {
    const ping = () => {
      if (document.visibilityState !== "visible") return;
      void fetch("/api/presence", { method: "POST", keepalive: true }).catch(() => {});
    };

    ping();
    const id = setInterval(ping, INTERVAL_MS);
    document.addEventListener("visibilitychange", ping);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", ping);
    };
  }, []);

  return null;
}
