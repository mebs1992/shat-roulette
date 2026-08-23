# Shat Roulette

Anonymous text chat between two people who are currently on the toilet.

This repository holds the front end and the design canvas it was built from.

## Running it

Two processes — the app, and the realtime worker it talks to:

```
npm install
npm run realtime   # the Cloudflare worker, on :8787
npm run dev        # the app, on :3000
```

`cp .env.local.example .env.local` first. `npm run typecheck` covers both the
app and the worker; `npm run build` builds the app.

## How it fits together

Next.js 15 (App Router) + React 19 + TypeScript for the UI. Styling is plain
CSS with the design tokens as custom properties in `app/globals.css` — no
utility framework, so the values stay identical to the mockups.

Matchmaking and chat run on a **Cloudflare Durable Object** (`worker/`). One
lobby object holds the queue and relays messages for the pairs it makes: a
Durable Object is single-threaded, so pairing has no race to lose. It is also
the whole backend — there is **no database**. Messages are relayed in memory
and never stored, which is both the cheapest and the most defensible place to
be. Per-device stats stay in `localStorage`.

`worker/protocol.ts` is the wire contract, shared by both sides.
`lib/realtime.ts` is the browser client (reconnects with backoff, deliberately
does not pretend a dropped chat can be resumed). `lib/session.ts` maps that
onto React state.

What the lobby enforces: gender-preference matching, longest-wait-first
queueing, a message rate limit, a maximum message length, mutual blocks that
never rematch, and structured report logging (visible in `wrangler tail`).

## Deploying

The worker needs a free Cloudflare account:

```
npx wrangler login
npm run realtime:deploy
```

Then point the app at it by setting `NEXT_PUBLIC_REALTIME_URL` to
`wss://<worker>.<your-subdomain>.workers.dev/ws`.

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

Chat also covers the states a real connection forces: the shitmate leaving or
dropping out, a lost connection, an empty queue, and server-side rejections.

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
