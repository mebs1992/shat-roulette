"use client";

import { useEffect } from "react";

/**
 * Loads the webfont stylesheet after mount instead of in the document head.
 *
 * A render-blocking <link> to a third-party font host stalls the HTML parser,
 * which stops Next's scripts executing and leaves the page hydrated-never —
 * visible but completely dead. A slow or blocked fonts.googleapis.com must
 * cost us nice type, not the whole app, so the page boots on the fallback
 * stack and upgrades when (if) the stylesheet arrives.
 */
export function FontStylesheet({ href }: { href: string }) {
  useEffect(() => {
    if (document.querySelector(`link[data-fonts="1"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.setAttribute("data-fonts", "1");
    document.head.appendChild(link);
  }, [href]);

  return null;
}
