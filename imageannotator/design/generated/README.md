# Generated artwork

All four Round 1 images were generated with the built-in image generation tool
on October 19, 2026. The PNG files here preserve the original outputs; the app
ships resized PNG icons and WebP UI art.

The final prompt set is recorded in [image-requests.md](../image-requests.md).
Each prompt was sent separately, with these production instructions:

- `icon.png`: stylized-concept; finished app icon, square 1024×1024.
- `logo.png`: logo-brand; finished app wordmark, wide 4:1 composition intended
  for 1200×300 transparent PNG, tightly fitted typography. Exact text:
  “Image Annotator”. No watermark. Transparent background requested.
- `cover.png`: stylized-concept; library card cover, landscape 4:3 composition
  intended for 1200×900.
- `welcome.png`: stylized-concept; welcome illustration, landscape 4:3
  composition intended for 1200×900 transparent PNG. Keep all photos, pen,
  marks and shadows inside the canvas without clipping. Mountain, cat, and
  city photo content should each be identifiable. Transparent background requested.

Exports preserve aspect ratio and alpha. The wordmark's empty outer space is
trimmed before fitting it onto its 1200×300 transparent canvas. The icon master
is resized to 1024×1024; `../source/make_icons.mjs` makes the smaller icons.
