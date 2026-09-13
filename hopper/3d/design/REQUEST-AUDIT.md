# Request inventory audit

Audited 2026-09-12 against `hopper/3d/design/source/build_requests.py`, the generated `standin-manifest.json`, current model manifests, round-three verification, model progress, modelling notes, and both preserved stashes. This file is an audit/recommendation; the request source remains authoritative and no shared manifest or production-state file was changed.

## Counts and source of truth

After the reviewed M-006 and M-005 deliveries (`bdd3082` and `f169534`),
the generated inventory contains **93 distinct model requests**: **76 delivered**,
**17 stand-ins**, and **0 open**. M-001 and M-002 are delivered with reviewed
animation extensions. The 17 creature IDs still represented by stand-ins are
**M-003, M-004, M-007–M-013, M-015–M-017, and M-019–M-023**; zero open entries
does not mean these creatures or later art cleanup are finished.

There are **86 image requests**: round one **47** (46 delivered, **T-038 procedural-final**), round two **32 delivered pending art review**, and round three **7** (**T-080–T-082 and T-086 delivered**; **T-083–T-085 open**). The exact pending image IDs are therefore **T-083–T-085**, all optional native-4K skies. `standin-manifest.json` is the generated status inventory; `build_requests.py` is its source. `model-requests.md` and the round image request documents are generated outputs.

The 76 delivered request IDs comprise M-000–M-002 in `hopper/models` plus
M-005, M-006, M-014, M-018 and M-024–M-092 in `hopper/3d/models`. The latter
manifest contains **75 GLB entries representing 73 distinct request IDs**:
M-092 has separate city, fields and mountains terrain files. File count and
request count must therefore remain separate. The current authored
high-confidence batch is documented in `hopper/3d/models/PROGRESS.md`; its
code-built entries remain delivered for gameplay but are explicitly marked for
later Blender cleanup in `hopper/3d/models/CODE-BUILT-CLEANUP.md`. “Delivered”
here means the current implementation delivery, not final painted-art approval.

## Image reconciliation

Round-three verification is authoritative at `hopper/3d/textures/round3/verification.json` and `hopper/3d/textures/round3/README.md`:

- **T-080 delivered/verified:** the imagegen seam-cross sea, dust and slag repaints and their aligned grayscale detail maps all measure 0.000 on both seams. Native paintings are 1254²; 2048² albedos are upscaled exports with a trivial 8 px wrap-edge finish. The rejected 10% feather candidates were not used. Shoreline foam also passes at seam 0.000 with clear top/bottom margins.
- **T-081 delivered/verified:** light landing guide passes alpha and geometry checks.
- **T-082 delivered/verified:** all twelve occupied Hopper effect cells clear the requested 48 px atlas padding (minimum 53 px) after uniform scale 0.8327.
- **T-086 delivered/verified:** all four prop decal cells clear the requested 24 px padding (minimum 28 px) after uniform scale 0.7812.
- **T-083–T-085 open/optional:** native-4K repaint attempts returned 1774×887, so they do not meet the explicit 4096×2048 native requirement.

Native-resolution constraint applies broadly to the delivered painted pack: `hopper/3d/design/image-history.md` and `hopper/3d/textures/README.md` record source masters around 1254² for tiles and 1774×887 for skies; requested larger exports are upscaled. The T-082/T-086 padding repair uniformly scales existing native paint and creates no new detail. Round-two reference metadata similarly records native source sizes per plate and says larger exports are upscaled. Do not describe those exports as native 2K/4K/8K detail.

## Model disposition suggestions (not status changes)

The remaining 17 creature stand-ins are pending review and production. M-005
Window Ray and M-006 Spire Leech are now reviewed deliveries, alongside M-014
Turbine Wasp and M-018 Phase Skate. The exact feasible local remainder is
**three art refinements backed by completed mechanical scaffolds**:

- **M-007 Crag Tortoise:** `hopper/3d/models/source/crag_tortoise.py`; Astra
  refinement queued after Window Ray.
- **M-011 Chain Manta:** `hopper/3d/models/source/chain_manta.py`; Astra
  refinement queued after M-007.
- **M-015 Basalt Burrower:**
  `hopper/3d/models/source/basalt_burrower.py`; scaffold ready, art refinement
  still pending.

These three remain stand-ins until their canonical art passes are reviewed and
integrated. No additional creature scaffold is planned beyond this seven-creature
local sequence. **M-013 Coil Wraith** and **M-020 Gravity Cantor** retain
identity/contract conflicts requiring reconciliation. Gravity Cantor's crowned
humanoid painting contradicts its requested rigid ring organ with four prongs;
Coil Wraith's mismatch is detailed below. The current split is therefore **3
scaffold-backed art passes + 2 conflicts + 12 Tripo-preferred**.

The remaining **12** are Tripo-preferred or require a higher creative/organic pass: **M-003 Shade Hound, M-004 Seed Spitter, M-008 Rift Condor, M-009 Furnace Hound, M-010 Slag Caster, M-012 Ballast Crab, M-016 Thorn Choir, M-017 Veil Medusa, M-019 Mirror Stalker, M-021 Night Rook, M-022 Smelter Leviathan, and M-023 Eclipse Regent**. This is a recommendation only; it does not relabel any request or authorize Tripo work.

Outside the creature stand-ins, the exact feasible Tier A cleanup remainder is
**four functional rigid kits**: **M-059 Coral Bridge, M-060 Floating Reef,
M-064 Ring Shard, and M-066 Gravity Seam**. Their falling, moving-root,
orbiting-landing, and animated-arrow pivots require the separate
pivot-preserving cleanup path documented in
`hopper/3d/models/source/tier-a-progress.md`; they must not pass through the
static flattening runner. **M-056 Ivory Rib Arch** is a separate creative
geometry correction: its existing `Landing.0` is inside the central rib with no
downward landing face within the required 0.5 m, so cleanup alone cannot make
the authored landing valid. These five entries are already delivered code-built
requests and do not change the 76/17 request-status counts.

The remaining image-side external limitation is **T-083–T-085 only**. They are
optional sky repaints whose explicit requirement is native 4096×2048 paint;
the available generator returned 1774×887, and upscaling cannot satisfy that
constraint. They remain open unless a source capable of true native 4K becomes
available and the resulting paintings pass review.

For every creature, the source-of-truth chain is `build_requests.py` → `standin-manifest.json` / `model-requests.md`, canonical sprites in `hopper/game/public/assets/enemies` or `bosses`, and approved-but-pending-review turnaround sheets under `hopper/3d/design/references`. The local model contract is `hopper/3d/models/source/BUILD-CONTRACT.md`; existing local builders are `common.py`, `rural.py`, `architecture.py`, and `props.py`. Tripo-preferred material is preserved under `hopper/design/tripo/` when applicable, but no Tripo output was inferred as a delivered creature model.

## Additional canonical review on resume

Root inspected the Spire Leech and Coil Wraith turnaround paintings. Spire Leech's segmented armored worm is compatible with its spline contract. Coil Wraith is another material mismatch: its painting has a beaked head, armored torso, two clawed arms and a serpentine tail, while M-013 specifies a narrow ribbon between two electrical nodes. It cannot be faithfully delivered as that simple spline ribbon without changing either the canonical design or the rig/dimensions contract.

This review moved Coil Wraith from the initial text-only local-first recommendation into the conflict category. Counts above include this correction.

## Stash reconciliation

`stash@{1}` (`Preserve Round 3 documentation before production sync`) contains an older documentation-only claim about T-080, T-081, T-082 and T-086, plus an older 47-image summary. Do not restore it: current generated docs and zero-failure verification supersede that record; only the separate native-4K failures for T-083–T-085 remain open.

`stash@{0}` (`Preserve local Tripo references before production sync`) contains the formerly untracked `hopper/design/tripo/` references, reports, prompts, and animation materials. Upstream now includes this directory. Preserve it as reference material; do not blindly pop or treat its presence as delivery of any M-003–M-023 request.

No source count correction is pending. The model records are split by layout:
`hopper/3d/models/manifest.json` covers M-005, M-006, M-014, M-018 and
M-024–M-092, while the existing M-000–M-002 delivery metadata is in
`hopper/models/manifest.json`. The generated request inventory correctly totals
76 delivered request IDs and keeps the remaining 17 creatures as stand-ins.
