# Ai-Ching intake

Drop files for Ai-Ching (the `aiching/` folder) here and ask for them to be integrated.
Nothing in this folder is published.

Generated art is saved under the file name given in its **File** line in
[`../design/image-requests.md`](../design/image-requests.md). On integration it
moves to that path under `aiching/app/` (opaque pictures converted to `.webp`,
at most 1600 px wide for the hexagrams), its id is added to `DELIVERED` in
`../design/source/build_requests.py`, and the script is rerun. Images on a flat
`#FF00FF` background have the magenta keyed out.

Afterwards the folder is emptied, leaving only this README. The
repository-wide rules are under "Intake" in [`CLAUDE.md`](../../CLAUDE.md).
