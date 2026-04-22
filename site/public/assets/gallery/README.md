# Gallery assets

Production gallery images live here. The `/gallery` page is currently a placeholder; when you build out the real gallery:

1. Drop images directly into this folder named as `01.jpg`, `02.jpg`, … (or any naming you want).
2. Generate a manifest (either hand-written `gallery.json` or Astro content collection) so `pages/gallery.astro` can iterate them without hardcoded filenames.
3. Use Astro's `<Image>` (from `astro:assets`) in a masonry layout — it auto-generates responsive `srcset` and modern formats.

Recommended treatment: 1600 px longest edge, 80 % quality JPEG, same warm/desaturated feel as the rest of the site.
