# Bookzam intake

Drop files for Bookzam here: artwork from `design/image-requests.md`, sample
shelf photos for testing, notes.

Processing a drop (see `hopper/intake/README.md` for the full steps):

- **Images** go to the path their request names under `bookzam/app/`
  (`icons/`, `assets/ui/`). Check size, transparency and lettering, then mark
  the request delivered in `design/image-requests.md` and swap the stand-in
  for it in the page. The app icon is resized to `icons/icon-180.png`
  (opaque, for iPhone), `icon-192.png` and `icon-512.png`.
- **Shelf photos** for testing go to `bookzam/test-photos/` (keep them small:
  under 1 MB each) with a note of what is on them.

Empty this folder afterwards, keeping only this README.
