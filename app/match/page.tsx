"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Mark } from "@/components/Mark";
import { GENDER_LABEL, useElapsed, useSession } from "@/lib/session";

function Party({
  label,
  labelColor,
  meta,
  elapsed,
  progress,
  barColor,
}: {
  label: string;
  labelColor: string;
  meta: string;
  elapsed: string;
  progress: number;
  barColor: string;
}) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: 20,
        padding: "18px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <span className="eyebrow" style={{ color: labelColor }}>{label}</span>
        <span className="mono" style={{ fontSize: 11, color: "var(--muted)", letterSpacing: "0.08em" }}>{meta}</span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <span className="mono" style={{ fontSize: 34, fontWeight: 700, letterSpacing: "-0.03em" }}>{elapsed}</span>
        <span style={{ fontSize: 13, color: "var(--muted)" }}>on the toilet</span>
      </div>
      <div style={{ height: 4, borderRadius: 3, background: "var(--line-soft)", overflow: "hidden" }}>
        <div style={{ width: `${progress}%`, height: "100%", background: barColor }} />
      </div>
    </div>
  );
}

export default function MatchPage() {
  const router = useRouter();
  const { match, gender, shitStartedAt, beginChat } = useSession();
  const mine = useElapsed(shitStartedAt);
  const theirs = useElapsed(match?.startedAt ?? null);

  useEffect(() => {
    if (!match) router.replace("/matchmaking");
  }, [match, router]);

  if (!match) return <main className="screen" />;

  function start() {
    beginChat();
    router.push("/chat");
  }

  return (
    <main className="screen">
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <div
          style={{
            width: 62,
            height: 62,
            borderRadius: 20,
            background: "var(--fill)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Mark size={38} color="var(--beige)" />
        </div>
        <h1 className="display" style={{ margin: 0, fontSize: 38, textAlign: "center" }}>Shitmate found</h1>
        <div className="eyebrow" style={{ letterSpacing: "0.16em" }}>Connected in 0:07</div>
      </div>

      <div style={{ flexGrow: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 10 }}>
        <Party
          label="You"
          labelColor="var(--highlight)"
          meta={`${gender ? GENDER_LABEL[gender].toUpperCase() : "YOU"} · AU`}
          elapsed={mine}
          progress={42}
          barColor="var(--highlight)"
        />

        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "2px 4px" }}>
          <div style={{ flexGrow: 1, height: 1, background: "var(--line-soft)" }} />
          <span className="eyebrow" style={{ fontSize: 10, letterSpacing: "0.2em" }}>Matched</span>
          <div style={{ flexGrow: 1, height: 1, background: "var(--line-soft)" }} />
        </div>

        <Party
          label={`Shitmate #${match.id}`}
          labelColor="var(--clay)"
          meta={`${GENDER_LABEL[match.gender].toUpperCase()} · ${match.country}`}
          elapsed={theirs}
          progress={68}
          barColor="var(--clay)"
        />

        <p style={{ margin: "8px 0 0", textAlign: "center", fontSize: 13, lineHeight: 1.5, color: "var(--faint)" }}>
          They have a head start. Be respectful of that.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <button className="btn btn--primary" onClick={start}>START SHITTING CHAT</button>
        <button className="btn btn--quiet" onClick={() => router.replace("/matchmaking")}>
          Skip — find someone else
        </button>
      </div>
    </main>
  );
}
