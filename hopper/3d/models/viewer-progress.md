# Final model viewer/tooling progress

Updated 2026-09-08.

- Read the model request and build contracts.
- Confirmed the project viewer CDN versions: Three.js 0.185.1 and its Meshopt decoder.
- Confirmed the portable Generations pipeline used `npx --yes gltfpack`; it does not bundle a `gltfpack` executable.
- Added `viewer.html` + `viewer.js`: manifest list/search/category filter, direct `?model=` paths, thumbnails, orbit/fit, clip buttons, LOD0/LOD1 isolation, and socket overlays under neutral studio lighting.
- Added `source/validate.mjs`: dependency-free GLB parsing, payload/accessor finite-number checks, LOD triangle and bounds derivation, extension/content checks, and manifest clip/socket/landing/budget contracts.
- Added `source/compress.mjs`: offline discovery of PATH/`GLTFPACK`/cached npm gltfpack, mandatory `-cc -kn -ke` plus named-material preservation, temporary output, and post-compression node/clip/material/extras checks.
- Syntax and whitespace checks pass. Failure-path test against the existing Hopper GLB correctly reports missing final-model LOD roots without crashing; compression preflight refuses that nonconforming input before writing.
- End-to-end validation/viewer QA awaits the first generated final GLB and manifest.

## Pilot QA

- Tested rebuilt M-025, M-029, and M-068 raw exports against a local pilot manifest.
- Fixed LOD discovery to select exact `LOD0` / `LOD1` roots instead of the first `LOD1.*` child mesh. Derived counts now exactly match records: 728/212, 1656/526, and 1444/456.
- Fixed compression-tool discovery so an unset `GLTFPACK` value cannot resolve to the working directory.
- Compressed all three pilot copies using cached gltfpack. Post-checks retained all named nodes, extras, named materials, sockets, LOD roots, and Spring Pad clips `Idle` / `Active`.
- An intermediate M-025 build correctly failed its 35 m width/depth contract. After the root rebuild, refreshed M-025 is 35 × 12.119 × 35 m and passes.
- Browser-tested the compressed pilot manifest and all three Meshopt GLBs. Manifest-relative paths and thumbnails load; orbit/fit, LOD0/LOD1 controls, clip buttons, painted textures, and animated socket overlay work.
- Refreshed the pilot after final corrections. Strict compressed validation passes all three latest builds: M-025 1344/408 triangles, M-029 4308/1198, and M-068 1876/630. Browser retest confirms corrected Ivory Tower materials/detail and Spring Pad's `Idle` / `Active` clips.
- Corrected validator quaternion transform math and now use exact raw vertices when available; compressed bounds use conservative accessor bounds and compare against the manifest measurement.
