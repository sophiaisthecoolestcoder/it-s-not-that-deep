import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";
import sitemap from "@astrojs/sitemap";

// Public marketing site for Bleiche Resort & Spa.
// Static output — deploys to Cloudflare Pages / Netlify / Vercel / any CDN.
// View Transitions are opted-in per layout via <ViewTransitions />.
export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || "https://www.bleiche-resort.de",
  output: "static",
  integrations: [
    react(),
    tailwind({ applyBaseStyles: false }),
    sitemap(),
  ],
  vite: {
    // Large media lives in /public and is served verbatim; don't let Vite try
    // to inline or transform it.
    assetsInclude: ["**/*.mp4", "**/*.webm", "**/*.mp3", "**/*.wav"],
  },
});
