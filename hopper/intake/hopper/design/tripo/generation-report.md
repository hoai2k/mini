# Tripo model generation — September 7, 2026

Two separate image-to-model tasks use the corrected canonical master images. Supporting illustrated views remain inspection references because they are not exact orthographic projections. The documented image endpoint does not accept a supplemental text prompt; the model briefs in README.md guide inspection rather than being sent as unsupported fields.

## Settings

- API: Tripo V2 OpenAPI, `image_to_model`.
- Model: `v3.1-20260211` (H3 family).
- Detailed geometry and detailed PBR textures; texture alignment to geometry.
- Hopper: `hopper-master.png`, requested face limit 150,000, model/texture seed 70701.
- Boy: `rider-master.png`, requested face limit 80,000, model/texture seed 70702.
- Image autofix disabled to preserve the approved master; default orientation; geometry compression.
- No automatic rigging, animation, or smart low-poly conversion in this source generation.

These are high-detail source candidates. Face limits are generation settings, not promises of final triangle counts. Custom joint setup, topology cleanup and optimized game exports follow visual approval.

## Task records

- Hopper: `abfa8212-3855-4548-a1df-f20e97cebf76`.
- Boy: `eff0c9c1-76f3-4707-8c64-5dd41d4fa469`.
- First Hopper submission returned service audit error 2014; a retry with the same image/settings was accepted.
- Available balance before generation: 895 credits. Both accepted tasks reserved 120 credits total (775 available, 120 frozen).

Raw request/result records, downloads and Blender inspection renders are saved in `mini/local/tripo-models/`, excluded from Git. The API key is held only in the running process and is absent from project files.

## Review

The initial Hopper candidate imported successfully in Blender: 146,282 triangles, one mesh object, one material with embedded color/ORM/normal textures, and no armature. Four inspection renders confirm the broad design, empty saddle and two antennae. Its rear femurs are strongly asymmetric: one rises vertically while the other projects backward. Preserve this candidate, but do not use it as the final mechanical rig source without correcting that structure.

The boy imported successfully: 78,910 triangles, one mesh object, one material with embedded color/ORM/normal textures, and no armature. Four views show a coherent costume and head, separated arms, shoes and scarf. Hands remain simplified and require close topology/weighting work before animation. This is a useful source candidate, not a completed game-ready character.

A second Hopper candidate uses `hopper-front.png`, the same detailed settings and face limit, and seed 70703. This view exposes both hind legs symmetrically. Task: `84df228e-9fbd-4905-b1e8-1ec3e62bc5e1`. It consumed 60 additional credits. Blender inspection measured 145,863 triangles. Rear femurs are more symmetric, but the hidden back has invented eye-like forms and the saddle is poorly reconstructed. The first candidate is the recommended overall source: it preserves the body, saddle and visual identity better. The front candidate is an anatomy comparison reference, not a replacement.

**Final account balance: 715 credits available, zero frozen. Total spent: 180 credits** for two Hopper candidates and one boy. No further generation was commissioned; mechanical cleanup is a more targeted next step than repeatedly resampling the whole character.

The original GLBs use `EXT_meshopt_compression` and `KHR_mesh_quantization`. Blender 5.2 imports them successfully. Separate editable GLB copies and native Blender source files preserve the mesh and textures for tools without Meshopt support.

## Official API references

- [Image-to-model V3.0 / V3.1](https://docs.tripo3d.ai/model-generation/image-to-model-v3-0-v3-1.html)
- [Task queries](https://docs.tripo3d.ai/task-query/get-your-task-result.html)
- [Error codes](https://docs.tripo3d.ai/get-started/errors-and-error-handling.html)


## Deliverables and next steps

All paths below are relative to `mini/local/tripo-models/` and excluded from Git:

| Asset | Editable GLB | Blender source |
| --- | --- | --- |
| Recommended Hopper source | `hopper/hopper-editable.glb` | `hopper/hopper-source.blend` |
| Boy | `rider/rider-editable.glb` | `rider/rider-source.blend` |
| Alternate Hopper | `hopper-front/hopper-front-editable.glb` | `hopper-front/hopper-front-source.blend` |

Each folder retains the untouched Tripo `pbr_model.glb`, task and request metadata, and `review/` with four renders, mesh statistics and a lit Blender scene. The editable GLBs embed all three texture maps and have no required compression extension. `comparison.jpg` shows original Hopper, alternate Hopper, then the boy.

Recommended cleanup: align the original Hopper's hind legs as a mirrored mechanical pair; separate rigid armor and joint pieces; rebuild thin rails/antennae if needed; divide material regions for eye emission and armor; inspect underside intersections. For the boy, inspect fingers and shoulder topology, then build the humanoid rig. Scale and seat the rider only after Hopper's saddle and leg articulation are settled. Both models are unrigged, unanimated source assets, not yet production game exports. No deformation testing has been performed.
