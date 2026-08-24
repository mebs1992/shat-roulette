"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Mark } from "@/components/Mark";
import { ChevronLeft } from "@/components/icons";
import { useSession } from "@/lib/session";
import type { FriendStats } from "@/lib/friend-stats";

const PRESENCE_LABEL: Record<FriendStats["presence"], string> = {
  shitting: "SHITTING NOW",
  available: "AROUND",
  offline: "OFFLINE",
};

const PRESENCE_COLOR: Record<FriendStats["presence"], string> = {
  shitting: "var(--highlight)",
  available: "var(--clay)",
  offline: "var(--faint)",
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

export function FriendProfileScreen({ data }: { data: FriendStats }) {
  const router = useRouter();
  const { startShit } = useSession();
  const [busy, setBusy] = useState(false);

  async function invite() {
    setBusy(true);
    const res = await fetch("/api/invites", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ friendId: data.id }),
    });
    const body = (await res.json().catch(() => null)) as { roomId?: string } | null;
    if (res.ok && body?.roomId) {
      startShit();
      router.push(`/matchmaking?room=${body.roomId}`);
    } else {
      setBusy(false);
    }
  }

  return (
    <main className="screen">
      <div style={{ display: "flex", alignItems: "center", minHeight: 44 }}>
        <button className="icon-btn" style={{ marginLeft: -12 }} onClick={() => router.push("/friends")} aria-label="Back">
          <ChevronLeft />
        </button>
        <div className="eyebrow" style={{ margin: "0 auto", paddingRight: 32 }}>Shitty friend</div>
      </div>

      <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 14 }}>
        <div
          style={{
            position: "relative",
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
          {data.presence !== "offline" && (
            <span
              aria-hidden
              style={{
                position: "absolute",
                right: -3,
                bottom: -3,
                width: 14,
                height: 14,
                borderRadius: "50%",
                background: PRESENCE_COLOR[data.presence],
                border: "2px solid var(--surface)",
                animation: data.presence === "shitting" ? "blink 1.6s ease-in-out infinite" : undefined,
              }}
            />
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
          <div className="display" style={{ fontSize: 26 }}>{data.username}</div>
          <div className="mono" style={{ fontSize: 11, letterSpacing: "0.1em", color: PRESENCE_COLOR[data.presence] }}>
            {PRESENCE_LABEL[data.presence]}
            {` · #${data.shitmateNum}`}
            {data.country ? ` · ${data.country}` : ""}
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
            ? `Their best run was ${data.longestStreak} days.`
            : "One a day keeps the streak alive."}
        </span>
      </div>

      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
        <span className="eyebrow" style={{ fontSize: 10 }}>Countries shat with</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {data.countries.length === 0 && (
            <span style={{ fontSize: 13, color: "var(--faint)" }}>None yet. A homebody shitter.</span>
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

      <div className="spacer" />

      <button
        className="btn btn--primary"
        style={{ minHeight: 58 }}
        onClick={invite}
        disabled={busy}
      >
        {busy ? "STARTING…" : data.presence === "shitting" ? "JOIN THEIR SHIT" : "INVITE TO SHIT"}
      </button>
    </main>
  );
}
