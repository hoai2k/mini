# Widow's Bay intake

Drop files for Widow's Bay here and ask for them to be integrated. Nothing in
this folder is published or loaded by the game.

- **Art:** name each image by its request id from
  [`../design/image-requests.md`](../design/image-requests.md), for example
  `ship.png` or `keepsake-tea.png`. It moves to `../assets/`, and its slot in
  `../assets/manifest.json` is set to `delivered`.
- **Video stills and other references:** put them in `references/`, named
  `video-<mm>m<ss>s-<subject>.jpg`. They move to `../design/references/`.
- **The song or its stems:** any common audio format. The song moves to
  `../assets/audio/`, and the manifest's `audio.song` entry is set to
  `delivered`.

Each file is checked before it lands: images are opened and compared with
their request, audio is decoded, and the game is played with the file in
place. Afterwards the folder is emptied, leaving only this README. The
repository-wide rules are under "Intake" in [`CLAUDE.md`](../../CLAUDE.md).
