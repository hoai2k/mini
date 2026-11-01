# Phage: look development

The owner, 1 November 2026: *"The references are lush and look detailed and
organic, but the game feels sparse and geometric."* This note says what the
target is, where it comes from, and how each part maps to a real-time
technique in three.js r186 (no build step, ES modules, a software-WebGL
fallback).

## The target

The two false-light references in
`micro/design/generated/phage-false-light/` (a gold phage approaching a
receptor; the genome entering a crowded cytoplasm) are the target. What makes
them lush, and what the game lacked:

| In the references | In the game before | Now |
| --- | --- | --- |
| Water packed with molecules in every direction, small ones filling the gaps | ~550 molecules in a thin slab round the target; empty past its edges | ~5,800 molecules (≈47,000 beads) in two nested GPU baths wrapped round every view |
| Every molecule a lumpy cluster of small spheres | smooth icosahedral blobs | bead clusters (sphere impostors) |
| Soft contact shadows in the creases | none | per-bead crease occlusion (baked) + screen-space AO in the outlined looks |
| Hosts furred with LPS and studded with proteins | sparse LPS on the front half | a dense bead forest of LPS, porins and membrane proteins all round each cell |
| Far cells hanging in haze all round | a band of far cells behind the slab | a shell of 48 far cells in every direction, and a backdrop drawn by view direction |
| Colour by molecule type | a few palette pairs | one palette by type (`PALETTE` in `shared/techniques/phage-beads.js`) |

## Where the look comes from

- **Goodsell's mesoscale paintings and their 3D successors.** David
  Goodsell paints cells and their surroundings with every molecule at true
  relative size and crowding (cellular environments are 20 to 30 % filled
  with macromolecules); cellPACK and Mesoscope build the same scenes in 3D
  from recipes of membranes, membrane proteins and soluble molecules
  ([Goodsell, Autin and Olson on mesoscale illustration][meso];
  [cellPACK][cellpack]). The game borrows the recipe idea: each bath is a
  list of species with counts and size ranges.
- **Illustrate and Mol\*: flat colour, outlines, soft ambient shadows.**
  Goodsell's *Illustrate* renders space-filling molecules with cartoon
  colours, outlines found from depth differences between pixels, and soft
  ambient shadows ([Goodsell, Autin and Olson 2019][illustrate];
  [Illustrate][illustrate-site]). The Goodsell look's outlines now come from
  the same idea: a depth-discontinuity pass.
- **QuteMol: ambient occlusion and edge cueing on sphere impostors.** Tarini,
  Cignoni and Montani showed that space-filling molecules of up to a million
  atoms read far better in real time with ambient occlusion and depth-aware
  edge halos, drawn as GPU procedural impostors ([TVCG 2006][qutemol];
  [QuteMol][qutemol-site]). That is the core technique here.
- **Molecular animation (Iwasa) and crowding.** Molecular animators show
  motion as constant thermal jostling, often thinning the crowd to show the
  key players ([Iwasa, Animation Lab][iwasa]); particles in a fluid make
  near-continual random displacements from collisions
  ([crowding and diffusion review][crowd]). The game keeps the crowd thick
  but clears a lens round the camera and a wake round each phage.

## How it maps to real time

- **Bead-cluster molecules as sphere impostors**
  (`shared/techniques/phage-beads.js`). A molecule is a template of beads;
  each bead is one camera-facing quad whose fragment shader ray-casts the
  sphere, discards outside it, writes the true depth (`gl_FragDepth`) and
  shades it. One instanced draw per template draws every copy. Thousands of
  molecules cost tens of thousands of quads, not millions of triangles.
  (The ray-sphere test uses the closest-approach form; the textbook
  `|C|² - b²` cancels catastrophically for small, far beads and produced
  infinities that bloomed into blotches.)
- **Crease occlusion, baked.** Each bead carries the direction from its
  cluster's centre; the side facing into the cluster darkens. Cheap, stable,
  and it makes every cluster read as a lumpy solid.
- **Screen-space ambient occlusion and outlines** (in the final pass,
  `phage-goodsell.js`): up to 10 depth taps per pixel in a ring scaled by
  depth, plus a 4-tap depth-discontinuity outline. On in the Goodsell,
  cryo-EM and fluorescence looks; in false light the baked occlusion and the
  translucent rim carry it (the pass's AO there darkened the glow).
- **A bath that is never empty.** The baths never touch the CPU: the vertex
  shader wraps each molecule round the view's centre (`mod` in a box), so the
  water is full whichever way the camera turns and round every split view (the
  centre is set per view); molecules shrink away before a wrap (no popping),
  jostle with a few sines (smaller ones faster), tumble, make way for each
  phage and for a gust, vanish inside the hosts, the amoeba and the clay
  (capsule tests), and clear a lens in front of the camera.
- **Colour by type, depth-cued.** False light: a warm key and a teal fill,
  wrap lighting, a translucent rim and a wet glint, fading into teal haze.
  Goodsell: flat colour, a soft two-tone light and depth by desaturation.
- **The backdrop by direction**, not by screen: the final pass rebuilds each
  pixel's view ray from the inverse projection and camera matrix, and draws a
  3D-noise haze with far molecule silhouettes (MP-V06, an equirectangular
  panorama, replaces it when delivered). The UV wash is placed in the world
  the same way (from the depth buffer), so it stays at the surface in any
  orientation.
- **Organic hosts.** The capsule body wobbles more (vertex noise) under its
  wet relief; the bead forest hides the primitive.

## Not done (see `micro/design/open-recommendations.md`)

- A true membrane mesh with a lipid-headgroup texture for the hosts (MP-V05
  will give its albedo; the bead forest stands in).
- Per-bead SSAO in false light without darkening the glow.
- Impostor beads for the phage itself (its capsid is the T4 model, which is
  geometric because the real capsid is).

[meso]: https://pmc.ncbi.nlm.nih.gov/articles/PMC7230070
[cellpack]: https://ccsb.scripps.edu/cellpack/
[illustrate]: https://pmc.ncbi.nlm.nih.gov/articles/PMC6834899
[illustrate-site]: https://ccsb.scripps.edu/illustrate
[qutemol]: https://vcg.isti.cnr.it/Publications/2006/TCM06
[qutemol-site]: https://qutemol.sourceforge.net/
[iwasa]: https://bioscience.utah.edu/faculty/iwasa/
[crowd]: https://pmc.ncbi.nlm.nih.gov/articles/PMC2957576
