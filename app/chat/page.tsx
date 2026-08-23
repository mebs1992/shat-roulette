"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Block, Bubble, Close, Dots, Flag, Send, Shuffle } from "@/components/icons";
import {
  GENDER_LABEL,
  PROMPTS,
  formatDuration,
  useElapsed,
  useSession,
  type EndReason,
} from "@/lib/session";

const SILENCE_MS = 40_000;

export default function ChatPage() {
  const router = useRouter();
  const {
    match, partnerStartedAt, messages, theyAreTyping, partnerLeft, notice, connection,
    sendMessage, setTyping, endChat, endShit, shitStartedAt, chatStartedAt,
  } = useSession();
  const mine = useElapsed(shitStartedAt);
  const theirs = useElapsed(partnerStartedAt);

  const [draft, setDraft] = useState("");
  const [tray, setTray] = useState(false);
  const [traySuppressed, setTraySuppressed] = useState(false);
  const [silent, setSilent] = useState(false);
  const [ending, setEnding] = useState(false);
  const [promptSeed, setPromptSeed] = useState(0);
  const [leaving, setLeaving] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivity = messages.length ? messages[messages.length - 1].at : chatStartedAt;

  // Bounce back to matchmaking if there is no match — but not while we are
  // deliberately leaving, or this races the push to the summary and wins.
  useEffect(() => {
    if (!match && !leaving) router.replace("/matchmaking");
  }, [leaving, match, router]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, theyAreTyping, tray, partnerLeft]);

  // Prompts surface themselves only after a genuinely awkward pause.
  useEffect(() => {
    if (!lastActivity || traySuppressed || partnerLeft) return;
    const id = setInterval(() => {
      const quiet = Date.now() - lastActivity > SILENCE_MS;
      setSilent(quiet);
      if (quiet) setTray(true);
    }, 2000);
    return () => clearInterval(id);
  }, [lastActivity, partnerLeft, traySuppressed]);

  useEffect(
    () => () => {
      if (typingTimer.current) clearTimeout(typingTimer.current);
    },
    [],
  );

  const prompts = useMemo(() => {
    const offset = promptSeed % PROMPTS.length;
    return [...PROMPTS.slice(offset), ...PROMPTS.slice(0, offset)].slice(0, 4);
  }, [promptSeed]);

  if (!match) return <main className="screen" />;

  function type(value: string) {
    setDraft(value);
    setTyping(true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => setTyping(false), 1200);
  }

  function send(text: string) {
    sendMessage(text);
    setTyping(false);
    setDraft("");
    setSilent(false);
    setTray(false);
  }

  function finish(next: "again" | "done", reason: EndReason = "leave") {
    setLeaving(true);
    endChat(reason);
    // "Done" ends the shit itself, not just this conversation.
    if (next === "done") void endShit();
    router.push(next === "again" ? "/matchmaking" : "/summary");
  }

  const offline = connection !== "online";

  return (
    <main className="screen screen--flush" style={{ height: "100dvh" }}>
      <header
        style={{
          padding: "max(56px, env(safe-area-inset-top)) 16px 12px",
          borderBottom: "1px solid var(--line-soft)",
          background: "rgba(239,228,210,0.92)",
          backdropFilter: "blur(8px)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button className="icon-btn" onClick={() => setEnding(true)} aria-label="End chat">
            <Close />
          </button>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, flexGrow: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, letterSpacing: "-0.01em" }}>
              Shitmate #{match.num}
            </div>
            <div className="mono" style={{ fontSize: 10, letterSpacing: "0.1em", color: "var(--muted)" }}>
              {GENDER_LABEL[match.gender].toUpperCase()} · {match.country} · ANONYMOUS
            </div>
          </div>
          <button
            onClick={() => finish("again")}
            style={{
              height: 40,
              padding: "0 16px",
              border: "1px solid var(--line-strong)",
              borderRadius: 999,
              background: "transparent",
              color: "var(--text-2)",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.1em",
              cursor: "pointer",
            }}
          >
            NEXT
          </button>
          <button className="icon-btn" onClick={() => setEnding(true)} aria-label="More">
            <Dots />
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <Timer label="Your shit" value={mine} color="var(--highlight)" />
          <Timer label="Their shit" value={theirs} color="var(--clay)" />
        </div>
      </header>

      {offline && (
        <div
          className="mono"
          style={{
            background: "rgba(164,85,60,0.14)",
            color: "var(--clay)",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.12em",
            textAlign: "center",
            padding: "8px 16px",
          }}
        >
          RECONNECTING — MESSAGES WON&apos;T SEND
        </div>
      )}

      <div
        ref={listRef}
        style={{ flexGrow: 1, overflowY: "auto", padding: "18px 16px", display: "flex", flexDirection: "column", gap: 10 }}
      >
        <div style={{ flexGrow: 1, minHeight: 0 }} />

        <div
          className="mono"
          style={{ textAlign: "center", fontSize: 10, letterSpacing: "0.1em", color: "var(--faint)", padding: "4px 0 8px" }}
        >
          CONNECTED · NEITHER OF YOU KNOWS ANYTHING
        </div>

        {messages.map((m) =>
          m.from === "me" ? (
            <div
              key={m.id}
              style={{
                alignSelf: "flex-end",
                maxWidth: "76%",
                background: "var(--fill)",
                color: "var(--surface)",
                borderRadius: "18px 18px 6px 18px",
                padding: "12px 15px",
                fontSize: 15,
                lineHeight: 1.4,
                fontWeight: 500,
              }}
            >
              {m.text}
            </div>
          ) : (
            <div
              key={m.id}
              style={{
                alignSelf: "flex-start",
                maxWidth: "76%",
                background: "var(--surface-2)",
                color: "var(--text-2)",
                borderRadius: "18px 18px 18px 6px",
                padding: "12px 15px",
                fontSize: 15,
                lineHeight: 1.4,
              }}
            >
              {m.text}
            </div>
          ),
        )}

        {theyAreTyping && !partnerLeft && (
          <>
            <div
              style={{
                alignSelf: "flex-start",
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "var(--surface-2)",
                borderRadius: "18px 18px 18px 6px",
                padding: "14px 16px",
              }}
            >
              {[0, 0.15, 0.3].map((delay) => (
                <span
                  key={delay}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "var(--muted)",
                    animation: `bob 1.2s ease-in-out infinite ${delay}s`,
                  }}
                />
              ))}
            </div>
            <div
              className="mono"
              style={{ alignSelf: "flex-start", fontSize: 10, letterSpacing: "0.08em", color: "var(--faint)", paddingLeft: 6 }}
            >
              SHITMATE IS TYPING
            </div>
          </>
        )}

        {silent && !tray && !partnerLeft && (
          <div
            className="mono"
            style={{ textAlign: "center", fontSize: 10, letterSpacing: "0.1em", color: "var(--faint)", padding: "6px 0" }}
          >
            SILENCE FOR 40 SECONDS. AWKWARD.
          </div>
        )}

        {partnerLeft && (
          <div
            className="mono"
            style={{ textAlign: "center", fontSize: 10, letterSpacing: "0.1em", color: "var(--clay)", padding: "10px 0" }}
          >
            {partnerLeft === "leave" ? "SHITMATE FLUSHED AND LEFT" : "SHITMATE VANISHED MID-SENTENCE"}
          </div>
        )}
      </div>

      {tray && !partnerLeft && (
        <div
          style={{
            margin: "0 12px",
            background: "var(--surface)",
            border: "1px solid var(--line-strong)",
            borderRadius: "22px 22px 0 0",
            padding: "16px 16px 18px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            animation: "sheet-in 0.2s ease-out",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15 }}>Nothing to say?</span>
            <span style={{ fontSize: 12, color: "var(--faint)" }}>Tap to send it</span>
            <button
              className="icon-btn"
              style={{ marginLeft: "auto", width: 32, height: 32 }}
              onClick={() => setTray(false)}
              aria-label="Close prompts"
            >
              <Close size={16} />
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {prompts.map((p) => (
              <button
                key={p}
                onClick={() => send(p)}
                style={{
                  minHeight: 46,
                  textAlign: "left",
                  border: "1px solid var(--line-soft)",
                  borderRadius: 13,
                  background: "var(--surface-2)",
                  color: "var(--text-2)",
                  fontFamily: "var(--font-ui)",
                  fontSize: 14,
                  padding: "12px 14px",
                  cursor: "pointer",
                }}
              >
                {p}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 44 }}>
            <button
              onClick={() => setPromptSeed((s) => s + 2)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                border: "none",
                background: "none",
                padding: 0,
                color: "var(--highlight)",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.1em",
                cursor: "pointer",
              }}
            >
              <Shuffle />
              SHUFFLE
            </button>
            <button
              onClick={() => {
                setTray(false);
                setTraySuppressed(true);
                setSilent(false);
              }}
              style={{ border: "none", background: "none", padding: 0, color: "var(--faint)", fontSize: 12, cursor: "pointer" }}
            >
              Stop suggesting things
            </button>
          </div>
        </div>
      )}

      {notice && !partnerLeft && (
        <div style={{ padding: "0 16px", marginBottom: -4 }}>
          <div
            style={{
              background: "rgba(164,85,60,0.12)",
              color: "var(--clay)",
              borderRadius: 12,
              padding: "10px 14px",
              fontSize: 13,
            }}
          >
            {notice}
          </div>
        </div>
      )}

      {partnerLeft ? (
        <div
          style={{
            padding: "14px 16px max(34px, env(safe-area-inset-bottom))",
            borderTop: "1px solid var(--line-soft)",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <button className="btn btn--primary" style={{ minHeight: 58 }} onClick={() => finish("again")}>
            NEXT SHITMATE
          </button>
          <button className="btn btn--ghost" style={{ minHeight: 52 }} onClick={() => finish("done")}>
            I&apos;M DONE
          </button>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(draft);
          }}
          style={{
            padding: "12px 16px max(34px, env(safe-area-inset-bottom))",
            borderTop: tray ? "none" : "1px solid var(--line-soft)",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <button
            type="button"
            onClick={() => {
              setTray((t) => !t);
              setTraySuppressed(false);
            }}
            aria-label="Conversation prompts"
            style={{
              width: 48,
              height: 48,
              flexShrink: 0,
              border: `1px solid ${tray ? "var(--highlight)" : "var(--line-strong)"}`,
              borderRadius: 14,
              background: tray ? "rgba(138,74,24,0.12)" : "transparent",
              color: tray ? "var(--highlight)" : "var(--faint)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <Bubble />
          </button>

          <input
            value={draft}
            onChange={(e) => type(e.target.value)}
            placeholder={offline ? "Waiting for the connection…" : "Say something…"}
            aria-label="Message"
            disabled={offline}
            style={{
              flexGrow: 1,
              minWidth: 0,
              height: 48,
              border: "1px solid var(--line-strong)",
              borderRadius: 14,
              padding: "0 16px",
              fontSize: 15,
              fontFamily: "var(--font-ui)",
              color: "var(--ink)",
              background: "transparent",
              outline: "none",
            }}
          />

          <button
            type="submit"
            disabled={!draft.trim() || offline}
            aria-label="Send"
            style={{
              width: 48,
              height: 48,
              flexShrink: 0,
              border: "none",
              borderRadius: 14,
              background: draft.trim() && !offline ? "var(--fill)" : "var(--surface-2)",
              color: draft.trim() && !offline ? "var(--surface)" : "var(--faint)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: draft.trim() && !offline ? "pointer" : "default",
            }}
          >
            <Send />
          </button>
        </form>
      )}

      {ending && (
        <EndSheet
          toilet={mine}
          chat={chatStartedAt ? formatDuration(Date.now() - chatStartedAt) : "00:00"}
          count={messages.length}
          onKeep={() => setEnding(false)}
          onNext={() => finish("again")}
          onDone={() => finish("done")}
          onReport={() => finish("done", "report")}
          onBlock={() => finish("done", "block")}
        />
      )}
    </main>
  );
}

function Timer({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      style={{
        flexGrow: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "var(--surface)",
        border: "1px solid var(--line-soft)",
        borderRadius: 12,
        padding: "9px 12px",
      }}
    >
      <span className="eyebrow" style={{ fontSize: 9, letterSpacing: "0.14em" }}>{label}</span>
      <span className="mono" style={{ fontSize: 14, fontWeight: 700, color }}>{value}</span>
    </div>
  );
}

function EndSheet({
  toilet, chat, count, onKeep, onNext, onDone, onReport, onBlock,
}: {
  toilet: string;
  chat: string;
  count: number;
  onKeep: () => void;
  onNext: () => void;
  onDone: () => void;
  onReport: () => void;
  onBlock: () => void;
}) {
  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", justifyContent: "center", zIndex: 10 }}>
      <div
        onClick={onKeep}
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(180deg, rgba(239,228,210,0.70) 0%, rgba(239,228,210,0.93) 60%)",
          backdropFilter: "blur(2px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          width: "100%",
          maxWidth: 390,
          background: "var(--surface)",
          borderTop: "1px solid var(--line-strong)",
          borderRadius: "26px 26px 0 0",
          padding: "12px 22px max(34px, env(safe-area-inset-bottom))",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          animation: "sheet-in 0.22s ease-out",
        }}
      >
        <div style={{ width: 44, height: 4, borderRadius: 3, background: "rgba(74,45,20,0.22)", margin: "0 auto 4px" }} />

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <h2 className="display" style={{ margin: 0, fontSize: 34 }}>Shit complete?</h2>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.45, color: "var(--muted)" }}>
            Your shitmate will never know how this ended.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, background: "var(--surface-2)", borderRadius: 14, padding: "12px 14px" }}>
          <SheetStat label="Toilet time" value={toilet} />
          <div style={{ width: 1, background: "var(--line-soft)" }} />
          <SheetStat label="Chat time" value={chat} />
          <div style={{ width: 1, background: "var(--line-soft)" }} />
          <SheetStat label="Messages" value={String(count)} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button className="btn btn--primary" style={{ minHeight: 58 }} onClick={onNext}>NEXT SHITMATE</button>
          <button className="btn btn--ghost" style={{ minHeight: 54 }} onClick={onDone}>I&apos;M DONE</button>
          <button className="btn btn--quiet" onClick={onKeep}>Actually, keep chatting</button>
        </div>

        <div style={{ height: 1, background: "var(--line-soft)" }} />

        <div style={{ display: "flex", gap: 10 }}>
          <DangerButton label="REPORT" icon={<Flag />} onClick={onReport} />
          <DangerButton label="BLOCK" icon={<Block />} onClick={onBlock} />
        </div>
      </div>
    </div>
  );
}

function SheetStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ flexGrow: 1, display: "flex", flexDirection: "column", gap: 3 }}>
      <span className="eyebrow" style={{ fontSize: 9 }}>{label}</span>
      <span className="mono" style={{ fontSize: 16, fontWeight: 700 }}>{value}</span>
    </div>
  );
}

function DangerButton({ label, icon, onClick }: { label: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        flexGrow: 1,
        minHeight: 44,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        border: "1px solid rgba(164,85,60,0.40)",
        borderRadius: 13,
        background: "transparent",
        color: "var(--clay)",
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.1em",
        cursor: "pointer",
      }}
    >
      {icon}
      {label}
    </button>
  );
}
