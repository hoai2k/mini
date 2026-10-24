# Meditation Timer intake

Drop files for Meditation Timer (the `meditation/` folder) here and ask for
them to be integrated: the artwork listed in
[`../design/image-requests.md`](../design/image-requests.md), chime
recordings, notes from another agent. Nothing in this folder is published.

Delivered art is checked against its request, converted to the size and
format the request names, and copied to its path under `../app/`; its status
is then flipped to `delivered` in `../design/source/build_requests.py`, which
is rerun (and, for the icon and favicon, `../design/source/make_icons.mjs`).
A chime recording is trimmed to a single strike with its natural ring-out,
loudness-matched and encoded as described under "Chimes" in
[`../README.md`](../README.md), copied to `../app/sounds/`, and its source and
licence are added to the credits there and in the app. Afterwards the folder
is emptied, leaving only this README. The repository-wide rules are under
"Intake" in [`CLAUDE.md`](../../CLAUDE.md).
