# Micro prototypes: image requests

Open artwork requests for the prototypes in `micro/prototypes/`. Delivered requests are kept in [`image-requests-history.md`](image-requests-history.md). Generated from `design/source/build_requests.py`; edit the data there and rerun it, which also rewrites `micro/prototypes/shared/asset-list.js`.

## How to use this list

1. Each prompt is complete on its own: paste it as it stands.
2. Give the generator the listed **reference images** too, where it accepts image input. They are the credited photographs and micrographs in the research atlas (`micro/research/assets/references/`); check the result against them for anatomy, cell shapes and scale. The **concept board** is AI art from the atlas: use it for mood only, never for anatomy.
3. Save each image under the file name in its **File** line and drop it in `micro/intake/`. On integration it moves to that path under `micro/prototypes/`, its status flips to `delivered` and the prototype loads it.
4. Tileable textures must wrap seamlessly on both axes. Transparent images may use a flat `#FF00FF` background instead; it is keyed out on integration.
5. Nothing here blocks the prototypes: the creatures and worlds are built in code, and every image has a procedural stand-in.

## Status

1 requested, 81 delivered, 82 in total.

## Springtail (macro photography)

Images for the springtail prototype (Level 0, the bog surface), seen as a macro photograph in daylight. The springtail, its enemies and the water surface are geometry and shaders built in code; these supply the surface texture, the moss lawn, the far backdrop and the sundew. Real colours, shallow focus.

### MP-S06 · Bog pondweed floating leaf plate

- **File:** `micro/prototypes/assets/springtail/pondweed-leaf.png`
- **Size:** 1536 x 768, transparent
- **Used for:** The floating leaves of bog pondweed that grow thick round each portal raft (the wolf spiders' hunting grounds) and only here and there elsewhere: a sign that the way on is a few seconds off. Mapped onto each leaf from above.
- **Stand-in until delivered:** Procedural olive-to-red leaves with a pale midrib and faint veins.
- **Status:** requested
- **Reference images:**
  - [Scottish Sphagnum bog pool; habitat analogue, not Simmelried documentation.](research/assets/references/production/bog-pool.jpg) · JarroNevsbaru, CC BY 4.0 · [source](https://commons.wikimedia.org/wiki/File:Sphagnum_Bog_Pool_Bealach_na_Ba_Viewpoint_1.jpg)
  - [Moss habitat structure; use leaf architecture as environmental reference.](research/assets/references/moss.jpg) · HermannSchachner, CC0 · [source](https://commons.wikimedia.org/wiki/File:Sphagnum_girgensohnii_(a,_150137-481740)_7207.JPG)
  - Concept board (mood only): [`01-moss-frontier.webp`](research/assets/concepts/01-moss-frontier.webp)

```text
Macro-photography look: a real photograph through a macro lens at 2 to 5 times life size, natural overcast daylight, real colours, very shallow depth of field with creamy out-of-focus areas, fine water droplets and surface tension visible where they are real, no studio flash glare, no HDR, no colour grading. One floating leaf of bog pondweed (Potamogeton polygonifolius) seen from directly above, isolated, its long axis left to right filling the frame: a leathery elliptic blade about 30 mm long and 12 mm wide with a blunt tip, olive green flushed wine red toward the edges and the base, a glossy waxy surface beaded with a few tiny water droplets, a pale midrib and fine curved parallel veins running tip to base, the short stalk at the left edge. Even soft daylight, the whole leaf in focus. No insect on it. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. Scientifically grounded: match real microscopy of the named organisms and habitat, with correct anatomy and believable scale. No fantasy creatures, no faces, no glowing magic, no text, no labels, no scale bars, no watermark, no UI.
```
