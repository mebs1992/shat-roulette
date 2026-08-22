# Shat Roulette — screen designs

Mobile UI mockups for the MVP: anonymous text chat between two people who are
currently on the toilet.

Live canvas: https://claude.ai/code/artifact/ed504eb8-9a9a-4237-90bb-35c2d4f2a5d9

## Screens

**Core journey** — Home, Confirmation, Matchmaking, Match Found, Shat Chat,
Conversation Prompts, End Chat, Post-Shit Summary.
**Secondary** — anonymous Stats, Global Shat Statistics.
**Alt directions** — two low-fi alternates ("Porcelain Daylight", "Tabloid Chaos")
against the chosen direction, "Deadpan Dark".

## Art direction (Deadpan Dark)

- Warm near-black `#0E0D0C`, porcelain `#F2EDE4`, one acid-lime accent `#C9F04B`,
  blush `#FF93B6` for the other party and destructive actions.
- Bricolage Grotesque (display) · Space Grotesk (UI) · JetBrains Mono (timers, IDs, labels).
- Icons are inline SVG, never emoji. Country identity is a mono country code.
- The interface plays it straight; the copy carries the joke.

All numbers in the mockups are placeholder sample data.

## Files

- `*.dc.html` — one artboard per screen (generated for the ten journey screens,
  handwritten for the two alt directions).
- `canvas.json` — artboard positions, pages and sticky notes for the canvas.
- `src/` — shared head/foot plus one body per screen; single source of truth for
  the shared CSS.
- `build.sh` — recomposes the ten journey artboards from `src/`. Run it after
  editing anything in `src/`; edits made directly to a generated `*.dc.html`
  (including ones exported back out of the canvas editor) will be overwritten.
- `shat-roulette-screens.html` — the published canvas, reseeded from the artboards.
