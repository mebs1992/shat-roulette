"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Close, Share } from "@/components/icons";
import { formatDuration, useSession } from "@/lib/session";

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
      <span className="mono" style={{ fontSize: 12, letterSpacing: "0.06em", color: "var(--paper-ink)" }}>{label}</span>
      <span className="mono" style={{ fontSize: 19, fontWeight: 700 }}>{value}</span>
    </div>
  );
}

// Deterministic so the receipt looks the same on the server and the client.
const BARS = [3, 8, 2, 4, 10, 2, 6, 3, 9, 2, 4, 7, 2, 11, 3, 5, 2, 8, 4, 2, 9, 3, 6, 2, 10, 4, 2, 7, 3, 5];

export default function SummaryPage() {
  const router = useRouter();
  const { lastSummary, shitStartedAt } = useSession();

  useEffect(() => {
    if (!lastSummary) router.replace("/");
  }, [lastSummary, router]);

  if (!lastSummary) return <main className="screen" />;

  const stamp = new Date().toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).toUpperCase();

  return (
    <main className="screen">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 44 }}>
        <div className="eyebrow">Session ended</div>
        <button className="icon-btn" style={{ marginRight: -12 }} onClick={() => router.push("/")} aria-label="Close">
          <Close />
        </button>
      </div>

      <h1 className="display" style={{ margin: "14px 0 0", fontSize: 44 }}>
        Shit
        <br />
        complete.
      </h1>

      <div
        style={{
          marginTop: 22,
          background: "var(--paper)",
          color: "var(--ink)",
          border: "1px solid var(--line)",
          borderRadius: 6,
          padding: "20px 20px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span className="mono" style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em" }}>SHAT ROULETTE</span>
          <span className="mono" style={{ fontSize: 11, color: "var(--paper-ink)" }}>{stamp}</span>
        </div>

        <Dashed />

        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          <Line label="TOILET TIME" value={formatDuration(lastSummary.toiletMs)} />
          <Line label="CHAT TIME" value={formatDuration(lastSummary.chatMs)} />
          <Line label="MESSAGES" value={String(lastSummary.messages)} />
          <Line label="SHITMATE" value={`${lastSummary.country} · #${lastSummary.matchId}`} />
          <Line label="SHITMATES TODAY" value={String(lastSummary.shitmatesToday)} />
        </div>

        <Dashed />

        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <span className="mono" style={{ fontSize: 12, letterSpacing: "0.06em", color: "var(--paper-ink)" }}>
            PERSONAL BEST
          </span>
          <span className="mono" style={{ fontSize: 13, fontWeight: 700 }}>
            {lastSummary.toiletMs > 31 * 60_000 ? "NEW RECORD" : "NOT EVEN CLOSE"}
          </span>
        </div>

        <div
          style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 3, height: 34, marginTop: 2 }}
          aria-hidden
        >
          {BARS.map((w, i) => (
            <span key={i} style={{ width: w, height: "100%", background: "var(--ink)" }} />
          ))}
        </div>
        <div className="mono" style={{ textAlign: "center", fontSize: 10, letterSpacing: "0.16em", color: "var(--paper-ink)" }}>
          SR-{lastSummary.matchId}-{lastSummary.country}-{formatDuration(lastSummary.toiletMs).replace(":", "")}
        </div>
      </div>

      <div className="spacer" />

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <button className="btn btn--primary" onClick={() => router.push(shitStartedAt ? "/matchmaking" : "/confirm")}>
          SHIT AGAIN
        </button>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            className="btn btn--ghost"
            style={{ flexGrow: 1, minHeight: 50, gap: 8, fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 500 }}
            onClick={() => navigator.share?.({ title: "Shat Roulette", text: "Shit complete." }).catch(() => {})}
          >
            <Share />
            Share receipt
          </button>
          <button
            className="btn btn--ghost"
            style={{ flexGrow: 1, minHeight: 50, fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 500 }}
            onClick={() => router.push("/stats")}
          >
            My stats
          </button>
        </div>
      </div>
    </main>
  );
}

function Dashed() {
  return (
    <div
      aria-hidden
      style={{
        height: 1,
        background: "repeating-linear-gradient(90deg, var(--ink) 0 5px, transparent 5px 10px)",
        opacity: 0.35,
      }}
    />
  );
}
