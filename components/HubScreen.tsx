import Link from "next/link";
import { Mark } from "@/components/Mark";
import { ChevronRight } from "@/components/icons";

export type HubData = {
  publicName: string;
  streakDays: number;
  totalShitmates: number;
  longestShitLabel: string;
  totalShitLabel: string;
  friendsShitting: number;
  friendsAround: number;
  friendRequests: number;
};

/** The signed-in landing screen: everything reachable, one obvious action. */
export function HubScreen({ data }: { data: HubData }) {
  return (
    <main className="screen">
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Mark size={30} />
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 17, letterSpacing: "-0.02em" }}>
          Shat&nbsp;Roulette
        </div>
        <Link
          href="/settings"
          className="mono"
          style={{
            marginLeft: "auto",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.12em",
            color: "var(--muted)",
            border: "1px solid var(--line)",
            borderRadius: 999,
            padding: "7px 11px",
          }}
        >
          {data.publicName.replace("Shitmate ", "")}
        </Link>
      </div>

      <div style={{ marginTop: 26, display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
        <Stat value={data.streakDays === 0 ? "—" : `${data.streakDays}`} label={data.streakDays === 1 ? "Day streak" : "Day streak"} accent />
        <Stat value={String(data.totalShitmates)} label="Shitmates" />
        <Stat value={data.totalShitLabel} label="Total shitting" />
        <Stat value={data.longestShitLabel} label="Longest shit" />
      </div>

      <div style={{ marginTop: 10, display: "flex", flexDirection: "column" }}>
        <NavRow
          href="/friends"
          label="Shitty friends"
          meta={
            data.friendRequests > 0
              ? `${data.friendRequests} waiting on you`
              : data.friendsShitting > 0
                ? `${data.friendsShitting} shitting now`
                : data.friendsAround > 0
                  ? `${data.friendsAround} around`
                  : "Nobody in there"
          }
          highlight={data.friendRequests > 0 || data.friendsShitting > 0}
        />
        <NavRow href="/stats" label="Your stats" meta="Streaks, countries, records" />
        <NavRow href="/global" label="Global stats" meta="Who is winning at this" />
      </div>

      <div className="spacer" />

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Link href="/confirm" className="btn btn--primary">
          I&apos;M SHITTING
        </Link>
        <div className="eyebrow" style={{ textAlign: "center", fontSize: 10, color: "var(--faint)", letterSpacing: "0.16em" }}>
          Anonymous · Text only · Wash your hands
        </div>
      </div>
    </main>
  );
}

function Stat({ value, label, accent = false }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 6 }}>
      <span
        className="mono"
        style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em", color: accent ? "var(--highlight)" : "var(--ink)" }}
      >
        {value}
      </span>
      <span className="eyebrow" style={{ fontSize: 10 }}>{label}</span>
    </div>
  );
}

function NavRow({ href, label, meta, highlight = false }: { href: string; label: string; meta: string; highlight?: boolean }) {
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        minHeight: 64,
        padding: "12px 0",
        borderBottom: "1px solid var(--line-soft)",
        color: "var(--ink)",
      }}
    >
      <div style={{ flexGrow: 1, display: "flex", flexDirection: "column", gap: 3 }}>
        <span style={{ fontSize: 16, fontWeight: 500 }}>{label}</span>
        <span
          className="mono"
          style={{ fontSize: 10, letterSpacing: "0.08em", color: highlight ? "var(--highlight)" : "var(--faint)" }}
        >
          {meta.toUpperCase()}
        </span>
      </div>
      <span style={{ color: "var(--faint)", display: "flex" }}>
        <ChevronRight />
      </span>
    </Link>
  );
}
