# Percy Jackson intake

Drop files for the Percy Jackson game here and ask for them to be integrated.
Nothing in this folder is published.

Save each concept image under the file name given in its **File** line in
[`../design/image-requests.md`](../design/image-requests.md) (for example
`char-percy.png`). On integration it moves to `../design/concept/` and the
request document is rebuilt with
`python3 percyjackson/design/source/build_requests.py`, which marks it
delivered.

Music goes in the same way: save each track as `<id>.mp3` (or `.ogg`) with the
id from [`../design/music-requests.md`](../design/music-requests.md). On
integration it moves to `../game/assets/music/`.

Afterwards the folder is emptied, leaving only this README. The
repository-wide rules are under "Intake" in [`CLAUDE.md`](../../CLAUDE.md).
