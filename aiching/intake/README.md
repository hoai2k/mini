# Ai-Ching intake

Drop files for Ai-Ching (the `aiching/` folder) here and ask for them to be integrated.
Nothing in this folder is published.

Generated art is saved under the file name given in its **File** line in
[`../design/image-requests.md`](../design/image-requests.md). On integration it
moves to that path under `aiching/app/` (opaque pictures converted to `.webp`),
its id is added to `DELIVERED` in `../design/source/build_requests.py` (a
replacement also comes off `REPLACE` there), the script is rerun, and
`../tools/build_web.py` makes the web copies the page loads. Images on a flat
`#FF00FF` background have the magenta keyed out. Look at each picture before
taking it: a replacement exists because a picture missed its art style.

Afterwards the folder is emptied, leaving only this README. The
repository-wide rules are under "Intake" in [`CLAUDE.md`](../../CLAUDE.md).
