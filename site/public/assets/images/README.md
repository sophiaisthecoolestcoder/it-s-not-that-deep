# Site image assets

Drop production images into this directory. Current placeholders referenced by the scaffold:

| Path | Where it's used | Suggested size |
|---|---|---|
| `hero-poster.jpg` | First-frame still for the hero video (shown until `background.mp4` loads) | 1920×1080 |
| `og-cover.jpg` | Social-link preview card | 1200×630 |
| `menu-side.jpg` | Right-hand photo pane in the full-screen hamburger menu | 1400×2000 (portrait) |
| `placeholder-room.jpg` | Home — "Zimmer & Suiten" tile | 1200×1200 (square) |
| `placeholder-spa.jpg` | Home — "Landtherme Spa" tile | 1200×1200 |
| `placeholder-arrangements.jpg` | Home — "Arrangements" tile | 1200×1200 |
| `placeholder-story.jpg` | Home — "Unsere Geschichte" chess-block | 1200×1200 |
| `placeholder-events.jpg` | Home — "Veranstaltungen" tile | 1200×1200 |
| `placeholder-gallery.jpg` | Home — "Galerie" tile | 1200×1200 |
| `placeholder-culture.jpg` | Home — "Kultur" tile | 1200×1200 |
| `placeholder-kitchen.jpg` | Home — "Küche" chess-block | 1200×1200 |
| `placeholder-tile.jpg` | Fallback used by `<Tile>` when no image passed | 1200×1200 |

Treatment (to match the bleiche.de feel): warm, slightly desaturated, never oversharpened. Dusk/dawn tones, candlelight, steam. Avoid anything loud or neon.

Use the Astro `<Image>` helper (`import { Image } from 'astro:assets'`) for any image placed in `src/assets/` — it gets automatic format conversion (WebP/AVIF) and responsive `srcset`. Images in `public/` are served verbatim.
