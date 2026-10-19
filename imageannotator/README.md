# Image Annotator

Open a picture from your phone or computer, point things out on it with
arrows, circles and free drawing, give any of them a title, then save it back
to your photos or files. Open it at https://hoai2k.github.io/mini/imageannotator/
(add it to the home screen for a full-screen app).

## How it works

1. **Open an image** (the file picker, which on a phone also offers the photo
   library and camera). On a computer you can also drop a picture on the page
   or paste one.
2. **Mark it up.** The tool bar at the bottom has three tools:
   - **Arrow** (the default): tap anywhere and an arrow points at that spot.
     Its tail comes from the middle of the picture, so it stays on the image;
     press and drag instead to pull the tail out where you want it. A
     selected arrow shows a dashed ring as wide as the arrow is long: drag
     the tip (white handle, the arrow's centre of rotation) to move it, and
     drag the tail (blue handle) or anywhere on the ring to swing it round
     the tip, which keeps pointing at the same spot.
   - **Circle**: tap to circle something, or drag out from the middle. A
     selected circle moves by dragging its middle (anything inside it) and
     changes size by dragging its edge.
   - **Free draw**: draw with a finger or the mouse. Strokes are drawn over
     other marks; a plain tap on a mark selects it, and a selected drawing
     moves by dragging.
   Tapping a mark selects it; ✓ (or Esc) lets go, 🗑 (or Delete) removes it.
   Undo and redo cover every change.
3. **Settings** (⚙, shown while a mark is selected): color (eight colors or
   any color), line width, opacity, the arrow's length, and an optional
   **title** with its font, size and an optional background. The last
   settings used for each tool become that tool's defaults (kept in the
   browser).
4. **Titles** are placed automatically near their mark (past an arrow's
   tail, outside a circle, beside a drawing), clear of the other titles,
   the marks and the picture's edges (`src/layout.js` tries 16 directions at
   four distances and scores each spot). Drag a title to place it yourself:
   it keeps its offset from its mark and follows it when the mark moves, and
   the automatic titles make room for it. A title away from its mark gets a
   thin leader line. "Place title automatically" in Settings undoes a drag.
5. **Save** keeps the picture and its marks in the browser (IndexedDB), so
   the start screen offers to continue it on the next visit, still editable.
   Only one picture is kept; saving another replaces it.
6. **Export** (once saved, with no unsaved changes) makes the finished file:
   - **Original format**, full size, when the browser can write it (JPEG,
     PNG, and WebP where supported). HEIC and other formats a browser can't
     write offer JPEG instead.
   - **JPEG**, full size, quality 0.92.
   - **JPEG for web**: at most 1920 px on the long side, quality 0.8.
   Each option shows its pixel size and file size; the files are made when
   the dialog opens so the save button can hand one over straight away.
   On **iPhone and iPad**, "Save to Photos or Files" opens the share sheet
   (choose Save Image or Save to Files). On **Android** the file goes to
   Downloads (where Files and the gallery find it), with Share… for other
   apps. On a **computer** it downloads, or opens a Save As window in
   browsers that have one. JPEG puts see-through pictures on white.

Zoom with two fingers (or Ctrl/⌘ + scroll, or + and −), pan by scrolling or
by dragging outside the picture, and ⤢ (or 0) fits it again. Keys: A, C, D
pick the tools, Ctrl/⌘+Z and Shift+Ctrl/⌘+Z undo and redo, Ctrl/⌘+S saves.

Sizes (line width, title size, arrow length) are in thousandths of the
picture's longer side, so a setting looks the same on a screenshot and on a
big photo. Exports keep the full resolution, except that pictures over 16.7
megapixels (the most iOS Safari can draw) are scaled down to that. Camera
metadata (EXIF location, date) is not copied into exported files; the
picture is turned upright as the browser shows it.

It is an app, not a game, so the controller-first title screen of
`GAME_GUIDELINES.md` doesn't apply.

## Files

- `app/index.html`, `app/styles.css`: the page.
- `app/src/main.js`: opening, the view (zoom and pan), gestures, the
  settings sheet, save and export. `geometry.js`: arrow, circle and stroke
  geometry and hit-testing (pure). `layout.js`: title placement (pure).
  `render.js`: drawing marks and titles on a canvas, shared by the editor and
  the export. `exporter.js`: the export choices, sizes and file names (pure)
  and the encoding and hand-over. `store.js`: IndexedDB. `icons.js`: inline
  SVG icons.
- `app/data/asset-list.json`: which artwork is delivered (generated).
- `design/generated/`: the four original generated PNGs and generation notes.
  All Round 1 artwork is delivered and used by the app and library card.
- `app/icons/`: the 180, 192 and 512 px icons, made by
  `design/source/make_icons.mjs` from `icon-1024.png` (the master art, not
  published) or, until it arrives, from the stand-in `app/icon.svg`.
- `design/image-requests.md`: the artwork requests (icon, wordmark, library
  card cover, start-screen picture), generated by
  `design/source/build_requests.py`. Until a file is delivered the app shows
  a stand-in (an SVG picture on the start screen, the text title, a gradient
  card). New art goes in `intake/`: convert it to the size and format in its
  request, flip its status in `build_requests.py`, rerun it, rerun
  `make_icons.mjs` for the icon, and for the card cover add it to
  `.imageannotator .cover` in the root `index.html`.

## Checks

Run before committing (they cost no Actions minutes):

```sh
node --test imageannotator/app/test/*.test.mjs
python3 imageannotator/design/source/build_requests.py --check
sh imageannotator/publish.sh local/pages/imageannotator
```

To try it locally, serve `imageannotator/app/` (for example
`python3 -m http.server -d imageannotator/app 8000`) and open
http://localhost:8000/ (`?test` exposes the state as `window.__annotator` for
browser tests). The service worker registers only over HTTPS.
