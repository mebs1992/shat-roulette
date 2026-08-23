# Shat Roulette — screen designs

Mobile UI mockups for the MVP: anonymous text chat between two people who are
currently on the toilet.

Live canvas: https://claude.ai/code/artifact/ed504eb8-9a9a-4237-90bb-35c2d4f2a5d9

## Screens

**Core journey** — Home, Confirmation, You & Preference, Matchmaking, Match Found,
Shat Chat, Conversation Prompts, End Chat, Post-Shit Summary.
**Secondary** — anonymous Stats, Global Shat Statistics.
**Alt directions** — three low-fi alternates: the original dark/lime treatment,
"Porcelain Daylight" and "Tabloid Chaos".

## The mark

A toilet seat and a roulette wheel are the same shape. The outer ring is a seat,
broken at the front the way a real one is; inside it sit eight wedges, a hub and
a ball. One form carrying both halves of the name. It is pure SVG in
`currentColor`, so it recolors and scales anywhere — 24px is the practical floor,
below which the wedges close up. The brand sheet (`LogoSheet.dc.html`) carries
the lockups, app icons, size test, palette, and the two marks that lost.

## Art direction (beige & brown)

- Beige ground `#EFE4D2`, cards `#F8F2E6`, ink `#2B1D12`, chocolate fills `#6E4220`,
  burnt-sienna highlight `#8A4A18`, clay `#A4553C` for the other party and
  destructive actions.
- Bricolage Grotesque (display) · Space Grotesk (UI) · JetBrains Mono (timers, IDs, labels).
- Icons are inline SVG, never emoji. Country identity is a mono country code.
- The interface plays it straight; the copy carries the joke.

## Gender and matching

Gender is set once at entry (screen 3) alongside a matching preference — anyone,
men, women or non-binary only — with live waiting counts so the cost of filtering
is visible at the moment of choosing. It resurfaces as a filter chip on
matchmaking (with a one-tap widen), a tag on the match card, and in the anonymous
identity line in chat. It is editable from Stats. Nothing else about a person is
ever shown.

All numbers in the mockups are placeholder sample data.

## Files

- `*.dc.html` — one artboard per screen (generated for the ten journey screens,
  handwritten for the two alt directions).
- `canvas.json` — artboard positions, pages and sticky notes for the canvas.
- `src/` — shared head/foot plus one body per screen; single source of truth for
  the shared CSS.
- `build.sh` — recomposes the journey artboards and the brand sheet from `src/`. Run it after
  editing anything in `src/`; edits made directly to a generated `*.dc.html`
  (including ones exported back out of the canvas editor) will be overwritten.
- `shat-roulette-screens.html` — the published canvas, reseeded from the artboards.
