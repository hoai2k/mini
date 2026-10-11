# Ear Trainer intake

Drop files for Ear Trainer here: artwork from `design/image-requests.md`, piano
samples, melody lists, notes.

Processing a drop (see `hopper/intake/README.md` for the full steps):

- **Images** go to the path their request names under `eartrainer/app/`
  (`assets/ui/`, `assets/books/`, `icons/`). Check size, transparency and
  lettering, then flip the request's status to `delivered` in
  `design/source/build_requests.py` and rerun it. The icon is resized to
  `icons/icon-180.png`, `icon-192.png` and `icon-512.png`.
- **Piano samples** go to `app/assets/samples/<kit>/<midi>.mp3`, one every
  minor third from 36 (C2) to 96 (C7); see `design/source/fetch_samples.py`.
- **Melodies** are added to a file in `app/data/melodies/` (listed in its
  `index.js`) and must pass `node app/test/validate-melodies.mjs`.

Empty this folder afterwards, keeping only this README.
