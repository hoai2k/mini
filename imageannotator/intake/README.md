# Image Annotator intake

Drop files for Image Annotator (the `imageannotator/` folder) here and ask for
them to be integrated: the artwork listed in
[`../design/image-requests.md`](../design/image-requests.md), notes from
another agent. Nothing in this folder is published. Pictures to annotate don't
go here: the app opens them from the device it runs on.

Delivered art is checked against its request, converted to the size and
format the request names, and copied to its path under `../app/`; its status
is then flipped to `delivered` in `../design/source/build_requests.py`, which
is rerun (and, for the icon, `../design/source/make_icons.mjs`). Afterwards the
folder is emptied, leaving only this README. The repository-wide rules are
under "Intake" in [`CLAUDE.md`](../../CLAUDE.md).
