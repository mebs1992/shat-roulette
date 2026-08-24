"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "@/lib/session";
import type { Invite } from "@/app/api/invites/route";

/** Shows pending "come and shit with me" invites on the hub. Polls lightly. */
export function InviteBanner() {
  const router = useRouter();
  const { startShit } = useSession();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/invites", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { invites: Invite[] };
        if (alive) setInvites(data.invites);
      } catch {
        /* ignore */
      }
    };
    load();
    const id = setInterval(load, 15_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  if (invites.length === 0) return null;
  const invite = invites[0];

  async function accept() {
    setBusy(true);
    const res = await fetch("/api/invites/accept", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: invite.id }),
    });
    const data = (await res.json()) as { roomId?: string };
    if (res.ok && data.roomId) {
      startShit();
      router.push(`/matchmaking?room=${data.roomId}`);
    } else {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        marginTop: 14,
        display: "flex",
        alignItems: "center",
        gap: 12,
        background: "rgba(138,74,24,0.10)",
        border: "1px solid var(--highlight)",
        borderRadius: 16,
        padding: "14px 16px",
      }}
    >
      <span
        aria-hidden
        style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--highlight)", animation: "blink 1.4s ease-in-out infinite" }}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 2, flexGrow: 1, minWidth: 0 }}>
        <span style={{ fontSize: 15, fontWeight: 500 }}>{invite.fromUsername} wants to shit with you</span>
        <span className="mono" style={{ fontSize: 10, letterSpacing: "0.08em", color: "var(--muted)" }}>
          {invites.length > 1 ? `AND ${invites.length - 1} MORE` : "TAP TO JOIN THEM"}
        </span>
      </div>
      <button
        onClick={accept}
        disabled={busy}
        className="mono"
        style={{
          minHeight: 40,
          padding: "0 16px",
          border: "none",
          borderRadius: 999,
          background: "var(--fill)",
          color: "var(--surface)",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.1em",
          cursor: "pointer",
        }}
      >
        JOIN
      </button>
    </div>
  );
}
