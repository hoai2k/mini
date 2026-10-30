# Micro intake

Drop files for Micro (the microscopic-creatures project: its research atlas
and prototypes) here and ask for them to be integrated. Nothing in this folder
is published or loaded.

Save each image under the file name given in its **File** line in
[`../design/image-requests.md`](../design/image-requests.md). On integration it
moves to that path under `micro/prototypes/`, its status is set to `delivered`
in `../design/source/build_requests.py`, and the script is rerun. Images on a
flat `#FF00FF` background have the magenta keyed out; tileable textures are
checked for seams.

Reference photographs and papers go in `../research/` instead, credited in its
manifest.

Afterwards the folder is emptied, leaving only this README. The
repository-wide rules are under "Intake" in [`CLAUDE.md`](../../CLAUDE.md).
