# Games Chat intake

Drop files for Games Chat here and ask for them to be integrated. Nothing in
this folder is published or loaded by the app.

Save each image under the file name given in its **File** line in
[`../design/image-requests.md`](../design/image-requests.md). On integration it
moves to that path under `chat/`, its status is set to `delivered` in
`../design/source/build_requests.py`, and the script is rerun (which moves the
request into [`../design/image-requests-history.md`](../design/image-requests-history.md)). Images on a flat
`#FF00FF` background have the magenta keyed out.

Afterwards the folder is emptied, leaving only this README. The
repository-wide rules are under "Intake" in [`CLAUDE.md`](../../CLAUDE.md).
