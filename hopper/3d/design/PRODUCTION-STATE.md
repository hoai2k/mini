# Production plan and restart state

## Objective

Reconcile the current request inventory, finish requested image work that the available tools can deliver, and complete feasible 3D work without Tripo. Validate each delivery, update source-generated documentation, and commit completed batches to main. Keep incomplete or blocked requests explicitly open.

## Starting state

- Synced main to origin/main at `956414d` on 2026-09-12.
- Preserved prior local Round 3 documentation in the stash named `Preserve Round 3 documentation before production sync`.
- Preserved the formerly untracked Tripo references in `Preserve local Tripo references before production sync`; upstream now includes this directory. Compare before restoring anything; do not blindly pop either stash.
- `updates/` is an existing manual-upload backup, not a delivery to commit.
- New upstream verification reopens T-080, T-082 and T-086. T-081 is verified. T-083–085 are optional native-4K repaints; the latest built-in trial still returned 1774×887. Do not claim upscales meet native resolution.

## Execution order and agents

1. **Inventory and docs — GPT-5.6 Luna, medium.** Reconcile stale delivery claims against upstream verification; audit all image/model requests and preserve valuable stashed changes. Own a compact inventory report and request-source/doc corrections. No model changes.
2. **Mechanical model work — GPT-5.6 Sol, high.** Read the build contract and Tier A recipe, implement a repeatable cleanup pipeline, and process low-risk models first. Preserve animated pivots, sockets, LODs and collision/landing contracts. Stop individual files when checks fail and record why. Own cleanup scripts and isolated candidate outputs until integration.
3. **Root Astra, high: supervise early batches.** Review agent results, repair or regenerate imagery using imagegen and applicable policies, validate real image dimensions/alpha/tiling, and commit/push each coherent completed batch. Only root changes the shared manifest or commits.
4. **Animation — Astra, high, after simple batches.** Author M-001 Hopper traversal/combat clips and M-002 seated rider reactions on the existing rig, add wing-tip sockets, review poses/animation and combined attachments in the viewer. Preserve the existing mesh and rig contract.
5. **Creative modeling — Astra, high, last.** Assess the 21 creature stand-ins against approved references. Prioritize feasible geometric/rigid species (Turbine Wasp, Phase Skate, Gravity Cantor), then spline species and other credible local work. Complete and review only models that meet the visual and rig contract; retain Tripo-preferred complex organic species as pending. Review remaining Tier B environment/landmark/terrain work in bounded batches.
6. **Final handoff.** Run delivery validation and image verification, regenerate docs from source, commit/push completed work to main, and record exact remaining work and commands below.

## Acceptance and cost controls

- Start with Luna and Sol tasks; reserve Astra for creative judgment and complex fixes.
- Never mark a request delivered on file existence alone. Check resolution/alpha/atlas/tiling for images; dimensions, sockets, LODs, animation and visual quality for models.
- Existing code-built files may need substantive Tier B work; Tier A completion does not make them fully art-approved.
- Keep shared-file ownership explicit; agents report manifests changes for root integration.
- Save state after each batch and before expensive generation/modeling. Preserve originals under ignored local storage where appropriate; do not commit heavy unused sources or `updates/`.
- Commit only reviewed task files, never unrelated site changes or credentials. Push main after each completed batch when network authorization permits.

## Progress

- [x] Fetch latest upstream and fast-forward main, preserving local edits in named stashes.
- [x] Write staged plan and agent assignments.
- [x] Reconcile request source and docs; count local-feasible versus Tripo-preferred work. After visual review: 3 local-first creatures, 4 conditional, 2 canonical/contract conflicts (Coil Wraith and Gravity Cantor), 12 Tripo-preferred; 2 existing-rig animation requests now delivered.
- [ ] Fix/re-export/regenerate failed Round 3 images and rerun verification.
- [ ] Deliver native-resolution sky repaints or document concrete tool limitation.
- [ ] Complete verified Tier A batches.
- [x] Complete animation requests (15 Hopper clips, 6 rider reactions; visual and preservation checks passed).
- [ ] Complete feasible creative model batches.
- [ ] Final validation, main commits/pushes, and restart handoff.

## Checkpoint: inventory and verification

- Plan committed/pushed as `4490e93`.
- Luna inventory audit complete. Preserve both named stashes; their stale delivered claims must not overwrite upstream verification failures.
- Round 3 verifier now also checks required export dimensions and expected occupied atlas cells; a blank atlas cannot pass. Current baseline: 10 failures across 9 assets, consistent with upstream.
- Native sky retries still below spec: Fields `exec-409532f4-9913-420d-ac32-9cf530e07e64.png`, City `exec-3c11740a-585f-4413-837e-1ac9c001459a.png`, Mountains `exec-4bc4ba46-de4b-4826-aa2c-ab15915121c1.png`; all 1774×887. Outputs are discarded candidates in the default imagegen session directory, not published HD assets. T-083–085 remain open. The built-in tool has no resolution parameter; do not spend repeated calls on the same limit.
- Pending user text clarification: authorize deterministic image-processing seam repair and atlas repacking, or use imagegen for visual edits. Continue independent model work while waiting; do not interpret elapsed time as authorization.
- Sol `tier_a` agent owns new cleanup scripts and ignored `local/hopper-tier-a/` candidates; no production GLB/manifest writes yet. Luna `rig_inventory` owns RIG-AUDIT.md.
- Inventory/checks batch committed/pushed as `1960fd4`. The inexpensive rig audit is complete in RIG-AUDIT.md; it distinguishes 15 new Hopper clips and 6 new rider clips from existing exports (combined expected total 46). Existing character geometry/weights should be retained byte-for-byte using an animation append workflow where practical.
- Tier A prototype found the installed gltfpack needs `-kn -ke -km` during decode to retain named nodes. Sol is testing one landmark before batching.
- Simple audit stages are complete and backed up; begin Astra animation work while the mechanical cleanup test runs. Animation agent owns candidate outputs/new authoring code, not production GLBs or manifests.
- Audit checkpoint pushed as `0f8d834`.
- Image-processing preparation is complete: `source/repack_round3.py --dry-run` passes and predicts uniform scale 0.8327 for effects and 0.7812 for props, preserving frame anchors. Root corrected path indexing, off-center padding calculation, and double premultiplication found during review. `source/repair_surface_seams.py` has passed syntax/dependency checks only. Neither has processed production artwork; image-processing authorization is still pending.
- Astra `animations` agent is appending new tracks/sockets to canonical GLBs with binary mesh/skin preservation, candidates under `local/hopper-animation-extension/`.
- Sol `rigid_creatures` agent is starting Phase Skate then Turbine Wasp, candidates under `local/hopper-rigid-creatures/`; root reviews visual output before integration.

## Resumed checkpoint

### Latest handoff (2026-09-12)

- User requests regular commits and pushes to main for another integration agent. Latest pushed batch `42aa735`: reviewed M-061 root pillar and M-092 fields terrain; all 74 production GLBs pass validation.
- Previous published batches: `bdd3082` Spire Leech with skin-aware bounds validation; `d0b9106` M-062/063/065 cleanup; `4c0bc91` M-057/058 cleanup. Round 3 image fixes are complete (`5255d7b`, `67dcf3d`), except optional native-4K T-083–085 beyond builtin imagegen resolution.
- M-005 Window Ray and city/mountains terrain cleanup delivered in `f169534`; all 75 GLBs pass. Root reviewed all four Window Ray sheets, including both LODs and Hover extrema. Astra `animation_resume` is now refining M-007 Crag Tortoise, then M-011 Chain Manta and M-015 Basalt Burrower. All three mechanical scaffolds are complete and their sources backed up in `d0fd7bd`; they are not delivered assets.
- M-067 delivered in `879f691` after both LOD visual review. Its original 124 LOD1 triangles include two coincident duplicate ring faces (triangles 1/0 and 41/40); Blender import removes them, yielding 122. This is an explicitly accepted cleanup, not a stale manifest count. Source/import topology guards and the narrowly scoped integration exception are committed.
- Functional cleanup is delivered: M-060/M-064 in `1135ed2`, M-059/M-066 in `1f00d9a` (pushed via `aa10caf` after syncing another agent's main changes). All named pivots, transforms, extras, per-pivot geometry ownership, and original landing hierarchy are preserved. 27/28 code-built files now have mechanical cleanup; M-056 remains held because its original landing lacks a nearby face. Tier B is not marked complete. Preserve both named stashes and unrelated `updates/`.
- Concurrent integration agent changes were synced from `564a4b2` and `29bc618`; these put the delivered creatures into the game and update the Hopper proxy. No integration edits were overwritten.
- Final creative work assignment: Astra-high `animation_resume` finishes M-007 (walk foot-contact correction and fuller limb-scale coverage), then M-015. Separate Astra-high `chain_manta_art` owns M-011 refinement in new isolated source/candidate files. All inexpensive scaffolding, inventory, and feasible mechanical cleanup are complete; root alone integrates reviewed exports and commits/pushes. Sol agents are finished.

- Prior commit attempt after `0f8d834` was rejected by automatic approval review due to usage limits. Prepared sources remained local. On resume, fetched and fast-forwarded main to `5a6cd9b` (only unrelated site updates).
- M-083 first Tier A candidate visually reviewed by root against matched before/after renders and integrated: 17,540 → 6,260 bytes, 17 → 2 meshes, 108/96 triangles unchanged. Full model validation rerun. This is mechanical cleanup only; the basic distant silhouette still needs Tier B art work.
- Resumed Sol cleanup and Astra animation agents from saved source; no dependency on former live agent state.
- `7e6d7f9` pushed first M-083 cleanup and image repair tools; `cfe00df` pushed the animation generator/QA source checkpoint.
- Integrated seven further static landmarks M-084–M-088, M-090–M-091 after paired render review; 71/71 production model validations pass. M-089 held for separate LOD1 visual review (118 to 88 triangles).
- New creature M-018 initial candidate rejected in visual review: rectangular wings, excessive glow and disconnected-looking tails do not meet the canonical reference. Sol is refining custom silhouette/armor/tails; it is NOT a delivered asset.
- Animation candidates have 35/19/46 clips and preserved source mesh/skin data. Astra visual review caught and corrected gaze/tuck directions and reaction layer masks; publication still awaits root visual acceptance.
- Image-processing preference re-requested on resume; still pending. No failed image asset has been marked fixed.
- Animation delivery integrated into canonical `hopper/models`: 35 Hopper, 19 rider, 46 combined clips. Root accepted all five pose sheets; independent published-file validation confirms original binary/rig resources preserved and exact loop closure. M-001/M-002 docs regenerated as delivered. Gameplay transition testing remains separate.
- Landmark batch committed/pushed as `06894cc`. M-089 LOD1 ring gaps and M-024/027/036/037 atlas appearance remain rejected pending fixes; do not publish their existing candidates.
- Phase Skate second candidate passes structural checks but still fails visual quality; awaiting creative handoff. No creature candidate is delivered.
- Animation delivery committed/pushed as `060c59d`; local Generations viewer copies refreshed from canonical GLBs. Astra animation agent reassigned to creative Phase Skate refinement in separate source/candidate files.
- M-089 repaired with conservative interior-face rollback, matched LOD1 visuals and original 928/118 triangle counts. Integrated after review; all 71 model validations pass. Textured environment candidates remain held.
- M-018 Phase Skate delivered after Astra refinement and root review of both LODs/four views/seven clip poses. Canonical `hopper/3d/models/enemies/phaseSkate.glb`: 2616/990 triangles, seven clips, exact contract dimensions. Request docs now mark M-018 delivered; 20 creature stand-ins remain. Runtime handles phase visibility/hitbox; clip gestures are supplied.
- M-037 ledge atlas fixed: reversed UV transfer had overwritten the packed source coordinates. Corrected transfer, explicit original sampling and exported Atlas checks pass; root accepted both LOD renders. Integrated at 1,197,276 bytes. All 72 production GLBs pass validation. M-024/027/036 awaiting final batch acceptance.
- Turbine Wasp mechanical draft checkpoint pushed `9d7c334`, visually rejected due to floating eyes and basic armor. Astra now owns separate creative refinement; Sol creature agent idle. Original draft remains a reference, not delivery.
- Delivered Phase Skate + ledge batch pushed `068ac04`; cleanup source fixes pushed `6763bfc`.
- Remaining episode-one QA: M-027 still rejected (1416 → 1374 LOD0 triangles, visible canopy gaps); M-036 rejected for blurred atlas hiding painted slate detail. Root requested conservative weld rollback and preserving original textures if necessary. M-024 LOD0 reasonable, awaiting LOD1 review. Do not integrate on numeric pass alone.
- Agent assignments: Astra `animation_resume` owns Wasp creative refinement; Sol `cleanup_resume` owns isolated cleanup repairs; Sol `creatures_resume` now builds M-006 rig/animation scaffold only, explicitly not final art. Each writes separate source and ignored candidates.
- User authorized trivial image processing only when quality is retained; use imagegen otherwise. Padding/foam fixes accepted and pushed `c0b530f`. Ten-percent surface feathers rejected for visible streaks. Imagegen repainted offset central seams for sea/dust/slag; final trivial 8px edge match and aligned grayscale detail retained artwork. Native sources 1254², exports 2048² (not native 2K). All ten Round 3 texture checks pass; surface batch pushed `5255d7b`. Optional native-4K T-083–085 remain blocked by builtin resolution ceiling.
- Wasp M-014 and M-024/027/036 cleanup deliveries pushed `52f8a38`; 73/73 model validations pass. M-036 retains original textures for quality, and manifest bounds corrected from inflated primitive-AABB estimate using exact decoded baseline/candidate comparison (within 2mm).
- M-006 scaffold complete; Astra art refinement now 4858/1480 triangles, true nine-joint skins. Root accepted rest appearance; full deformation review remains before delivery. Source/candidates under `source/spire_leech*.py` and ignored `local/hopper-spire-leech-refine/`.
- Cleanup next pair M-057/M-058 in review. M-066 static cleanup held: design uses animated arrow pivots even though current GLB lacks clips. Preserve functional contracts in separate path, never flatten on static absence alone.
