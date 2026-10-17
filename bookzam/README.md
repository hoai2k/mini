# Bookzam

Shazam for books. Open it at https://hoai2k.github.io/mini/bookzam/.

Made for phones first (portrait, one hand), and works on tablets and desktops
too. Add it to the home screen for a full-screen app.

## What it does

- **Catalogue.** Tap **+** and take or choose photos of shelves, piles or
  tables. Each photo is read for every book and board game whose title shows,
  and they go into two separate lists, **Books** and **Board games**. Add as
  many photos as you like; a title already in the list isn't added twice (the
  match ignores case, accents, punctuation, a leading "The" and subtitles, and
  checks the author's surname when both have one), and a later photo fills in
  an author the first one missed. Several photos can be picked at once; they're
  read one after another, each with a card saying what it added.
  - Each book is then looked up on [Open Library](https://openlibrary.org)
    (free, no key) for its cover, first-published year, ISBN, pages, publisher
    and subjects. Board games link to a BoardGameGeek search instead (its API
    needs a registered key and doesn't allow browser requests).
  - Titles the reader wasn't sure of get a yellow **?**.
  - Tap an item to correct its title or author (a book is looked up again),
    move it between books and board games, delete it, see the photos it was
    found in, open it on Open Library, Goodreads, Google Books or
    BoardGameGeek, or **Find on shelf**.
  - Search and sort (newest, title, author) each list.
  - The **⋯** menu exports books or board games as JSON (shared through the
    phone's share sheet on a phone, downloaded on a computer), lists the
    photos (deleting one removes the items only it found) and clears the
    catalogue.
  - Everything is kept on the device in IndexedDB, with the photos as small
    thumbnails. The full photos are never stored.
- **Find Book.** Type a title (the field suggests titles from your catalogue)
  and photograph the shelf. Bookzam circles the book in yellow, dims the rest,
  and says where to look ("second shelf from the top, a third of the way in").
  Tap the photo to zoom in on it. If it isn't there, it says so and offers the
  closest titles it could see as buttons to search for instead. **Search this
  photo again** retries the same photo with a new title.
  - It looks twice: once at the whole photo, then at a close-up cut from the
    full-resolution original around what it found, which shows the spines in
    far more detail and tightens the circle. If the close-up disagrees, the
    first circle stays.

## How photos are read

The page shrinks each photo to at most 1568 px on its long edge (JPEG, about
300 KB) and posts it to the shared mini-rooms worker
(`multiplayer/server/src/bookzam.js`): `POST /bookzam/scan` for the catalogue
and `POST /bookzam/find` with the title for Find Book. The worker builds the
prompts itself, so the routes can only read shelves, and allows 40 photos per
person per 10 minutes and only this site's origins.

- **With Claude** (set the worker secret once: `cd multiplayer/server && npx
  wrangler secret put ANTHROPIC_API_KEY`): Claude Opus 5.5 reads the photo
  with structured JSON output. It reads small and sideways spine text well
  and places the find box closely. Roughly 5–10 US cents a photo (more for a
  crowded shelf), and a Find is two calls.
- **Without the key**, Workers AI's Llama 4 Scout vision model reads it, free
  within Cloudflare's daily allowance. It reads fewer spines, especially thin
  or stylised ones, and its boxes are looser. If a Claude call fails, the
  worker falls back to it too.

The menu says which one read your last photo. `?api=http://localhost:8787`
points the page at a local `wrangler dev`.

## Files

- `app/index.html`, `app/styles.css`, `app/src/`: the app (static ES modules,
  no build step).
  - `main.js`: the page: tabs, list, item sheet, menu, photo jobs, Find Book.
  - `catalogue.js`: title matching, merging scans, moving, filtering,
    sorting and the export format (pure, tested).
  - `geometry.js`: photo sizes, the Find close-up crop and the ring (pure,
    tested).
  - `photo.js`: decoding (upright whatever the EXIF says), resizing,
    thumbnails. `api.js`: the worker calls. `lookup.js`: Open Library.
    `store.js`: IndexedDB.
- `app/icons/`: a stand-in icon (`icon.svg`, rendered to 180/192/512 PNGs)
  until the requested art arrives.
- `design/image-requests.md`: the art to generate.
- `tools/browser-check.mjs`: a walk-through on a phone-sized Chromium with
  the photo server and Open Library mocked.
- `publish.sh`: copies the app to `local/pages/bookzam/`.

## Export format

```json
{
  "app": "Bookzam", "kind": "books", "exported": "2026-10-17T09:00:00.000Z", "count": 1,
  "items": [{
    "title": "Dune", "author": "Frank Herbert", "year": 1965, "isbn": "9780441172719",
    "publisher": "Ace Books", "pages": 535, "subjects": ["Science fiction"],
    "openLibrary": "https://openlibrary.org/works/OL893415W",
    "cover": "https://covers.openlibrary.org/b/id/…-M.jpg",
    "matchedTitle": "Dune", "matchedAuthors": ["Frank Herbert"],
    "added": "2026-10-17T08:58:00.000Z", "confidence": 0.95, "photos": 1
  }]
}
```

Board games carry `publisher`, `designer`, `year` and a `boardGameGeek`
search link instead of the Open Library fields.

## Checks

```sh
node --test bookzam/app/test/*.test.mjs
bookzam/publish.sh local/pages/bookzam
node bookzam/tools/browser-check.mjs   # needs playwright-core in local/tools
cd multiplayer/server && npm test      # the worker routes
```
