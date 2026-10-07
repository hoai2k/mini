# Ice-Cream Cone Coot intake

Drop files for the Ice-Cream Cone Coot game here and ask for them to be
integrated. Nothing in this folder is published or loaded by the game.

Save each image under the file name given in its **File** line in
[`../design/image-requests.md`](../design/image-requests.md). On integration it
moves to that path under `icecreamcone/game/`, its status is set to `delivered`
in `../design/source/build_requests.py`, and the script is rerun. Images on a
flat `#FF00FF` background have the magenta keyed out.

Reference material about the book goes in [`../reference/`](../reference/README.md)
instead, with a line in its README saying where it came from.

Afterwards the folder is emptied, leaving only this README. The
repository-wide rules are under "Intake" in [`CLAUDE.md`](../../CLAUDE.md).
