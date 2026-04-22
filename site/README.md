# Bleiche Resort — Public Marketing Site

Static marketing website for **www.bleiche-resort.de**, built with Astro + React islands + Tailwind. Separate from the operations platform in `frontend/` — see `docs/site.md` for the high-level architecture.

## Getting started

```bash
cd site
cp .env.example .env
npm install
npm run dev          # → http://localhost:4321
```

The dev server hot-reloads on file saves. It fetches live public events from the local backend at `http://localhost:8000` (set `PUBLIC_API_BASE_URL` in `.env` if yours is elsewhere).

From the repo root, `run-site.bat` (Windows) or `run-site.sh` (macOS/Linux) wraps `npm install` + `npm run dev` in one go.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with HMR on `0.0.0.0:4321` |
| `npm run build` | Static build to `dist/` (ready for any CDN) |
| `npm run preview` | Serve the built `dist/` locally |
| `npm run typecheck` | `astro check` — TS + Astro type validation |

## Directory layout

```
site/
├── astro.config.mjs         ← Astro + React + Tailwind + Sitemap integrations
├── tailwind.config.mjs      ← brand palette, fonts, animations
├── tsconfig.json
├── package.json
├── .env.example
├── public/
│   └── assets/
│       ├── images/          ← static JPGs/PNGs (see images/README.md)
│       ├── videos/          ← background.mp4 + any other hero clips
│       ├── audio/           ← ambient loop (user-gated)
│       └── gallery/         ← full-res gallery images
└── src/
    ├── layouts/
    │   └── BaseLayout.astro ← <head>, View Transitions, nav, footer, audio toggle
    ├── pages/               ← one .astro file per route
    │   ├── index.astro      ← landing (hero + 3-up tiles + chess-block + events widget)
    │   ├── events.astro     ← list of upcoming public events from /api/public/events
    │   ├── rooms.astro      ← placeholder
    │   ├── spa.astro        ← placeholder
    │   ├── gallery.astro    ← placeholder
    │   └── contact.astro    ← placeholder
    ├── components/
    │   ├── Nav.astro        ← top rail, transparent-over-hero
    │   ├── Footer.astro
    │   ├── HeroVideo.astro  ← full-bleed shaded video + display type + scroll cue
    │   ├── Tile.astro       ← square image tile with centred serif heading
    │   ├── ChessBlock.astro ← 50/50 text + image section, flip-direction prop
    │   └── islands/         ← React components (hydrated by Astro)
    │       ├── HamburgerMenu.tsx   ← full-screen slide-in menu (Framer Motion)
    │       ├── AudioToggle.tsx     ← ambient audio player (Howler, localStorage-persisted)
    │       ├── EventsWidget.tsx    ← fetches /api/public/events, scroll-reveals cards
    │       └── SmoothScroll.tsx    ← Lenis buttery scroll (respects prefers-reduced-motion)
    ├── lib/
    │   └── api.ts           ← public API client — ONLY hits /api/public/*
    └── styles/
        └── global.css       ← fonts, brand CSS custom props, section rhythm utilities
```

## Design system

Palette — matches the platform brand tokens exactly so guests crossing between the site and the platform stay in the same visual world:

| Token | Hex | Use |
|---|---|---|
| `sand-50` / `sand-100` | `#FAF0EA` / `#EEE5DA` | section backgrounds |
| `sand-400` | `#C2A98C` | primary accent, CTA underlines |
| `sand-600` | `#8B6A43` | hover states, bronze rules |
| `ink-500` | `#535353` | primary text (never pure black) |
| `ink-400` | `#787978` | captions, labels |
| `amber-soft` | `#FAC429` | seasonal promo bubbles (sparingly) |

Typography:

- **Playfair Display** → `font-display`, for `<h1>`/`<h2>` and hero taglines
- **Noto Serif** → body text (via `font-serif`)
- **Noto Sans** → UI labels, eyebrows, nav (`font-sans`), usually uppercased + `tracking-widest`

All three load from Google Fonts in `src/styles/global.css`.

## Motion

| Effect | Implementation | Notes |
|---|---|---|
| Smooth scroll | `SmoothScroll` island (Lenis) | Opt-in per page via `<SmoothScroll client:idle />`. Respects `prefers-reduced-motion`. |
| Page transitions | Astro's `<ViewTransitions />` in `BaseLayout` | Uses the browser's View Transitions API where available, falls back gracefully. Cross-fade duration tuned in `global.css`. |
| Scroll reveal | Framer Motion `whileInView` inside islands | Used in `EventsWidget`; copy-paste the same pattern into new islands. |
| Hero scroll cue | CSS `animate-bounce` on chevron | |
| Ambient audio | `AudioToggle` island (Howler) | Strictly user-gated; state persisted in localStorage. |
| Tile hover | CSS `group-hover:scale-105` + gradient darken | 1.4 s ease-out-slow — deliberately slow. |

## Data flow

The site reads from the backend's **public, unauthenticated** API namespace only:

- `GET /api/public/events?upcoming_days=90` — events the admin has flagged `public=true`
- `GET /api/public/health` — plumbing check

Every call is rate-limited per client IP (120/min). The site never hits the authenticated platform routes. See `backend/app/routers/public.py` for the server side.

To expose a new piece of public data:

1. Add an opt-in flag (`public: bool`) or curated selection to the underlying model.
2. Add an endpoint to `backend/app/routers/public.py`.
3. Add a helper to `src/lib/api.ts`.
4. Hydrate a React island (`src/components/islands/`) that calls the helper.

## Deployment

Target host: Cloudflare Pages, Netlify, or Vercel — any static-site host. The build output is plain HTML + CSS + JS islands + the contents of `public/`.

Build command: `npm run build`.
Output directory: `dist/`.

Set `PUBLIC_SITE_URL` and `PUBLIC_API_BASE_URL` as build-time env vars on the host:

- `PUBLIC_SITE_URL=https://www.bleiche-resort.de`
- `PUBLIC_API_BASE_URL=https://api.bleiche-resort.de`

Then point DNS: `www.bleiche-resort.de` → CDN; `api.bleiche-resort.de` → backend; `app.bleiche-resort.de` → platform.

## What's NOT here (deferred)

- Real images and real video (current `background.mp4` is your upload — ship a tighter 1080p encode per `public/assets/videos/README.md`).
- Real ambient audio loop (see `public/assets/audio/README.md`).
- Booking widget / reservation funnel — the bleiche.de site links out to a hotel-booking provider; when we add one we can either iframe it or build a lightweight React island backed by a new `/api/public/availability` endpoint.
- Gallery page content + masonry layout.
- Blog / stories section (MDX-based content collection).
- Legal pages (Impressum, AGB, Datenschutz) — required under German law before LIVE.
