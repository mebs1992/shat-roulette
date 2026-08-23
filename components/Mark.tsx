"use client";

import { useId } from "react";

/**
 * The Shat Roulette mark: three dollops, a curled tip, eyes knocked out with a
 * mask so they stay transparent holes on any ground. One fill colour.
 * Below 24px the eyes close up — pass `faceless` for favicons and watermarks.
 */
export function Mark({
  size = 48,
  color = "var(--fill)",
  faceless = false,
}: {
  size?: number;
  color?: string;
  faceless?: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const maskId = `mark-eyes-${uid}`;

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-hidden="true">
      {!faceless && (
        <defs>
          <mask id={maskId}>
            <rect width="100" height="100" fill="#fff" />
            <ellipse cx="41" cy="56" rx="4.7" ry="5.4" fill="#000" />
            <ellipse cx="59" cy="56" rx="4.7" ry="5.4" fill="#000" />
          </mask>
        </defs>
      )}
      <g fill={color} mask={faceless ? undefined : `url(#${maskId})`}>
        <path d="M38 42 C39 28 45 16 55 9 C63 3.5 70 11 63 16.5 C56 22 52.5 30 52 42 Z" />
        <ellipse cx="50" cy="41" rx="21.5" ry="11.5" />
        <ellipse cx="50" cy="60" rx="32" ry="13.5" />
        <path d="M12 90 C7 90 5.5 87 6.5 83 C9.5 72 27 66 50 66 C73 66 90.5 72 93.5 83 C94.5 87 93 90 88 90 Z" />
      </g>
    </svg>
  );
}
