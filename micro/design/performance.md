# Micro Zoom: performance audit

Audit of every world (springtail, mite, tardigrade, amoeba, paramecium,
bacterium, phage), the zoom transition player (`prototypes/zoom/`) and the
shell (`game/`), at 1 player and at 4 players split. Measured on 31 Oct 2026
while other agents were adding fight-back and animations, so **line numbers are
as of the audit and drift**: each reference also names the function. Nothing
was changed in this phase. The fixes below are written to be applied
mechanically in a second phase.

Goal (owner): 60 fps with 4 players, without degrading the experience.

## Summary

- **Split screen multiplies whole pipelines.** Every view renders the whole
  screen through the world's whole pipeline, and only its region (about a
  quarter of the screen with 4 players) is shown (`shared/splitscreen.js`
  `render()`, `compose()`). Two worlds don't lower their resolution when the
  screen splits: phage renders 4 full-resolution views, and the tardigrade's
  DIC buffers stay at full size in every view. Restricting each view to its
  region (scissor) is the largest shared win.
- **CPU, not the GPU, is what stops some worlds at 4 players:** the mite's
  foot raycasts (brute-force triangle tests), the tardigrade's CPU body
  deformation of 48k-triangle meshes, the amoeba's per-cell granule and
  distance-field simulation inside a catch-up loop, and the springtail's water
  simulation and half-float conversion.
- **Geometry is the springtail's and phage's GPU limit at 4 players:** 6.3 M
  and 4.6 M triangles a frame, because every instanced moss capitulum or
  molecule is drawn in every view.
- **Amoeba:** the delivered images are *not* the cause of its headless
  slowness (measured: 2.95 s per frame without them, 2.68 s with them). It is
  slow headless because it is the only world with no software-GL fallback (the
  others drop to 40–60 % resolution when they see SwiftShader), and because its
  fixed-step loop runs 4 simulation steps per frame whenever frames are slow.
  At the same resolution as the others it is mid-pack on the GPU. See
  [Amoeba diagnosis](#amoeba-diagnosis).

## How it was measured

The container has no GPU: Chromium uses SwiftShader, so absolute frame rates
are meaningless. What was recorded transfers to real GPUs:

- CPU time per frame (the rAF callback), split by script from a V8 CPU profile
  (250 µs sampling);
- every WebGL call per frame: draws, primitives, render passes (framebuffer and
  viewport size of each), programs, texture and buffer uploads, framebuffer
  copies and blits, and shader compiles after warm-up;
- SwiftShader raster time, total and per pass (the GPU process is drained with
  a 1-pixel `readPixels` after each pass). This is a *relative* fill and shader
  cost: software rendering overstates ALU (`exp` in loops) and geometry;
- JS heap growth per frame (allocation lower bound), canvas-2D calls and pixels
  per frame, DOM mutations;
- a census of the heaviest meshes (triangles × instances) and of every linked
  shader (texture fetches, loop trip counts).

Every world was forced onto its **real-GPU path**: the GPU name was spoofed to
an Iris Xe, so no world took its SwiftShader fallback, and `?f=-dynres,-adaptive`
turned off the springtail, mite and paramecium governors. The tardigrade's
`mic.autoQuality` cannot be switched off from the URL, and it fell to quality 0
(0.4 scale, 10 taps). Its fill numbers below are scaled to its default,
quality 2. Runs were 8 s at 640×360 (1280×720 for the first amoeba runs, and
for the shell); counts don't depend on size, and fill is scaled to 1920×1080
analytically. 4 players were four mocked Xbox pads that join with A, then
teleported apart with each world's test hook so the screen split (3–4 views).
The container's CPU was shared with other agents' headless browsers, so CPU
times are inflated by an unknown factor (guess 1.5–3× against a recent
laptop). Compare them with each other, not with 16.7 ms. See
[How to measure](#how-to-measure) for the scripts.

### Measurements

At 640×360 unless noted. CPU = JS per frame, as measured here. *World JS*
excludes three.js. SwS = SwiftShader raster ms per frame (relative only).
Prims = triangles (and points) submitted per frame.

| run | views | CPU ms/frame | world JS | three.js | SwS ms | draws | prims | passes | upload KB/frame (tex + buffer) | heap KB/frame |
|---|---|---|---|---|---|---|---|---|---|---|
| springtail 1p | 1 | 34 | 13.7 | 3.4 | 3734 | 25 | 1.94 M | 5 | 256 + 169 | 611 |
| springtail 4p | 3 | 125 | 10.0 | 1.4 | 7667 | 149 | 6.31 M | 15 | 256 + 175 | 397 |
| mite 1p | 1 | 12 | 3.3 | 4.9 | 507 | 36 | 0.37 M | 2 | 4 + 46 | 1885 |
| mite 4p | 3 | 36 | 4.4 | 33.4 (raycasts) | 1229 | 256 | 1.61 M | 6 | 4 + 148 | 3608 |
| tardigrade 1p (q0) | 1 | 20 | 13.7 | 1.4 | 319 | 77 | 0.35 M | 5 | 0 + 1064 | 1258 |
| tardigrade 4p (q0) | 4 | 55 | 48.3 | 6.9 | 1546 | 568 | 3.49 M | 21 | 0 + 2712 | 3703 |
| amoeba 1p (1280×720) | 1 | 37 | — | — | 2679 | 61 | 3.2 k | 8 | 16 + 42 | 750 |
| amoeba 1p, no delivered art (1280×720) | 1 | 25 | — | — | 2951 | 70 | 3.2 k | 8 | 16 + 42 | 634 |
| amoeba 1p | 1 | 29 | 36.2 (4 sim steps) | 1.3 | 772 | 61 | 3.2 k | 8 | 16 + 42 | 991 |
| amoeba 4p | 4 | 59 | 48.3 (4 sim steps × 4 cells) | 3.5 | 956 | 321 | 34 k | 57 | 64 + 124 | 422 |
| paramecium 1p | 1 | 10 | 2.1 | 0.9 | 1278 | 78 | 0.62 M | 6 | 0 + 109 | 596 |
| paramecium 4p | 4 | 29 | (GPU wait) | 8.8 | 6546 | 431 | 3.46 M | 24 | 0 + 118 | 213 |
| bacterium 1p | 1 | 4 | 5.2 | 0.6 | 524 | 7 | 130 | 7 | 0 + 5 | 562 |
| bacterium 4p | 4 | 14 | 3.8 | 2.4 | 3865 | 33 | 766 | 28 | 0 + 12 | 430 |
| phage 1p | 1 | 5 | 1.3 | 1.8 | 908 | 62 | 0.81 M | 2 | 0 + 55 | 410 |
| phage 4p | 3–4 | 10 | 2.7 | 2.4 | 3572 | 607 | 4.63 M | 8 | 0 + 119 | 26 |
| zoom (transition) | — | 1 | 0.3 | 0.2 | 723 | 3 | 3 | 3 | 0 | 67 |
| shell title (1280×720) | — | 0.3 | canvas 2D: 1236 calls, 25.8 Mpx | — | — | — | — | — | — | 17 |

No world recompiled shaders after warm-up (0 compiles in every run).

## The target: 60 fps, 4 players, a mid-range laptop GPU

Budget per frame (16.7 ms) on Intel Iris Xe (96 EU) or Apple M1 (8-core GPU),
both on about 60–70 GB/s of memory shared with the CPU:

- **GPU: 10–12 ms of work**, leaving headroom for the compositor and the HUD
  canvases. As a rule of thumb that is **~250 M bilinear texture fetches**
  (RGBA8 rate; RGBA16F about half rate, RGBA32F about a quarter), **~0.5 GB of
  render-target traffic**, and **~2–4 M triangles** through a lit vertex
  shader.
- **CPU main thread: ~8 ms** of JS for simulation and render submission
  together, with GC kept rare (under ~200 KB allocated per frame).
- **Pixels:** 1920×1080 at DPR 1 is 2.07 Mpx. On a Retina or HiDPI laptop the
  worlds' DPR cap of 1.5 gives 1.5² = 2.25× the CSS pixels: a 1440×900 window
  becomes 2160×1350 = 2.9 Mpx. Every fill number below scales with this.

### Estimated GPU cost per frame at 1080p (DPR 1), as the code stands

"Fetches" counts texture samples in the post passes (the heaviest shaders'
samples per pixel × the pixels they cover). Scene geometry is listed
separately.

| world | 1 player | 4 players (current split handling) | after the [Obvious] fixes, 4 players |
|---|---|---|---|
| springtail | gather 64+9 taps at ½ res ≈ 38 M + comp 10 M; **1.9 M tris** | 4 views at 0.55² ≈ 1.2× fill; **6–8 M tris** (geometry-bound) | scissor + instance culling/LOD: ~1 M tris/view, fill ~0.5× |
| mite | G-buffer RGBA32F + 21 point fetches/px (AO 8, shadow 8, edge 4) ≈ 43 M RGBA32F fetches (~0.7 GB raw) | 1.2× fill, 1.6 M tris | scissor: ~0.5× fill |
| tardigrade (q2) | 2 layers × MRT 2×RGBA32F at 0.7 scale; blur 26 taps × 2 fetches × 2 layers ≈ **105 M RGBA32F fetches (~1.7 GB raw)** | **4× (DIC buffers not reduced per view): ~420 M — far over budget** | per-view scale 0.6 + half float + scissor: ≈ 0.6–0.8× of 1p |
| amoeba | composite 37 fetches/px ≈ 77 M + blurs 27 M (13.5 M of them unused in brightfield) | buffers 0.7² per view, composite at 0.75²: ≈ 245 M | skip halo + scissor: ≈ 90 M |
| paramecium | main MRT 4×RGBA16F (32 B/px written, blended, overdraw ~3) ≈ 0.4 GB; form 9 + post 7 fetches ≈ 33 M; 0.62 M tris | 0.75² per view ×4 = 2.25× fill; 3.5 M tris | scissor + per-view culling: ≈ 1× fill, ~1.5 M tris |
| bacterium | diffraction PSF at full res, 2 passes × up to 63 fetches (3 MRT) ≈ up to 260 M at high zoom, ~50 M at low zoom | 0.7² ×4 ≈ 2× | scissor: ≈ 0.8× |
| phage | 0.81 M tris (half of them ink hulls); post 17 fetches ≈ 35 M | **4× at full resolution**, 4.6 M tris | split scale 0.55 + scissor + skip empty draws: ≈ 1× fill, ~2 M tris |
| zoom | one procedural full-screen pass at 0.75 × min(DPR, 1.25), ALU-bound | single-player only | — |

Reading: as the code stands, tardigrade, springtail, phage and amoeba miss
60 fps at 4 players on an Iris Xe, and paramecium and bacterium are marginal.
With the [Obvious] fixes every world's 4-player GPU cost comes within the
budget at 1080p DPR 1. Retina (DPR 1.5) needs the governor or the DPR
trade-off (T2).

## Per world

### Springtail (`prototypes/springtail/`, `shared/techniques/springtail-macro.js`, `springtail-surface.js`)

Pipeline (`createMacro`): scene → `sceneRT` (RGBA16F + depth, full res) →
`pre` (½ res, 4 fetches) → `tile` (1/32 res, 256 fetches: negligible) →
`gather` (½ res, 64 + 9 taps, early-out when sharp) → `comp` (full, 5 fetches)
to the screen. Split: `capture: true`, pixel ratio ×0.7 (2 views) or ×0.55
(3–4) (`main.js` ~1385, `const k = split.views.length > 2 ? 0.55 …`), each
view copied with `copyFramebufferToTexture`.

| | 1p | 4p (3 views) |
|---|---|---|
| CPU JS / frame | 13.7 world + 3.4 three.js | 10.0 + 1.4 |
| draws / prims | 25 / 1.94 M | 149 / 6.31 M |
| passes | scene, pre, tile, gather, comp | ×3 + compose |
| SwS split | scene 6711 ms, gather 719, comp 347, pre 227 | scene ≈ 2000–2700 per view |
| uploads | 256 KB texture (ripple field) + 169 KB buffers | same |

Top bottlenecks:

1. **Geometry.** 1.94 M triangles per view. From the census: instanced moss
   capitula 1440 tris × 382 + 1200 × 342 (0.96 M), food grains
   (icosahedron) 120 × 2430 (0.29 M), sundew parts 640 × 320 and 80 × 1920,
   water grid 96.8 k (`waterGeometry({ segs: 220 })`, `main.js` ~45). Every
   instance is drawn in every view: `InstancedMesh` is culled as one object
   (`world.js` ~288 `buildMoss`, ~459 `buildFood` with `frustumCulled = false`).
   It dominates SwiftShader (6.7 s of 7.2 s) and is 6–8 M tris at 4 players.
2. **Ripple simulation on the CPU.** `RippleField.step` runs up to 8 wave
   substeps at `rate = 240` Hz on a 256² grid (`springtail-surface.js` ~49,
   ~163 `step`, ~172 `waveStep`), plus `surfStep`. `upload` converts 2 × 65 k
   floats with `THREE.DataUtils.toHalfFloat` every frame (~204), which costs
   as much as a wave substep. `waveStep` + `upload` ≈ 4.1 ms/s of profile at
   0.41 fps, i.e. ~10 ms per frame here.
3. **The DOF gather** (64 taps at ½ res, `GATHER_FS`): fine at 1 player, and
   reduced by the split pixel ratio.

### Mite (`prototypes/mite/`, `shared/techniques/mite-sem.js`)

Pipeline (`createSem`): scene → G-buffer (`FloatType` RGBA32F + depth, full
res, `mite-sem.js` ~367) → SEM composite to the screen (8 AO taps, 8
detector-shadow march steps, 4 edge taps, point-sampled). Split: capture,
×0.7 / ×0.55 pixel ratio.

| | 1p | 4p (3 views) |
|---|---|---|
| CPU JS / frame | 3.3 world + 4.9 three.js | 4.4 world + **33.4 three.js (raycasts)** |
| draws / prims | 36 / 0.37 M | 256 / 1.61 M |
| SwS | G-buffer 384, composite 119 | G-buffer ≈ 400 per view |
| heap / frame | 1.9 MB | **3.6 MB** |

Top bottlenecks:

1. **Foot and body raycasts are brute force.** `Colliders.cast`
   (`world.js` ~160) calls `Mesh.raycast` on world meshes of up to 102 k
   triangles with no acceleration structure (`getVertexPosition`,
   `_computeIntersections`, `intersectTriangle`). About 12 call sites per mite
   per frame (`mite.js` ~359, 450, 531, 628, 657, 666, 695, 702, 727, 730,
   739). 31 ms/frame at 4 players here.
2. **Allocations: 1.9–3.6 MB per frame.** Leg IK clones vectors per leg per
   frame (`mite.js` ~823–840: `V3()`, `.clone()`, `L.seg.map`), and every
   raycast hit allocates (`h.point.clone()`, `h.face.normal.clone()` in
   `cast`). At 60 fps that is 110–220 MB/s and a GC pause every second or two.
3. **The RGBA32F G-buffer**: 16 B/px written and read about 21 times by the
   composite with poor cache locality (AO taps up to 34 µm away). It is
   bandwidth-heavy on integrated GPUs; it is fine at 1 player.

### Tardigrade (`prototypes/tardigrade/`, `shared/techniques/tardigrade-dic.js`)

Pipeline (`DicMicroscope.render`): layers a and b (substrate, specimen), each
an MRT of 2 × RGBA32F (`FloatType` whenever `EXT_float_blend` exists,
`tardigrade-dic.js` ~217) at `scale` (q2 = 0.7); a gather blur of each (26
taps × 2 fetches, `BLUR_FRAG`); composite (9 fetches). Split: target path,
`renderScale` 0.75, **but `mic` keeps its full size in every view**
(`drawView`, `main.js` ~965).

| | 1p | 4p |
|---|---|---|
| CPU JS / frame | **13.7 world** (deformAll) + 1.4 | **48.3 world** + 6.9 |
| draws / prims | 77 / 0.35 M | 568 / 3.49 M |
| buffer upload | 1.06 MB | **2.7 MB** |
| heap / frame | 1.3 MB | 3.7 MB |

Top bottlenecks:

1. **CPU skinning.** `Creature.deformAll` + `bodyDeform` (`creature.js` ~234,
   ~272) move every vertex of a 48 k-triangle "cuticle and body" mesh in JS each
   frame, for every creature: the player, other players, and Milnesium
   predators (`predator.js` ~121, ~275). That is 10 such meshes at 4 players,
   ~4.5 ms each here, and a 0.5 MB buffer upload each. It runs whether or not
   the creature is on screen.
2. **The DIC gather blur in float32**: ≈ 105 M RGBA32F fetches at 1080p q2.
   This is the heaviest fill in the game. `autoQuality` (`main.js` ~632)
   rescues it by stepping down to quality 0, which is visible.
3. **The split doesn't reduce the DIC buffers**: 4 views = 4 full DIC
   pipelines (~420 M fetches). Also a `new THREE.Matrix4()` per claw per frame
   when claws are scaled (`main.js` ~756), and `refreshNormals` per frame in
   the lit look.

### Amoeba (`prototypes/amoeba/`, `render.js`, `shared/techniques/amoeba-optics.js`)

Pipeline (`View.render`): per cell, a mask (MSAA 4×, cleared, resolved,
`render.js` ~63) and the body + granules into `focusRT` (RGBA16F, additive);
then obstacles and prey into `focusRT`, out-of-focus layer into `defRT` (½
res); `compose`: DOF blur of `defRT` (2 passes, 13 taps, ½ res), **halo blur
of `focusRT` (2 passes, used only in phase contrast and darkfield)**, composite
(37 fetches/px, full res). Split: target path, `split.renderScale 0.75`,
buffers at `SPLIT_SCALE 0.7` (`main.js` ~1403).

| | 1p | 4p |
|---|---|---|
| CPU JS / frame | 36 (4 sim steps of 1 cell) | 48 (4 sim steps × 4 cells) |
| draws / passes | 61 / 8 | 321 / 57 (16 mask passes + 16 MSAA resolves) |
| SwS split (640×360) | composite 347, body 133, 4 blurs 145 (halo 90) | per view ≈ 200 |

Top bottlenecks:

1. **Simulation per cell per step**: `Cytoplasm.update` (2600 granules, 4
   bilinear density samples + 2–3 SDF samples + `flowAt` each), the 128² SDF
   (`SdfGrid.build`: scanline fill + 2 exact distance transforms), and the soft
   body. That is ≈ 2.7 ms per cell per step here (4-player profile). It runs in
   a fixed-step accumulator with **up to 4 catch-up steps per frame**
   (`frame`, `main.js` ~1459), so a slow frame makes the next one slower.
2. **Composite** at full resolution (37 fetches/px, `COMPOSITE_FS`), plus the
   **halo blur run every frame even in brightfield**, where nothing reads it
   (`amoeba-optics.js` ~197).
3. **Per-cell masks**: at 4 players, 16 MSAA mask passes and 16 resolves per
   frame, each clearing the whole target for one cell.

### Paramecium (`prototypes/paramecium/`, `shared/techniques/paramecium-microscope.js`)

Pipeline (`createOptics.render`): scene → `main` (4 × RGBA16F MRT, additive,
full res) → down (¼ res) → 2 blurs (¼ res, 15 taps × 3) → form (full, 9
fetches) → post (full, 7) to the screen. A GPU fence governor
(`adaptive`) and ×0.75 per view when split (`main.js` ~1161). Capture split.

| | 1p | 4p |
|---|---|---|
| CPU JS / frame | 2.1 + 0.9 | 8.8 three.js; the rest is blocked on the GPU |
| draws / prims | 78 / 0.62 M | 431 / 3.46 M |
| SwS | main 951, form 103, post 69, blurs 64 | main 1160–1520 per view |

Top bottlenecks:

1. **The scene pass into 4 float attachments**, translucent and blended: 32
   B/px written per layer of overdraw. That is the bandwidth limit on an
   integrated GPU (~0.4 GB/frame at 1080p).
2. **Geometry in every view**: cilia instanced 140 tris × ~550 × 3 meshes per
   cell, 41 k / 29 k / 20 k-triangle bodies (`Amoeba proteus` included: its
   CPU `reshape` + `computeVertexNormals` every frame, `proteus.js` ~86).
   Every view draws every cell (3.46 M tris at 4 players).
3. **Split views at 0.75 per view** whatever the count: 4 × 0.56 = 2.25× the
   1-player fill. Small CPU items: `set font` on the overlay canvas every frame
   (1.2 ms/s).

The quarter-resolution blurs here are already the right design: the other
worlds should copy them.

### Bacterium (`prototypes/bacterium/`, `shared/techniques/bacterium-fluorescence.js`)

Pipeline (`createLightOptics`): cells → `field` (3 × RGBA16F MRT, full res) →
`diffract` (separable PSF, full res, 2 passes × up to 21 taps × 3 attachments)
→ pack + 2 low-pass blurs (¼ res) → compose to the screen. Capture split,
×0.7 per view (`main.js` ~957).

| | 1p | 4p |
|---|---|---|
| CPU JS / frame | 5.2 (`eatenByGrazer` 4 ms) | 3.8 + 2.4 |
| draws | 7 | 33 |
| SwS | diffract 583 of 804, compose 129 | diffract ≈ 400–1000 per view |

Top bottlenecks:

1. **The full-resolution diffraction blur over 3 float attachments**
   (`BLUR3_FS`, `diffract`): up to 126 fetches/px at high magnification.
2. **`eatenByGrazer`** (`world.js` ~290) is called for every phage and
   particle against every grazer each step: 8 ms/s of profile, 4 ms/frame
   here.
3. Split ×0.7 per view: 4 × 0.49 ≈ 2× fill.

### Phage (`prototypes/phage/`, `shared/techniques/phage-goodsell.js`)

Pipeline (`createPost`): scene → RGBA8 target (full res) → post (17 fetches:
centre + 8 + 8 rings) to the screen. Ink outlines are inverted hulls
(`inkedInstanced`, ~214): every molecule mesh is drawn twice. Capture split,
**no resolution reduction** (`renderScale` is fixed at 1 on GPUs,
`main.js` ~41).

| | 1p | 4p |
|---|---|---|
| draws / prims | 62 / 0.81 M | 607 / 4.63 M |
| SwS | scene 482, post 174 | ≈ 620–750 + 190–280 per view |
| empty draws | — | 52 draws/frame with 0 primitives (instanced meshes at count 0) |

Top bottlenecks:

1. **4 full-resolution views** (no split scale).
2. **Geometry**: crowd molecules 80 tris × 1140 ×2 (ink), 320 × 70 ×2, 240 × 90
   ×4… all drawn in every view; ink hulls double the triangle count.
3. Landmark arrow search (`shared/landmark.js` `inPoly` / `insetInside`
   ~50/~128): ~1.8 ms/frame at 4 players here, and GC at 1 player.

### Zoom transition (`prototypes/zoom/`)

One procedural field pass (`FIELD_FS` in `specimen.js`: many small loops, no
textures) and one optics pass (`zoom-optics.js`, 3 × 12-iteration loops), at
`scale 0.75` × min(DPR, 1.25), plus a tiny final pass. 1 ms CPU. It is
ALU-bound and single-player (the shell plays it between worlds). No action
needed. If a slow laptop stutters in it, drop `DEFAULT_OPTS.scale` to 0.6 while
`eng` reports slow frames.

### Shell (`game/`)

The title background (`title-bg.js` `draw`) is canvas 2D: 1236 calls and
25.8 Mpx of 2D fill per frame at 720p (7 nested, clipped, oversized
`drawImage`s, each with a radial gradient over its square). It stops outside the
title screen (`main.js` ~132), so it never competes with a world. In play the
shell only polls input. Only one world iframe exists at a time (`S.frame.remove()`),
and the zoom player's iframe is removed after the transition.

## Amoeba diagnosis

Why it ran at 1–2 fps headless, and what matters on a real GPU:

1. **The delivered images are not the cause.** With MP-A01/A02/A03 blocked
   (stand-ins) a frame took 2951 ms at 1280×720; with them, 2679 ms (same
   draws, passes and shaders; texture memory 26 → 71 MB). They are sampled
   about 1:1 at the 20× objective and are mipmapped. Each is sampled once per
   pixel: the cytoplasm image in the body pass, the wet mount in the composite,
   the filaments in the ½-res out-of-focus layer.
2. **It is the only world without a software-GL fallback.** Tardigrade
   (`main.js` ~44–46, quality 0), paramecium (0.4), bacterium (0.5), phage
   (0.6) and zoom (0.35) all drop resolution when they detect SwiftShader; the
   amoeba renders at full resolution (`main.js` ~36). Forced onto the same
   GPU path at the same size, the amoeba (772 ms/frame at 640×360) sits
   mid-pack: below springtail (3734), paramecium (1278) and phage (908), and
   above mite (507), bacterium (524) and tardigrade (319, at quality 0).
3. **The catch-up loop multiplies the simulation exactly when frames are
   slow.** `while (acc >= 1/60 && steps < 4) simStep(1/60)`. Each frame of
   several seconds runs 4 steps of every cell (≈ 2.7 ms per cell-step here),
   so the CPU cost is 4× its 60 fps cost, and 16× with 4 players (44 ms/frame
   of simulation at 4 players). On a laptop at 4 players, each 60 Hz step is
   ~4–6 ms of simulation for 4 cells. One long frame (a join, a GC pause) asks
   for 2–4 steps the next frame, which takes longer still: a slide into a few
   fps that only recovers when the cells calm down.
4. **On a real GPU the amoeba is moderate:** ≈ 110 M fetches at 1080p for 1
   player (3–5 ms on an Iris Xe), ≈ 245 M at 4 players. 13.5 M of the 1-player
   cost is the halo blur, which brightfield never reads. At 4 players, the 16
   mask passes and resolves and the 4 × 4 cell-body draws are the waste.
5. Joining is a hitch: a new cell runs 90 warm-up steps of body + SDF +
   cytoplasm at once (`main.js` ~1163), ≈ 250 ms here.

Fixes: A1–A6 below, plus the shared mechanism. Simulation ideas on the CPU
side that keep the look: precompute the density gradient on the 40×40 grid
once per step and sample it once (instead of 4 bilinear `sampleDens` calls
per granule); update granules only on the last catch-up step; reuse the
`worldColliders` and `obstacleList` arrays.

## Fixes, ranked

Expected gains are for 4 players at 1080p unless noted. "Here" means the
container's measurement.

### [Obvious]: clear wins, no visible change

| # | where | change | expected gain |
|---|---|---|---|
| S1 | `shared/splitscreen.js` + each world's passes | **Render only each view's region.** Add `view.rect` (the region polygon's bounding box in drawing-buffer px, padded by a margin the world gives for its widest blur, e.g. 24 px) to `layout.views`. Each world sets a scissor to it for every pass of that view: `rt.scissor.set(...)` + `rt.scissorTest = true` for render targets (scaled to the RT size), `renderer.setScissor/ScissorTest` for the screen. Compose then reads only that rect. A helper `split.scissor(view, rt)` keeps it mechanical. | 4 views: about 35–45 % of the current split fill (regions are ~¼ of the screen each, plus margins); 2 views ~60 % |
| S2 | `shared/splitscreen.js` `compose()` ~615, ~640 | Preallocate the region and divider `BufferAttribute`s (max vertex counts) and update them with `needsUpdate` and `setDrawRange`, instead of `new Float32BufferAttribute` every frame (each creates a new GL buffer: `createBuffer` shows in the springtail profile). | no buffer churn; less GC |
| S3 | `shared/landmark.js` `begin()` ~73 | Clear only if something was drawn last frame (dirty flag), so an idle overlay isn't a full-screen layer redrawn every frame. Cache the `insetInside` search per region while the layout and the target don't move. | ~0.2 ms GPU composite; up to ~2 ms CPU at 4 players (phage) |
| S4 | worlds that resize on split (springtail ~1385, mite ~1088, paramecium ~1161, bacterium ~957, tardigrade `setSize`) | Changing the pixel ratio on split/merge reallocates every render target (the tardigrade recreates its MRTs). Allocate once at full size and render into a sub-viewport (`rt.viewport`, with uniforms' texel sizes from the used size), or keep a second set of targets per scale. | removes the split/merge hitch |
| P1 | `phage/main.js` `resize` ~41 | Apply the same split pixel-ratio factor as springtail/mite (0.7 for 2 views, 0.55 for 3–4). | 4 views: 4× → 1.2× of 1-player fill |
| P2 | phage instanced meshes | Set `visible = false` (or skip) when an instanced mesh's `count` is 0 (52 empty draws per frame at 4 players). Give the crowd's instanced meshes per-chunk bounds (split the crowd into a few spatial `InstancedMesh`es) so frustum culling works per view. | fewer draws; ~30–50 % fewer molecule tris per view |
| T1 | `tardigrade/main.js` `drawView` ~965 + `DicMicroscope` | Scale the DIC buffers per view when split, like the amoeba's `setScale` (0.7 for 2 views, 0.55 for 3–4, applied after a 0.4 s hold). | 4 views: 4× → ~1.2× of 1-player fill |
| T2 | `tardigrade/creature.js` `deformAll` ~272, `predator.js` | Move `bodyDeform` and the leg frames into the vertex shader (the leg transforms as 8 uniforms: `H0, H1, a0, rot, s, ps`; `part/part2/partW` are already attributes). Until then, skip `deformAll` for creatures outside every view (use the split views' frusta) and for predators while asleep or off-screen. | ~4.5 ms CPU and 0.5 MB upload per creature per frame (here); 4 players ≈ 45 ms → ~0 |
| T3 | `tardigrade-dic.js` ~217 | Use `HalfFloatType` targets even when `EXT_float_blend` exists (half-float blending needs no extension in WebGL2 with `EXT_color_buffer_float`). **Check first** that the OPD sums (`s*z*z*0.5`) stay within half-float range and precision at the deepest leaves: compare screenshots of both. | halves the heaviest bandwidth in the game (~1.7 → 0.85 GB raw per frame at q2) |
| T4 | `tardigrade/main.js` ~756 | Reuse one `Matrix4` for the claw scale instead of `new THREE.Matrix4()` per claw per frame; generally reuse temporaries in `animateCapture`/`fightPose`. | GC (3.7 MB/frame at 4 players, part of it) |
| M1 | `mite/world.js` `Colliders.cast` ~160 | Add an acceleration structure for the static collider meshes: a per-mesh uniform grid (or a BVH) of triangle indices built once, and test only the cells along the ray. three-mesh-bvh can be vendored (MIT) into `shared/vendor/` if preferred. | ~31 ms/frame here at 4 players → ~1–2 ms |
| M2 | `mite/mite.js` leg IK ~810–900, `world.js` `cast` | Reuse scratch vectors and quaternions instead of `V3()`/`.clone()`/`.map()` per leg per frame; return hits in a reused object. | 1.9–3.6 MB/frame allocated → under ~0.2 MB; no GC hitches |
| SP1 | springtail `world.js` `buildMoss` ~288, `buildFood` ~459, sundew instancing | Split each instanced set into spatial chunks (say 8×8 tiles round the pool) so whole chunks are frustum-culled per view, and add a low-detail capitulum geometry (fewer branch sides and segments) beyond a distance where its ribs are below a pixel (or deep in the DOF blur). | 1.9 M → ~0.6–1 M tris per view; 4 players 6.3 M → ~2.5 M |
| SP2 | `springtail-surface.js` `upload` ~204 | Upload the ripple field as `RGFormat`/`FloatType` (one `Float32Array` copy, or no copy if `h` and `s` are interleaved) instead of a per-texel `toHalfFloat`; check `OES_texture_float_linear` (fall back to the current path where it is missing). | ~2–4 ms CPU/frame here |
| A1 | `amoeba-optics.js` `compose` ~197 | Skip the halo blur (2 passes) unless the mode reads `uHalo` (phase contrast, darkfield). | −13.5 M fetches at 1080p 1 player; ×4 views |
| A2 | `amoeba/render.js` `render` ~382 | One mask pass per view: draw every cell's mask into its own channel of one RGBA target (≤ 4 cells), one clear and one resolve; each body shader reads its channel. | 4 players: 16 → 4 mask passes and resolves |
| A3 | `amoeba/main.js` `frame` ~1459 | Run every catch-up step's soft body and SDF, but the cytoplasm (granules) only on the last step of the frame. Cap catch-up at 2 steps (see T10 for the 4-step question). | 30–60 % less simulation CPU in slow frames |
| A4 | `amoeba/cytoplasm.js` `update` ~91 | Compute the density gradient once per step on the 40×40 grid (two 1600-cell arrays) and sample it once per granule instead of 4 `sampleDens` calls; hoist `obstacleList()` and `tipCaps` allocation. | ~30 % of cytoplasm time |
| A5 | `amoeba/main.js` joining ~1163 | Spread the 90 warm-up steps of a new cell over the next frames (the cell fades in), or start it from a copy of a settled cell. | removes a ~250 ms hitch on join |
| A6 | `amoeba/main.js` ~36 | A software-GL fallback like the other worlds (0.5 resolution under SwiftShader), so headless checks run at a usable rate. This does not affect players. | headless checks ~4× faster |
| B1 | `bacterium/world.js` `eatenByGrazer` ~290 | Build the list of feeding grazer mouths once per step (usually 0–3) and return early when it is empty; bucket particles by x if there are many. | ~4 ms/frame here → ≪ 1 ms |
| PA1 | `paramecium` overlay | Set the canvas font only when it changes (`set font` costs 1.2 ms/s). Per view, skip cells (and their cilia) whose bounding sphere is outside that view's frustum. | small CPU; fewer tris per view at 4 players |
| G1 | all worlds | Keep the 0-compile record: no world recompiled after warm-up, so no change is needed. Pre-warm the split-only shaders (compose, dividers) with `renderer.compile` at load so the first split doesn't hitch. | first-split hitch |

KTX2/Basis texture compression would cut texture memory (amoeba 57 MB,
tardigrade 97 MB, bacterium 77–84 MB, springtail 61–75 MB, mostly 2048² and
2560² RGBA8 plus mips) and upload time, but needs a transcoder and an art
pipeline step; it is out of scope for this pass. Mipmaps are already on for
the delivered images.

### [Trade-off]: a visible or design cost

| # | what | cost | recommendation |
|---|---|---|---|
| T1 | **One split resolution rule for every world**: per-view scale 0.7 for 2 views and 0.55 for 3–4 (now: springtail/mite 0.7/0.55, bacterium 0.7, paramecium 0.75, amoeba 0.7 buffers + 0.75 target, tardigrade 1.0 DIC + 0.75 target, phage 1.0) | split views a little softer; each view is smaller on screen anyway | **Do it** (with S1 it is cheap insurance). *Owner:* are 4-way views at 55 % resolution acceptable? |
| T2 | **DPR cap** 1.5 → 1.25 alone and 1.0 when split, on HiDPI screens | slightly softer image on Retina | **Do it when split**; let the governor decide alone. *Owner:* is 1.25 acceptable for single player on a Retina Mac? |
| T3 | Tardigrade default quality in split: q1 (0.55 scale, 16 taps) instead of q2 | DOF slightly noisier | Let the governor choose; force q1 at 3–4 views |
| T4 | Springtail ripple simulation 240 → 120 Hz (`RippleField rate`) | slower, slightly coarser ripple fronts | Try it and compare; keep 240 if the difference shows. Better long-term: move the wave equation to a GPU ping-pong pass (the CPU height lookups then need a coarse readback, which is the reason it isn't [Obvious]). |
| T5 | Phage ink outlines from a screen-space edge pass (depth/ID) instead of inverted hulls | line weight and look change slightly | Only if phage is still over budget after P1/P2. *Owner's call* (the look is the Goodsell reference). |
| T6 | Mite G-buffer RGBA32F → RGBA16F (normal, class) + a separate R32F depth | risk of AO/shadow banding | Try after M1/M2, with an A/B screenshot; not needed for 60 fps |
| T7 | Amoeba granules 2600 → 1300 per cell at 3–4 players (the `GRANULES` option already exists) | sparser-looking endoplasm | Recommend at 3–4 players only, if A3/A4 aren't enough |
| T8 | Amoeba cytoplasm at 30 Hz (every other step), interpolated for drawing | granule motion slightly less smooth | Recommend over T7 (less visible) |
| T9 | Paramecium: fewer cilia instances on other players' cells in each view, or 3 MRT attachments instead of 4 | fewer cilia on far cells; less scatter detail | Only if the governor has to drop paramecium below 0.6 scale |
| T10 | Amoeba catch-up cap 4 → 2 steps | on a slow machine the amoeba's world runs slower instead of skipping ahead | **Recommend**: it is what makes the slide unrecoverable. *Owner:* OK for the simulation to slow down on a slow machine? |
| T11 | Throttle off-screen threats (predators, NPCs, ambient prey) to 20–30 Hz when no view sees them | an off-screen hunter's path is a little coarser | Recommend; nobody sees it. It is a trade-off only because an arrival from off-screen could be a frame or two later. |
| T12 | Title background: draw it at DPR 1 and stop at 5 nested fields | slightly softer title screen | Optional; it doesn't run during play |

### Questions for the owner

1. Split views at 55 % resolution with 3–4 players, and DPR 1.0 while split
   (T1, T2)?
2. When the machine can't keep up, should the amoeba's world slow down rather
   than stutter (T10)?
3. Phage outlines: keep inverted hulls (exact look) unless measurement says
   otherwise (T5)?
4. Should the quality governor (below) be on by default in every world, with
   a "fixed quality" switch in the developer features?

## Proposed shared mechanism

### `shared/quality.js`: one governor for every world

The springtail and mite (`dynres`), paramecium (`adaptive`, with a GPU fence)
and tardigrade (`autoQuality`) each have their own. Replace them with one
module:

```js
const q = createQuality(renderer, {
  levels: [            // from best to cheapest; each world lists its own knobs
    { scale: 1.0,  fx: 3 },
    { scale: 0.85, fx: 3 },
    { scale: 0.7,  fx: 2 },
    { scale: 0.55, fx: 1 },
    { scale: 0.45, fx: 0 },
  ],
  apply: (lv) => { /* world: set its pixel ratio / buffer scale, taps, cilia LOD ... */ },
  target: 1 / 60,
});
// each frame: q.frame(dtReal, split.views.length);
```

- **GPU time:** `EXT_disjoint_timer_query_webgl2` when it exists (Chrome on
  most desktop GPUs), otherwise the paramecium's fence (`fenceSync`, polled
  next frame). **CPU time:** the frame callback measured with
  `performance.now()`. It steps down only for the GPU-bound case: when the CPU
  is the bottleneck, lowering resolution doesn't help, and the governor
  reports that instead (`q.cpuBound`) so the world can throttle T11-type work.
- **Hysteresis** like `autoQuality`: step down after ~1 s over 1/55 s, up
  after ~4 s under 1/70 s, never more than one step per second, with a short
  hold after a split or merge (the frame-time spike then is the reallocation,
  not steady state).
- **Views:** the level's scale is multiplied by a per-view-count factor (1,
  0.7, 0.55, 0.55; T1), so a split immediately costs about what one view did.
- **Off in tests** with `?f=-quality` (the same `features` id everywhere), and a
  `?q=<level>` override for measurements.

### Split screen: per-view rect and scale

In `shared/splitscreen.js`:

- `layout.views[i].rect = { x, y, w, h }` in drawing-buffer px (S1), padded by
  `opts.margin` (default 24 px); `split.scissor(i, target)` sets
  `target.scissor`/`scissorTest` (or the renderer's for the screen), scaled to
  the target's size.
- `split.viewScale`: the factor above, for worlds to multiply into their own
  buffer scale. The `capture` path then copies only `rect`
  (`copyFramebufferToTexture` with a position and a region), not the whole
  canvas.
- Preallocated compose geometry (S2).

With S1 and the scale factor, 4 views cost roughly 0.55² × 4 × (rect share ≈
0.35) ≈ 0.4–0.5 of a single full view in fill. Geometry (draw calls and
triangles) still multiplies by the number of views, which is why SP1, P2 and
PA1 matter.

## How to measure

The scripts are in this session's scratch folder
`/tmp/claude-0/-home-user-mini/a2e7d3f8-8484-5617-99c7-ad1a69823111/scratchpad/perf/`
(copy them into the repository, e.g. `micro/prototypes/perf/`, if they should
stay):

- **`inject.js`**: an init script for every page. It wraps
  `requestAnimationFrame` (CPU per frame), drains the GPU process after each
  frame with a 1-pixel `readPixels` (SwiftShader raster time; `gl.finish()`
  doesn't block in Chrome), and wraps the WebGL2 calls to record draws,
  primitives, passes (framebuffer and viewport), programs and their sources,
  texture and buffer upload bytes, copies and blits, compiles, and
  per-program draw and primitive totals. It also counts canvas-2D calls and
  pixels, DOM mutations and JS heap growth. Options (`window.__perfCfg`):
  spoof the GPU name (default on, so worlds take their GPU path); mock N
  gamepads (`__press(i, button, on)`, `__stick(i, x, y)`); per-pass timing.
- **`measure.mjs <world> [players] [seconds] [--size=WxH] [--native]
  [--block=url-part] [--warm=s] [--tag=x]`**: serves `micro/`, opens
  `prototypes/<world>/?f=-dynres,-adaptive` (or `game/`), waits, joins and
  spreads N players through the world's test hook, records a CPU profile
  (self time by file and by function), times 3 frames pass by pass, takes a
  scene census and a screenshot, and writes `out/<world>-<N>p.json` and
  `out/<world>-programs.json`. `--native` keeps each world's
  software-renderer fallbacks; `--block=assets/amoeba` tests without the
  delivered images.
- **`runall.sh`** (env `PLAYERS`, `WORLDS`, `EXTRA`): every world in turn.
  Runs are sequential, because SwiftShader uses every core.
- **`table.py [filter]`**: the Markdown table above from `out/*.json`.
  **`shaders.py <world>`**: each linked shader's uniforms, texture-fetch sites
  and loop trip counts.

To verify a fix, run the world before and after at the same size and compare
draws, prims, passes (with their sizes), upload KB, heap KB per frame and the
per-pass SwiftShader ms for the pass you changed. Each needs 3+ runs: the
container is shared, so ±30 % noise is normal. CPU numbers are comparable
between runs, but not as absolute laptop times. On a real machine, the
worlds' own HUD stats (draws, tris, fps) and Chrome's Performance panel with
GPU timing are the final check: 4 players, 1080p, 60 fps.
