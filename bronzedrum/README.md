# Bronze Drum (prototype)

A drum-command rhythm game about the Trưng sisters, who raised an army of
women against Han rule around 40 CE. It adapts Phong Nguyen's novel
*Bronze Drum*, staged as a backlit paper-cut theatre.

Play the prototype at https://hoai2k.github.io/mini/bronzedrum/. It has nine
chapters in story order: four battles, four call-and-answer chapters (echo
the caller's rhythm), and one casting chapter (hold a steady tempo).
[`design/design.md`](design/design.md) lists them.

It plays with a controller, a keyboard, a mouse, or on a phone or tablet held
sideways, where the bronze drum becomes the instrument: tap its centre and its rim.

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

## Run and check

```sh
cd bronzedrum/game
python3 -m http.server 8123     # then open http://localhost:8123/
node --test test/*.test.mjs     # rhythm reader and battle simulation
node scripts/check.mjs          # syntax and manifest ids
python3 ../design/source/build_requests.py --check
python3 ../design/source/build_audio.py --check
python3 ../design/source/build_web_art.py --check
```

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

All but two of the 74 requests (BD-P10, the Han general, and BD-U16, the touch
buttons) now have generated artwork: 20 style and direction images in
`design/references/` and 52 game images in `game/assets/art/`. The set follows
the coloured-paper direction (BD-S02).

[`design/image-deliveries.json`](design/image-deliveries.json) records the exact
generation and correction prompts, references, native image sizes, export sizes,
and sprite-sheet cells. Exports match the requested dimensions; larger canvases
are resampled from the generator's native output rather than generated at native
4K. Puppet sheets are artwork for future rigging, not animated rigs.

The manifest's `runtime` flag distinguishes the 42 images used by the prototype
from the 10 delivered puppet, effects and planned interface sheets. The latter
remain available for production work without being downloaded at game startup.

The PNGs in `game/assets/art/` are the masters, kept at the requested sizes.
The game loads WebP copies scaled to the size it actually draws them at (4.4 MB
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
