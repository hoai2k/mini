# Hopper skinning repair

The initial skin passed weight-sum checks but failed anatomical ownership: broad spatial cuts placed wing-base faces on leg bones, left parts of the asymmetric front limbs on the torso, and put a rear hip shell on the lower leg. The earlier checks were insufficient to validate visible articulation.

The repair rebuilds the rigid parts from the untouched generated source. Wing/rear-leg separation follows surface adjacency with a crease penalty, seeded inside identified surfaces. Complete cleaner-side front, middle and rear assemblies are mirrored to form consistent pairs; the malformed opposite front leg's extra zig-zag segment and disconnected remnants are removed. Front and middle pivots are fitted to measured source cross-sections. Rear thigh and shin surfaces are separated by their links, including correct ownership of the hip shell. Source UV artwork is retained; deliberate cut interiors are capped.

The portable LOD pipeline then reduces the corrected mesh to **64,925 triangles**. Every vertex has exactly one rigid bone weight, and no triangle crosses bone groups. Independent interior landmark probes check both wings and all six lower leg shafts. A 121-sample walk/run check found no discontinuous joint flips (maximum per-sample change: 6.37° walk, 10.77° run).

Visual inspection covers four textured walk phases, tucked jump, backward kick and block, plus live viewer walking. The kick check caught and corrected the detached hip-shell remnant. The compressed files were reimported and their clips evaluated; Hopper retains 20 clips and the combined model retains 25. The enlarged rider remains on the original couch seat, with the same attachment checks passing.

Current files: `mini/local/hopper-3d/models/output/hopper.glb` and `hopper-rider.glb`. Editable repaired rigs: `models/hopper_rigged.blend`, `models/hopper_game_lod0.blend` and `models/animated/*-animated.blend`. Previous outputs and rigs are preserved under `models/skinning-repair/previous/`. Older static exports elsewhere in `models/` are historical; use `output/` for current runtime assets.

Reproduction: `local/hopper-3d/scripts/repair_hopper.py`, portable `create_game_lod.py`, `check_repaired_skin.py`, `build_animations.py`, `attach_export.py`, Meshopt compression, `audit_animations.py` and `reimport_animations.py`. Numeric results are included in [validation.json](validation.json).

The generated surface still has sculpted irregularities and visible articulation seams at close range. This repair addresses incorrect moving-part ownership and detached geometry; it is not a new hand-retopologized model.
