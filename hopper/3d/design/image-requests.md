# Image and texture requests (3D edition)

Round one: skies, horizon cards, terrain sets, trim sheets, creature hide, UI and effects for the 3D game. Round two, the model reference sheets, is in [image-requests-round-2.md](image-requests-round-2.md) and was added after round one had begun, so this file is unchanged apart from this note. Everything marked `stand-in` has a procedural placeholder in `hopper/3d/standins/src/textures.js` or `terrain.js` that the game renders until the painting arrives. Generated from `source/build_requests.py`; edit the data there.

Style for every painted request: the 2D game's 1970s cel-and-gouache look. Flat colour fields, two or three tones per surface, visible brush direction, dark ink edges where the 2D sprites have them, no photographic gradients, no lens flare, no text. Region palettes are the exact hex values in `hopper/3d/standins/src/palette.js` (the same ones the 2D game uses).

## Summary

| Category | Requests | Delivered | Stand-in | Open | Procedural final |
| --- | ---: | ---: | ---: | ---: | ---: |
| sky | 9 | 9 | 0 | 0 | 0 |
| horizon | 9 | 9 | 0 | 0 | 0 |
| terrain | 9 | 9 | 0 | 0 | 0 |
| trim | 9 | 9 | 0 | 0 | 0 |
| creature | 1 | 1 | 0 | 0 | 0 |
| shading | 1 | 0 | 0 | 0 | 1 |
| ui | 9 | 8 | 0 | 1 | 0 |
| effects | 3 | 2 | 0 | 1 | 0 |
| **total** | **47** | **46** | **0** | **0** | **1** |

## Painted skies (9)

One equirectangular dome per region, drawn from inside a 9 km sphere. The stand-in is the procedural gradient-plus-sun in `paintSky`.

### T-001 · Sky: Sunseed Fields

Painted gouache sky dome for Sunseed Fields: honey morning light, huge cumulus, sun low in the east, apricot haze band. The lower half is a matching ground haze, never seen directly.

- **Spec:** 8192×4096 equirectangular, painted, no lens effects; horizon at the vertical centre; sun or eclipse placed 100° right of +Z
- **Status:** delivered · **Stand-in:** `terrain.sky` · **Final:** `textures/sky/fields.ktx2`
- **Prompt:** Use case: environment. 1970s anime gouache painted sky, equirectangular panorama, honey morning light, huge cumulus, sun low in the east, apricot haze band, dense brushed cloud texture, flat colour fields, no photographic gradients, no text.

### T-002 · Sky: Crownline City

Painted gouache sky dome for Crownline City: golden sunset, long cloud streaks, warm pink haze. The lower half is a matching ground haze, never seen directly.

- **Spec:** 8192×4096 equirectangular, painted, no lens effects; horizon at the vertical centre; sun or eclipse placed 100° right of +Z
- **Status:** delivered · **Stand-in:** `terrain.sky` · **Final:** `textures/sky/city.ktx2`
- **Prompt:** Use case: environment. 1970s anime gouache painted sky, equirectangular panorama, golden sunset, long cloud streaks, warm pink haze, dense brushed cloud texture, flat colour fields, no photographic gradients, no text.

### T-003 · Sky: Thunderhead Range

Painted gouache sky dome for Thunderhead Range: slate grey storm sky, apricot clouds, an eclipse beginning above the summit. The lower half is a matching ground haze, never seen directly.

- **Spec:** 8192×4096 equirectangular, painted, no lens effects; horizon at the vertical centre; sun or eclipse placed 100° right of +Z
- **Status:** delivered · **Stand-in:** `terrain.sky` · **Final:** `textures/sky/mountains.ktx2`
- **Prompt:** Use case: environment. 1970s anime gouache painted sky, equirectangular panorama, slate grey storm sky, apricot clouds, an eclipse beginning above the summit, dense brushed cloud texture, flat colour fields, no photographic gradients, no text.

### T-004 · Sky: Cinder Foundries

Painted gouache sky dome for Cinder Foundries: ochre smoke sky, orange furnace underglow on the clouds. The lower half is a matching ground haze, never seen directly.

- **Spec:** 8192×4096 equirectangular, painted, no lens effects; horizon at the vertical centre; sun or eclipse placed 100° right of +Z
- **Status:** delivered · **Stand-in:** `terrain.sky` · **Final:** `textures/sky/foundry.ktx2`
- **Prompt:** Use case: environment. 1970s anime gouache painted sky, equirectangular panorama, ochre smoke sky, orange furnace underglow on the clouds, dense brushed cloud texture, flat colour fields, no photographic gradients, no text.

### T-005 · Sky: Tempest Docks

Painted gouache sky dome for Tempest Docks: rain, sea-green overcast, white spray haze. The lower half is a matching ground haze, never seen directly.

- **Spec:** 8192×4096 equirectangular, painted, no lens effects; horizon at the vertical centre; sun or eclipse placed 100° right of +Z
- **Status:** delivered · **Stand-in:** `terrain.sky` · **Final:** `textures/sky/harbor.ktx2`
- **Prompt:** Use case: environment. 1970s anime gouache painted sky, equirectangular panorama, rain, sea-green overcast, white spray haze, dense brushed cloud texture, flat colour fields, no photographic gradients, no text.

### T-006 · Sky: Skyhook Works

Painted gouache sky dome for Skyhook Works: pale gold above the clouds, rust-red rings, a sea of cloud below the horizon. The lower half is a matching ground haze, never seen directly.

- **Spec:** 8192×4096 equirectangular, painted, no lens effects; horizon at the vertical centre; sun or eclipse placed 100° right of +Z
- **Status:** delivered · **Stand-in:** `terrain.sky` · **Final:** `textures/sky/launchworks.ktx2`
- **Prompt:** Use case: environment. 1970s anime gouache painted sky, equirectangular panorama, pale gold above the clouds, rust-red rings, a sea of cloud below the horizon, dense brushed cloud texture, flat colour fields, no photographic gradients, no text.

### T-007 · Sky: Vermilion Basin

Painted gouache sky dome for Vermilion Basin: red sky under a black sun with a thin corona, dense heat haze. The lower half is a matching ground haze, never seen directly.

- **Spec:** 8192×4096 equirectangular, painted, no lens effects; horizon at the vertical centre; sun or eclipse placed 100° right of +Z
- **Status:** delivered · **Stand-in:** `terrain.sky` · **Final:** `textures/sky/red.ktx2`
- **Prompt:** Use case: environment. 1970s anime gouache painted sky, equirectangular panorama, red sky under a black sun with a thin corona, dense heat haze, dense brushed cloud texture, flat colour fields, no photographic gradients, no text.

### T-008 · Sky: Cobalt Drift

Painted gouache sky dome for Cobalt Drift: ultramarine void, stars, a huge pale moon, luminous dust. The lower half is a matching ground haze, never seen directly.

- **Spec:** 8192×4096 equirectangular, painted, no lens effects; horizon at the vertical centre; sun or eclipse placed 100° right of +Z
- **Status:** delivered · **Stand-in:** `terrain.sky` · **Final:** `textures/sky/blue.ktx2`
- **Prompt:** Use case: environment. 1970s anime gouache painted sky, equirectangular panorama, ultramarine void, stars, a huge pale moon, luminous dust, dense brushed cloud texture, flat colour fields, no photographic gradients, no text.

### T-009 · Sky: Violet Inversion

Painted gouache sky dome for Violet Inversion: dark purple nebula sky, broken planetary rings, glowing gravity seams. The lower half is a matching ground haze, never seen directly.

- **Spec:** 8192×4096 equirectangular, painted, no lens effects; horizon at the vertical centre; sun or eclipse placed 100° right of +Z
- **Status:** delivered · **Stand-in:** `terrain.sky` · **Final:** `textures/sky/violet.ktx2`
- **Prompt:** Use case: environment. 1970s anime gouache painted sky, equirectangular panorama, dark purple nebula sky, broken planetary rings, glowing gravity seams, dense brushed cloud texture, flat colour fields, no photographic gradients, no text.


## Horizon cards (9 sets)

Two rings of painted silhouettes 5 km and 6.75 km out, in the region's haze colours. The stand-in is the cone ring in `makeHorizon`. Each set leaves a gap where the region's exit landmark stands.

### T-010 · Horizon cards: Sunseed Fields

Distant mountains, skylines or structures around Sunseed Fields, painted flat in the region's haze colours. Placed on a ring 5 km out; never reachable.

- **Spec:** two rings of 8 cards, 4096×1024 each, alpha, painted silhouettes at two haze depths
- **Status:** delivered · **Stand-in:** `terrain.horizon` · **Final:** `textures/horizon/fields-<ring>-<n>.png`
- **Prompt:** Use case: environment. Painted distant mountain range silhouette strip for Sunseed Fields, two flat haze tones, gouache texture, transparent above the ridge line, no text.

### T-011 · Horizon cards: Crownline City

Distant mountains, skylines or structures around Crownline City, painted flat in the region's haze colours. Placed on a ring 5 km out; never reachable.

- **Spec:** two rings of 8 cards, 4096×1024 each, alpha, painted silhouettes at two haze depths
- **Status:** delivered · **Stand-in:** `terrain.horizon` · **Final:** `textures/horizon/city-<ring>-<n>.png`
- **Prompt:** Use case: environment. Painted distant skyline silhouette strip for Crownline City, two flat haze tones, gouache texture, transparent above the ridge line, no text.

### T-012 · Horizon cards: Thunderhead Range

Distant mountains, skylines or structures around Thunderhead Range, painted flat in the region's haze colours. Placed on a ring 5 km out; never reachable.

- **Spec:** two rings of 8 cards, 4096×1024 each, alpha, painted silhouettes at two haze depths
- **Status:** delivered · **Stand-in:** `terrain.horizon` · **Final:** `textures/horizon/mountains-<ring>-<n>.png`
- **Prompt:** Use case: environment. Painted distant mountain range silhouette strip for Thunderhead Range, two flat haze tones, gouache texture, transparent above the ridge line, no text.

### T-013 · Horizon cards: Cinder Foundries

Distant mountains, skylines or structures around Cinder Foundries, painted flat in the region's haze colours. Placed on a ring 5 km out; never reachable.

- **Spec:** two rings of 8 cards, 4096×1024 each, alpha, painted silhouettes at two haze depths
- **Status:** delivered · **Stand-in:** `terrain.horizon` · **Final:** `textures/horizon/foundry-<ring>-<n>.png`
- **Prompt:** Use case: environment. Painted distant skyline silhouette strip for Cinder Foundries, two flat haze tones, gouache texture, transparent above the ridge line, no text.

### T-014 · Horizon cards: Tempest Docks

Distant mountains, skylines or structures around Tempest Docks, painted flat in the region's haze colours. Placed on a ring 5 km out; never reachable.

- **Spec:** two rings of 8 cards, 4096×1024 each, alpha, painted silhouettes at two haze depths
- **Status:** delivered · **Stand-in:** `terrain.horizon` · **Final:** `textures/horizon/harbor-<ring>-<n>.png`
- **Prompt:** Use case: environment. Painted distant skyline silhouette strip for Tempest Docks, two flat haze tones, gouache texture, transparent above the ridge line, no text.

### T-015 · Horizon cards: Skyhook Works

Distant mountains, skylines or structures around Skyhook Works, painted flat in the region's haze colours. Placed on a ring 5 km out; never reachable.

- **Spec:** two rings of 8 cards, 4096×1024 each, alpha, painted silhouettes at two haze depths
- **Status:** delivered · **Stand-in:** `terrain.horizon` · **Final:** `textures/horizon/launchworks-<ring>-<n>.png`
- **Prompt:** Use case: environment. Painted distant skyline silhouette strip for Skyhook Works, two flat haze tones, gouache texture, transparent above the ridge line, no text.

### T-016 · Horizon cards: Vermilion Basin

Distant mountains, skylines or structures around Vermilion Basin, painted flat in the region's haze colours. Placed on a ring 5 km out; never reachable.

- **Spec:** two rings of 8 cards, 4096×1024 each, alpha, painted silhouettes at two haze depths
- **Status:** delivered · **Stand-in:** `terrain.horizon` · **Final:** `textures/horizon/red-<ring>-<n>.png`
- **Prompt:** Use case: environment. Painted distant mountain range silhouette strip for Vermilion Basin, two flat haze tones, gouache texture, transparent above the ridge line, no text.

### T-017 · Horizon cards: Cobalt Drift

Distant mountains, skylines or structures around Cobalt Drift, painted flat in the region's haze colours. Placed on a ring 5 km out; never reachable.

- **Spec:** two rings of 8 cards, 4096×1024 each, alpha, painted silhouettes at two haze depths
- **Status:** delivered · **Stand-in:** `terrain.horizon` · **Final:** `textures/horizon/blue-<ring>-<n>.png`
- **Prompt:** Use case: environment. Painted distant mountain range silhouette strip for Cobalt Drift, two flat haze tones, gouache texture, transparent above the ridge line, no text.

### T-018 · Horizon cards: Violet Inversion

Distant mountains, skylines or structures around Violet Inversion, painted flat in the region's haze colours. Placed on a ring 5 km out; never reachable.

- **Spec:** two rings of 8 cards, 4096×1024 each, alpha, painted silhouettes at two haze depths
- **Status:** delivered · **Stand-in:** `terrain.horizon` · **Final:** `textures/horizon/violet-<ring>-<n>.png`
- **Prompt:** Use case: environment. Painted distant mountain range silhouette strip for Violet Inversion, two flat haze tones, gouache texture, transparent above the ridge line, no text.


## Terrain sets (9)

Tileable ground, cliff and path textures blended by a splat mask. The procedural painters named in `Stand-in` are what the game shows meanwhile.

### T-019 · Terrain set: Sunseed Fields

Hand-painted tileable ground textures for Sunseed Fields: meadow grass, ploughed terrace soil, dirt road. Two or three flat tones each, visible brush direction, no photo detail. The procedural "grass" painter is the placeholder.

- **Spec:** three 2048² tileable albedo textures (ground, cliff, path) + one 512² splat mask template
- **Status:** delivered · **Stand-in:** `texture.grass` · **Final:** `textures/terrain/fields/`
- **Prompt:** Use case: texture. Seamless tileable hand-painted gouache texture, meadow grass, 1970s anime background style, three flat cel tones, brushed edges, no lighting baked in, no text.

### T-020 · Terrain set: Crownline City

Hand-painted tileable ground textures for Crownline City: ivory paving, teal glass, rooftop gravel. Two or three flat tones each, visible brush direction, no photo detail. The procedural "ivory" painter is the placeholder.

- **Spec:** three 2048² tileable albedo textures (ground, cliff, path) + one 512² splat mask template
- **Status:** delivered · **Stand-in:** `texture.ivory` · **Final:** `textures/terrain/city/`
- **Prompt:** Use case: texture. Seamless tileable hand-painted gouache texture, ivory paving, 1970s anime background style, three flat cel tones, brushed edges, no lighting baked in, no text.

### T-021 · Terrain set: Thunderhead Range

Hand-painted tileable ground textures for Thunderhead Range: slate, alpine turf, scree. Two or three flat tones each, visible brush direction, no photo detail. The procedural "rock" painter is the placeholder.

- **Spec:** three 2048² tileable albedo textures (ground, cliff, path) + one 512² splat mask template
- **Status:** delivered · **Stand-in:** `texture.rock` · **Final:** `textures/terrain/mountains/`
- **Prompt:** Use case: texture. Seamless tileable hand-painted gouache texture, slate, 1970s anime background style, three flat cel tones, brushed edges, no lighting baked in, no text.

### T-022 · Terrain set: Cinder Foundries

Hand-painted tileable ground textures for Cinder Foundries: iron plate, slag crust, soot ground. Two or three flat tones each, visible brush direction, no photo detail. The procedural "iron" painter is the placeholder.

- **Spec:** three 2048² tileable albedo textures (ground, cliff, path) + one 512² splat mask template
- **Status:** delivered · **Stand-in:** `texture.iron` · **Final:** `textures/terrain/foundry/`
- **Prompt:** Use case: texture. Seamless tileable hand-painted gouache texture, iron plate, 1970s anime background style, three flat cel tones, brushed edges, no lighting baked in, no text.

### T-023 · Terrain set: Tempest Docks

Hand-painted tileable ground textures for Tempest Docks: wet green steel, concrete quay, rain-dark timber. Two or three flat tones each, visible brush direction, no photo detail. The procedural "wetSteel" painter is the placeholder.

- **Spec:** three 2048² tileable albedo textures (ground, cliff, path) + one 512² splat mask template
- **Status:** delivered · **Stand-in:** `texture.wetSteel` · **Final:** `textures/terrain/harbor/`
- **Prompt:** Use case: texture. Seamless tileable hand-painted gouache texture, wet green steel, 1970s anime background style, three flat cel tones, brushed edges, no lighting baked in, no text.

### T-024 · Terrain set: Skyhook Works

Hand-painted tileable ground textures for Skyhook Works: rust plate, pale concrete, cloud-lit steel. Two or three flat tones each, visible brush direction, no photo detail. The procedural "rust" painter is the placeholder.

- **Spec:** three 2048² tileable albedo textures (ground, cliff, path) + one 512² splat mask template
- **Status:** delivered · **Stand-in:** `texture.rust` · **Final:** `textures/terrain/launchworks/`
- **Prompt:** Use case: texture. Seamless tileable hand-painted gouache texture, rust plate, 1970s anime background style, three flat cel tones, brushed edges, no lighting baked in, no text.

### T-025 · Terrain set: Vermilion Basin

Hand-painted tileable ground textures for Vermilion Basin: red coral, ivory bone, hot sand. Two or three flat tones each, visible brush direction, no photo detail. The procedural "coral" painter is the placeholder.

- **Spec:** three 2048² tileable albedo textures (ground, cliff, path) + one 512² splat mask template
- **Status:** delivered · **Stand-in:** `texture.coral` · **Final:** `textures/terrain/red/`
- **Prompt:** Use case: texture. Seamless tileable hand-painted gouache texture, red coral, 1970s anime background style, three flat cel tones, brushed edges, no lighting baked in, no text.

### T-026 · Terrain set: Cobalt Drift

Hand-painted tileable ground textures for Cobalt Drift: luminous reef rock, cyan root, blue dust. Two or three flat tones each, visible brush direction, no photo detail. The procedural "reef" painter is the placeholder.

- **Spec:** three 2048² tileable albedo textures (ground, cliff, path) + one 512² splat mask template
- **Status:** delivered · **Stand-in:** `texture.reef` · **Final:** `textures/terrain/blue/`
- **Prompt:** Use case: texture. Seamless tileable hand-painted gouache texture, luminous reef rock, 1970s anime background style, three flat cel tones, brushed edges, no lighting baked in, no text.

### T-027 · Terrain set: Violet Inversion

Hand-painted tileable ground textures for Violet Inversion: obsidian, violet seam glass, ring stone. Two or three flat tones each, visible brush direction, no photo detail. The procedural "obsidian" painter is the placeholder.

- **Spec:** three 2048² tileable albedo textures (ground, cliff, path) + one 512² splat mask template
- **Status:** delivered · **Stand-in:** `texture.obsidian` · **Final:** `textures/terrain/violet/`
- **Prompt:** Use case: texture. Seamless tileable hand-painted gouache texture, obsidian, 1970s anime background style, three flat cel tones, brushed edges, no lighting baked in, no text.


## Structure trim sheets (9)

One trim sheet per region kit so every piece shares a palette and a brush.

### T-028 · Structure trim sheet: Sunseed Fields

Shared trim sheet for the Sunseed Fields structure kit: ivory plaster, red tile, timber, concrete. Every kit model maps onto this sheet so the region reads as one painting.

- **Spec:** 4096² albedo trim sheet + 4096² emissive/mask, 8–12 horizontal strips
- **Status:** delivered · **Stand-in:** `texture.grass` · **Final:** `textures/trim/fields.png`
- **Prompt:** Use case: texture. Hand-painted trim sheet strips, ivory plaster, red tile, timber, concrete, 1970s anime cel style, flat tones with ink edges, no text.

### T-029 · Structure trim sheet: Crownline City

Shared trim sheet for the Crownline City structure kit: ivory panels, teal glass bands, rail concrete, billboard paper. Every kit model maps onto this sheet so the region reads as one painting.

- **Spec:** 4096² albedo trim sheet + 4096² emissive/mask, 8–12 horizontal strips
- **Status:** delivered · **Stand-in:** `texture.ivory` · **Final:** `textures/trim/city.png`
- **Prompt:** Use case: texture. Hand-painted trim sheet strips, ivory panels, teal glass bands, rail concrete, billboard paper, 1970s anime cel style, flat tones with ink edges, no text.

### T-030 · Structure trim sheet: Thunderhead Range

Shared trim sheet for the Thunderhead Range structure kit: slate blocks, timber deck, iron mast. Every kit model maps onto this sheet so the region reads as one painting.

- **Spec:** 4096² albedo trim sheet + 4096² emissive/mask, 8–12 horizontal strips
- **Status:** delivered · **Stand-in:** `texture.rock` · **Final:** `textures/trim/mountains.png`
- **Prompt:** Use case: texture. Hand-painted trim sheet strips, slate blocks, timber deck, iron mast, 1970s anime cel style, flat tones with ink edges, no text.

### T-031 · Structure trim sheet: Cinder Foundries

Shared trim sheet for the Cinder Foundries structure kit: iron plate with rivets, rust bands, furnace brick. Every kit model maps onto this sheet so the region reads as one painting.

- **Spec:** 4096² albedo trim sheet + 4096² emissive/mask, 8–12 horizontal strips
- **Status:** delivered · **Stand-in:** `texture.iron` · **Final:** `textures/trim/foundry.png`
- **Prompt:** Use case: texture. Hand-painted trim sheet strips, iron plate with rivets, rust bands, furnace brick, 1970s anime cel style, flat tones with ink edges, no text.

### T-032 · Structure trim sheet: Tempest Docks

Shared trim sheet for the Tempest Docks structure kit: wet green steel, container ribs, crane yellow. Every kit model maps onto this sheet so the region reads as one painting.

- **Spec:** 4096² albedo trim sheet + 4096² emissive/mask, 8–12 horizontal strips
- **Status:** delivered · **Stand-in:** `texture.wetSteel` · **Final:** `textures/trim/harbor.png`
- **Prompt:** Use case: texture. Hand-painted trim sheet strips, wet green steel, container ribs, crane yellow, 1970s anime cel style, flat tones with ink edges, no text.

### T-033 · Structure trim sheet: Skyhook Works

Shared trim sheet for the Skyhook Works structure kit: rust plate, pale rocket skin, piston brass. Every kit model maps onto this sheet so the region reads as one painting.

- **Spec:** 4096² albedo trim sheet + 4096² emissive/mask, 8–12 horizontal strips
- **Status:** delivered · **Stand-in:** `texture.rust` · **Final:** `textures/trim/launchworks.png`
- **Prompt:** Use case: texture. Hand-painted trim sheet strips, rust plate, pale rocket skin, piston brass, 1970s anime cel style, flat tones with ink edges, no text.

### T-034 · Structure trim sheet: Vermilion Basin

Shared trim sheet for the Vermilion Basin structure kit: red coral, ivory bone. Every kit model maps onto this sheet so the region reads as one painting.

- **Spec:** 4096² albedo trim sheet + 4096² emissive/mask, 8–12 horizontal strips
- **Status:** delivered · **Stand-in:** `texture.coral` · **Final:** `textures/trim/red.png`
- **Prompt:** Use case: texture. Hand-painted trim sheet strips, red coral, ivory bone, 1970s anime cel style, flat tones with ink edges, no text.

### T-035 · Structure trim sheet: Cobalt Drift

Shared trim sheet for the Cobalt Drift structure kit: reef rock, cyan crystal. Every kit model maps onto this sheet so the region reads as one painting.

- **Spec:** 4096² albedo trim sheet + 4096² emissive/mask, 8–12 horizontal strips
- **Status:** delivered · **Stand-in:** `texture.reef` · **Final:** `textures/trim/blue.png`
- **Prompt:** Use case: texture. Hand-painted trim sheet strips, reef rock, cyan crystal, 1970s anime cel style, flat tones with ink edges, no text.

### T-036 · Structure trim sheet: Violet Inversion

Shared trim sheet for the Violet Inversion structure kit: obsidian, violet seam, ring stone. Every kit model maps onto this sheet so the region reads as one painting.

- **Spec:** 4096² albedo trim sheet + 4096² emissive/mask, 8–12 horizontal strips
- **Status:** delivered · **Stand-in:** `texture.obsidian` · **Final:** `textures/trim/violet.png`
- **Prompt:** Use case: texture. Hand-painted trim sheet strips, obsidian, violet seam, ring stone, 1970s anime cel style, flat tones with ink edges, no text.


## Creature

### T-037 · Shadow hide sheet

The base skin every shadow species shares: charcoal interior, violet contour flecks. Species get unique 2K sheets on top (listed with each model).

- **Spec:** 2048² albedo + emissive, tileable charcoal hide with violet flecks
- **Status:** delivered · **Stand-in:** `texture.shadow` · **Final:** `textures/creatures/shadow-hide.png`
- **Prompt:** Use case: texture. Seamless hand-painted charcoal creature hide with sparse violet flecks, ink texture, 1970s anime cel style, no text.


## Shading

### T-038 · Toon ramps

The cel gradient maps are generated in code and are final; listed so nobody paints them.

- **Spec:** 3 ramps, 8×1 px: characters (3 tones), structures (3 tones), terrain (4 tones)
- **Status:** procedural-final · **Stand-in:** `none` · **Final:** `procedural (final)`


## Interface

### T-039 · Landing guide decal

Projected under Hopper while airborne, scaled by height. The single most important 3D readability aid; ships as a vector-clean ring.

- **Spec:** 512² alpha, ring + centre mark, white with a dark rim
- **Status:** delivered · **Stand-in:** `none` · **Final:** `textures/ui/landing-guide.png`

### T-040 · Lock-on reticle

Drawn at the locked target's Core socket; brackets close when the core is exposed.

- **Spec:** 256² alpha, four brackets that close on lock
- **Status:** delivered · **Stand-in:** `none` · **Final:** `textures/ui/lock-on.png`

### T-041 · HUD icons: dive, glide, lock-on, horizon view, crouch charge

New verbs need prompts. Same family as the 2D HUD icons.

- **Spec:** 5 icons, 128² alpha, ivory on transparent, matching the existing HUD line weight
- **Status:** delivered · **Stand-in:** `none` · **Final:** `textures/ui/icons-3d.png`

### T-042 · Controller diagram (3D controls)

Authored here from the 2D SVG with the 3D mapping. Used by the instructions screen and this document.

- **Spec:** SVG 1440×580, same style as the 2D diagram
- **Status:** delivered · **Stand-in:** `none` · **Final:** `design/source/controller-3d.svg`

### T-043 · Title poster and logo

The title screen is unchanged. Optional later: a 3D-rendered poster in the same composition once the world is dressed.

- **Spec:** existing inspiration.png and hopper-logo.png
- **Status:** delivered · **Stand-in:** `none` · **Final:** `game/public/assets/inspiration.png, hopper-logo.png`

### T-044 · Episode cards and transitions

Reused for the play-select screen and mission transitions.

- **Spec:** existing level boards and the four transition illustrations from the 2D design
- **Status:** delivered · **Stand-in:** `none` · **Final:** `design/assets/level-*.png`

### T-047 · Signal glyphs

Shown on the results screen and the gallery; reused from the 2D signals where they exist.

- **Spec:** 9 glyphs, 256² alpha, one per region
- **Status:** delivered · **Stand-in:** `none` · **Final:** `textures/ui/signals.png`

### T-081 · Landing guide, light variant

The delivered guide is dark navy, right for the fields and the city; on the obsidian, slag and reef floors of later regions it disappears. The game picks the variant by region floor luminance.

- **Spec:** 512² alpha ring and centre mark in ivory with a dark rim, same geometry as ui/landing-guide.png
- **Status:** delivered · **Stand-in:** `none` · **Final:** `textures/ui/landing-guide-light.png`
- **Prompt:** Use case: interface decal. The attached landing guide, redrawn in ivory #f6edcc lines with a thin dark rim, identical geometry and transparent background, no text.

### T-086 · Checkpoint totem and spring pad decals

Small painted faces for the props the player reads at a glance. The stand-ins draw them as flat emissive shapes; the delivered models (M-071 onward) will carry these as decals.

- **Spec:** 512² alpha sheet: lit and unlit totem lamp faces, a chevron ring for the spring pad plate, a signal-cage crown glyph
- **Status:** open · **Stand-in:** `none` · **Final:** `textures/ui/props.png`
- **Prompt:** Use case: prop decals. Hand-painted anime cel decals on transparent background: a glowing ivory lamp face and its dark unlit twin, a ring of four white chevrons on cyan, a violet crown glyph. Flat tones with ink edges, no text.


## Effects

### T-045 · Effect sprites: laser impact, kick spark, stomp shockwave ring, thermal motes, wind streaks

Billboard effects in the painted style; the 2D explosion and emergence atlases are reused for shadow deaths and eruptions.

- **Spec:** 5 atlases, 512² frames, 6–8 frames each, alpha
- **Status:** delivered · **Stand-in:** `none` · **Final:** `textures/effects/`

### T-046 · Gravity seam and gate arrows

The inversion warning graphics; must read at 200 m.

- **Spec:** 256² alpha arrow + 1024×128 seam strip, animated by UV scroll
- **Status:** delivered · **Stand-in:** `none` · **Final:** `textures/effects/gravity.png`

### T-082 · Hopper effect sprites: laser bolt, eye muzzle glow, guard shield face, glide wing trail

Round one covered impacts and sparks; Hopper's own attacks still use flat shapes: the laser bolt is a red capsule, the shield a translucent dome, the glide has no trail. This sheet gives them paint in the same style as the delivered atlases.

- **Spec:** one 2048² sheet, four 512² alpha elements plus an 8-frame 512² strip for the muzzle glow
- **Status:** open · **Stand-in:** `none` · **Final:** `textures/effects/hopper.png`
- **Prompt:** Use case: effect sprites. 1970s anime cel effects on transparent background: a red-white eye laser bolt with a bright core and ink edge, an eight-frame eye muzzle glow, a teal hexagon-patterned shield face with a white rim, and a soft cream glide wing trail. Flat tones, no text.

## Delivery history

See [image-history.md](image-history.md) and [texture pack notes](../textures/README.md) for delivered files, native resolutions, processing and review.

## Acceptance

- Inspect every painting at gameplay distance in the viewer (`hopper/3d/viewer/`) against the stand-in it replaces before it is committed.
- Skies must tile at the seam and keep the sun where `paintSky` puts it, because the directional light is aimed there.
- Terrain and trim textures must tile; check repeated features at 6× repeat over a 200 m surface.
- Record prompts, references and acceptance notes in this file's history, as the 2D `image-history.md` does.

