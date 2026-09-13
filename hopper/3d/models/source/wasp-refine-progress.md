# Turbine Wasp refinement checkpoint

2026-09-12: Refinement of Sol's technically validated but visually rejected M-014 draft. Owns `wasp_refine.py` and ignored `local/hopper-wasp-refine/`; production integration authorized after final root review.

- Preserves the three fan pivots, intake ring, stinger, exactly two legs, six clips and six sockets.
- Replaced helmet/thorax with smooth swept sectional lofts. Eye lenses, rims and pupils sample the helmet surface itself, removing detached eye badges. Added wrapping shell plates and tapered curved dorsal/flank thorns.
- First renders checked shape; reduced redundant loft/eye/thorn tessellation toward 6k/2k budgets. Restricted slate texture UVs to the existing generated violet trim band.
- Lowered the third fan slightly beneath the abdomen for readability. Extended Hover rotor sampling across its full 1.1 s duration; the mechanical draft rotated only during the first 0.28 s and then held.
- Captures and restores all rest transforms between poses and both before/after export, addressing Blender's NLA export state leak.
- Geometry passes at 5,910 / 1,933 triangles and 7.7 × 3.4 × 6.1 m. LOD1 front fan rims use regular 12-sided geometry to avoid jagged decimation. Both LODs receive front, three-quarter, side and top views plus all six clip key poses.
- Clip comparison caught and corrected missing Dash root inheritance on LOD1. Numeric audit also caught fractional-frame NLA truncation in the inherited draft; authoring keys are now rounded up to complete frames so final Dash, Hit and Dissolve keys reach export.
- Root accepted both final contact sheets and authorized production integration. Published `enemies/turbineWasp.glb`, compact `previews/enemy.turbineWasp.png`, manifest entry, and delivered request status. No commit made by the refinement agent.
- Reproducible QA: `python3 hopper/3d/models/source/wasp_contact_sheets.py`, then `python3 hopper/3d/models/source/wasp_audit.py`. Audit records exact endpoint/root movement checks and candidate hashes in `wasp-refine-validation.json`.
- Runtime responsibilities: blend Hover fan rotation beneath Intake_Tell/Dash as appropriate; drive wind/intake and dissolve shader VFX; expose Core/Landing hitboxes after Guard_Break. The model supplies pivots, socket positions and rigid poses.

Run: `/Applications/Blender.app/Contents/MacOS/Blender -b --python hopper/3d/models/source/wasp_refine.py` (approved executable escalation on this Mac).
