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
| Water packed with molecules in every direction, small ones filling the gaps | ~550 molecules in a thin slab round the target; empty past its edges | ~5,500 molecules (≈63,000 beads) plus 1,400 far sprites (MP-V07) and the panorama (MP-V06) in two nested GPU baths wrapped round every view |
| Every molecule a lumpy cluster of small spheres | smooth icosahedral blobs | bead clusters (sphere impostors) |
| Soft contact shadows in the creases | none | per-bead crease occlusion (baked) + screen-space AO in the outlined looks |
| Hosts furred with LPS and studded with proteins | sparse LPS on the front half | a dense bead forest of LPS, porins and membrane proteins all round each cell (the Goodsell looks; false light now draws a lumpy membrane under shell fur, see below) |
| Far cells hanging in haze all round | a band of far cells behind the slab | far cells wrapped round every view, and a backdrop drawn by view direction (see below) |
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
  depth, plus a 4-tap depth-discontinuity outline that fades with distance.
  Strength per look (AO / outline): false light 0.45 / 0.3, Goodsell 0.6 /
  0.6, cryo-EM 0.4 / 0.8, fluorescence 0.2 / 0.25. The quality governor
  trims the taps (10, 6, none).
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
  3D-noise haze with far molecule silhouettes (MP-V06, the delivered equirectangular
  panorama, is mixed over it). The UV wash is placed in the world
  the same way (from the depth buffer), so it stays at the surface in any
  orientation.
- **Organic hosts.** The capsule body wobbles more (vertex noise) under its
  wet relief; the bead forest hides the primitive.

## Not done (see `micro/design/open-recommendations.md`)

- (Done 2 Nov 2026: the hosts' membrane is now a displaced, lumpy, wet surface in
  false light, without MP-V05; see "The look target".)
- AO that spares the phage's glow (the pass darkens creases on it too).
- Finer wet detail on the membrane (the target's pale streaks and teal-green
  variation) and a little more near-field particle life; the end caps of a
  cell seen head-on can read as a dark hollow.

[meso]: https://pmc.ncbi.nlm.nih.gov/articles/PMC7230070
[cellpack]: https://ccsb.scripps.edu/cellpack/
[illustrate]: https://pmc.ncbi.nlm.nih.gov/articles/PMC6834899
[illustrate-site]: https://ccsb.scripps.edu/illustrate
[qutemol]: https://vcg.isti.cnr.it/Publications/2006/TCM06
[qutemol-site]: https://qutemol.sourceforge.net/
[iwasa]: https://bioscience.utah.edu/faculty/iwasa/
[crowd]: https://pmc.ncbi.nlm.nih.gov/articles/PMC2957576

## The look target (2 November 2026)

The owner sent `micro/design/reference/phage-look-target.webp` (a bronze
crystal phage left of centre, a huge furred host at the lower right, more
cells mid-distance and far, few free particles) with: *"a bit more 'lush'
feeling, smoother, more furry less blurry, not emissive, more shaded, with
the gold color of the phage a little more bronze less yellow, more big
objects to move around and toward as opposed to a uniform sea of particles."*

A first pass (shaded light, a third of the bloom, far-only depth of field,
bronze, a quarter of the bath, nine big scenery cells) still left the near
host a speckled mosaic of beads, the water cluttered with saturated bead
chains, the phage yellow and beaded, and the far field a crowd. The second
pass rebuilt the false-light look to the recipe below.

### Recipe (read from the target)

Colours sampled from the image (a 9 × 9 average round each point):

| Where | Sample | Used for |
| --- | --- | --- |
| water, upper middle (lit) | `#6199b1` | `uTop` `#2f8494` before the tone curve |
| water, middle | `#4c6c70` | haze `uHaze` `#185462` |
| water, dark corners | `#0a2a35` | `uBot` `#07202c` |
| host membrane, hollows | `#092d3d`, `#0c303f` | membrane deep colour `#082438` |
| host membrane, lit lumps | `#1e4144` (teal) | membrane teal `#1a5e6c` |
| host crests | `#6b9186` | pale crest `vec3(0.46, 0.62, 0.56)` |
| host rim / fur | `#839ea5` | fur `#7aa4b4` → tips `#dcecec` |
| surface proteins | `#5483c3`, `#4783c3` | flower lobes `#5c80d0`, `#7a78d4`, `#6aa0d8` |
| phage head | `#ae8345`; edges `#e1d0ba` | bronze `#9a6028`-`#c48a48` (more bronze than the target, as asked); edges `#d09a58`-`#f0d0a0` |
| phage sheath | `#b3853c` | `#8f5a26`-`#b67c3e`, rings `#a87238` / `#8e5e2a` |
| far cells | `#214858`, `#205162`, rim `#295a75` | far body `(0.07, 0.24, 0.30)`-`(0.10, 0.22, 0.38)`, rim `(0.32, 0.55, 0.60)`, then 45-85 % haze |

- **Lighting.** One soft key from the upper left (view space
  `(-0.45, 0.75, 0.5)`, warm white `(1, 0.94, 0.84)`), wrapped for soft matter;
  a cool teal fill from the water, stronger from above; a rim (Fresnel) where
  light comes through thin edges; no emission but a faint rim on the phage.
- **Membrane** (`membraneLight` in `phage-goodsell.js`, toonMaterial
  `lumps`). Smooth, wet and lumpy: the capsule is displaced along its normal
  by a three-octave height field in object space (amplitude ~10 % of the
  radius, lumps ~1/3 of the radius across) and its normal re-derived by finite
  differences, so the lumps catch the light; finer relief (three rotated
  octaves of smooth noise) tilts the normal per pixel. Colour from height:
  deep navy in the hollows, teal on the lumps, soft blue patches, pale crests;
  light through thin parts and the rim (a subsurface-like wrap); a sharp wet
  glint broken into sparkles and a broad faint sheen; the bright water above
  reflected at grazing angles. MP-V05 is not used in false light: as albedo it
  was the busy bead mosaic the owner objected to, and as relief it added
  nothing the noise does not.
- **Fur** (`furShells`). Seven shells of a coarser copy of the capsule (one
  instanced draw), each pushed out along the same lumped normal, cut into fine
  tapering strands (one per cell of a 3D grid on the base surface, jittered,
  random length), pale blue-white, darker at the root, fading to nothing
  face-on so it reads as a fringe at the silhouette. Far off, strands below a
  pixel average into a soft fuzz instead of shimmering.
- **Surface proteins.** Sparse: one "flower" per ~1,200 units² (about 45 on
  a host, a dozen or two on a visible side), four or three lobes of beads on a
  thin pale stalk, soft blue and violet (bead impostors at 80 % saturation).
  The grab receptors (gold on Host A's patches) and the violet decoys stay as
  they were.
- **Water.** Clear teal with a gentle gradient (lighter toward the sunlit
  surface), a faint mottle, and MP-V06 only as a heavily blurred 256 × 128
  copy mixed in at 50 %, so it lends colour and the soft shapes of far cells
  but not its crowd. The bath draws a share of each species in false light
  (`fl` in `world.js` `NEAR` / `MID`): no green dimers, yellow chains or
  humic tangles; a fifth to a third of the globular proteins, a few gold
  ones; ~45 % of the small molecules; at 50 % saturation (45 % for the mid
  bath). MP-V07's far sprites: 18 %, hazier. Fine motes: 600, dim.
- **Far cells.** 60 big soft rods in one instanced draw, wrapped round each
  view's centre on the GPU in a ±950-unit box and never nearer than 420 units
  (they dissolve before that), so a few hang in the haze whichever way you
  look; soft body, pale fuzzy rim, 45-85 % haze, softened by the depth of
  field. Scenery for the eye only.
- **Big things to move toward.** 36 big bacteria of other kinds (`BYSTANDERS`
  in `world.js`, was 9), half to three times a host's size, evenly through
  the field's volume (~500 units apart, so a view that sees ~450 units into
  the haze holds a few), two composed for the opening view (a huge one at the
  lower right, one farther off at the upper left). Same membrane and fur as
  the hosts, sparse flowers, a few pili; solid. The director's hosts are
  placed as before.
- **Phage** (`phage-model.js`). Bronze glass: the faceted capsid at 72 %
  opacity with a strong specular and Fresnel, thin bright facet edges, and the
  packed genome as a dim faceted amber core seen through it (in place of the
  spool's coils, which read as stripes in a lantern; the cutaway still shows
  the spool); a ribbed sheath of finer rings; each long fibre drawn as thin
  tubes along a smooth curve through its simulated nodes, with small joints
  (the knee and tip a little larger), not as beads. Glow only a faint rim.
- **Post.** No outlines in false light (the target is shaded, not inked), a
  light AO (0.3) only within 3.5× the focus distance; depth of field on the
  far layers only, plus a light softening of a molecule right at the lens; a
  partly transparent pixel (fur, glass, light) over the far background keeps
  its sharpness; highlights barely warmed (bronze, not yellow).
- **The medium** (`medium.js`, added 2 November 2026 with the controls pass:
  the owner asked for "a textured liquid of molecules ... transparent noise
  texture"). Four faint slices of drifting world-space noise across each view
  (0.55 to 2.3 times the camera's distance), pale teal light with a trace of
  alpha, so the clear water between the clumps reads as a thick, slowly
  moving liquid and parallaxes as you move; the slice before the phage is
  kept faint so it never veils you. A current streams it into pale streaks
  along its direction. It sits under the look: the target's clear water and
  soft clumps still lead.

### The black blocks (fixed)

The rectangles of black with green speckles in the earlier screenshots were
non-finite texels in the scene target spread by the blurs. One NaN or
infinite texel, downsampled to the quarter-resolution soft copy (the depth of
field) and blurred twice, became a ~100 px block of NaN; and since
`mix(sc, soft, 0)` is still NaN, the block showed whether or not that pixel was
blurred (the bloom's chain did the same at 1/4 and 1/8). The sources were the
impostor ray-cast's infinities (fixed in the first revamp) and the
procedural bump's `normalize(abs(det) * n - grad * bump)`, which is
`normalize(0)` on an edge-on triangle (det = 0, grad = 0). The bump now keeps
the unbumped normal there, and the quarter-resolution downsample that feeds
every blur (`BRIGHT_FRAG`) drops any non-finite texel, so one can never spread
again. (A guard on every scene read in the final pass cost a third of that
pass in software GL, so the guard sits where the blurs start.) `debug.nanCount()`
counts non-finite texels in the last scene target; it reads 0 in every view
of the checks.

### Side by side

`compare-final.jpg` in the session's scratch folder (`phage-look2/final/`):
the target, ours at the same framing (the phage left of centre, a big host at
the lower right), the first pass at that framing, and a Host B angle.
Close now: the phage a bronze crystal, a smooth wet teal-blue host with a
pale fur fringe and sparse blue flowers on stalks, clear water with a few
soft molecules, big cells near and soft rods far off. Still apart: the
target's membrane carries more fine wet detail and colour (teal-green and
pale streaks) than ours, its water a few more small soft molecules, and its
mid-distance cells are crisper.
