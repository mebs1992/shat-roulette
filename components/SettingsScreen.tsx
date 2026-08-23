"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronLeft } from "@/components/icons";

export function SettingsScreen({ username, email, publicName }: { username: string; email: string | null; publicName: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  async function deleteAccount() {
    setBusy(true);
    await fetch("/api/auth/account", { method: "DELETE" });
    router.push("/");
    router.refresh();
  }

  return (
    <main className="screen">
      <div style={{ display: "flex", alignItems: "center", minHeight: 44 }}>
        <button className="icon-btn" style={{ marginLeft: -12 }} onClick={() => router.back()} aria-label="Back">
          <ChevronLeft />
        </button>
        <div className="eyebrow" style={{ margin: "0 auto", paddingRight: 32 }}>Account</div>
      </div>

      <div className="card" style={{ marginTop: 18, padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
        <Row label="Username" value={username} hint="Only your Shitty Friends see this." />
        <div style={{ height: 1, background: "var(--line-soft)" }} />
        <Row label="Strangers see" value={publicName} hint="Never your username." />
        <div style={{ height: 1, background: "var(--line-soft)" }} />
        <Row label="Email" value={email ?? "—"} hint="Only used to sign you in." />
      </div>

      <div className="spacer" />

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <button className="btn btn--ghost" onClick={signOut} disabled={busy}>SIGN OUT</button>

        {confirming ? (
          <div className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12, borderColor: "rgba(164,85,60,0.40)" }}>
            <span style={{ fontSize: 14, lineHeight: 1.45, color: "var(--text-2)" }}>
              This deletes your account, your stats and your streak. It cannot be undone.
            </span>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={deleteAccount}
                disabled={busy}
                style={{
                  flexGrow: 1,
                  minHeight: 48,
                  border: "none",
                  borderRadius: 13,
                  background: "var(--clay)",
                  color: "var(--surface)",
                  fontFamily: "var(--font-display)",
                  fontWeight: 800,
                  fontSize: 15,
                  cursor: "pointer",
                }}
              >
                DELETE IT
              </button>
              <button className="btn btn--ghost" style={{ flexGrow: 1, minHeight: 48 }} onClick={() => setConfirming(false)}>
                KEEP IT
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            style={{
              minHeight: 48,
              border: "none",
              background: "none",
              color: "var(--clay)",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Delete my account
          </button>
        )}
      </div>
    </main>
  );
}

function Row({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span className="eyebrow" style={{ fontSize: 9 }}>{label}</span>
      <span style={{ fontSize: 16, fontWeight: 500 }}>{value}</span>
      <span style={{ fontSize: 12, color: "var(--faint)" }}>{hint}</span>
    </div>
  );
}
