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
- [x] Reconcile request source and docs; count local-feasible versus Tripo-preferred work. See REQUEST-AUDIT.md: 4 local-first creatures, 4 conditional, 1 canonical/contract conflict (Gravity Cantor), 12 Tripo-preferred; 2 existing-rig animation requests.
- [ ] Fix/re-export/regenerate failed Round 3 images and rerun verification.
- [ ] Deliver native-resolution sky repaints or document concrete tool limitation.
- [ ] Complete verified Tier A batches.
- [ ] Complete animation requests.
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
