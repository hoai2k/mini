# Music Practice intake

Drop files for Music Practice here: artwork from `design/image-requests.md`,
sound effects, notes.

Processing a drop (see `hopper/intake/README.md` for the full steps):

- **Images** go to the path their request names under `musicpractice/app/`
  (`assets/ui/`, `icons/`), shipped as WebP at display size. Check size,
  transparency and lettering; for the two metronome layers, check the pivot
  lines up (body screw at 50%/83%, pendulum hub at 50%/96%) and record any
  correction in `app/src/assets.js`. Then flip the request's status to
  `delivered` in `design/source/build_requests.py` and rerun it. The icon is
  resized to `icons/icon-180.png`, `icon-192.png` and `icon-512.png`.
- **Sound effects** (if any are requested later) go to `app/assets/sfx/`.

Empty this folder afterwards, keeping only this README.
