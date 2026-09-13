# M-011 Chain Manta canonical art pass

Delivered: `hopper/3d/models/enemies/chainManta.glb`. Root owns commits; the art agent integrated the production files after explicit final review approval.
Reference inspected: `design/references/enemies/chainManta-turnaround-preview.jpg`.
Root accepted the rest silhouette/palette, both final clip sheets, and Soar extrema.

## Reproduce

- Build and render: `/Applications/Blender.app/Contents/MacOS/Blender --background --python hopper/3d/models/source/chain_manta_refine.py -- --qa`
- Evaluated surfaces: `/Applications/Blender.app/Contents/MacOS/Blender --background --python hopper/3d/models/source/chain_manta_audit.py`
- Sheets: `python3 hopper/3d/models/source/chain_manta_contact.py`
- GLB audit: `node hopper/3d/models/source/chain_manta_validate.mjs`
- Repository validation: `node hopper/3d/models/source/validate.mjs --manifest local/hopper-chain-manta-refine/manifest.json local/hopper-chain-manta-refine/chainManta.glb`

Blender needs existing authorized sandbox escalation because sandbox startup crashes.
Logs: `/tmp/chain-manta-refine.log` and `/tmp/chain-manta-audit.log`.
Helpers import scaffold `chain_manta.py`, surfaces from `wasp_refine.py`/
`phase_skate_refine.py`, and reusable studio/render from `window_ray_refine.py`.
The render module globals point to this candidate and the Chain Manta scaffold.

## Final geometry and animation choices

- 4,818 / 1,980 authored triangles; exact 14.2 × 7.3 × 7.6 m in Blender.
- Two skins, eighteen joints each; seven clips, six unique sockets, static roots.
- Broad cambered hook wings with layered slate armor, paired swept horns, an inset
  ivory slit eye, faceted back core, short center tail, two real linked chains,
  crescent/spear hooks, and a visible violet weak point on the left tether end.
- Ten interlocked links per chain in both LODs; LOD1 reduces tube cross sections.
  Both chain strands use the contracted shared six-joint tether spline.
- Wing axes bend instead of twisting. Dissolve scale occurs once at Body instead
  of compounding through child joints. Socket world matrices refresh before bone parenting.
- Surface audit found separate fissure overlays lifted up to 9.5 cm in the most
  braced pose. Final fissures are material regions of the wing foil itself with
  shared vertices and skin weights, eliminating overlay drift altogether.
- The compressed export embeds the approved painted hide and violet trim images.

## QA and review files

`contact-rest.png`: four views × two LODs.
`contact-clips-LOD0.png` / `contact-clips-LOD1.png`: each clip start/mid/end.
`contact-soar-extrema.png`: 0/quarter/half/three-quarter/end for both LODs.
`rig-qa.json`: weights, eighteen-bone lists, motion samples, chain articulation,
static roots, bounds, triangle counts, and exact Soar channel closure.
`surface-audit.json`: nine evaluated samples per clip per LOD, vertex-finite
checks, Soar vertex closure, link/hook contact samples, and socket tracking.
`validation.json` and source `chain-manta-refine-validation.json`: independent
compressed skin bounds, SHA256, image/skin counts, clip/socket/root assertions.

Final topology rebuild and all 54 renders complete. Art agent inspected both LODs
in four rest views, all seven clips at start/mid/end, and Soar quarter-cycle extrema.
Repository validator and independent compressed GLB audit PASS. Surface audit PASS
at nine samples per clip per LOD: finite coordinates; evaluated Soar first/last
vertex delta below 4e-17 m; maximum adjacent-link nearest-vertex distance 0.113606 m
on the coarse LOD1 tubes; maximum last-link/hook-eyelet distance 0.050751 m.
TetherNode stays on the visible weak point within 1 micrometer. Integrated fissure
material faces have zero overlay separation by construction. These vertex contact
checks are sampled proximity evidence, not a general collision solver.

Integrated the approved candidate as `enemies/chainManta.glb` with compact
`previews/enemy.chainManta.png`, manifest metadata, source QA, and source-generated
delivery documents. Production SHA-256:
`2018c2f8ef266dd02edeecd412dd7e14f82cf1008d3138fea94d588296d62583`.
File size: 3,293,856 bytes. Full repository validation passes **77/77 GLBs**.
Independent production audit: `node hopper/3d/models/source/chain_manta_validate.mjs --production`.

Runtime still owns navigation, platform tether attachment/dragging, weak-point
hitboxes, stomp/bounce collision, and charge/dissolve shaders. No game code or git
operations were performed by the art agent. Ignored candidate source and all
review sheets remain under `local/hopper-chain-manta-refine/`.
