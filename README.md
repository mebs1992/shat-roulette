# Shat Roulette

Anonymous text chat between two people who are currently on the toilet.

This repository holds the front end and the design canvas it was built from.

## Running it

```
npm install
npm run dev     # http://localhost:3000
npm run build   # production build
```

Next.js 15 (App Router) + React 19 + TypeScript. Styling is plain CSS with the
design tokens as custom properties in `app/globals.css` — no utility framework,
so the values stay identical to the mockups.

There is **no backend yet**. `lib/session.ts` holds the whole session in React
state (persisted to localStorage) and stands in for matchmaking and the other
person: matching waits and resolves to a random shitmate, and replies arrive on
a timer with a typing indicator. Swapping it for a real service means replacing
that one module.

### Routes

| Route | Screen |
| --- | --- |
| `/` | Home |
| `/confirm` | Are you currently shitting? |
| `/preference` | Gender and matching preference |
| `/matchmaking` | Finding a shitmate |
| `/match` | Shitmate found |
| `/chat` | Shat chat, prompts tray, end-chat sheet |
| `/summary` | Post-shit receipt |
| `/stats` | Anonymous stats |
| `/global` | Global shat statistics |

## The designs

Mockups for the MVP, published as a design canvas.

Live canvas: https://claude.ai/code/artifact/ed504eb8-9a9a-4237-90bb-35c2d4f2a5d9

## Screens

**Core journey** — Home, Confirmation, You & Preference, Matchmaking, Match Found,
Shat Chat, Conversation Prompts, End Chat, Post-Shit Summary.
**Secondary** — anonymous Stats, Global Shat Statistics.
**Alt directions** — three low-fi alternates: the original dark/lime treatment,
"Porcelain Daylight" and "Tabloid Chaos".

## The mark

The poo emoji redrawn as a proper mark: three dollops, a curled tip, two eyes and
no mouth — the missing smile is the joke, it stares rather than grins. The eyes
are knocked out with an SVG mask, so they are transparent holes and the mark
drops onto any ground in a single fill color. 24px is the floor; below that the
eyes close up and it reads as silhouette (a faceless variant covers favicons and
watermarks). The brand sheet (`LogoSheet.dc.html`) carries the lockups, app
icons, size test, palette and variants.

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
