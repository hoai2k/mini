# Phase Skate delivery checkpoint

2026-09-12: Root accepted the refined M-018 after reviewing both LODs in front/top/rear/side views and all seven clip key poses (22 renders total). Integrated the accepted GLB and a compact preview; no commit made by the animation/refinement agent.

- Production: `hopper/3d/models/enemies/phaseSkate.glb`, 3,320,324 bytes, SHA-256 `7378153e84e4fe7e1634cae55f9a24d2932004aae58ebfd42147ed0b251127f8`.
- Dimensions 8.7 × 0.9 × 6.1 m, LOD0/LOD1 2,616/990 triangles. Rigid body, two wing pivots, three curved tapered tail shards; no skin.
- Added correct relative entry to `hopper/3d/models/manifest.json`, plus `previews/enemy.phaseSkate.png`. M-018 is delivered in `build_requests.py` and regenerated documents.
- QA receipt: `source/phase-skate-validation.json`. Repository validator passes on the production path. Raw animation values are finite, loop endpoints exact, and Dash is the only root-motion clip (3.6 m forward on each LOD).
- Sculpted closed cambered wings use a continuous swept leading edge and serrated trailing silhouette. Layered armor, inset tapered blue seams, recessed shaded eye and shared-curve LODs replace the rejected flat/stepped drafts.
- Uses existing generated painted hide and slate-band trim textures. No replacement texture artwork was drawn.
- Gameplay owns shader visibility/dissolve, destination ghost placement, Hitbox.Body activation and the 0.4 s stomp window after solidification. GLB clips supply the corresponding geometric poses.
- Source captures and restores rest transforms between QA poses, before export and after export. Muting NLA alone did not undo Blender's last evaluated transform; the saved `.blend` has also been restored to rest pose.
- Editable source/candidates: `local/hopper-phase-skate-refine/`. Accepted comparison sheets: `views-contact-sheet.jpg`, `clips-contact-sheet.jpg`. Rejected earlier drafts remain in `local/hopper-rigid-creatures/M-018/`.

```sh
/Applications/Blender.app/Contents/MacOS/Blender -b --python hopper/3d/models/source/phase_skate_refine.py
python3 hopper/3d/models/source/phase_skate_contact_sheets.py
node hopper/3d/models/source/validate.mjs --manifest local/hopper-phase-skate-refine/manifest.json local/hopper-phase-skate-refine/phaseSkate.glb
node hopper/3d/models/source/validate.mjs hopper/3d/models/enemies/phaseSkate.glb
```

Blender needs the approved executable escalation on this Mac. Candidate regeneration does not overwrite production.
