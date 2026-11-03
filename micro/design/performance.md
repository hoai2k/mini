# Micro Zoom: performance audit

Audit of every world (springtail, mite, tardigrade, amoeba, paramecium,
bacterium, phage), the zoom transition player (`game/zoom/`) and the
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

### Springtail (`game/springtail/`, `shared/techniques/springtail-macro.js`, `springtail-surface.js`)

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

### Mite (`game/mite/`, `shared/techniques/mite-sem.js`)

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

### Tardigrade (`game/tardigrade/`, `shared/techniques/tardigrade-dic.js`)

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

### Amoeba (`game/amoeba/`, `render.js`, `shared/techniques/amoeba-optics.js`)

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

### Paramecium (`game/paramecium/`, `shared/techniques/paramecium-microscope.js`)

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

### Bacterium (`game/bacterium/`, `shared/techniques/bacterium-fluorescence.js`)

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

### Phage (`game/phage/`, `shared/techniques/phage-goodsell.js`)

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

### Zoom transition (`game/zoom/`)

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

## Second pass (2026-11-01)

Scope: the shared modules (`game/shared/*.js`), the game shell
(`game/`), the zoom player and page (`game/zoom/`) and `split-demo`.
The worlds' own folders were out of scope; other sessions were editing them.

`measure.mjs tardigrade 4 --url=q=high` ran before and after, back to back.
The container was saturated (0.4 fps, about 5 s of SwiftShader per frame), so
that profile can't separate the shared modules (each shows up at 0.1 ms/s).
Back to back, it gave a CPU median of 32.3 → 25.7 ms with the same 572
draws. That is only 4–7 frames per run, though, and the heap figures swing
with GC timing (17.8 → 305 KB per frame), so those runs prove nothing either
way. The numbers below come from focused benchmarks instead: the module
alone in Chromium or Node, original against new, on the same inputs.

### Findings

- **`landmark.js`** (4 views plus one on-screen marker, 1280×720, CPU
  profile): `shapes()` took 0.034–0.039 ms a frame and `draw()` 0.11–0.14 ms.
  Most of `shapes()` was rebuilding the same arc and 16 ray segments twice per
  mark. Most of the march was `Math.cos`/`sin` in `insetInside`, about 200
  calls a mark.
- **`crowd.js`** (400 members, 4 players): a closure per member per substep
  in the separation pass. That was 572 minor GCs per 3000 frames with a 1 MB
  young generation.
- **Per-frame DOM and GPU writes:** `hud.stats()` (every world, every frame)
  rewrote `hidden` and `textContent` even when nothing had changed, and
  `hud.players()` rebuilt `innerHTML` on every call. In a still split,
  `splitscreen.compose()` re-uploaded the region fans and dividers every frame
  (about 11 KB at 4 views). The capture veil's opacity was written every frame
  of a catch. The zoom page ran 4 `querySelector` lookups and 5 DOM writes a
  frame. The shell's transition readout wrote `innerHTML` every frame.
- **`pad.js`:** two new 17-element arrays, an axes array and
  `Object.entries(KEYS)` on every poll, for each pad.
- **`audio.js`:** worlds call `loop.set()` every frame (phage, bacterium,
  paramecium, and the zoom engine with 7 ambiences). Each call queued a new
  `setTargetAtTime`, even with the same target.
- **Shell during play:** one rAF loop runs `input.poll` and `glyphMode`
  (2–3 `getGamepads` calls and a few small arrays). `roster.poll` runs only
  while paused. The title background is stopped with `cancelAnimationFrame`
  off the title, and nothing renders behind the iframe. The shell does poll
  pads alongside the world, but it needs that for Start and for disconnects,
  and it costs well under 0.05 ms.
- **Zoom player:** the first `play()` imports three.js and the engine
  (221 ms) and links 3 programs (592 ms under SwiftShader). A transition draws
  about 3 times a frame. The loop stops when it arrives: 0 draws in the
  following 3 s. Its WebGL context stays alive between transitions.
- **Load** (local server, SwiftShader):
  - The title made 41 requests, 7.5 MB in all. 4.3 MB of that is the title's
    own art (plates, logo, paper). The other 3.6 MB is for the menu and intro
    (7 cards, `menu.webp`, the first intro plate) and loaded in parallel.
  - Preload-to-ready in the shell:

    | World | Ready after | Fetched |
    | --- | --- | --- |
    | Springtail | 5.7 s | 9.3 MB |
    | Mite | 35 s | 5.6 MB |
    | Tardigrade | 5.9 s | 5.1 MB |
    | Amoeba | 30 s | 3.8 MB |
    | Paramecium | 3.3 s | 3.7 MB |
    | Bacterium | 0.9 s | 3.6 MB |
    | Phage | 3.3 s | 4.6 MB |

  - Mite and amoeba are dominated by shader compiles.
  - The largest files are PNGs: `springtail/sundew-leaf.png` 3.1 MB,
    `springtail/ripples.png` 2.2 MB, `tardigrade/particles.png` 875 KB,
    `game/logo.png` 689 KB, `game/card-frame.png` 507 KB.
  - Audio isn't fetched until a gesture unlocks sound.

### Implemented (non-destructive)

| Change | Before → after |
| --- | --- |
| `landmark.js`: mark outlines cached as `Path2D`; the 8 probe directions precomputed | `shapes()` 0.034–0.039 → 0.005–0.007 ms/frame; `insetInside` 0.043–0.047 → 0.014–0.016; `draw()` 0.11–0.14 → 0.047–0.069. Overlay pixel hashes identical at 6 states |
| `crowd.js`: separation query inlined, same cell and member order | GCs 572 → 289 per 3000 frames; instance matrices bit-identical |
| `pad.js`: two button buffers swapped, key table built once, key scan skipped when no key is held | no arrays allocated per poll |
| `hud.js`: `stats`, `players` and `hidden` written only on change | 2 DOM writes/frame → 0 while the text holds |
| `splitscreen.js`: size vector reused; compose fills without temporary arrays and uploads fans and dividers only when a value changes (compared as float32) | about 11 KB/frame → 0 in a still 4-way split |
| `predation.js`: veil opacity written on change | |
| `audio.js`: `loop.set()` skips a target identical to the last one sent. Re-sending the same target and time constant traces the same curve; the memo resets after the fade-in and on `stop()` | 60 automation events/s per loop → 0 while steady |
| Shell: menu-only art waits until the title art settles, or until the title is left | first menu-only request moved from in parallel to after the title art (requested by 0.9 s); all 7 cards ready on the menu |
| Shell: transition readout written on change | |
| `zoom/main.js`: HUD elements cached, written on change | |

Verified with a deterministic A/B: virtual clock, seeded `Math.random`,
frames stepped by hand, mock pads, and the original files served for "before".
`split-demo` at 1 and 4 players (a 4-way split with landmarks) and the zoom
page at 45 %: every canvas is byte-identical and the page text is identical.
`node game/check-worlds.mjs index zoom split-demo` passes,
`node game/check.mjs` passes, the Node tests pass 6/6, and `node --check`
passes on every touched file.

### Recommendations (not implemented)

| Recommendation | Reason not done | Expected gain | Effort |
| --- | --- | --- | --- |
| Pre-rasterise the landmark marks to a sprite and `drawImage` it rotated | Resampling softens the edges, so it is not pixel-identical | The remaining stroke raster cost, large on a software canvas | Small |
| Skip redrawing the landmark overlay when the marks haven't changed | Amoeba and mite paint player rings onto `marks.canvas` after `drawSplit`, so the module can't tell what is on the canvas. It needs a `marks.end()` the worlds adopt | About 0.05 ms/frame while still | Medium |
| Re-encode PNG art as lossless WebP | The assets are outside these folders and need `asset-list.js` updates | Typically 30–50 % smaller; about 2–3 MB off the springtail | Small |
| Pre-compile shaders off the critical path (`renderer.compileAsync` / `KHR_parallel_shader_compile`) in mite and amoeba | World folders | Most of 35 s / 30 s to ready under SwiftShader; seconds on weak GPUs | Medium |
| Import the zoom player module during the intro | Parsing three.js on the shared main thread could hitch Begin or a playing world | About 200 ms off the first transition's start | Small |
| One `getGamepads` snapshot per frame shared by every pad (up to 6 calls a frame at 4 players) | Changes when each pad samples (sub-millisecond) | Tiny | Small |
| Free the zoom player's GL context between transitions | The next transition would re-link its programs (about 0.6 s here) | One WebGL context of memory during play | Small |

**Known issue found:** the landmark overlay is cleared only when the module
itself drew a mark (`dirty`). If a world paints rings on `marks.canvas` in a
frame where no mark is drawn (the forward mark suppressed, or `onScreen:
'none'`), those rings are never cleared and smear. Today the mite and amoeba
always draw a mark, so it doesn't show.

### Second pass in the worlds (2026-11-01)

Every change below left the picture, gameplay and timing unchanged: seeded or
frozen-frame screenshots were compared before and after (identical, or within
1/255 where a faster square root changes the last bit), and the worlds' own
tests and `check.mjs` passed. Measured with `micro/tools/perf/measure.mjs`
at `q=high`, before and after back to back; SwiftShader times are relative.

| World | Change | Before → after |
| --- | --- | --- |
| Mite | Objects keep one shape, no rest arrays or destructuring in hot paths; mites culled per view (they were `frustumCulled = false`) | 1p heap 463 → 144 KB/frame, CPU 7.1 → 3.9 ms; 4 views CPU 40 → 16 ms, draws 581 → 439, triangles 2.28 → 1.97 M |
| Amoeba | `hyp()` instead of `Math.hypot` in hot loops, array reuse, faster distance grid (bit-identical), unseen cells not updated | garbage per step 1.45 → 0.20 MB (1p); grid build 1.17 → 0.61 ms; 3p step 7.6–9.1 → 5.4 ms |
| Springtail | Water shader evaluates dimples and island distance once per pixel; `RippleField.recenter` without allocation; `islandEdge` indexed; no ripple upload on still water | scene pass 1p 2.78 → 2.14 s, 4p 1.66 → 1.16 s per view; first frame 7.4 → 6.1 s; upload 512 KB → 0 when still |
| Tardigrade | Each view hides animals outside its part of the buffer | 4p spread 3.66 → 2.13 M triangles, draws 572 → 405 |
| Paramecium | Each view draws only bloom cells and objects in its region (`bloom.cullView`) | 1p 667 → 529 k triangles, upload 152 → 80 KB; 4p 2.56 → 2.09 M triangles |
| Bacterium | Distant grains skipped before the exact push-out test; shared materials | step garbage 1.53 → 0.22 MB, ~9 → 3.7 ms; 4p heap 944 → 262 KB/frame |
| Phage | Hosts and crowd culled per view; host-distance pre-check; bloom reads the scene once | 1p 0.58 → 0.36 M triangles, 4p 2.54 → 1.38 M; update 1.3 → 0.45 ms |
| Shared | `landmark.js` point tests without destructuring | about 275 KB/frame less garbage at 4 views |

Findings that needed no change: the rotifer meadow (about 0.5 ms a frame), the
bacterium collective (about 4% of a step at 40 members) and the R/L pseudopod
marks (0.03 ms) are cheap. The remaining recommendations are listed in
[open-recommendations.md](open-recommendations.md) under Performance.

## Third pass (2026-11-01)

The second pass's deferred items that were skipped only for the work they
needed. Each left the picture unchanged unless noted. SwiftShader on a loaded
4-core container, so times are rough.

| World | Change | Before → after |
| --- | --- | --- |
| Shared, amoeba | `splitscreen.js` compiles its compose programs (both colour spaces) when the split screen is made; `split.prewarm()` for worlds that draw their own frames; the amoeba compiles every program at load (`view.precompile()`) | programs compiled at join: amoeba 6 → 0, bacterium 3 → 0, split-demo 3 → 0; amoeba join frame 144–284 → 65–191 ms; load and steady 2-player frame unchanged |
| Mite | `sem.warm()` compiles the SEM programs at load; each mite's parts merged; moss, litter and grains as `BatchedMesh`, culled per object | first frame 2.3–2.7 → 1.0–2.0 s; draws per mite 9 → 5; 1p 70 → 44 draws, 267 → 182 k triangles; 4 views 380 → 244 draws, 1.20 → 0.91 M triangles; seeded screenshots byte-identical |
| Springtail | Water dimples bucketed in a 16×16 grid in the shader | scene pass 6.06 → 2.08 s (bit-identical output) |
| Springtail (option) | "Cheaper ripples (experimental)" in World features: 128 grid at 120 Hz | ripple step 2.2–2.9 → 0.35 ms; off by default because the ripples look and feel different |
| Paramecium (fix) | The bloom places every cell at its height once even with nobody near | far view: a cloud 27–623 µm deep instead of a flat sheet on the slide |
| Phage (feature) | The molecule crowd splits per view when a view would show more than 12 units of bare water beyond the merged screen; the copy is seeded from the main crowd, fades in over 0.6 s and out after 1.5 s back together; "Crowd per split view" in World features, `?spread=350` for perf runs | about 0.2–0.4 ms per extra crowd per frame while apart; merged play unchanged |

There is no per-frame gain from compiling at load: it moves a one-time cost
from the moment a player joins (a visible pause) to loading. Deferred: the
phage's quarter-resolution noise (softens the look).

## Current state (pre-deploy audit, 2026-11-01)

`tools/perf/measure.mjs <world> 1|4 8 --url=q=high`, run back to back on a
4-core container with a load average of 15–26 (other sessions were
rendering), so the CPU and SwiftShader times are only a sanity check (4–10
frames per run); the draws and triangles are exact.

| World | 1 player: draws / triangles | 4 players: draws / triangles (views) | Compared with the last numbers |
| --- | --- | --- | --- |
| Springtail | 22 / 481 k | 70 / 1.30 M (2) | no recent baseline; far below the first pass (25 / 1.94 M per view) |
| Mite | 47 / 197 k | 69 / 354 k (1) | identical to the director pass (47 / 197 k, 69 / 354 k) |
| Tardigrade | 55 / 185 k | 329 / 1.60 M (4) | identical (55 / 185 k, 327 / 1.6 M) |
| Amoeba | 17 / 3 k | 108 / 9 k (4) | fewer draws than the first pass (61 and 321) |
| Paramecium | 102 / 526 k | 448 / 2.57 M (4) | within the rings-and-portal pass (99 / 619 k, 423 / 2.71 M) |
| Bacterium | 7 / 0 k | 33 / 3 k (4) | identical to the first pass (7, 33) |
| Phage | 95 / 591 k | 442 / 1.98 M (4) | **+64 % / +44 % triangles** on the second pass (0.36 M, 1.38 M): the look revamp (bead baths, hosts furred all round) and the in-progress look work; for the phage's own pass to confirm |

No regression in the other six worlds' rendering work. CPU medians (9–37 ms)
are two to three times the earlier passes' on the same worlds, in line with
the load; nothing in them points at one module. No page errors in any run.
