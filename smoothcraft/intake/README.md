# Smoothcraft intake

Drop files for Smoothcraft (the `smoothcraft/` folder) here and ask for them to
be integrated: generated textures from the image requests
([`../design/image-requests.md`](../design/image-requests.md)), replacements
for the ones queued in
[`../design/image-requests-regenerate.md`](../design/image-requests-regenerate.md)
(a delivered replacement leaves the list once it passes
`../tools/audit_textures.py` and review), material
tweaks, screenshots of something that looks wrong.

Name a texture by its request id, either as a path (`block/oak_log.png`,
`entity/villager/villager.png`) or flattened with double underscores
(`block__oak_log.png`). Each one is checked against its request (exact size,
frame count, transparency) and moved into the HD resource pack at
`../mod/src/main/resources/resourcepacks/hd/assets/minecraft/textures/`; then
`../design/source/build_requests.py` is rerun so the request shows as
delivered. Afterwards the folder is emptied, leaving only this README. The
repository-wide rules are under "Intake" in [`CLAUDE.md`](../../CLAUDE.md).
