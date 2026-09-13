# M015 Basalt Burrower art refinement

Candidate only. Root owns review/integration. Source: `basalt_burrower_refine.py`; outputs: `local/hopper-basalt-burrower-refine`.

First coherent source checkpoint replaces the mechanical scaffold with an elongated basalt body, layered scutes, thick broken dorsal slabs, protected ivory core cage and side ribs, a tapering seven-ring drill with visible cutting flutes, four scale-wrapped clawed legs and a pointed armored tail. Both LODs reuse the canonical generated violet trim; LOD1 seams are UV-mapped without extra triangles.

The source preserves the original two 16-joint skins, eight clips, three sockets, exact 7.7 × 4.1 × 11.4 m bounds and 7k/2k budgets. Drill spinning and Erupt-only upward root motion retain the original interface. First build, budget, rest appearance and deformation QA pending; this checkpoint is not an accepted delivery.

## First build and deformation findings

- Both authored LODs fit exact bounds at 6,740 / 1,988 triangles after adding convex fracture facets to the dorsal shards. Updated shard yaw/offset/lean breaks the initial regular parallel arrangement.
- Initial both-LOD skin/clip/drill/root audits passed. The fixed support audit nevertheless found the inherited spine pitch put front soles about 1.9 m below ground in Erupt_Tell and 1.8 m above it in Land.
- Corrected restrained three-spine pitch and baked per-leg joint translations now preserve support through brace, Erupt pose, landing and withdrawal; Tunnel retains swing lift. Erupt is still the only scene-root translation, [0, 4.8, 0]. The original 16-joint skeleton is unchanged.
- Re-rendering full deformation. `basalt_burrower_contact_audit.py` will add 61-phase evaluated-sole samples per support clip/LOD and fixed-camera side renders with a visible Y=0 ground plane. Root review and integration remain pending.

## Final candidate checks

- Final exported GLB: **6,740 / 1,988 triangles**, **2,179,260 bytes**, SHA-256 `4776f936f9aad7a844f3de14caa98f453c8f1a4ca83688585f20041ff92ecdaa`.
- Independent exported-skin audit passes: two 16-joint skins, finite normalized weights and attributes, all eight clips, three correctly bone-parented sockets and Erupt-only root motion [0, 4.8, 0]. Raw exported quaternion travel proves one complete drill turn in Buried_Idle and two in Tunnel, on both LODs.
- Dense evaluated contact audit: 61 phases × four support clips × both LODs. Erupt_Tell/Land/Withdraw sole error stays below 6.8 mm; Tunnel penetration stays below 2.2 mm while swing lift is retained. This measures the skinned foot meshes after deformation, not their rest bounds.
- Rest and all-clip deformation sheets are current. Final fixed-camera side contact sheets use a visible Y=0 ground plane and line. The ground and line exist only in the QA render scene and are not in the exported asset.
- Full candidate validation passes. Root final art/contact review and integration authorization pending. No production/shared files touched for M015.

## Production integration — 2026-09-13

Root accepted final art, all poses and both fixed-ground contact sheets. The approved GLB is published to `hopper/3d/models/enemies/basaltBurrower.glb` with compact preview, shared manifest entry, generated delivered request documentation, QA receipt and scaffold disposition update. Full repository validator: **78/78 GLBs pass**. Root handles the commit. Shared files released; this completes the final planned local creature.
