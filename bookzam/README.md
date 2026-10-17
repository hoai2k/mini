# Bookzam

Shazam for books. Open it at https://hoai2k.github.io/mini/bookzam/.

Made for phones first (portrait, one hand), and works on tablets and desktops
too. Add it to the home screen for a full-screen app.

## What it does

- **Catalogue.** Two lists, **Books** and **Board games**. Tap **+** on one
  and take or choose photos of shelves, piles or tables: everything read in a
  photo is taken as that list's kind (books are looked up on Open Library,
  games on Wikidata), so photograph books from Books and games from Board
  games. Add as
  many photos as you like; a title already in the list isn't added twice (the
  match ignores case, accents, punctuation, a leading "The" and subtitles, and
  checks the author's surname when both have one), and a later photo fills in
  an author the first one missed. Several photos can be picked at once; they're
  read one after another, each with a card saying what it added.
  - Each book is identified on [Open Library](https://openlibrary.org) (free,
    no key), which also gives its cover, first-published year, ISBN, pages,
    publisher and subjects.
  - Each board game is identified from about 5,200 games bundled with the app
    (`app/data/games.json`, from [Wikidata](https://www.wikidata.org), CC0):
    matched on the phone with no network, and tolerant of a misread letter in
    a long name. A game it doesn't have is searched on Wikidata online, among
    games with a BoardGameGeek ID. Either way it gets its year, player count,
    designers, a picture and a direct BoardGameGeek link. (BoardGameGeek's own API needs a registered key and doesn't allow
    requests from web pages.) A game's name may be one word (Azul, Catan) if
    it was read exactly; a box's small print ("2-5 players, ages 10+") is
    never an item.
  - Text that was read clearly but isn't a book Open Library knows is kept as
    printed with a yellow **?**, to correct or delete.
  - Tap an item to correct its title and author or designer (it's looked up
    again),
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
  says roughly where it is ("Near the top, on the left."), and zooms in on a
  thin spine by itself; tap the photo to zoom in or out. If it isn't there, it
  says so and offers the titles it could read as buttons to search for
  instead. **Search this photo again** with another title is instant: the
  photo is read once.
  - The circle goes round the text it read, so it sits on the right spine.
    A title from the catalogue also matches by its author and by how its
    spine read when it was catalogued.

## How photos are read

Everything runs on the phone; photos are never uploaded.

1. **Text detection and recognition** in a web worker
   (`app/src/ocr/worker.js`) with ONNX Runtime Web (WebAssembly) and
   PaddleOCR's PP-OCRv5 mobile models (`app/models/`, Apache 2.0, details in
   its README). The photo is read at up to 2560 px on its long side, since
   spine lettering is small; spines are read both ways up and the more
   confident reading kept. The first photo downloads the reader, about 25 MB
   (detector 4.8 MB, recogniser 7.8 MB, runtime 12 MB); the browser keeps it
   after that.
2. **Spines** (`app/src/ocr/spines.js`): lines that continue each other or
   sit side by side on one spine are grouped; neighbouring spines are kept
   apart (a line joins a group only if it fits every member), and labels in
   line across a shelf only join if Open Library confirms the joined title.
3. **Which book** (`app/src/ocr/identify.js`): one Open Library search with
   every word read, then, if that finds nothing, one with any of them ORed,
   so a misread word doesn't sink it. A result is accepted only if most of its
   title was read, in order, and its title and author explain most of what was
   read; a one-word title also needs its author, and words under five letters
   must match exactly (five/fire, java/lava). The same title by two authors
   with nothing naming either keeps the title only. Repeated searches on a
   shelf (a series) are asked once.
4. **Board games** (`app/src/games.js`): in the Board games list the same
   readings are matched against the bundled games first (an index of their
   names and aliases; long words may be a letter off), then searched on
   Wikidata (`haswbstatement:P2339`, games with a BoardGameGeek ID), every
   word then any word, with the same checks. Small print (player counts, ages,
   playing time) is dropped before anything is looked up.

Measured on five real photos (a dim bookcase photographed at an angle with a
shallow depth of field, a children's shelf, a bookshop shelf, a mixed
German/English shelf, picture books with tilted spines) against Cloudflare
Workers AI's Llama 4 Scout reading the same photos: on-device found and
identified more books on four of the five (all but the German shelf), and
placed Find Book's circle on the right spine, where Llama's boxes were a
bookcase off. A photo takes about 10 s to read on a laptop and 20–60 s in all
with the Open Library lookups; phones are slower.

It reads printed titles: thin spines, decorative lettering, glare, blur and
steep angles lose books. Straight on, close and well lit works best.

## Files

- `app/index.html`, `app/styles.css`, `app/src/`: the app (static ES modules,
  no build step).
  - `main.js`: the page: tabs, list, item sheet, menu, photo jobs, Find Book.
  - `catalogue.js`: title matching, merging scans, moving, filtering,
    sorting and the export format (pure, tested).
  - `reader.js`: drives the reading worker, turns lines into catalogue
    entries, and finds a title in a read photo (tested).
  - `ocr/`: `core.js` the image maths around the models (detector input, box
    finding, rotated crops, CTC decoding), `engine.js` runs the models,
    `worker.js` the web worker, `spines.js` grouping and fuzzy matching,
    `identify.js` the Open Library step (all but the worker tested).
  - `geometry.js`: photo sizes and the Find ring. `photo.js`: decoding
    (upright whatever the EXIF says), resizing, thumbnails. `games.js`:
    Wikidata board game search (tested). `lookup.js`: Open
    Library lookups after a title is edited. `store.js`: IndexedDB.
- `app/models/`: the PaddleOCR models and their sources.
- `app/data/games.json`: the bundled board games (Wikidata, CC0), rebuilt by
  `node bookzam/tools/build-games.mjs` (5,230 games, 390 KB, about 140 KB
  compressed; loaded only when a game is looked up). Each row is
  `[wikidata id, name, aliases, BGG id, year, min players, max players,
  designers, picture file, Wikipedia articles]`, best known first.
  `app/vendor/ort/`: ONNX Runtime Web 1.23.2 (MIT), the WebAssembly build.
- `app/icons/`: a stand-in icon (`icon.svg`, rendered to 180/192/512 PNGs)
  until the requested art arrives.
- `design/image-requests.md`: the art to generate.
- `tools/browser-check.mjs`: a walk-through on a phone-sized Chromium with
  the real reader on photos it draws (a bookshelf with spines both ways up and
  a book lying flat, added to Books; a stack of game boxes, added to Board
  games), Open Library and Wikidata mocked.
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

Board games carry `designer`, `designers`, `publisher`, `year`, `players`
("1-5"), `image`, `wikidata` and `boardGameGeek` (the game's page when
Wikidata knows its BoardGameGeek ID, else a search) instead of the Open
Library fields.

## Checks

```sh
node --test bookzam/app/test/*.test.mjs
bookzam/publish.sh local/pages/bookzam
node bookzam/tools/build-games.mjs --check
node bookzam/tools/browser-check.mjs   # needs playwright-core in local/tools
```
