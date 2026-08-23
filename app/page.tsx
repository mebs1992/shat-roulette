import Link from "next/link";
import { Mark } from "@/components/Mark";
import { LiveCount } from "@/components/LiveCount";

const step: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.1em",
  color: "var(--muted)",
};

export default function HomePage() {
  return (
    <main className="screen" style={{ alignItems: "center" }}>
      <div
        className="mono"
        style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", color: "var(--faint)" }}
      >
        ANONYMOUS · TEXT ONLY · NO SIGNUP
      </div>

      <div className="spacer" />

      <div style={{ position: "relative", marginTop: 8, display: "flex", justifyContent: "center" }}>
        <span
          aria-hidden
          style={{
            position: "absolute",
            top: -92,
            left: "50%",
            width: 330,
            height: 330,
            marginLeft: -165,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(74,45,20,0.14) 0%, rgba(74,45,20,0.06) 45%, rgba(74,45,20,0) 70%)",
          }}
        />
        <span style={{ position: "relative" }}>
          <Mark size={148} />
        </span>
      </div>

      <h1 className="display" style={{ margin: "26px 0 0", fontSize: 52, textAlign: "center" }}>
        SHAT
        <br />
        ROULETTE
      </h1>

      <span
        aria-hidden
        style={{ marginTop: 18, width: 44, height: 3, borderRadius: 2, background: "var(--highlight)" }}
      />

      <p
        style={{
          margin: "18px 0 0",
          fontSize: 16,
          lineHeight: 1.45,
          color: "var(--text-3)",
          textAlign: "center",
          maxWidth: 280,
        }}
      >
        Random chat for people who are currently on the toilet.
      </p>

      <div className="spacer" />

      <div
        style={{ alignSelf: "stretch", display: "flex", alignItems: "center", gap: 10, padding: "0 6px" }}
      >
        <span className="mono" style={step}>01 CONFIRM</span>
        <span style={{ flexGrow: 1, height: 1, background: "var(--line)" }} />
        <span className="mono" style={step}>02 MATCH</span>
        <span style={{ flexGrow: 1, height: 1, background: "var(--line)" }} />
        <span className="mono" style={step}>03 CHAT</span>
      </div>

      <div
        style={{
          marginTop: 20,
          display: "flex",
          alignItems: "center",
          gap: 11,
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 999,
          padding: "11px 18px",
        }}
      >
        <span
          aria-hidden
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "var(--highlight)",
            boxShadow: "0 0 0 5px rgba(138,74,24,0.14)",
          }}
        />
        <span className="mono" style={{ fontSize: 13, fontWeight: 700 }}>
          <LiveCount />
        </span>
        <span
          className="mono"
          style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", color: "var(--muted)" }}
        >
          SHITTING RIGHT NOW
        </span>
      </div>

      <div
        style={{ marginTop: 26, alignSelf: "stretch", display: "flex", flexDirection: "column", gap: 14 }}
      >
        <Link href="/confirm" className="btn btn--primary">
          FIND MY SHITMATE
        </Link>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 8,
            minHeight: 44,
          }}
        >
          <span style={{ fontSize: 14, color: "var(--muted)" }}>Someone is already waiting.</span>
          <Link
            href="/global"
            style={{ fontSize: 14, fontWeight: 500, borderBottom: "1px solid rgba(138,74,24,0.45)" }}
          >
            How it works
          </Link>
        </div>
      </div>
    </main>
  );
}
