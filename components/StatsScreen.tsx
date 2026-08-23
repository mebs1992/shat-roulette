"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mark } from "@/components/Mark";
import { ChevronLeft, ChevronRight } from "@/components/icons";
import { GENDER_LABEL, useSession } from "@/lib/session";

export type StatsData = {
  publicName: string;
  username: string;
  country: string | null;
  joined: string;
  totalShitmates: number;
  totalShitLabel: string;
  longestShitLabel: string;
  streakDays: number;
  longestStreak: number;
  countries: string[];
};

function Stat({ value, label, accent = false }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 6 }}>
      <span
        className="mono"
        style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.03em", color: accent ? "var(--highlight)" : "var(--ink)" }}
      >
        {value}
      </span>
      <span className="eyebrow" style={{ fontSize: 10 }}>{label}</span>
    </div>
  );
}

export function StatsScreen({ data }: { data: StatsData }) {
  const router = useRouter();
  const { gender, preference } = useSession();

  const preferenceLabel =
    preference === "anyone" ? "matched with anyone" : `matched with ${GENDER_LABEL[preference].toLowerCase()} only`;

  return (
    <main className="screen">
      <div style={{ display: "flex", alignItems: "center", minHeight: 44 }}>
        <button className="icon-btn" style={{ marginLeft: -12 }} onClick={() => router.back()} aria-label="Back">
          <ChevronLeft />
        </button>
        <div className="eyebrow" style={{ margin: "0 auto", paddingRight: 32 }}>Your stats</div>
      </div>

      <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 14 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 18,
            background: "var(--surface-2)",
            border: "1px solid var(--line)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Mark size={30} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div className="display" style={{ fontSize: 26 }}>{data.publicName}</div>
          <div className="mono" style={{ fontSize: 11, letterSpacing: "0.1em", color: "var(--muted)" }}>
            {data.country ?? "??"} · SHITTING SINCE {data.joined}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 22, display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
        <Stat value={String(data.totalShitmates)} label="Shitmates" />
        <Stat value={String(data.countries.length)} label="Countries" />
        <Stat value={data.totalShitLabel} label="Total shitting" accent />
        <Stat value={data.longestShitLabel} label="Longest shit" />
      </div>

      <div className="card" style={{ marginTop: 10, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <span className="eyebrow" style={{ fontSize: 10 }}>Shit streak</span>
          <span className="mono" style={{ fontSize: 15, fontWeight: 700, color: "var(--highlight)" }}>
            {data.streakDays} {data.streakDays === 1 ? "DAY" : "DAYS"}
          </span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {Array.from({ length: 7 }, (_, i) => {
            // Last seven days, filled from the right by the current streak.
            const filled = i >= 7 - Math.min(data.streakDays, 7);
            return (
              <span
                key={i}
                style={{
                  flexGrow: 1,
                  height: 28,
                  borderRadius: 7,
                  background: filled ? "var(--highlight)" : "var(--line-soft)",
                }}
              />
            );
          })}
        </div>
        <span style={{ fontSize: 12, color: "var(--faint)" }}>
          {data.longestStreak > data.streakDays
            ? `Your best run was ${data.longestStreak} days. Miss one and it resets.`
            : "Miss a day and it resets. Your body decides, not you."}
        </span>
      </div>

      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
        <span className="eyebrow" style={{ fontSize: 10 }}>Countries shat with</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {data.countries.length === 0 && (
            <span style={{ fontSize: 13, color: "var(--faint)" }}>
              None yet. Go and meet someone.
            </span>
          )}
          {data.countries.map((c) => (
            <span
              key={c}
              className="mono"
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.08em",
                border: "1px solid var(--line-strong)",
                borderRadius: 999,
                padding: "8px 12px",
                color: "var(--text-2)",
              }}
            >
              {c}
            </span>
          ))}
        </div>
      </div>

      <button
        className="card"
        onClick={() => router.push("/preference")}
        style={{
          marginTop: 12,
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 16px",
          minHeight: 56,
          cursor: "pointer",
          textAlign: "left",
          borderRadius: 16,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 3, flexGrow: 1 }}>
          <span className="eyebrow" style={{ fontSize: 9 }}>Matching</span>
          <span style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)" }}>
            {gender ? GENDER_LABEL[gender] : "Not set"} · {preferenceLabel}
          </span>
        </div>
        <span style={{ color: "var(--faint)", display: "flex" }}>
          <ChevronRight />
        </span>
      </button>

      <div className="spacer" />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, minHeight: 44 }}>
        <span style={{ fontSize: 12, lineHeight: 1.45, color: "var(--faint)", maxWidth: 210 }}>
          No photo. No followers. No bio. Nothing here to curate.
        </span>
        <Link
          href="/settings"
          style={{
            display: "flex",
            alignItems: "center",
            minHeight: 44,
            padding: "0 14px",
            border: "1px solid var(--line-strong)",
            borderRadius: 999,
            background: "transparent",
            color: "var(--muted)",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.1em",
            cursor: "pointer",
          }}
        >
          ACCOUNT
        </Link>
      </div>
    </main>
  );
}
