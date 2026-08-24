"use client";

import { useEffect, useState } from "react";
import { enablePush, pushGranted, pushSupported } from "@/lib/push-client";

/** A one-tap "get notified when a friend invites you" affordance on the hub. */
export function NotifyToggle() {
  const [state, setState] = useState<"hidden" | "offer" | "on" | "busy">("hidden");

  useEffect(() => {
    if (!pushSupported()) return;
    setState(pushGranted() ? "on" : "offer");
  }, []);

  if (state === "hidden" || state === "on") return null;

  return (
    <button
      onClick={async () => {
        setState("busy");
        setState((await enablePush()) ? "on" : "offer");
      }}
      disabled={state === "busy"}
      style={{
        marginTop: 14,
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: "transparent",
        border: "1px dashed var(--line-strong)",
        borderRadius: 14,
        padding: "12px 14px",
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--highlight)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.7 21a2 2 0 0 1-3.4 0" />
      </svg>
      <span style={{ flexGrow: 1, fontSize: 13, color: "var(--text-2)" }}>
        {state === "busy" ? "…" : "Get pinged when a friend invites you"}
      </span>
      <span className="mono" style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "var(--highlight)" }}>
        TURN ON
      </span>
    </button>
  );
}
