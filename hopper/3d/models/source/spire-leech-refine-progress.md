# M006 Spire Leech art refinement

2026-09-12: Separate `spire_leech_refine.py` builds on Sol's true nine-bone scaffold in `spire_leech.py`. Outputs remain isolated in `local/hopper-spire-leech-refine/`; no production integration authorization.

- Preserves seven chain bones, Head and Jaw, normalized skin groups, all seven clips, and Core/Emitter/Hitbox.Body sockets.
- Canonical turnaround inspected: slate/violet overlapping shell armor, recessed circular ivory hooked mouth and orange emitter. Initial art pass adds fourteen armor segments, thick curved mouth mandibles, dorsal thorns and a curled terminal hook.
- Both LODs are authored from the same curves, without decimating skin weights. Initial render and triangle checks are in progress.
- Run Blender `--background --python hopper/3d/models/source/spire_leech_refine.py`; append `-- --qa` for three deformation samples of every clip on both LODs.
- All rest transforms are restored between render poses and around export. Existing generated hide/violet trim are used, with shell UVs constrained to a quiet painted band.
- Full visual deformation acceptance, budget checks, compressed skin/clip audit and root review remain pending.
