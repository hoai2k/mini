# Architecture quality refinement

2026-09-08: Eight requested hero refinements authored in architecture.py. Source syntax and a fake Context API pass completed; Blender/export/render QA belongs to root. No commits made.

- M031: complete ivory arch spandrels/curved arch edges, inset teal pier details, capitals/feet, segmented rail fascias and sleepers. Landing, TrackStart/End unchanged. Approx 2,716 triangles.
- M033: six open steel floors with completed ivory/window core, staged panels, safety rails and distinct oxide columns. Crane mast/jib are actual open lattice, plus cab/counterweight/hoist. Crane socket and Jib_Slew preserved; jib top now meets 131.5 landing. Approx 4,092 triangles.
- M035: tall inset window bays and buttresses around drum, real hemisphere with segmented curved ribs, latitude mullions, annular sill and finials. Crown/ring landings preserved. Approx 4,204 triangles.
- M041: painted riveted steel versus oxide courses, warm orange furnace with hotter inset, side/rear catwalks with knees, defined roof landing, dual stacks, collars, feed pipes and ladder. Landing list unchanged. Approx 3,564 triangles.
- M046: true open green mast and deep underside boom truss, galleries, cab, winch, sling/hook and corrugated container. BoomPivot, HookLoad, Landing.Hook, Boom_Slew and Container_Hoist retained. Approx 2,940 triangles.
- M051: solid annular box-section deck, inner/outer guard rails, underside webs, lattice legs with collars and wide upper knees, eight pads. Pad landings unchanged. Approx 5,552 triangles.
- M052: enamel stages with seams, swept foil fins, engine bells, open oxide mast with braced arm platforms. Four arm landings preserved. Approx 2,992 triangles.
- M054: reference-directed 240-degree cutaway enclosure reveals the four staggered baffles, supports, rails and orange bottom vent/grate. Full circular rim and foundation preserve footprint; rear wall intentionally opens toward positive X/Z for visual/play readability. Updraft and baffle landings unchanged. Approx 3,052 triangles.

Small root-requested corrections: M044 molten slag changed cyan to warm orange; M050 top now uses painted city concrete instead of green/dark harbor trim. Existing clips and landings retained.

Texture materials use existing generated region trim images and explicit UV bands, not new procedural art. Custom warm emissions use amber/orange. No common.py/build scripts modified. Approximate source triangle counts include conservative beveled-box estimates; actual export report is authoritative.
