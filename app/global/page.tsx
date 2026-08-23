"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronLeft } from "@/components/icons";
import { LiveCount } from "@/components/LiveCount";

const TABS = ["LONGEST", "SHITMATES", "COUNTRIES"] as const;

const LONGEST = [
  { rank: "01", id: "#90114", meta: "JP · STILL IN THERE", time: "1:04:22" },
  { rank: "02", id: "#22087", meta: "BR · FINISHED 11:40", time: "58:19" },
  { rank: "03", id: "#61550", meta: "DE · FINISHED 09:02", time: "47:03" },
];

const NATIONS = [
  { code: "US", pct: 88, count: "1,204", clay: false },
  { code: "IN", pct: 71, count: "968", clay: false },
  { code: "BR", pct: 44, count: "602", clay: false },
  { code: "AU", pct: 13, count: "177", clay: true },
];

export default function GlobalPage() {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]>("LONGEST");

  return (
    <main className="screen" style={{ paddingLeft: 20, paddingRight: 20 }}>
      <div style={{ display: "flex", alignItems: "center", minHeight: 44 }}>
        <button className="icon-btn" style={{ marginLeft: -12 }} onClick={() => router.back()} aria-label="Back">
          <ChevronLeft />
        </button>
        <div className="eyebrow" style={{ margin: "0 auto", paddingRight: 32 }}>Global shat stats</div>
      </div>

      <div className="card" style={{ marginTop: 12, borderRadius: 20, padding: "18px 20px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <span
            aria-hidden
            style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--highlight)", animation: "blink 1.6s ease-in-out infinite" }}
          />
          <span className="eyebrow" style={{ fontSize: 10 }}>Currently shitting worldwide</span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span className="mono" style={{ fontSize: 42, fontWeight: 700, letterSpacing: "-0.04em" }}>
            <LiveCount start={4281} />
          </span>
          <span className="mono" style={{ fontSize: 12, color: "var(--highlight)" }}>+312 / HR</span>
        </div>
        <svg width="100%" height="42" viewBox="0 0 310 42" preserveAspectRatio="none" fill="none" aria-hidden>
          <path
            d="M0 34 L26 30 L52 33 L78 22 L104 26 L130 14 L156 19 L182 10 L208 16 L234 7 L260 12 L286 5 L310 9"
            stroke="var(--highlight)"
            strokeWidth="1.6"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <path
            d="M0 34 L26 30 L52 33 L78 22 L104 26 L130 14 L156 19 L182 10 L208 16 L234 7 L260 12 L286 5 L310 9 L310 42 L0 42 Z"
            fill="rgba(138,74,24,0.10)"
          />
        </svg>
        <div className="mono" style={{ fontSize: 10, letterSpacing: "0.08em", color: "var(--faint)" }}>
          PEAK WAS 08:12 THIS MORNING. COFFEE.
        </div>
      </div>

      <div
        style={{
          marginTop: 14,
          display: "flex",
          gap: 6,
          background: "var(--surface)",
          border: "1px solid var(--line-soft)",
          borderRadius: 14,
          padding: 5,
        }}
      >
        {TABS.map((t) => {
          const on = tab === t;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flexGrow: 1,
                minHeight: 40,
                border: "none",
                borderRadius: 10,
                background: on ? "var(--fill)" : "transparent",
                color: on ? "var(--surface)" : "var(--muted)",
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.08em",
                cursor: "pointer",
              }}
            >
              {t}
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: 16, display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <span className="eyebrow" style={{ fontSize: 10 }}>
          {tab === "LONGEST" ? "Longest shits today" : tab === "SHITMATES" ? "Most shitmates today" : "Busiest countries"}
        </span>
        <span className="mono" style={{ fontSize: 10, color: "var(--faint)", letterSpacing: "0.08em" }}>RESETS 00:00 UTC</span>
      </div>

      <div style={{ marginTop: 10, display: "flex", flexDirection: "column" }}>
        {LONGEST.map((row, i) => (
          <div key={row.rank}>
            {i > 0 && <div style={{ height: 1, background: "var(--line-soft)" }} />}
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0" }}>
              <span
                className="mono"
                style={{ fontSize: 13, fontWeight: 700, color: i === 0 ? "var(--highlight)" : "var(--muted)", width: 22 }}
              >
                {row.rank}
              </span>
              <div style={{ flexGrow: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: 14, fontWeight: 500 }}>Shitmate {row.id}</span>
                <span className="mono" style={{ fontSize: 10, letterSpacing: "0.08em", color: "var(--faint)" }}>{row.meta}</span>
              </div>
              <span className="mono" style={{ fontSize: 18, fontWeight: 700 }}>{row.time}</span>
            </div>
          </div>
        ))}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 10px",
            background: "rgba(138,74,24,0.08)",
            borderRadius: 12,
            margin: "4px -10px 0",
          }}
        >
          <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: "var(--highlight)", width: 22 }}>47</span>
          <div style={{ flexGrow: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>You</span>
            <span className="mono" style={{ fontSize: 10, letterSpacing: "0.08em", color: "var(--muted)" }}>AU · MID-SHIT</span>
          </div>
          <span className="mono" style={{ fontSize: 18, fontWeight: 700, color: "var(--highlight)" }}>14:32</span>
        </div>
      </div>

      <div className="spacer" />

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <span className="eyebrow" style={{ fontSize: 10 }}>Countries currently shitting</span>
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {NATIONS.map((n) => (
            <div key={n.code} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span className="mono" style={{ fontSize: 11, fontWeight: 700, width: 26, color: "var(--text-2)" }}>{n.code}</span>
              <span style={{ flexGrow: 1, height: 8, borderRadius: 5, background: "var(--line-soft)", overflow: "hidden" }}>
                <span
                  style={{
                    display: "block",
                    width: `${n.pct}%`,
                    height: "100%",
                    background: n.clay ? "var(--clay)" : "var(--highlight)",
                  }}
                />
              </span>
              <span className="mono" style={{ fontSize: 12, color: "var(--muted)", width: 44, textAlign: "right" }}>{n.count}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
