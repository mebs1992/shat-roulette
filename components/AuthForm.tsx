"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { Mark } from "@/components/Mark";

const field: React.CSSProperties = {
  height: 54,
  width: "100%",
  border: "1px solid var(--line-strong)",
  borderRadius: 14,
  padding: "0 16px",
  fontSize: 16, // 16px or iOS zooms the page on focus
  fontFamily: "var(--font-ui)",
  color: "var(--ink)",
  background: "var(--surface)",
  outline: "none",
};

export function AuthForm({ mode }: { mode: "join" | "signin" }) {
  const router = useRouter();
  const joining = mode === "join";
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(joining ? "/api/auth/signup" : "/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(joining ? { username, email, password } : { email, password }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "That didn't work.");
        setBusy(false);
        return;
      }
      router.push("/confirm");
      router.refresh();
    } catch {
      setError("Couldn't reach the server. Try again.");
      setBusy(false);
    }
  }

  return (
    <main className="screen" style={{ alignItems: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, marginTop: 12 }}>
        <Mark size={64} />
        <h1 className="display" style={{ margin: 0, fontSize: 34, textAlign: "center" }}>
          {joining ? "Make an account" : "Welcome back"}
        </h1>
        <p
          style={{
            margin: 0,
            fontSize: 14,
            lineHeight: 1.45,
            color: "var(--muted)",
            textAlign: "center",
            maxWidth: 280,
          }}
        >
          {joining
            ? "Your username is only ever shown to friends. Strangers see a number."
            : "Your shits are where you left them."}
        </p>
      </div>

      <form onSubmit={submit} style={{ alignSelf: "stretch", marginTop: 28, display: "flex", flexDirection: "column", gap: 10 }}>
        {joining && (
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            autoComplete="username"
            autoCapitalize="none"
            aria-label="Username"
            style={field}
          />
        )}
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          aria-label="Email"
          style={field}
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          type="password"
          autoComplete={joining ? "new-password" : "current-password"}
          aria-label="Password"
          style={field}
        />

        {error && (
          <div
            style={{
              background: "rgba(164,85,60,0.12)",
              color: "var(--clay)",
              borderRadius: 12,
              padding: "10px 14px",
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        <button type="submit" className="btn btn--primary" disabled={busy} style={{ marginTop: 4 }}>
          {busy ? "…" : joining ? "CREATE ACCOUNT" : "SIGN IN"}
        </button>
      </form>

      <div className="spacer" />

      <div style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 44 }}>
        <span style={{ fontSize: 14, color: "var(--muted)" }}>
          {joining ? "Already have one?" : "No account yet?"}
        </span>
        <Link
          href={joining ? "/signin" : "/join"}
          style={{ fontSize: 14, fontWeight: 500, borderBottom: "1px solid rgba(138,74,24,0.45)" }}
        >
          {joining ? "Sign in" : "Make one"}
        </Link>
      </div>
    </main>
  );
}
