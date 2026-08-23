"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronLeft } from "@/components/icons";
import { GENDER_LABEL, useSession, type Gender, type Preference } from "@/lib/session";

const GENDERS: Gender[] = ["man", "woman", "nonbinary"];

const POOLS: { key: Preference; label: string; waiting: number }[] = [
  { key: "anyone", label: "Anyone", waiting: 3482 },
  { key: "man", label: "Men only", waiting: 2140 },
  { key: "woman", label: "Women only", waiting: 1102 },
  { key: "nonbinary", label: "Non-binary only", waiting: 240 },
];

export default function PreferencePage() {
  const router = useRouter();
  const session = useSession();
  const [gender, setGender] = useState<Gender>(session.gender ?? "man");
  const [preference, setPreference] = useState<Preference>(session.preference);

  function submit() {
    session.setIdentity(gender, preference);
    router.push(session.shitStartedAt ? "/matchmaking" : "/confirm");
  }

  return (
    <main className="screen">
      <div style={{ display: "flex", alignItems: "center", minHeight: 44 }}>
        <button className="icon-btn" style={{ marginLeft: -12 }} onClick={() => router.back()} aria-label="Back">
          <ChevronLeft />
        </button>
        <div className="eyebrow" style={{ margin: "0 auto", paddingRight: 32 }}>
          Step 2 of 2
        </div>
      </div>

      <h1 className="display" style={{ margin: "16px 0 0", fontSize: 34 }}>
        Who&apos;s shitting,
        <br />
        and who with?
      </h1>

      <div style={{ marginTop: 26, display: "flex", flexDirection: "column", gap: 10 }}>
        <span className="eyebrow" style={{ fontSize: 10 }}>I am</span>
        <div style={{ display: "flex", gap: 8 }}>
          {GENDERS.map((g) => {
            const on = gender === g;
            return (
              <button
                key={g}
                onClick={() => setGender(g)}
                aria-pressed={on}
                style={{
                  flexGrow: 1,
                  minHeight: 52,
                  borderRadius: 14,
                  cursor: "pointer",
                  fontFamily: "var(--font-ui)",
                  fontSize: 14,
                  border: on ? "none" : "1px solid var(--line-strong)",
                  background: on ? "var(--fill)" : "transparent",
                  color: on ? "var(--surface)" : "var(--text-2)",
                  fontWeight: on ? 700 : 500,
                }}
              >
                {GENDER_LABEL[g]}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <span className="eyebrow" style={{ fontSize: 10 }}>Match me with</span>
          <span className="mono" style={{ fontSize: 10, letterSpacing: "0.08em", color: "var(--faint)" }}>
            WAITING NOW
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {POOLS.map((pool) => {
            const on = preference === pool.key;
            return (
              <button
                key={pool.key}
                onClick={() => setPreference(pool.key)}
                aria-pressed={on}
                style={{
                  minHeight: 58,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  border: on ? "1px solid var(--highlight)" : "1px solid var(--line-soft)",
                  borderRadius: 14,
                  background: on ? "rgba(138,74,24,0.10)" : "transparent",
                  padding: "0 14px",
                  cursor: "pointer",
                  fontFamily: "var(--font-ui)",
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    border: `2px solid ${on ? "var(--highlight)" : "rgba(74,45,20,0.30)"}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {on && <span style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--highlight)" }} />}
                </span>
                <span
                  style={{
                    flexGrow: 1,
                    textAlign: "left",
                    fontSize: 15,
                    fontWeight: on ? 700 : 500,
                    color: on ? "var(--ink)" : "var(--text-2)",
                  }}
                >
                  {pool.label}
                </span>
                <span
                  className="mono"
                  style={{ fontSize: 13, fontWeight: on ? 700 : 400, color: on ? "var(--highlight)" : "var(--muted)" }}
                >
                  {pool.waiting.toLocaleString("en-US")}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <p style={{ margin: "16px 0 0", fontSize: 13, lineHeight: 1.5, color: "var(--faint)" }}>
        Filters shrink the pool. Anyone matches in about 8 seconds. Women only is running at 2 minutes right now.
      </p>

      <div className="spacer" />

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <button className="btn btn--primary" onClick={submit}>
          FIND MY SHITMATE
        </button>
        <div style={{ minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 13, color: "var(--faint)" }}>Change this any time. Nobody sees anything else.</span>
        </div>
      </div>
    </main>
  );
}
