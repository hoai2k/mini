# Bronze Drum (prototype)

A drum-command rhythm game about the Trưng sisters, who raised an army of
women against Han rule around 40 CE. It adapts Phong Nguyen's novel
*Bronze Drum*, staged as a backlit paper-cut theatre.

Play the prototype at https://hoai2k.github.io/mini/bronzedrum/. It has nine
chapters in story order: four battles, four call-and-answer chapters (echo
the caller's rhythm), and one casting chapter (keep pace with the bellows).
[`design/design.md`](design/design.md) lists them.

**Drum Practice**, on the title screen, has no right or wrong. In free drumming
the crew loops whatever rhythm you drum and dancers gather. In call and answer
a partner trades rhythms with you. You can set the length (2 to 12 strokes) and
swap the bronze drum for one of five other kits.

It plays with a controller, a keyboard, a mouse, or on a phone or tablet held
sideways, where the bronze drum becomes the instrument: tap its centre and its rim.
On a phone the first tap in landscape goes full screen (on iPhone Safari, swipe
up to hide the bars, or add the game to the home screen).

- [`design/design.md`](design/design.md): the concept, the core loop, the art
  direction and the open questions.
- [`design/image-requests.md`](design/image-requests.md): the image requests,
  generated from [`design/source/build_requests.py`](design/source/build_requests.py).
  Edit the data there and rerun it. The script also writes
  `game/assets/manifest.json`, which the game reads.
- [`design/sound-effects.md`](design/sound-effects.md) and
  [`design/music-requests.md`](design/music-requests.md): the sound effects
  (generated with ElevenLabs) and the prompts for the score, both built from
  [`design/source/build_audio.py`](design/source/build_audio.py).
- [`design/screens/`](design/screens/): screenshots of the prototype with the
  delivered art.
- [`game/`](game/): the prototype itself, static ES modules with no build step.
- [`workbench/`](workbench/): the sound workbench, published at
  https://hoai2k.github.io/mini/bronzedrum/workbench/. It plays each chapter's
  ambience next to its alternate takes (level-matched, with an optional drum
  over them), every effect take and the music, and lets you mark each one and
  copy the notes. Its catalogue, `sounds.json`, is written by `build_audio.py`;
  `--alternates` makes the alternate beds and `--music-trial` the music experiment.

## Run and check

```sh
cd bronzedrum/game
python3 -m http.server 8123     # then open http://localhost:8123/
node --test test/*.test.mjs     # rhythm reader, chapters, battles, practice
node scripts/check.mjs          # syntax and manifest ids
python3 ../design/source/build_requests.py --check
python3 ../design/source/build_audio.py --check
python3 ../design/source/build_web_art.py --check
python3 ../design/source/build_rigs.py --check
```

## Music

The five core tracks are delivered: the title theme (`mu-title`), the chapter
select (`mu-select`), the battle and story beds (`mu-bed-battle`,
`mu-bed-story`) and the ending (`mu-ending`). The rest of
[`design/music-requests.md`](design/music-requests.md) is optional; each
chapter falls back to the shared bed until its own arrives.

The tracks as delivered are kept in `design/music-masters/<id>.mp3` (not
published). To add or replace one, put it there under its request id and run:

```sh
python3 bronzedrum/design/source/build_audio.py --music
```

This writes the game's copy to `game/assets/music/` (cover art stripped, silence
trimmed, matched to −17 LUFS, 128 kbps) and measures the loop points of the
looping tracks into `design/source/music-loops.json`: where the body starts
after the fade-in and ends before the fade-out. The game never restarts a loop
outright. Just before the loop end it starts a second copy at the loop start
and crossfades the two over three seconds on an equal-power curve, so neither
the track's own fades nor the gap browsers leave when an MP3 loops are heard.

## Sound effects

All sound effects come from ElevenLabs. To generate missing effects, or to
remake one, run:

```sh
python3 bronzedrum/design/source/build_audio.py --generate [--force <id>]
```

The script reads the API key from the `ELEVENLABS_API_KEY` environment variable
(set it in the cloud environment's settings) or from `~/.config/elevenlabs.key`.
The key is never committed.

Each take is checked by measuring its level over time and how its energy splits
between low and high frequencies. Takes that fail are listed in `REJECTED` with
the reason. The game falls back to its synthesised sounds for anything missing.

`bronzedrum/publish.sh local/pages/bronzedrum` copies the game into the Pages
output. The workflow in `.github/workflows/pages.yml` runs the tests and the
manifest check, then publishes the game.

## Delivered art

All 81 requests have generated artwork, including the five Drum Practice assets
(BD-U17 to BD-U19, BD-P11, BD-C13): 20 style and direction images in
`design/references/` and 61 game images in `game/assets/art/`. The set follows
the coloured-paper direction (BD-S02).

[`design/image-deliveries.json`](design/image-deliveries.json) records the exact
generation and correction prompts, references, native image sizes, export sizes,
and sprite-sheet cells. Exports match the requested dimensions; larger canvases
are resampled from the generator's native output rather than generated at native
4K. Puppet sheets are artwork for future rigging, not animated rigs.

Trưng Trắc is a jointed puppet cut from her part sheet (BD-R01).
[`design/source/build_rigs.py`](design/source/build_rigs.py) holds each piece's
box, its pin hole and the parent pin it hangs on (measured from the painted pin
holes), and cuts the pieces into `game/assets/rigs/`. `src/rig.js` poses them:
between strokes she holds the stick raised; on each tùng her forearm whips over
onto the drum and lifts back, her body leans in, and her cape and sash ribbons
trail on springs. The other three rig sheets are not cut yet.

The manifest's `runtime` flag distinguishes the 55 images used by the prototype
from the 6 delivered sheets it does not use directly: the four puppet-rig sheets
(cut into rigs instead) and the glyph and icon sheets. They remain available
for production work without being downloaded at game startup. The effects
sheets are in use: hits and deflections burst into the paper scraps (BD-F01,
picked by colour), the arrows and bolts fly as BD-F02, and when the drum wakes
its rings (BD-F03) spread from the drum.

The PNGs in `game/assets/art/` are the masters, kept at the requested sizes.
The game loads WebP copies scaled to the size it actually draws them at (4.6 MB
in all). Only these copies are published. After
delivering or replacing art, rerun
[`design/source/build_web_art.py`](design/source/build_web_art.py) and then
`build_requests.py`. The renderer also tints the painted parallax layers to
each chapter's light (dawn, day, night), because one set of layers serves all
three chapters.

Delivered art is integrated through [`intake/`](intake/README.md). For each image:

1. Put the file at the **File** path given in its request, under
   `game/assets/art/`. Direction pieces go under `design/references/`.
2. Set the request's `status` to `"delivered"` in `build_requests.py` and rerun
   the script.

The game then loads the image in place of its procedural stand-in. Stand-ins are
drawn by `game/src/render.js`.
