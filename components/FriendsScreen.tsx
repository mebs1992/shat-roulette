"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSession } from "@/lib/session";
import { ChevronLeft } from "@/components/icons";
import type { Friend } from "@/lib/friends";

export function FriendsScreen({ friends: initial }: { friends: Friend[] }) {
  const router = useRouter();
  const { startShit } = useSession();
  const [friends, setFriends] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);

  async function invite(friendId: string) {
    setBusy(friendId);
    const res = await fetch("/api/invites", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ friendId }),
    });
    const data = (await res.json()) as { roomId?: string };
    if (res.ok && data.roomId) {
      startShit();
      router.push(`/matchmaking?room=${data.roomId}`);
    } else {
      setBusy(null);
    }
  }

  async function accept(id: string) {
    setBusy(id);
    await fetch("/api/friends/accept", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setFriends((all) => all.map((f) => (f.id === id ? { ...f, state: "accepted" } : f)));
    setBusy(null);
    router.refresh();
  }

  async function remove(id: string) {
    setBusy(id);
    await fetch("/api/friends", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setFriends((all) => all.filter((f) => f.id !== id));
    setBusy(null);
    router.refresh();
  }

  const incoming = friends.filter((f) => f.state === "incoming");
  const accepted = friends.filter((f) => f.state === "accepted");
  const pending = friends.filter((f) => f.state === "pending");
  const shitting = accepted.filter((f) => f.presence === "shitting").length;
  const available = accepted.filter((f) => f.presence === "available").length;

  return (
    <main className="screen">
      <div style={{ display: "flex", alignItems: "center", minHeight: 44 }}>
        <button className="icon-btn" style={{ marginLeft: -12 }} onClick={() => router.push("/")} aria-label="Back">
          <ChevronLeft />
        </button>
        <div className="eyebrow" style={{ margin: "0 auto", paddingRight: 32 }}>Shitty friends</div>
      </div>

      <div className="card" style={{ marginTop: 12, borderRadius: 20, padding: "18px 20px", display: "flex", alignItems: "center", gap: 12 }}>
        <span
          aria-hidden
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: shitting ? "var(--highlight)" : "var(--line-strong)",
            animation: shitting ? "blink 1.6s ease-in-out infinite" : undefined,
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span className="mono" style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>
            {shitting}
          </span>
          <span className="eyebrow" style={{ fontSize: 10 }}>
            {shitting === 1 ? "Friend shitting now" : "Friends shitting now"}
          </span>
        </div>
        <div style={{ flexGrow: 1 }} />
        <span className="mono" style={{ fontSize: 11, color: "var(--muted)", letterSpacing: "0.08em", textAlign: "right" }}>
          {available} AROUND
          <br />
          {accepted.length} TOTAL
        </span>
      </div>

      {incoming.length > 0 && (
        <Section title="Wants to be friends">
          {incoming.map((friend) => (
            <Row key={friend.id} friend={friend}>
              <button
                onClick={() => accept(friend.id)}
                disabled={busy === friend.id}
                style={pill("var(--fill)", "var(--surface)")}
              >
                ACCEPT
              </button>
              <button onClick={() => remove(friend.id)} disabled={busy === friend.id} style={pill("transparent", "var(--muted)", true)}>
                NO
              </button>
            </Row>
          ))}
        </Section>
      )}

      {accepted.length > 0 && (
        <Section title="Friends">
          {accepted.map((friend) => (
            <Row key={friend.id} friend={friend}>
              <button onClick={() => invite(friend.id)} disabled={busy === friend.id} style={pill("var(--fill)", "var(--surface)")}>
                INVITE
              </button>
              <button onClick={() => remove(friend.id)} disabled={busy === friend.id} style={pill("transparent", "var(--clay)", true)}>
                REMOVE
              </button>
            </Row>
          ))}
        </Section>
      )}

      {pending.length > 0 && (
        <Section title="Waiting on them">
          {pending.map((friend) => (
            <Row key={friend.id} friend={friend}>
              <span className="mono" style={{ fontSize: 10, letterSpacing: "0.1em", color: "var(--faint)" }}>SENT</span>
            </Row>
          ))}
        </Section>
      )}

      {friends.length === 0 && (
        <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 10 }}>
          <span className="display" style={{ fontSize: 26 }}>No shitty friends yet.</span>
          <span style={{ fontSize: 14, lineHeight: 1.5, color: "var(--muted)", maxWidth: 300 }}>
            After a chat you can add the person you met. They only ever see your username once you are both in.
          </span>
        </div>
      )}

      <div className="spacer" />

      <div style={{ minHeight: 44, display: "flex", alignItems: "center" }}>
        <span style={{ fontSize: 12, lineHeight: 1.45, color: "var(--faint)" }}>
          Friends see your username and when you are shitting. Nothing else.
        </span>
      </div>
    </main>
  );
}

function pill(background: string, color: string, bordered = false): React.CSSProperties {
  return {
    minHeight: 36,
    padding: "0 12px",
    border: bordered ? "1px solid var(--line-strong)" : "none",
    borderRadius: 999,
    background,
    color,
    fontFamily: "var(--font-mono)",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.1em",
    cursor: "pointer",
  };
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 10 }}>
      <span className="eyebrow" style={{ fontSize: 10 }}>{title}</span>
      <div style={{ display: "flex", flexDirection: "column" }}>{children}</div>
    </div>
  );
}

function Row({ friend, children }: { friend: Friend; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 0",
        borderTop: "1px solid var(--line-soft)",
      }}
    >
      <span
        aria-hidden
        style={{
          width: 8,
          height: 8,
          flexShrink: 0,
          borderRadius: "50%",
          background:
            friend.presence === "shitting"
              ? "var(--highlight)"
              : friend.presence === "available"
                ? "var(--clay)"
                : "transparent",
          border: friend.presence === "offline" ? "1px solid var(--line-strong)" : "none",
          animation: friend.presence === "shitting" ? "blink 1.6s ease-in-out infinite" : undefined,
        }}
      />
      <div style={{ flexGrow: 1, display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
        <span style={{ fontSize: 15, fontWeight: 500 }}>{friend.username}</span>
        <span
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: "0.08em",
            color:
              friend.presence === "shitting"
                ? "var(--highlight)"
                : friend.presence === "available"
                  ? "var(--clay)"
                  : "var(--faint)",
          }}
        >
          {friend.presence === "shitting" ? "SHITTING NOW" : friend.presence === "available" ? "AROUND" : "OFFLINE"}
          {` · #${friend.shitmateNum}`}
          {friend.country ? ` · ${friend.country}` : ""}
          {friend.streakDays > 0 ? ` · ${friend.streakDays}D` : ""}
        </span>
      </div>
      <div style={{ display: "flex", gap: 8 }}>{children}</div>
    </div>
  );
}
