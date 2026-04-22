# Site video assets

## `background.mp4`

Full-bleed hero video for the landing page. Currently the file you uploaded; a real production replacement should meet:

- **Duration:** 12–25 seconds, seamless loop (end frame ≈ start frame)
- **Resolution:** 1920×1080 (1080p) — 4K wastes bandwidth for a backgrounded, shaded, auto-scaling element
- **Bitrate / file size:** target **< 6 MB**. Too big = slow first paint. `ffmpeg` recipe:
  ```bash
  ffmpeg -i input.mov -vcodec libx264 -crf 26 -preset slow \
         -movflags +faststart -pix_fmt yuv420p -an background.mp4
  ```
  (`-an` strips audio — the element is muted anyway, no reason to ship unused audio.)
- **Content:** slow-moving water, fog on the Fließe, candlelit interior, steam rising over the Landtherme pool. **Avoid** anything with cuts, panning faces, motion over 20 % of the frame. The feel is ambient, not cinematic.

`<video>` is served muted + autoplay + loop + playsinline, with a 35 % dark gradient shade overlaid via CSS so white serif display type stays legible.

## Offering a lighter variant

For slow connections, serve a 720p WebM alongside:
```html
<video ...>
  <source src="/assets/videos/background.webm" type="video/webm" />
  <source src="/assets/videos/background.mp4" type="video/mp4" />
</video>
```
Update `HeroVideo.astro` when you want this.
