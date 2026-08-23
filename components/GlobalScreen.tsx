"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronLeft } from "@/components/icons";
import type { BoardRow, Leaderboard } from "@/lib/leaderboard";

const TABS = ["LONGEST", "SHITMATES", "STREAKS"] as const;

const HEADINGS: Record<(typeof TABS)[number], string> = {
  LONGEST: "Longest shits today",
  SHITMATES: "Most shitmates today",
  STREAKS: "Longest streaks",
};

export function GlobalScreen({ board }: { board: Leaderboard }) {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]>("LONGEST");

  const rows: BoardRow[] =
    tab === "LONGEST" ? board.longest : tab === "SHITMATES" ? board.shitmates : board.streaks;

  // Shits started per hour over the last twelve, drawn to fit the card.
  const peak = Math.max(...board.trend, 1);
  const trendLine = board.trend
    .map((count, i) => `${i === 0 ? "M" : "L"}${(i * 310) / (board.trend.length - 1)} ${38 - (count / peak) * 32}`)
    .join(" ");

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
            {board.shittingNow.toLocaleString("en-US")}
          </span>
          <span className="mono" style={{ fontSize: 12, color: "var(--highlight)" }}>
            {board.shittingNow === 1 ? "JUST THE ONE" : "RIGHT NOW"}
          </span>
        </div>
        {board.trend.some((n) => n > 0) && (
          <svg width="100%" height="42" viewBox="0 0 310 42" preserveAspectRatio="none" fill="none" aria-hidden>
            <path d={trendLine} stroke="var(--highlight)" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
            <path d={`${trendLine} L310 42 L0 42 Z`} fill="rgba(138,74,24,0.10)" />
          </svg>
        )}
        <div className="mono" style={{ fontSize: 10, letterSpacing: "0.08em", color: "var(--faint)" }}>
          {board.shittingNow === 0
            ? "NOBODY. THE WORLD IS EMPTY."
            : `${board.trend.reduce((a, b) => a + b, 0)} SHITS STARTED IN THE LAST TWELVE HOURS`}
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
        <span className="eyebrow" style={{ fontSize: 10 }}>{HEADINGS[tab]}</span>
        <span className="mono" style={{ fontSize: 10, color: "var(--faint)", letterSpacing: "0.08em" }}>
          {tab === "STREAKS" ? "ALL TIME" : "RESETS 00:00 UTC"}
        </span>
      </div>

      <div style={{ marginTop: 10, display: "flex", flexDirection: "column" }}>
        {rows.length === 0 && (
          <span style={{ fontSize: 14, lineHeight: 1.5, color: "var(--faint)", padding: "12px 0" }}>
            Nothing here yet today. Be the first.
          </span>
        )}

        {rows.map((row, i) => (
          <div key={`${row.shitmateNum}-${i}`}>
            {i > 0 && !row.isYou && <div style={{ height: 1, background: "var(--line-soft)" }} />}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: row.isYou ? "12px 10px" : "12px 0",
                background: row.isYou ? "rgba(138,74,24,0.08)" : "transparent",
                borderRadius: row.isYou ? 12 : 0,
                margin: row.isYou ? "4px -10px 0" : 0,
              }}
            >
              <span
                className="mono"
                style={{ fontSize: 13, fontWeight: 700, color: i === 0 || row.isYou ? "var(--highlight)" : "var(--muted)", width: 22 }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <div style={{ flexGrow: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: 14, fontWeight: row.isYou ? 700 : 500 }}>
                  {row.isYou ? "You" : `Shitmate #${row.shitmateNum}`}
                </span>
                <span className="mono" style={{ fontSize: 10, letterSpacing: "0.08em", color: row.isYou ? "var(--muted)" : "var(--faint)" }}>
                  {row.country ? `${row.country} · ` : ""}
                  {row.meta}
                </span>
              </div>
              <span className="mono" style={{ fontSize: 18, fontWeight: 700, color: row.isYou ? "var(--highlight)" : "var(--ink)" }}>
                {row.value}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="spacer" />

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <span className="eyebrow" style={{ fontSize: 10 }}>Countries currently shitting</span>
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {board.countries.length === 0 && (
            <span style={{ fontSize: 13, color: "var(--faint)" }}>
              {board.shittingNow > 0 ? "Nobody has said where they are." : "Nobody is shitting anywhere. Suspicious."}
            </span>
          )}
          {board.countries.map((nation) => (
            <div key={nation.code} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span className="mono" style={{ fontSize: 11, fontWeight: 700, width: 26, color: "var(--text-2)" }}>{nation.code}</span>
              <span style={{ flexGrow: 1, height: 8, borderRadius: 5, background: "var(--line-soft)", overflow: "hidden" }}>
                <span
                  style={{
                    display: "block",
                    width: `${nation.pct}%`,
                    height: "100%",
                    background: nation.isYours ? "var(--clay)" : "var(--highlight)",
                  }}
                />
              </span>
              <span className="mono" style={{ fontSize: 12, color: "var(--muted)", width: 44, textAlign: "right" }}>
                {nation.count.toLocaleString("en-US")}
              </span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
