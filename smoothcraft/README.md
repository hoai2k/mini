# Smoothcraft

A Minecraft Java Edition mod (Fabric, Minecraft 26.3, client only) that
renders the world as smooth shapes instead of cubes:

- **Smooth terrain.** Natural terrain (stone, dirt, grass, sand, ores,
  snow, netherrack, leaves...) melts into one continuous surface. Edges and
  corners round off, cliffs become rounded bluffs, tree canopies become
  blobs, a lone block becomes a rounded lump, while flat ground, walls and
  one-block features stay where they were. Buildings keep their shape:
  terrain corners touching a built block (planks, bricks, glass, fences...)
  are pinned, so the two meet without gaps. Grass, flowers and snow layers
  ride on the smoothed ground under them. Lake and sea beds smooth too
  (water counts as open space), and a strip of water surface over each shore
  block lets the waterline follow the curved ground instead of the water
  blocks' edges.
- **Curved borders between materials.** Where grass meets sand, sand meets
  gravel or stone meets dirt, the neighbouring textures reach over the block
  edge and meet along a smooth, wandering border (blended share of each
  surface type around every point, cut by a noise threshold in the shader),
  so patches of sand and grass have curved, natural outlines. Where smoothing turns a block's
  side to face the sky (a grassy slope), it wears the block's top texture,
  so hillsides are green rather than striped with dirt.
- **Rounded mobs and objects.** Every model box (mob heads, bodies, legs,
  players, chests, signs, beds...) is drawn as a rounded box with smooth
  normals, so each mob becomes a soft 3D model of its voxel self. Animation,
  armour layers and UV layouts all still apply, so a face painted on a head
  texture shows as a rounded face.
- **Realistic lighting and materials.** Every terrain surface gets a
  physically based material (31 of them: rough stone, polished stone, soil,
  grass, bark, timber, foliage, iron, gold, copper and patina, glass, ice,
  snow, water, lava, glowing, gems, cloth, ceramic, glazed tile,
  obsidian...), picked from its texture's name. The terrain shader lights it
  with the real sun and moon (direction and colour from the sky), a sky dome,
  torch light, GGX specular highlights, Fresnel sky reflections, light through
  leaves and snow, rain-soaked surfaces, bump detail read from the texture,
  rippling reflective water and an ACES filmic tonemap. Sun light only reaches
  where the sky does, a cheap stand-in for shadows.
- **High-resolution realistic textures** from the image requests: a
  built-in resource pack, "Smoothcraft HD textures", on by default, holds
  each one as it is delivered. Until then vanilla's textures are used.

Press **F8** in game to switch the smooth world off and on (for comparing);
the settings live in `config/smoothcraft.json`:

| Setting | Default | |
| --- | --- | --- |
| `smoothTerrain` | `true` | melt natural terrain into smooth surfaces |
| `terrainStrength` | `1.0` | 0 keeps the cubes, 1 is fully smooth |
| `terrainSubdivisions` | `2` | each smoothed face is cut into n x n quads (1-4) |
| `blendBorders` | `true` | curved borders between neighbouring terrain textures |
| `realisticLighting` | `true` | Smoothcraft's lighting; off is vanilla's |
| `roundEntities` | `true` | round every model box |
| `entityRoundness` | `0.8` | rounding radius, as a fraction of a box's smallest half-size |
| `entityMaxRadius` | `4.0` | largest rounding radius, in model pixels |
| `entityBands` | `2` | grid lines across each rounded edge |

Known limits, for now: no real shadow maps (sky access stands in for
them); the water surface itself stays flat (its edges are covered by the
shore strip, but waterfalls and flowing water keep their block shapes);
mobs get the rounded shape but not per-mob materials (the entity shader is
vanilla's); and the HD pack is empty until the requested images arrive.

## Install

Needs Java 25, [Fabric Loader](https://fabricmc.net/use/) 0.20.1+ and
Fabric API 0.165.0+26.3. Build the jar (below) and put
`mod/build/libs/smoothcraft-<version>.jar` in the `mods` folder. It uses
Fabric's own renderer (Indigo), so it does not work alongside Sodium or Iris,
and replaces the terrain shader, so it does not combine with resource packs
that replace `terrain.vsh`/`terrain.fsh` either.

## How it works

| Piece | Where |
| --- | --- |
| Smooth surface maths: each face point is moved onto the half-density level of the blended voxel occupancy (Newton steps on a trilinear field), normals from a smoother quadratic B-spline field, corners next to built blocks pinned | `mod/src/main/java/.../geom/SmoothSurface.java` |
| Which blocks smooth, pin or follow the ground | `mod/src/main/resources/assets/smoothcraft/smoothing.json`, `terrain/BlockRules.java` |
| Wraps every block model; while a chunk is meshed it subdivides and projects the faces of terrain, moves plants with the ground, lays the shore water strip, and tags every quad with its material | `terrain/SmoothBlockModel.java`, `terrain/RegionCells.java` |
| Curved material borders: each face point's share of every surface type around it (bilinear + cubic B-spline over the exposed faces in the same plane); the types are drawn in layers, each overlay carrying its share in the vertex alpha's top 3 bits, and `terrain.fsh` keeps an overlay where its share beats a noise threshold | `geom/FaceBlend.java`, `terrain/Looks.java`, `smooth_border_threshold` in `lighting.glsl` |
| Rounded model boxes (Minkowski sum of a box and a sphere, faces cut finer near the edges) | `geom/RoundedBox.java`, `entity/RoundedCubes.java`, `mixin/ModelPartCubeMixin.java` |
| Materials and the texture-name rules that pick them | `assets/smoothcraft/materials.json`, `material/Materials.java`; the shader table `shaders/include/materials.glsl` is generated by `tools/gen_materials.py` |
| Terrain vertices have no normal: the normal rides in spare bits of the lightmap coordinate, the material in the vertex colour's alpha | `geom/NormalPacking.java`, `mixin/BufferBuilderMixin.java`, `mixin/FluidRendererMixin.java` |
| Sun direction, sky colour and weather appended to the Globals uniform block | `sky/SkyState.java`, `mixin/SkyRendererMixin.java`, `mixin/GlobalSettingsUniformMixin.java`, `assets/minecraft/shaders/include/globals.glsl` |
| The lighting model and terrain shaders | `assets/smoothcraft/shaders/include/lighting.glsl`, `assets/minecraft/shaders/core/terrain.vsh`, `terrain.fsh` |

Resource packs can override `smoothing.json` and `materials.json`
(`assets/smoothcraft/`); after changing `materials.json` in this repository,
rerun `python3 tools/gen_materials.py` so the shader table matches.

## Image requests

The textures are requested in [`design/image-requests.md`](design/image-requests.md)
(the rules, and tier 1: 151 common things with their own prompts),
[`design/image-requests-blocks.md`](design/image-requests-blocks.md) (tier 2,
every other block) and
[`design/image-requests-entities.md`](design/image-requests-entities.md)
(tier 3, every other mob, object and the sky), with a machine-readable
[`design/image-requests.json`](design/image-requests.json). They are generated
by `design/source/build_requests.py` from `design/source/vanilla_textures.tsv`
(written from the game jar by `tools/list_vanilla_textures.py`); edit the
prompts there and rerun it. `python3 tools/make_references.py` writes an
upscaled copy of each vanilla texture from your own jar into
`local/smoothcraft/references/` (outside Git) to paint over. Delivered images
go in [`intake/`](intake/README.md).

## Build and checks

From `smoothcraft/mod` (Java 25; the Gradle wrapper fetches Gradle 9.8):

```sh
./gradlew build                  # compile, unit tests, jar in build/libs/
./gradlew test                   # geometry unit tests only (17)
./gradlew runClient              # play in a development client
./gradlew runClientGameTest      # boots the game, makes a world, takes screenshots
python3 ../tools/gen_materials.py --check
python3 ../design/source/build_requests.py
```

`runClientGameTest` (`src/gametest/`) creates a world, summons a villager and
photographs a villager, a hillside, a shoreline from above and a lake bed
from underwater with Smoothcraft on and off, and the hillside at sunrise, into `build/run/clientGameTest/screenshots/`; it fails if a
shader does not compile or the chunks never finish meshing. Without a GPU it runs
on a virtual display with software OpenGL:
`Xvfb :99 -screen 0 1280x720x24 & DISPLAY=:99 ./gradlew runClientGameTest`
(the test source set asks for a non-sRGB window, which Xvfb needs).

Smoothcraft is a mod, not a browser game, so it has no `publish.sh` and is
not built by the Pages workflow.
