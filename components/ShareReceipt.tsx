"use client";

import { useState } from "react";
import { Share } from "@/components/icons";
import { renderReceipt } from "@/lib/receipt";
import type { Summary } from "@/lib/session";

/**
 * Turns the receipt into a real PNG and shares it — the Web Share sheet where
 * a phone supports sharing files (so it can go straight to Instagram/etc.),
 * a download everywhere else. This is the growth loop: a screenshot people
 * actually want to post.
 */
export function ShareReceipt({ summary }: { summary: Summary }) {
  const [busy, setBusy] = useState(false);

  async function share() {
    setBusy(true);
    try {
      const blob = await renderReceipt(summary);
      if (!blob) return;
      const file = new File([blob], "shat-roulette.png", { type: "image/png" });

      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav.canShare?.({ files: [file] }) && navigator.share) {
        await navigator.share({
          files: [file],
          title: "Shat Roulette",
          text: "Shit complete. 💩",
        });
      } else {
        // Fallback: hand them the image to save.
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "shat-roulette.png";
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
      }
    } catch {
      /* user cancelled the share sheet, or something transient */
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      className="btn btn--ghost"
      style={{ flexGrow: 1, minHeight: 50, gap: 8, fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 500 }}
      onClick={share}
      disabled={busy}
    >
      <Share />
      {busy ? "…" : "Share receipt"}
    </button>
  );
}
