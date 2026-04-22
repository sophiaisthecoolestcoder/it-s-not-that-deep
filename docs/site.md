# Public Marketing Site

High-level doc for the public-facing `www.bleiche-resort.de` website. Day-to-day implementation details live in [`site/README.md`](../site/README.md); this document is about **why the site exists as a separate app** and **how it integrates with the rest of the system**.

## Why it's separate from `frontend/`

The platform (`frontend/`) and the website (`site/`) share a brand but almost nothing else:

| | `frontend/` (platform) | `site/` (website) |
|---|---|---|
| Audience | Authenticated staff | Anonymous visitors / prospective guests |
| Primary job | Interactive workflows (offers, belegung, HR, POS) | Content, storytelling, conversion to booking |
| SEO needs | None (behind login) | Critical (first-paint, semantic HTML, sitemap, OG) |
| First-paint budget | ~1 MB is fine (workspace app) | < 100 KB target for mobile |
| Styling constraint | React Native Web (inline styles) | Free choice (Tailwind) |
| Asset handling | Minimal | Heavy — video, gallery, audio |
| Motion vocabulary | Crisp, functional | Slow, ambient, zen |

Trying to share the bundle would drag RN polyfills into anonymous visitor traffic (slow first paint, bad SEO) and force the marketing design into the platform's style system. Two apps, one backend, one design language keeps both honest.

## Repository shape

```
backend/       ← FastAPI + PostgreSQL. Grows a `/api/public/*` namespace for the site.
frontend/      ← React Native platform app. Unchanged by the site's existence.
site/          ← Astro + React islands + Tailwind marketing website. New.
docs/          ← This file plus site/README.md cover the architecture.
```

Three deploys from one monorepo:
- Backend → `api.bleiche-resort.de`
- Platform → `app.bleiche-resort.de`
- Website → `www.bleiche-resort.de`

## Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Astro 4** | Content-first, ships zero JS by default, island hydration for interactive bits, first-class React support, built-in View Transitions. |
| UI | **React 18** (islands only) | Shared mental model with the platform; needed only where interactivity exists (hamburger menu, audio toggle, events fetcher). |
| Styling | **Tailwind CSS 3** | Matches the brand palette used in the platform (`#C2A98C`, `#8B6A43`, `#535353`); content-only utility classes keep the CSS bundle tiny. |
| Motion | **Framer Motion** for island animations + **Lenis** for smooth scroll + Astro **View Transitions** for page cross-fades | Smooth, slow, zen. Respects `prefers-reduced-motion`. |
| Audio | **Howler.js**, user-gated | Browsers block autoplay-with-sound. Toggle persists to localStorage. |
| Sitemap / OG | `@astrojs/sitemap` + per-page `<meta>` in `BaseLayout.astro` | SEO baseline. |
| Deploy target | Static hosts (Cloudflare Pages / Netlify / Vercel) | Free tier covers small-hotel traffic; nothing server-side needed. |

## Data flow

The site consumes **only** the backend's `/api/public/*` namespace — unauthenticated, rate-limited, read-only, explicitly opt-in.

Router lives at [`backend/app/routers/public.py`](../backend/app/routers/public.py). Current endpoints:

- `GET /api/public/events?upcoming_days=90&event_type=…` — upcoming events admin has flagged `public=true`. Recurrence is expanded through the same service the internal calendar uses (`services/calendar_expand.py`).
- `GET /api/public/health` — plumbing probe.

Rate limit: 120 req/min per client IP (`public_ip_limiter` in `app/security.py`). X-Forwarded-For is respected when the backend is behind a proxy.

### Making data "public"

The principle: no data leaves the backend to the internet unless an admin explicitly opts it in. For calendar events this is a `public: bool` column (migration `202704a1b2c3`, default `false`). For any future public-facing model (featured offers, gallery captions, packages), follow the same pattern:

1. Add a `public: bool` (or richer visibility concept) to the model + migration.
2. Add a filtered endpoint under `/api/public/`.
3. Paint a toggle in the platform admin UI so staff can control what appears on the website.
4. Expose a helper in `site/src/lib/api.ts` and a React island that hydrates it.

### Future public endpoints (not built yet)

Sketched direction for the most likely next additions:

- `GET /api/public/offers` — featured packages/arrangements (marketable offers, not guest quotes). Would need a `public: bool` on `offers` or, more likely, a separate `packages` model.
- `GET /api/public/gallery` — manifest of gallery images with captions. Could live in a new `gallery_images` table or a filesystem-driven Astro content collection.
- `GET /api/public/availability?from=…&to=…` — room availability for the booking widget. Most complex — needs inventory modelling that the platform doesn't yet have.

## Interaction with the LLM assistant

The public site does **not** call the assistant. The LLM endpoints are authenticated and will stay that way — giving anonymous visitors an LLM at our cost is a denial-of-service invitation.

If we later want an on-site chatbot, it should be a separate, heavily-rate-limited, non-tool-using model that answers only from a curated knowledge base. That's a deliberate v2+ conversation.

## Governance

- Nothing the admin marks `public=true` should contain personal guest data. The `/api/public/events` endpoint returns `EventOccurrence` which carries `participants`; this is fine for role- or user-scoped events (where participants are the interesting bit), but for a **public** event we'd typically want zero named participants — the endpoint currently returns whatever is on the event, so admin discretion applies.
- **To-do before going public:** strip participant details from `EventOccurrence` when served through the `/api/public/events` route (or simply: refuse to mark any event with participants as `public`). Tracked as a deferred item.

## Operations

- `cd site && npm install && npm run dev` — local dev on port 4321.
- `cd site && npm run build` — static build.
- Root-level wrappers: `run-site.bat` / `run-site.sh`.
- Env: `site/.env` from `.env.example`. `PUBLIC_API_BASE_URL` determines which backend the site fetches from — local dev vs prod.
- Deploy: any static host. Typical flow is CI builds `site/dist/` and publishes to Cloudflare Pages on every main-branch push.

## What's in scope for v1

A scaffold — **not content**. What's in the repo right now:

- Astro + React + Tailwind wired up
- Brand design system (palette, fonts, section rhythm)
- Layout + nav + footer + full-screen hamburger
- Full-bleed shaded hero video using `background.mp4`
- Home page, events page, rooms / spa / gallery / contact placeholders
- Upcoming-events widget hydrated from `/api/public/events`
- Ambient audio toggle (user-gated)
- Smooth scroll + View Transitions

What's NOT in scope yet (deferred but laid out in `site/README.md`):

- Real images + production-quality hero video encode
- Real ambient audio loop
- Booking / reservation funnel
- Gallery content + masonry layout
- Blog / stories section (Astro content collection)
- German legal pages (Impressum, Datenschutz, AGB)
- i18n (DE ↔ EN) beyond the language-switcher stub
