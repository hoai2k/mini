# Crag Tortoise art refinement

Candidate only, not production. Root owns review and publishing.

- Scaffold source: `crag_tortoise.py`; reference: `design/references/enemies/cragTortoise-turnaround.png`.
- Art source checkpoint: `crag_tortoise_refine.py`; output: `local/hopper-crag-tortoise-refine`.
- Rebuild with Blender background Python; append `-- --qa` for both-LOD animation samples.
- Replaces primitives with a convex plated slate shell, attached thorns, connected weighted limbs, overlapping limb scales, grounded feet/three ivory claws each, fitted eye sockets, tapered head/jaw, ivory plastron and recessed violet belly mechanism.
- Preserves both 17-joint skeletons, eight clips, four sockets, exact 7.1 × 4.7 × 8.6 m, 7k/2k budgets and Lunge-only root motion.
- First render/budget/deformation QA pending. This source checkpoint is not an accepted asset.

## Second candidate checkpoint

- Both authored LODs measure exactly 7.1 × 4.7 × 8.6 m, at 5726 / 1831 triangles before export cleanup. Weights, finite animation samples, loop closure, Lunge-only root motion and rest foot grounding pass.
- Root reviewed the updated LOD0 rest appearance as coherent. Production remains untouched.
- Corrected curved shell-plate crown projection: inner chords no longer cut through the dome and expose broken violet outlines.
- The inherited Spine.1 local X axis is opposite Spine.0. Corrected rear-up gestures by mapping the intended pitch through each bone's rest quaternion, then authored a readable 55-degree body presentation with separate jaw/leg articulation. The original rig, clip names and root-motion contract remain unchanged.
- Full both-LOD keyframe renders, side support views and independent exported-GLB audit are in progress. Review still pending for final clip sheets.

## Support-stride correction

- Independent raw-GLB audit passes: two 17-joint skins, all normalized finite attributes, exact three loop endpoints, all four sockets parented to their correct bones, and both Lunge roots translate [0, 1.15, 5.4].
- Additional evaluated-sole audit found full rear-up rear feet within 1.3 cm of Y=0, but the inherited Walk angles pushed planted feet about 14 cm below ground.
- The art pipeline now bakes a small root-of-leg support correction on every Walk frame. Swing lift is preserved; scene roots remain static for Walk. Rebuilding and repeating visual/sole checks before parent acceptance.

## Final review candidate

- Final exported triangles: **6206 / 1983**, exact requested bounds. Four legs have scales wrapping their lateral surfaces in both LODs.
- Both-LOD clip/attachment sheets accepted by root. The final LOD1 violet seam pass uses UVs from a narrow painted boundary in the existing generated `trim/violet.png`; no pixel edits or extra geometry.
- `crag_tortoise_uv_invariants.py` compares the saved pre-seam raw GLB against the final raw GLB. It proves identical triangle-corner positions/normals/weights/joints, every animation channel/sample, skin joints/inverse-bind matrices, and node hierarchy/transforms. Triangle enumeration is canonicalized because Blender sphere triangles can appear in a different order between fresh builds.
- Final six-view seam review: `local/hopper-crag-tortoise-refine/lod1-seam-review-sheet.jpg`; full rest views and both-LOD deformation/walk/support sheets are alongside it. All-clip deformation review precedes the UV-only pass; final rest/Walk/belly samples show the new seams.
- Corrected planted Walk sole minima are within 1.3 mm of ground at interpolated quarter cycles; swing soles lift 14–17 cm. Full belly-hold rear soles remain within 1.3 cm of Y=0.
- Candidate validation and independent skin/clip/socket audit pass. Root publishing authorization pending; no shared production changes made.

## Production integration

Root accepted final six-view LOD1 seam review plus prior both-LOD deformation and exact UV invariants. The approved candidate is now published to `hopper/3d/models/enemies/cragTortoise.glb` with compact preview, manifest entry, QA receipt and generated delivered request documentation. Full repository validator: **76/76 GLBs pass**. Root handles commits; shared integration files released.
