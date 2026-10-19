# MP3 Player

The music files on your own phone, tablet or computer, played like a streaming
app. Open it at https://hoai2k.github.io/mini/mp3player/ (add it to the home
screen for a full-screen app).

## Can a web page play the files on a phone?

Yes, with one limit: a web page can't look through a device's storage by
itself. The listener picks the songs (or, on Android and computers, a whole
folder) in the system's file picker, and the app copies each one into its own
storage in the browser (IndexedDB). From then on the library is there on every
visit and plays offline. Removing a song deletes only the app's copy; the file
on the device is never touched.

- **iPhone and iPad:** songs come from the Files app (On My iPhone, iCloud
  Drive, a USB stick and so on). Songs in the Apple Music app can't be reached
  by any web page, and protected (DRM) downloads won't play. Safari has no
  folder picker, so pick many files at once instead. The page can't set the
  volume there; the side buttons do, so the volume slider is hidden.
- **Android:** songs or whole folders from the device's storage (Chrome).
- **Computers:** songs, folders, or drag them onto the page.
- Copies take space: the browser shares the device's free space between
  sites. Settings shows how much is used and can ask the browser to keep the
  library safe from automatic clean-up (adding to the home screen helps on
  iOS). The browser decides what it can play: MP3, AAC/M4A, FLAC, WAV and
  Ogg/Opus where supported; a file it can't play is skipped and counted when
  adding.

## What it does

- **Library** with Songs, Albums and Artists. Songs show in **your order**
  (drag the ≡ handles in Edit, use the arrow keys on a handle, or "Move to the
  top/bottom" in a song's ⋯ menu) or sorted by title, artist, album or
  recently added. Search matches every word across title, artist, album and
  genre, ignoring case and accents.
- **Adding**: + (or the empty library's buttons) opens the file or folder
  picker; files can also be dropped on the page. Songs already in the library
  are skipped. Details come from the files' tags (ID3v1/v2 in MP3, MP4 atoms
  in M4A, FLAC and Ogg comments, WAV INFO), including cover art; failing that,
  from the file name (`03 - Title`, `Artist - Title`) and an
  `Artist/Album/song` folder layout. A `cover.jpg` or `folder.jpg` beside the
  songs is used for songs without art. Durations come from the tags or the
  MP3 frame headers, and are corrected when a song plays.
- **Artwork from the internet** for every song whose file has none, new and
  already in the library (Settings → Find missing artwork online, on by
  default). `src/artwork.js` searches Apple's iTunes Search API (free, no key,
  open to any web page) and downloads the 600 px cover into the library, so
  it stays offline afterwards. Stem and edit versions are searched as the
  original: labels such as `(Instrumental)`, `[Vocals Only]`, `- No Drums`,
  `(Slowed + Reverb)`, `120 BPM`, featured artists and stem-splitter file
  names (`song_vocals.wav`, `song.no_drums`, `htdemucs`) come off the title,
  and covers, karaoke and tribute versions lose out to the original. It tries
  the album (artist + album), then the song (artist + title), then, when the
  artist is known, that artist's picture; the title alone is searched only
  for songs with no artist, so a known artist never gets a stranger's
  same-named song. Songs of one album are looked up once. Searches run in the
  background about 3 seconds apart (Apple allows roughly 20 a minute), back
  off when Apple says to slow down, wait for a connection when offline, and
  don't repeat a search that found nothing for two weeks (Settings → Look
  again forces it). Songs nothing is found for keep a stand-in cover. The
  setting notes that titles and artists are sent to Apple.
- **Playlists** (the Playlists tab): New playlist, then add songs from the
  playlist's + (a searchable picker: tap to add or take out) or from any
  song's ⋯ → Add to playlist… (also in the full-screen player's ⋯). On a
  playlist's page: play or shuffle it, ✎ to drag songs into any order (or
  move them with the arrow keys) and − to take one out (it stays in the
  library), and ⋯ to rename it, queue it or delete it (its songs stay). The
  picture is its first cover, or four covers once it has four different
  ones. Songs leaving the library leave their playlists too (Undo puts them
  back where they were).
- **Automatic playlists** (Settings → Automatic playlists, one switch, on by
  default): songs with "(no bass)" in the title (any case, "(No-Bass)" too)
  go into a **No Bass** playlist, and "(no piano)" into **No Piano**, both
  songs already in the library and ones added later. A playlist appears only
  once a song for it is in the library, and goes again when none is left.
  They are ordinary playlists otherwise: reorder, rename, add other songs. A
  song taken out of one stays out, and a deleted one isn't made again; turning
  the switch off and on brings deleted ones back. With the switch off nothing
  is sorted in and the playlists made so far stay as ordinary playlists.
  The rules are `AUTO_RULES` in `src/playlists.js`.
- **Removing**: ⋯ → Remove from library, or − in Edit, with Undo for 8
  seconds. Settings → Remove all songs empties the library.
- **Playback** in the manner of Spotify: tap a song to play its list from
  there (all songs, an album, an artist, or search results). Play and Shuffle
  buttons on every list; previous restarts a song past 3 seconds; repeat off,
  all or one; shuffle keeps the current song and never repeats a song until
  the list is done. **Queue**: Play next and Add to queue (queued songs play
  before the list continues), a Queue page to jump ahead or remove queued
  songs. **Sleep timer** (5 minutes to an hour, or the end of the song).
  The full-screen player has the cover (swipe it sideways to skip, down to
  close), a seek bar, volume, and the "Playing from" source, which opens that
  album or artist.
- **Lock screen and headphones**: the Media Session API shows the song and
  cover and takes play, pause, previous, next and seeking from the lock
  screen, notification, headphones, car and keyboard media keys. Playback
  keeps going with the screen off or the app in the background.
- **Remembers** the queue, the song and the position, so a reload or a new
  visit carries on where it stopped (press play).
- **Keys** (computers): Space play/pause, ← → seek 10 s, Shift+← → previous
  and next, / search, Escape closes.
- **Offline**: `sw.js` caches the app itself (network first, so a new version
  arrives on the next visit).

It is an app, not a game, so the controller-first title screen of
`GAME_GUIDELINES.md` doesn't apply, and it deliberately keeps playing when the
tab is hidden: background play is the point of a music player.

## Files

- `app/index.html`, `app/styles.css`: the page.
- `app/src/main.js`: views, playback, queue page, menus, adding, removing and
  reordering. `player.js`: the `<audio>` element and Media Session.
  `queue.js`: what plays next (pure). `playlists.js`: playlists and the
  automatic collections (pure). `library.js`: sorting, albums,
  artists, search, the custom order (pure). `tags.js`: tag reading (pure,
  plus `readTags` for Files). `artwork.js`: covers from iTunes Search (the
  matching is pure, the fetch injectable). `store.js`: IndexedDB.
  `icons.js`: inline SVG icons.
- `app/data/asset-list.json`: which artwork is delivered (generated).
- `app/assets/ui/` (logo, welcome picture, library card cover) and
  `app/assets/art/` (the artist placeholder, tinted per artist, and eight
  stand-in covers, chosen from the album name for songs without cover art).
- `app/icons/`: `icon-1024.png` is the master icon art (not published); the
  180, 192 and 512 px icons are made from it by `design/source/make_icons.mjs`.
  `app/icon.svg` is the old stand-in, kept for when the PNG master is missing.
- `design/image-requests.md`: the artwork requests, generated by
  `design/source/build_requests.py`; round 1 is delivered
  (`design/image-deliveries.json` records the prompts and checksums). If a
  file is marked `requested` again the app falls back to its stand-in
  (gradient covers with a note, a CSS record on the welcome screen). New art
  goes in `intake/`: convert it to the size and format in its request, flip
  its status in `build_requests.py`, rerun it, and for the icon rerun
  `make_icons.mjs`.

The visual identity uses deep navy surfaces, sky-blue and mint-green controls,
and violet accents. The artwork follows that cool palette, with occasional
warm sunset details.

## Checks

Run before committing (they cost no Actions minutes):

```sh
node --test mp3player/app/test/*.test.mjs
python3 mp3player/design/source/build_requests.py --check
sh mp3player/publish.sh local/pages/mp3player
```

To try it locally, serve `mp3player/app/` (for example
`python3 -m http.server -d mp3player/app 8000`) and open
http://localhost:8000/. The service worker registers only over HTTPS.
