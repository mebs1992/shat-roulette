"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Mark } from "@/components/Mark";
import { Funnel } from "@/components/icons";
import { GENDER_LABEL, useElapsed, useSession } from "@/lib/session";

const STATUS = [
  "Searching the globe for a fellow shitter…",
  "Finding someone in your timezone…",
  "Someone is almost finished. Please hold.",
];

const ASIDE = [
  "Someone in Lisbon is almost finished.",
  "Two people just gave up. Not you though.",
  "Filtering by preference. This takes longer.",
];

export default function MatchmakingPage() {
  const router = useRouter();
  const { findMatch, preference, setPreference, shitStartedAt } = useSession();
  const elapsed = useElapsed(shitStartedAt);
  const [line, setLine] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setLine((n) => n + 1), 2600);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const signal = { cancelled: false };
    findMatch(signal).then((found) => {
      if (found && !signal.cancelled) router.push("/match");
    });
    return () => {
      signal.cancelled = true;
    };
  }, [findMatch, router]);

  const filterLabel =
    preference === "anyone" ? "ANYONE · 3,482 WAITING" : `${GENDER_LABEL[preference].toUpperCase()} ONLY · 1,102 WAITING`;

  return (
    <main className="screen">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 44 }}>
        <div className="eyebrow">Matchmaking</div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            border: "1px solid var(--line)",
            borderRadius: 999,
            padding: "7px 12px",
          }}
        >
          <span
            aria-hidden
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "var(--highlight)",
              animation: "blink 1.4s ease-in-out infinite",
            }}
          />
          <span className="mono" style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "var(--text-3)" }}>
            412 WAITING
          </span>
        </div>
      </div>

      <div
        style={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 34,
        }}
      >
        <div
          style={{
            position: "relative",
            width: 240,
            height: 240,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                border: "1px solid rgba(138,74,24,0.55)",
                animation: `ring 3s ease-out infinite ${i}s`,
              }}
            />
          ))}
          <span
            aria-hidden
            style={{
              position: "absolute",
              width: 168,
              height: 168,
              borderRadius: "50%",
              background:
                "conic-gradient(from 0deg, rgba(138,74,24,0) 0deg, rgba(138,74,24,0.20) 300deg, rgba(138,74,24,0.60) 360deg)",
              animation: "sweep 2.6s linear infinite",
            }}
          />
          <div
            style={{
              position: "relative",
              width: 118,
              height: 118,
              borderRadius: "50%",
              background: "var(--surface)",
              border: "1px solid var(--line)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ animation: "bob 2.2s ease-in-out infinite", display: "flex" }}>
              <Mark size={54} />
            </span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <h1 className="display" style={{ margin: 0, fontSize: 30, textAlign: "center", maxWidth: 300 }}>
            {STATUS[line % STATUS.length]}
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: "var(--muted)", textAlign: "center" }}>
            {ASIDE[line % ASIDE.length]}
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: 14,
              padding: "12px 16px",
            }}
          >
            <span className="eyebrow" style={{ letterSpacing: "0.14em" }}>Your shit</span>
            <span className="mono" style={{ fontSize: 18, fontWeight: 700, color: "var(--highlight)" }}>
              {elapsed}
            </span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              border: "1px solid var(--line-strong)",
              borderRadius: 999,
              padding: "9px 14px",
              color: "var(--faint)",
            }}
          >
            <Funnel />
            <span className="mono" style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "var(--text-3)" }}>
              {filterLabel}
            </span>
          </div>

          {preference !== "anyone" && (
            <button
              onClick={() => setPreference("anyone")}
              style={{
                minHeight: 44,
                border: "none",
                background: "none",
                padding: 0,
                color: "var(--highlight)",
                fontSize: 13,
                fontWeight: 500,
                borderBottom: "1px solid rgba(138,74,24,0.45)",
                cursor: "pointer",
              }}
            >
              Taking a while — match me with anyone
            </button>
          )}
        </div>
      </div>

      <button className="btn btn--ghost" onClick={() => router.push("/")}>
        CANCEL
      </button>
    </main>
  );
}
