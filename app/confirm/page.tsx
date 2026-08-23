"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Mark } from "@/components/Mark";
import { ChevronLeft } from "@/components/icons";
import { useSession } from "@/lib/session";

export default function ConfirmPage() {
  const router = useRouter();
  const { startShit, gender } = useSession();
  const [denied, setDenied] = useState(false);

  function yes() {
    startShit();
    router.push(gender ? "/matchmaking" : "/preference");
  }

  return (
    <main className="screen">
      <div style={{ display: "flex", alignItems: "center", minHeight: 44 }}>
        <button className="icon-btn" style={{ marginLeft: -12 }} onClick={() => router.back()} aria-label="Back">
          <ChevronLeft />
        </button>
        <div className="eyebrow" style={{ margin: "0 auto", paddingRight: 32 }}>
          Step 1 of 2
        </div>
      </div>

      <div style={{ flexGrow: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 22 }}>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <div
            style={{
              width: 84,
              height: 84,
              borderRadius: 26,
              background: "var(--surface)",
              border: "1px solid var(--line)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Mark size={40} />
          </div>
        </div>

        <h1 className="display" style={{ margin: 0, fontSize: 42, textAlign: "center" }}>
          {denied ? "Then what are you doing here?" : "Are you currently shitting?"}
        </h1>

        <p
          style={{
            margin: "0 auto",
            maxWidth: 268,
            textAlign: "center",
            fontSize: 15,
            lineHeight: 1.45,
            color: "var(--muted)",
          }}
        >
          {denied
            ? "This is the only thing the app does. We'll wait."
            : "We have no way of checking this. We are choosing to trust you."}
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <button className="btn btn--primary" onClick={yes}>
          {denied ? "FINE, I'M SHITTING" : "YES, OBVIOUSLY"}
        </button>
        {!denied && (
          <button className="btn btn--ghost" onClick={() => setDenied(true)}>
            NO
          </button>
        )}
        <div style={{ minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 13, color: "var(--faint)" }}>
            {denied ? "Take your time." : "Answering “no” closes the app. Obviously."}
          </span>
        </div>
      </div>
    </main>
  );
}
