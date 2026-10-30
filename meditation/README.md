# Meditation Timer

A quiet timer for sitting. Choose how long, press Begin, and settle in: after
the preroll (5 seconds unless you change it) a singing bowl rings to begin,
and when the time is up the ending chime rings, three strikes unless you
change it. Open it at https://hoai2k.github.io/mini/meditation/ (add it to
the home screen for a full-screen app that works offline).

## How it works

- **Length**: the chips under the dial (5 to 60 minutes) or − and + by the
  minute (1 to 180; also in Settings, and ↑/↓ or +/− on a keyboard).
- **Begin** starts the **preroll**, a silent countdown to settle in, then the
  starting chime rings and the ring fills as the time passes. **Pause** holds
  the time and cancels the chimes still to come; **Resume** lines them up
  again. **End** stops the sitting and fades out any chime still ringing.
  Space or Enter is Begin/Pause/Resume, Esc is End.
- **Settings** (the gear):
  - **Preroll**: none, 5, 10, 15, 30 or 60 seconds, or any number up to 120
    (default 5).
  - **Starting chime** and **Ending chime**: one of six instruments (large
    singing bowl, small singing bowl, rin, tingsha, Koshi chimes, temple
    bell) and the number of strikes (start 1–3, default 1; end 1–5, default
    3), five seconds apart, each a little softer than the last. Choosing an
    instrument plays it.
  - **Interval chime**: off (default), or a single soft chime every 1 to 30
    minutes, never on top of the end.
  - **Volume**, and **keep the screen on** during a sitting (the Screen Wake
    Lock API; on by default, released when the sitting ends or pauses).
  - **Meditation length**, **Reset to defaults**, and **About the sounds**
    (credits).
  Settings are kept in the browser (`localStorage`).

The chimes are scheduled on the Web Audio clock when the sitting starts or
resumes, so they ring on time even when the browser throttles the page's
timers (a dimmed phone, a background tab). If the system suspends audio
altogether, the chimes are lined up again when the page comes back. On
iPhone the app asks for the "playback" audio session, so the ring/silent
switch doesn't mute the chimes (Safari 16.4 and later).

It is an app, not a game, so the controller-first title screen of
`GAME_GUIDELINES.md` doesn't apply.

## Chimes

Each instrument is a modal synthesis recipe in `app/src/sounds.js`: a strike
excites a handful of partials at the instrument's frequency ratios, each a
pair of slightly detuned sines (the split modes that make a bowl swell and
fade), decaying exponentially, with a short filtered-noise contact sound and
a little generated room reverb (`app/src/chimes.js`). The Koshi chimes play a
gust of rods tuned like the recording below.

Where a good freely licensed recording of the instrument exists, the app
plays that instead (`file` in `sounds.js`) and keeps the recipe as the
fallback. The recordings come from
[Wikimedia Commons](https://commons.wikimedia.org/wiki/Category:Singing_bowls),
which records the author and licence of every file; Freesound has more
(filter its search by the CC0 licence) but needs an account to download.
The candidates, each checked for its licence:

| Instrument | Recording | Author | Licence |
| --- | --- | --- | --- |
| Large singing bowl | [Tibetan Singing Bowl hit 11inch](https://commons.wikimedia.org/wiki/File:Tibetan_Singing_Bowl_hit_11inch.flac) (used) | דג בלי מלח (Dag Bli Melah) | CC BY-SA 4.0 |
| Small singing bowl | [Tibetan Singing Bowl hit 4.5inch](https://commons.wikimedia.org/wiki/File:Tibetan_Singing_Bowl_hit_4.5inch.flac) (used) | דג בלי מלח (Dag Bli Melah) | CC BY-SA 4.0 |
| Rin | [Japanese rin played as struck idiophone](https://commons.wikimedia.org/wiki/File:Japanese_rin_played_as_struck_idiophone.ogg) (used: its last, full strike) | MichaelMaggs | CC BY-SA 4.0 |
| Koshi chimes | [Windglockenspiel.Koshi](https://commons.wikimedia.org/wiki/File:Windglockenspiel.Koshi.ogg) (used: its first gust) | Membeth | CC0 |
| Singing bowl | [SingingBowl1](https://commons.wikimedia.org/wiki/File:SingingBowl1.ogg) (not used: low bit rate, cut off mid-ring) | BambooBeast | public domain |
| Singing bowl | [The sound of a singing bowl](https://commons.wikimedia.org/wiki/File:The_sound_of_a_singing_bowl.wav) (not used: a continuous rubbed tone that never decays, not a strike) | Valera N. Trubin | CC BY 4.0 |
| Temple bell | [Gong or bell vibrant (short)](https://commons.wikimedia.org/wiki/File:Gong_or_bell_vibrant_(short).ogg) (not used: 5.6 s, cut off mid-ring) | Stephan, via PDSounds | CC0 |

The tingsha and the temple bell are synthesized: no freely licensed recording
of either with a full ring-out turned up. A better one (or any recording you
prefer) can go in `intake/`.

The large-bowl and small-bowl originals are Commons' own MP3 transcodes of the
FLAC files, because the FLAC downloads were rate-limited. The large bowl's
original stops at 16 s while the bowl is still ringing, so its last 8 seconds
are a fade.

Recordings are made from the originals in `design/recordings/` by
`design/source/make_sounds.py`, which trims each to a single strike and its
ring-out, filters out rumble below 50 Hz, matches their peak level to the
synthesized chimes (−6 dBFS), fades the tail, and writes mono MP3 to
`app/sounds/`. Licence terms: CC0 and public domain need nothing; CC BY and
CC BY-SA need the credit (shown under About the sounds, generated from
`CREDITS` in `sounds.js`), and the trimmed CC BY-SA files stay under CC BY-SA.

## Files

- `app/index.html`, `app/styles.css`: the page.
- `app/src/main.js`: the dial, controls, settings sheet, wake lock and the
  session loop. `timer.js`: the timeline (preroll, chimes, phases) and a
  pausable clock (pure). `settings.js`: defaults, limits, storage (pure).
  `sounds.js`: the instruments and the credits (data). `chimes.js`: the Web
  Audio engine. `icons.js`: inline SVG buttons and the stand-in pictures.
- `app/sounds/`: the trimmed recordings.
- `app/data/asset-list.json`: which artwork is delivered (generated).
- `app/icons/`: the 180, 192 and 512 px icons, `favicon-32.png` and
  `favicon.ico` (16, 32 and 48 px), made by `design/source/make_icons.mjs`
  from `icon-1024.png` and `favicon-256.png` (the master art, not published)
  or, until they arrive, from the stand-in `app/icon.svg`.
- `design/image-requests.md`: the artwork requests (icon, favicon, library
  card cover, the meditation bowl, a backdrop, and a picture of each chime
  instrument), generated by `design/source/build_requests.py`. Until a file is
  delivered the app shows a stand-in (inline SVG, a CSS gradient). New art
  goes in `intake/`: convert it to the size and format in its request, flip
  its status in `build_requests.py`, rerun it, and rerun `make_icons.mjs` for
  the icon and favicon. The library card (`.meditation .cover` in the root
  `index.html`) already loads `assets/ui/cover.webp`.

## Checks

Run before committing (they cost no Actions minutes):

```sh
node --test meditation/app/test/*.test.mjs
python3 meditation/design/source/build_requests.py --check
python3 meditation/design/source/make_sounds.py --check
sh meditation/publish.sh local/pages/meditation
```

To try it locally, serve `meditation/app/` (for example
`python3 -m http.server -d meditation/app 8000`) and open
http://localhost:8000/ (`?test` exposes the state as `window.__meditation`
for browser tests). The service worker registers only over HTTPS.
