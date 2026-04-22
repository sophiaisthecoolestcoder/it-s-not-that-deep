# Site audio assets

## `background.mp3`

Ambient loop consumed by `AudioToggle.tsx`. Currently ~14 MB which is large for a web loop — before going live, recompress to **≤ 500 KB** by shortening to a seamless 15–30 s segment and encoding mono at 128 kbps:

```bash
ffmpeg -i background.mp3 -t 20 -ac 1 -b:a 128k -af "afade=t=in:d=1,afade=t=out:st=19:d=1" background-trimmed.mp3
```

(The `afade` filters mask the loop seam. Replace `-t 20` / `st=19` with the desired length — 1 s less than duration.)

## Guidelines for a replacement

- **Short** (10–30 seconds), **seamless loop** at sample boundaries
- **Mono or low-bitrate stereo**, 128 kbps MP3 — target under 500 KB
- **Subtle**: no melodic content, no vocals, no beat. Spreewald ambience: moving water, distant birds, wind through alder leaves
- **Quiet**: the toggle plays at 25 % volume by default, and it's user-gated (browsers block autoplay-with-sound)

Good free sources: [Freesound.org](https://freesound.org/) CC0 recordings of slow-moving water or forest ambience. Stitch with Audacity's `Crossfade Tracks` effect for a seamless loop.

## How it's wired

`site/src/layouts/BaseLayout.astro` mounts `<AudioToggle client:idle src="/assets/audio/background.mp3" />` on every page. Howler streams the file (html5 = true), loops it, and toggles on click. Preference is stored in `localStorage` so returning visitors aren't asked twice.
