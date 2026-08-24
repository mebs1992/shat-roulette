"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "@/components/icons";
import type { SearchResult } from "@/lib/friends";

export function FriendSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    const clean = query.trim();
    if (clean.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const mine = ++seq.current;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/friends/search?q=${encodeURIComponent(clean)}`);
        const data = (await res.json().catch(() => null)) as { results?: SearchResult[] } | null;
        // Ignore a stale response that came back after a newer keystroke.
        if (mine !== seq.current) return;
        setResults(res.ok ? data?.results ?? [] : []);
      } finally {
        if (mine === seq.current) setSearching(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  async function add(result: SearchResult) {
    setBusy(result.id);
    const res = await fetch("/api/friends", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ friendId: result.id }),
    });
    const data = (await res.json().catch(() => null)) as { state?: SearchResult["state"] } | null;
    if (res.ok && data?.state) {
      const next = data.state;
      setResults((all) => all.map((r) => (r.id === result.id ? { ...r, state: next } : r)));
      if (next === "accepted") router.refresh();
    }
    setBusy(null);
  }

  const clean = query.trim();

  return (
    <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 0 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          height: 48,
          padding: "0 14px",
          border: "1px solid var(--line-strong)",
          borderRadius: 14,
          background: "var(--surface)",
        }}
      >
        <span style={{ color: "var(--faint)", display: "flex", flexShrink: 0 }}>
          <Search />
        </span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Add a friend by username"
          aria-label="Search for a friend by username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          style={{
            flexGrow: 1,
            minWidth: 0,
            border: "none",
            background: "transparent",
            outline: "none",
            fontSize: 15,
            fontFamily: "var(--font-ui)",
            color: "var(--ink)",
          }}
        />
        {clean.length > 0 && (
          <button
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="mono"
            style={{
              border: "none",
              background: "none",
              color: "var(--faint)",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.08em",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            CLEAR
          </button>
        )}
      </div>

      {clean.length >= 2 && (
        <div style={{ display: "flex", flexDirection: "column", marginTop: 6 }}>
          {results.map((r) => (
            <div
              key={r.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 2px",
                borderTop: "1px solid var(--line-soft)",
              }}
            >
              <div style={{ flexGrow: 1, display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                <span style={{ fontSize: 15, fontWeight: 500, color: "var(--ink)" }}>{r.username}</span>
                <span className="mono" style={{ fontSize: 10, letterSpacing: "0.08em", color: "var(--faint)" }}>
                  #{r.shitmateNum}
                </span>
              </div>
              <Action result={r} busy={busy === r.id} onAdd={() => add(r)} />
            </div>
          ))}

          {!searching && results.length === 0 && (
            <span style={{ fontSize: 13, color: "var(--faint)", padding: "12px 2px" }}>
              Nobody by that name. Usernames are exact.
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function Action({ result, busy, onAdd }: { result: SearchResult; busy: boolean; onAdd: () => void }) {
  const base: React.CSSProperties = {
    minHeight: 36,
    padding: "0 14px",
    borderRadius: 999,
    fontFamily: "var(--font-mono)",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.1em",
    flexShrink: 0,
  };

  if (result.state === "accepted") {
    return <span className="mono" style={{ ...base, color: "var(--faint)", display: "flex", alignItems: "center" }}>FRIENDS</span>;
  }
  if (result.state === "pending") {
    return <span className="mono" style={{ ...base, color: "var(--faint)", display: "flex", alignItems: "center" }}>SENT</span>;
  }

  const label = result.state === "incoming" ? "ACCEPT" : "ADD";
  return (
    <button
      onClick={onAdd}
      disabled={busy}
      style={{ ...base, border: "none", background: "var(--fill)", color: "var(--surface)", cursor: "pointer" }}
    >
      {busy ? "…" : label}
    </button>
  );
}
