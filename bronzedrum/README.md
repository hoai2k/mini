# Bronze Drum (prototype)

A drum-command rhythm-strategy game about the Trưng sisters, who raised an army of
women against Han rule around 40 CE. It adapts Phong Nguyen's novel
*Bronze Drum* and staged as a backlit paper-cut theatre.

Play the prototype at https://hoai2k.github.io/mini/bronzedrum/.

- [`design/design.md`](design/design.md): the concept, the core loop, the art
  direction and the open questions.
- [`design/image-requests.md`](design/image-requests.md): the image requests,
  generated from [`design/source/build_requests.py`](design/source/build_requests.py).
  Edit the data there and rerun it. The script also writes
  `game/assets/manifest.json`, which the game reads.
- [`design/screens/`](design/screens/): screenshots of the prototype's
  procedural stand-in art.
- [`game/`](game/): the prototype itself, static ES modules with no build step.

## Run and check

```sh
cd bronzedrum/game
python3 -m http.server 8123     # then open http://localhost:8123/
node --test test/*.test.mjs     # rhythm reader and battle simulation
node scripts/check.mjs          # syntax and manifest ids
python3 ../design/source/build_requests.py --check
```

`bronzedrum/publish.sh local/pages/bronzedrum` copies the game into the Pages
output. The workflow in `.github/workflows/pages.yml` runs the tests and the
manifest check, then publishes the game.

## Delivered art

Delivered art is integrated through `hopper/intake/`. For each image:

1. Put the file at the **File** path given in its request, under
   `game/assets/art/`. Direction pieces go under `design/references/`.
2. Set the request's `status` to `"delivered"` in `build_requests.py` and rerun
   the script.

The game then loads the image in place of its procedural stand-in. Stand-ins are
drawn by `game/src/render.js`.
