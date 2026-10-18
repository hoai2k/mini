# MP3 Player intake

Drop files for MP3 Player (the `mp3player/` folder) here and ask for them to be
integrated: the artwork listed in
[`../design/image-requests.md`](../design/image-requests.md), notes from
another agent. Nothing in this folder is published. Music files don't go here:
the app plays music from the device it runs on.

Delivered art is checked against its request, converted to the size and
format the request names, and copied to its path under `../app/`; its status
is then flipped to `delivered` in `../design/source/build_requests.py`, which
is rerun. Afterwards the folder is emptied, leaving only this README. The
repository-wide rules are under "Intake" in [`CLAUDE.md`](../../CLAUDE.md).
