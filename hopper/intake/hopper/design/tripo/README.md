# Hopper / Tripo generation kit

Prepared September 7, 2026. This kit is for generating **two separate models**, followed by cleanup and custom rigging in Blender. Generation was authorized September 7, 2026. See `generation-report.md` for settings, results and review findings; heavy source models are kept under the Git-ignored `local/tripo-models/` directory.

## Image selection

- **Hopper, first attempt:** `hopper-master.png` is the primary single-image input. It shows the empty saddle and separated limbs in three-quarter view.
- **Hopper, multiview candidate:** `hopper-front.png`, `hopper-left.png`, `hopper-back.png`, `hopper-right.png`.
- **Rider, first attempt:** `rider-master.png` is the front A-pose input.
- **Rider, multiview candidate:** front = `rider-master.png`, then `rider-left.png`, `rider-back.png`, `rider-right.png`.
- `generation-prompts.json` records the imagegen prompts and reference relationships. `contact-sheet.jpg` is for review only; never submit the collage as a single model input.

All views were generated from the same subject master, but they are **illustrated proposals, not mathematically registered renders of one 3D object**. Prioritize the master if joints, markings, saddle construction or proportions disagree. Start with single-image generation; try multiview only after comparing the views. Tripo-generated multiview from the master is another candidate if independently drawn views conflict. Side names refer to the subject's side: left profile faces image-left, right profile faces image-right.

Review findings: the master and left-view first drafts had an extra visible leg; they were corrected (see `correction-prompts.json`). The final left view has overlapping far-side feet and is a supporting shape reference rather than a reliable limb-count guide. Saddle rails and antenna curvature still differ slightly among views. Rider side-view arms overlap the torso in projection. Therefore the recommended first generation is **one image per model using the masters**, not all nine images together.

## Hopper model prompt

> One giant six-legged mechanical grasshopper, matching the reference. Exactly three bilateral leg pairs: four slimmer front/middle supporting legs and two enormous rear jumping legs with long armored femurs and serrated lower legs. Deep green rigid armor, ivory and red stripes, blue thorax panels, brass circular hinges, black mechanical joints, two large red oval eyes, ivory segmented mouth plate, two gold segmented antennae. Empty red saddle with brass safety rail on the back. No boy. Neutral standing pose, rear legs partly extended, physical gaps between every leg and the body. Preserve the heroic 1970s anime silhouette and painted color design. Complete solid armor surfaces around each joint, suitable for later separation into rigid articulated pieces. No ground, display stand, scenery, text, lasers, smoke or baked dramatic shadows.

## Rider model prompt

> One stylized young boy matching the reference, separate from any robot. Tousled short black hair, youthful face and child proportions, ivory short-sleeved shirt, red neck scarf, blue shorts, tan belt, cream socks, brown ankle shoes. Neutral A-pose, arms slightly away from torso, feet apart, relaxed hands with five fingers each. Preserve the same costume on the back and sides. Short scarf tails resting naturally with space from the arms. Clean 1970s anime character design, simple readable surface colors. No saddle, robot, ground, accessories or action pose. Complete limbs and clothing surfaces suitable for a custom humanoid rig.

These are model briefs, not guaranteed API fields: image/multiview endpoints may not accept a supplemental text prompt. Use only fields documented for the selected endpoint/model; do not invent a `negative_prompt` or assume text can repair contradictory image inputs.

## Generation sequence

1. Confirm the account's available model versions, pricing and remaining credits after credentials are configured. Start with one Hopper candidate and one rider candidate; inspect before commissioning alternatives.
2. Obtain geometry previews first where supported. Judge silhouette, six-leg anatomy, joint separation and underside completeness before paying for high-resolution texture work.
3. Keep the original high-detail mesh. Export GLB with textures for inspection and FBX if useful for Blender interchange. Disable automatic animation for the first export: we intend to build a custom rig.
4. If Hopper's legs fuse, try a better-view candidate or segment generation; otherwise rebuild only problematic joints/legs in Blender. Remeshing alone does not restore hidden anatomy.
5. Refit the boy to the empty saddle in Blender. Use the existing canonical composition as the seating/scale guide; the separate image canvases are not to scale. Do not shrink Hopper's hind legs to make the rider fit.

## Acceptance before rigging

- Exactly six legs attached in three paired positions; no fused feet, duplicated knees or invented wing/leg hybrids.
- Two antennae and two red eyes; antennae and rails can be rebuilt if too thin or merged.
- Huge hind femurs and long lower legs have visible hinge centers and room to fold without intersecting the body.
- Saddle is empty and accessible; the rider is a separate object, with complete hands, feet and clothing.
- No background plane, scenery, holes through armor, or underside made solely from a flat texture.
- Materials separate eye emission, armor colors, mechanical joints and rider skin/clothing. Highlights should mostly come from lighting/shading, not fixed painted specular reflections.
- Test a crouch → takeoff → tucked flight → landing cycle before spending time on fine detail.

## Rigging plan and provisional web budgets

Hopper: body/root controls, neck/head, separate rigid chains for all six legs, dedicated hind-leg folding and kick controls, antenna chains, saddle attachment and eye-laser sockets. Armor should follow rigid bones; use blended skin weights only for flexible connections. The boy receives a separate humanoid rig, with hand grips, foot supports, seat attachment and secondary scarf motion.

For a first web prototype, aim for roughly 40–80k triangles for Hopper and 10–20k for the rider, then profile on the target display/device. These are starting budgets, not Tripo guarantees. Start with 2K material textures and avoid duplicate large maps. Preserve a high-detail source separately from game exports. Final GLB export must include baked animation clips and be tested for joint pivots, normals, materials and file size.

## Credentials

When ready, configure `TRIPO_API_KEY` locally or put it in `mini/local/tripo.env` as `TRIPO_API_KEY=...`. That directory is Git-ignored. Tell the assistant when it is configured; **do not paste the key into the conversation or commit it**. The generation phase should load it without printing it.

## Official references

- [Tripo multiview input documentation](https://developers.tripo3d.ai/en/docs/generation-multiview-to-model): named view inputs; verify the chosen API version before execution.
- [Tripo Smart Mesh workflow](https://www.tripo3d.ai/blog/smart-mesh-tutorial): generation, topology options and exports.
- [Tripo auto-rig documentation](https://developers.tripo3d.ai/en/docs/animations-rig): creature categories; optional comparison only, not a replacement for Hopper's mechanical rig.
