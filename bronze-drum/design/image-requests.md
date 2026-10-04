# Bronze Drum: image requests

Artwork for the Bronze Drum prototype in `bronze-drum/game/`, plus direction pieces for the look and atmosphere. Generated from `source/build_requests.py`; edit the data there and rerun it, which also rewrites `game/assets/manifest.json`.

## How to use this list

1. Start with the **inspiration and atmosphere** pieces (BD-M01 to BD-M14). They fix the look; when a later asset disagrees with them, the direction pieces win.
2. Each prompt is complete on its own: paste it as it stands. The shared style text is already included in every prompt that needs it.
3. Save each image under the file name in its **File** line and drop it in `hopper/intake/` (or straight into `bronze-drum/game/assets/` and `bronze-drum/design/`). On integration the request's status flips to `delivered` and the game loads the file in place of its procedural stand-in.
4. Cutouts need transparency. If the generator cannot produce alpha, use a flat pure magenta `#FF00FF` background as the prompts say; it is keyed out on integration.

## Art direction

The game is staged as a **backlit paper-cut theatre**. Every element is a flat silhouette cut from paper, layered in depth and lit from behind: light glows through the cuts, and each layer throws a soft shadow onto the one behind it. The aim is the feeling of standing in a dark room among hanging hand-cut panels, with fire-lit, cave-like shadows.

This direction is inspired by **Sarah Nguyen**'s hand-cut paper and fibre panels: suspended, backlit, built on folklore, plants, animals and a changing moon, often about women's stories. The prompts describe those *qualities* and never name her. A generator must not be asked to imitate a living artist, and the game must never reproduce her actual pieces. If she is involved in the project, her own work replaces these direction pieces.

The second source is the **Dong Son bronze drum** (Lac Viet, before and around the Trung sisters' time). Its face is already a flat, concentric, stylised frieze of herons, feather-crowned figures, boats and stilt houses around a sun-star, so it translates naturally into cut paper. The drum face also serves as the HUD and, later, as the campaign map.

**Rules for every piece**

- Flat colour fields. The only gradient is the glow of the backlight.
- Silhouettes read first. Faces and armour are carried by cut holes, not by painted detail.
- Lac Viet figures face right, Han figures face left.
- The Han are people, not monsters: specific Eastern Han kit (ji halberds, crossbows, lamellar armour), ordinary faces.
- Vietnamese names keep their diacritics wherever text appears (Trưng Trắc, Trưng Nhị, Mê Linh, Luy Lâu, Hát). The prompts are written without them so generators parse them cleanly; anything with lettering, like the logo, spells them exactly.
- No gore. Hits burst into paper scraps.

**Palette** (the same values as `game/src/palette.js`)

| Name | Hex |
| --- | --- |
| rice paper | `#F2E8D5` |
| paper shade | `#D9C9A8` |
| ink | `#16151A` |
| night indigo | `#1E2A44` |
| dusk indigo | `#3A4C6E` |
| bronze | `#B07A3A` |
| bronze light | `#D9A55B` |
| verdigris | `#4F8A7B` |
| lacquer red | `#A8322D` |
| moon | `#F6F0DC` |
| Han iron | `#5E6470` |
| Han iron dark | `#33373F` |
| straw | `#C9A866` |

## Summary

| Section | Requests | Stand-in | Planned | Reference | Delivered |
| --- | ---: | ---: | ---: | ---: | ---: |
| Inspiration and atmosphere | 14 | 0 | 0 | 14 | 0 |
| Backgrounds | 8 | 8 | 0 | 0 | 0 |
| Characters and units | 10 | 10 | 0 | 0 | 0 |
| Puppet part sheets | 4 | 0 | 4 | 0 | 0 |
| Interface | 8 | 5 | 3 | 0 | 0 |
| Effects | 3 | 0 | 3 | 0 | 0 |
| **total** | **47** | **23** | **10** | **14** | **0** |

## Inspiration and atmosphere (14)

Direction pieces, not game assets. They fix the look, the light and the emotional range before production art is made, and every later request should agree with them. Save delivered pieces to `design/references/` under the file names given.

### BD-M01 · Key art: the sisters ride to war

The single image the game is sold on. Sets scale, hierarchy and the backlit-diorama look.

- **Spec:** 3840x2160, opaque
- **Status:** reference only
- **File:** `bronze-drum/design/references/m01-key-art.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. Key art for a game about the Trung sisters, Vietnam, 40 CE. Trung Trac and Trung Nhi ride a great war elephant into battle, both in gold armour with tall feathered crowns, beating a huge bronze drum carried in the howdah between them. Behind them an army of women with spears, bows and feather headdresses streams across rice paddies; ahead, a Han palisade citadel under a full moon. Built as a stage of five cut-paper layers, one behind another, lit from behind so the moon and the cuts glow; every layer casts a soft shadow on the one behind. The sisters are the brightest, most intricately cut shapes in the frame.

### BD-M02 · Lightbox study: suspended panels

Defines the game's depth and lighting model: how layers glow, how shadows fall, how much the cuts carry.

- **Spec:** 3840x2160, opaque
- **Status:** reference only
- **File:** `bronze-drum/design/references/m02-suspended-panels.png`
- **Prompt:** Photograph of a gallery installation in a dark room: six large hand-cut white fibre-paper panels hang from the ceiling one behind another. A single warm lamp behind the last panel throws their cut patterns as long shadows onto the floor and the near wall. The panels show, back to front: a full moon ringed with herons, limestone karst peaks, areca palms and bamboo, stilt houses, rice paddies, and a row of women warriors with feather crowns. Fire-lit, cave-like atmosphere; the paper fibres visible where the light passes through.

### BD-M03 · Dong Son motif sheet

A shared vocabulary of cut shapes, translated from the bronze drums, for every artist and every later request.

- **Spec:** 3000x3000, opaque cream ground
- **Status:** reference only
- **File:** `bronze-drum/design/references/m03-dong-son-motifs.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. Reference sheet of cut-paper motifs translated from Dong Son bronze drums, arranged in a grid on rice-paper cream: the 12-point sun-star at the drum's centre; bands of tangential circles; zigzag and ladder bands; flying long-beaked herons; feather-crowned dancers and warriors in profile; long boats with crews; deer; stilt houses with saddle roofs; the small frogs that sit on drum rims; a drummer pounding paired drums. Each motif cut as a flat ink-black silhouette with fine interior cuts.

### BD-M04 · Colour script

The palette's journey through the story, so each chapter has its own light.

- **Spec:** 4800x1600, opaque, eight panels in two rows
- **Status:** reference only
- **File:** `bronze-drum/design/references/m04-colour-script.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. A colour script of eight small cut-paper scenes in two rows of four, each a different light: 1 dawn training, rose and bronze; 2 the garden, verdigris and cream; 3 grief, deep indigo with a single lacquer-red shape; 4 casting the drums, molten bronze and orange; 5 the villages answer, cream daylight and verdigris; 6 battle on the river, slate grey and lacquer red; 7 Luy Lau at night, indigo and gold; 8 elegy, ash grey and cream with one bronze shape. Simple compositions, the colour shift readable at thumbnail size.

### BD-M05 · The sisters: character study

Fixes the two leads' silhouettes and personalities before the sprites are made.

- **Spec:** 3000x2000, opaque cream ground
- **Status:** reference only
- **File:** `bronze-drum/design/references/m05-sisters.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. Character study of two Vietnamese sisters as cut-paper figures, side by side, front view and side profile each. Trung Trac, the elder: composed and upright, bronze and gold, hair in a high knot under a crown of tall feathers, holding a drumstick still at her side; her cut patterns are ordered rings and stars. Trung Nhi, the younger: in motion, lacquer red, flowers and leaves cut into her sleeves and hair, laughing, drumstick raised; her cut patterns are vines and birds. Ancient Lac Viet dress, wrapped skirts, bead collars. Dignified, warm, not sexualised.

### BD-M06 · The garden at Me Linh

Atmosphere for chapter one: the training years, intimate and green.

- **Spec:** 3840x2160, opaque
- **Status:** reference only
- **File:** `bronze-drum/design/references/m06-garden.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. The garden of a Lac Viet lord's house at Me Linh, late afternoon, with a pale moon in the sky. Nhi sits among lotus and flowering shrubs with birds around her; across the pond, Trac practises with a spear beside straw training targets. Stilt house with a saddle roof behind. Cut-paper layers backlit by low sun, verdigris and cream, the leaves cut with fine veins.

### BD-M07 · Casting the drums

Atmosphere for the uprising's preparation: the metalworkers of Nhat Nam.

- **Spec:** 3840x2160, opaque
- **Status:** reference only
- **File:** `bronze-drum/design/references/m07-casting.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. Night in a foundry of the Nhat Nam metalworkers: molten bronze poured from crucibles into clay drum moulds stamped with the sun-star; women carry the moulds, sparks drawn as tiny cut holes letting orange light through. Finished bronze drums stacked at the side. Cut-paper layers, bronze and orange glow against ink black.

### BD-M08 · The villages answer

The drum as a call: the sound made visible. Direction for the drum-wake effect and the campaign map.

- **Spec:** 3840x2160, opaque
- **Status:** reference only
- **File:** `bronze-drum/design/references/m08-villages-answer.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. Night over the Red River delta seen from above at a low angle. The sound of a great drum spreads from the centre as concentric cut-paper rings, like the rings on a bronze drum face. In stilt villages along the river, lanterns light one by one and women come down to long boats carrying spears. Indigo, cream and bronze.

### BD-M09 · Battle on the Hat River

Atmosphere for chapter two: daylight battle, shield walls and crossbow volleys.

- **Spec:** 3840x2160, opaque
- **Status:** reference only
- **File:** `bronze-drum/design/references/m09-river-battle.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. A battle at a river ford in low daylight. Han crossbowmen in iron-grey lamellar armour stand on a wooden palisade; a wall of Lac Viet women raises round shields with star patterns cut through them as a volley of bolts arcs over, drawn as clean cut lines. Reeds and lotus in the foreground. Slate grey, cream and lacquer red.

### BD-M10 · Luy Lau at night

Atmosphere for chapter three: the climax.

- **Spec:** 3840x2160, opaque
- **Status:** reference only
- **File:** `bronze-drum/design/references/m10-luy-lau.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. The Han citadel of Luy Lau at night under a full moon. War elephants carrying the sisters and bronze drums break through the gate; gold armour and feather crowns catch the moonlight; the citadel's watchtowers are cut with lattice windows lit from within. Indigo and gold, triumphant but heavy.

### BD-M11 · Elegy: the drums melted

The ending's tone: the victory does not last. Quiet, respectful, no depiction of death.

- **Spec:** 3840x2160, opaque
- **Status:** reference only
- **File:** `bronze-drum/design/references/m11-elegy.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. Quiet aftermath. In a Han workshop, captured bronze drums lie stacked by a furnace, about to be melted down and cast into a bronze horse. Through the open door, the Hat River at dawn with lotus drifting and herons flying. Ash grey and cream with one warm bronze shape. Mournful and still.

### BD-M12 · In-game screen mock-up

Steers the production HUD and checks that the style reads at play size.

- **Spec:** 1920x1080, opaque
- **Status:** reference only
- **File:** `bronze-drum/design/references/m12-screen-mockup.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. A 16:9 video game screen in cut-paper style. Side-scrolling battlefield: a line of women warriors on the left marches right towards Han soldiers and a palisade on the right; behind the women, two sisters stand on a palanquin with a bronze drum. Bottom centre, a round bronze drum face with rings, four herons and a central star as the rhythm display. Bottom left, a small panel listing four drum commands as rows of dots. Top left and top right, thin strength bars. Plenty of empty space around the interface.

### BD-M13 · Army of women: costume line-up

The unit types and their silhouettes, readable at small sizes.

- **Spec:** 4000x2000, opaque cream ground
- **Status:** reference only
- **File:** `bronze-drum/design/references/m13-army-lineup.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. Costume line-up of a Lac Viet women's army, ancient Vietnam, as flat cut-paper figures in profile facing right, all at the same scale: spearwoman, archer with a crossbow, shield bearer with a round star-cut shield, drum bearer, standard bearer, mountain archer with a longbow. Feather crowns of different heights, wrapped skirts, bead collars, lacquer-red sashes. Each silhouette distinct.

### BD-M14 · Han forces: line-up

The opposing side, dignified and specific to the Eastern Han, never caricatured.

- **Spec:** 4000x2000, opaque cream ground
- **Status:** reference only
- **File:** `bronze-drum/design/references/m14-han-lineup.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. Line-up of Eastern Han Chinese soldiers, 1st century, as flat cut-paper figures in profile facing left, at one scale: spearman with a ji halberd, kneeling crossbowman, officer with a banner, the provincial governor in robes and a scholar's cap. Lamellar armour shown as rows of small cut slots, iron grey and black. Ordinary, human faces; no caricature.

## Backgrounds (8)

One sky per chapter and four parallax strips. The game draws each strip at the full 720-pixel screen height, so composition is given as a fraction of the image height. The ground line sits at 69% of the height; the band below it holds the drum HUD.

### BD-B01 · Sky: dawn

Chapter one, the garden at Me Linh. The furthest backdrop; everything else is layered over it.

- **Spec:** 2560x1440, opaque; keep the lower third plain, it is covered by hills
- **Status:** stand-in in the prototype · **Stand-in:** `Renderer.buildSky` · **Game id:** `sky-dawn`
- **File:** `bronze-drum/game/assets/art/sky-dawn.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. Backdrop of a dawn sky: indigo at the top, rose in the middle, warm bronze near the horizon; the sun as a cut 12-point star low on the right with a glowing halo; a few long scalloped paper clouds. Sky only, no land.

### BD-B02 · Sky: day

Chapter two, the Hat River. The furthest backdrop; everything else is layered over it.

- **Spec:** 2560x1440, opaque; keep the lower third plain, it is covered by hills
- **Status:** stand-in in the prototype · **Stand-in:** `Renderer.buildSky` · **Game id:** `sky-day`
- **File:** `bronze-drum/game/assets/art/sky-day.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. Backdrop of a hazy daylight sky: pale verdigris at the top fading to cream at the horizon; the sun as a cut 12-point star at upper right; long scalloped paper clouds. Sky only, no land.

### BD-B03 · Sky: night

Chapter three, Luy Lau. The furthest backdrop; everything else is layered over it.

- **Spec:** 2560x1440, opaque; keep the lower third plain, it is covered by hills
- **Status:** stand-in in the prototype · **Stand-in:** `Renderer.buildSky` · **Game id:** `sky-night`
- **File:** `bronze-drum/game/assets/art/sky-night.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. Backdrop of a night sky: deep indigo, a large full moon at upper right with crater shapes cut out of it, a scatter of small stars, a few long indigo paper clouds. Sky only, no land.

### BD-B04 · Far layer: karst peaks

The far hills, moving at 15% of the camera speed.

- **Spec:** 5120x1440. Peaks between 10% and 60% of the height; the base solid to the bottom edge. Seamless horizontally: the left and right edges must join with no visible seam. Transparent above the silhouette (PNG with alpha); the game layers it over the sky.
- **Status:** stand-in in the prototype · **Stand-in:** `Renderer.buildKarst` · **Game id:** `layer-karst`
- **File:** `bronze-drum/game/assets/art/layer-karst.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. A long horizontal strip of steep limestone karst peaks with rounded tops, cut from one sheet of paper in a single muted indigo-violet, with thin mist bands and small flying herons cut out of it so the light shows through. Flat silhouette, no interior shading.

### BD-B05 · Middle layer: palms, bamboo, stilt houses

The middle distance, moving at 45% of the camera speed.

- **Spec:** 5120x1440. Tree bases on a solid band at 63-71% of the height; tallest crowns at about 25%. Seamless horizontally: the left and right edges must join with no visible seam. Transparent above the silhouette (PNG with alpha); the game layers it over the sky.
- **Status:** stand-in in the prototype · **Stand-in:** `Renderer.buildGrove` · **Game id:** `layer-grove`
- **File:** `bronze-drum/game/assets/art/layer-grove.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. A long horizontal strip of areca palms, clumps of bamboo and stilt houses with saddle-shaped roofs like those on Dong Son drums, cut from one dark indigo-green sheet; leaf veins and lattice windows cut out so the light shows through.

### BD-B06 · Ground layer: rice paddies

The ground the armies stand on.

- **Spec:** 5120x1440. Top edge a gentle scalloped line at 69% of the height; solid below, with the water slits kept faint so the HUD reads over it. Seamless horizontally: the left and right edges must join with no visible seam. Transparent above the silhouette (PNG with alpha); the game layers it over the sky.
- **Status:** stand-in in the prototype · **Stand-in:** `Renderer.buildPaddy` · **Game id:** `layer-paddy`
- **File:** `bronze-drum/game/assets/art/layer-paddy.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. A long horizontal strip of flooded rice paddies seen from the side, one dark sheet with a softly scalloped top edge; rows of thin horizontal slits cut through it suggest water catching light between rows of rice.

### BD-B07 · Foreground layer: reeds and lotus

The nearest layer, in front of the armies, moving at 125% of the camera speed.

- **Spec:** 5120x1440. Reeds rising from the bottom edge up to about 25% of the height; sparse enough that most of the bottom stays open. Seamless horizontally: the left and right edges must join with no visible seam. Transparent above the silhouette (PNG with alpha); the game layers it over the sky.
- **Status:** stand-in in the prototype · **Stand-in:** `Renderer.buildReeds` · **Game id:** `layer-reeds`
- **File:** `bronze-drum/game/assets/art/layer-reeds.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. A long horizontal strip of reeds, grasses and lotus pads rising from the bottom edge, ink-black silhouettes with very fine cut detail, sparse with gaps between clumps.

### BD-B08 · Paper fibre texture

Laid over the whole screen at low opacity, so the scene reads as one sheet of paper.

- **Spec:** 1024x1024, opaque, tileable in both directions
- **Status:** stand-in in the prototype · **Stand-in:** `fiberTexture` · **Game id:** `paper-fiber`
- **File:** `bronze-drum/game/assets/art/paper-fiber.png`
- **Prompt:** Seamless tileable texture of handmade mulberry rice paper lit from behind: warm cream, long pale fibres and a few darker flecks, even lighting, no folds, no shadows, no objects.

## Characters and units (10)

In-game cutouts. Lac Viet figures face right (the direction of the march); Han figures face left. The game scales each sprite to a fixed on-screen height, given in the spec, and adds the backlit shadow itself.

### BD-C01 · Trung Trac, drumming

The elder sister at the drum: plays the deep centre stroke (tung). Shown 96 px tall.

- **Spec:** 1024x1536. Single cut-paper figure, side profile, full body, feet on the bottom edge, centred, transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow: the game adds its own shadow.
- **Status:** stand-in in the prototype · **Stand-in:** `Renderer.sisters` · **Game id:** `sister-trac`
- **File:** `bronze-drum/game/assets/art/sister-trac.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. Trung Trac, a Lac Viet noblewoman and war leader, standing in profile facing right, both hands gripping a long drumstick raised for a strike. Gold armour of small plates over a wrapped skirt, a tall crown of feathers, hair in a high knot. Composed and upright. Bronze and ink-black paper, her armour cut with rings and small stars.

### BD-C02 · Trung Nhi, drumming

The younger sister at the drum: plays the rim stroke (cac) and the off-beat flourishes. Shown 96 px tall.

- **Spec:** 1024x1536. Single cut-paper figure, side profile, full body, feet on the bottom edge, centred, transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow: the game adds its own shadow.
- **Status:** stand-in in the prototype · **Stand-in:** `Renderer.sisters` · **Game id:** `sister-nhi`
- **File:** `bronze-drum/game/assets/art/sister-nhi.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. Trung Nhi, a young Lac Viet war leader, in profile facing right, mid-swing with a short drumstick in each hand, body turning with energy. Gold armour over a lacquer-red wrapped skirt, a crown of feathers with flowers tucked in, vines and birds cut into her sleeves. Lively and fierce.

### BD-C03 · War elephant with howdah

Chapter three: the sisters ride it with the great drum. The game draws the sisters and drum on top, so the howdah is empty. Shown 230 px tall.

- **Spec:** 2048x1536. Empty howdah floor at about 70% of the height above the feet, centred slightly behind the middle. Single cut-paper figure, side profile, full body, feet on the bottom edge, centred, transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow: the game adds its own shadow.
- **Status:** stand-in in the prototype · **Stand-in:** `Renderer.elephant` · **Game id:** `war-elephant`
- **File:** `bronze-drum/game/assets/art/war-elephant.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. An Asian war elephant walking right in profile, an empty open howdah with a lacquer-red rail on its back, a caparison cut with concentric rings and a sun-star, tusks and trunk curled forward. Ink-black paper with red and bronze inlays.

### BD-C04 · The drum on its palanquin

Chapters one and two: four women carry the bronze drum on a low platform; the sisters stand on its deck (drawn separately). Shown 150 px tall.

- **Spec:** 2048x1024. Platform deck at about 35% of the height. Single cut-paper figure, side profile, full body, feet on the bottom edge, centred, transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow: the game adds its own shadow.
- **Status:** stand-in in the prototype · **Stand-in:** `Renderer.drumCrew` · **Game id:** `drum-bearers`
- **File:** `bronze-drum/game/assets/art/drum-bearers.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. Four Lac Viet women in feather crowns carry a low wooden palanquin on poles, walking right; on it sits a large bronze drum, its side banded with rings and its top a sun-star. The deck is empty apart from the drum. Ink-black figures, a bronze drum.

### BD-C05 · Spearwoman

The front line. Shown 92 px tall; the game bobs, levels and tilts it for march and strike.

- **Spec:** 1024x1536. Spear held upright. Single cut-paper figure, side profile, full body, feet on the bottom edge, centred, transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow: the game adds its own shadow.
- **Status:** stand-in in the prototype · **Stand-in:** `Renderer.warrior` · **Game id:** `unit-spear`
- **File:** `bronze-drum/game/assets/art/unit-spear.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. A Lac Viet woman warrior in profile facing right, holding a long bronze-headed spear upright, a feather crown fanning backwards, wrapped skirt, a lacquer-red sash. Ink-black silhouette with fine cut details in the feathers.

### BD-C06 · Archer

The back line. Shown 92 px tall.

- **Spec:** 1024x1536. Single cut-paper figure, side profile, full body, feet on the bottom edge, centred, transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow: the game adds its own shadow.
- **Status:** stand-in in the prototype · **Stand-in:** `Renderer.warrior` · **Game id:** `unit-archer`
- **File:** `bronze-drum/game/assets/art/unit-archer.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. A Lac Viet woman archer in profile facing right, drawing a bow, a short feather crown, quiver on her back, a lacquer-red sash. Ink-black silhouette with fine cut details.

### BD-C07 · Han spearman

Advances and attacks at close range. Shown 96 px tall.

- **Spec:** 1024x1536. Faces left. Single cut-paper figure, side profile, full body, feet on the bottom edge, centred, transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow: the game adds its own shadow.
- **Status:** stand-in in the prototype · **Stand-in:** `Renderer.hanSoldier` · **Game id:** `han-spear`
- **File:** `bronze-drum/game/assets/art/han-spear.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. An Eastern Han Chinese soldier, 1st century, in profile facing left, holding a ji halberd upright, lamellar armour shown as rows of small cut slots, a soft cap. Iron grey and dark grey paper. An ordinary soldier, no caricature.

### BD-C08 · Han crossbowman

Fires a bolt every measure from range. Shown 96 px tall.

- **Spec:** 1024x1536. Faces left. Single cut-paper figure, side profile, full body, feet on the bottom edge, centred, transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow: the game adds its own shadow.
- **Status:** stand-in in the prototype · **Stand-in:** `Renderer.hanSoldier` · **Game id:** `han-crossbow`
- **File:** `bronze-drum/game/assets/art/han-crossbow.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. An Eastern Han Chinese crossbowman, 1st century, kneeling in profile facing left, aiming a bronze-triggered crossbow, lamellar armour as rows of small cut slots. Iron grey and dark grey paper, no caricature.

### BD-C09 · Han palisade fort

The goal of chapters two and three. Shown 300 px tall; the game tears pieces out as it takes damage.

- **Spec:** 2048x2048. Gate on the left side, facing the army. Single cut-paper structure, side view, base on the bottom edge, centred, transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow: the game adds its own shadow.
- **Status:** stand-in in the prototype · **Stand-in:** `Renderer.fort` · **Game id:** `fort-palisade`
- **File:** `bronze-drum/game/assets/art/fort-palisade.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. A Han frontier fort seen from the side: a wall of pointed timber stakes, a gate on the left, a two-storey watchtower with a tiled roof and a pennant, lattice windows cut through. Dark iron-grey paper.

### BD-C10 · Straw training target

Chapter one's goal. Shown 110 px tall.

- **Spec:** 1024x1024. Single cut-paper object, side view, base on the bottom edge, centred, transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow: the game adds its own shadow.
- **Status:** stand-in in the prototype · **Stand-in:** `Renderer.target` · **Game id:** `straw-target`
- **File:** `bronze-drum/game/assets/art/straw-target.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. A straw training dummy on a wooden post with a crossbar, bound with rope in three places. Straw-coloured paper with ink-black post and ropes.

## Puppet part sheets (4)

For the production build: the same figures split into separate pieces so they can be rigged and animated like shadow puppets. The prototype does not load these.

### BD-R01 · Part sheet: Trung Trac

Separate pieces of Trung Trac for puppet rigging.

- **Spec:** 4096x4096, transparent; pieces laid out apart with space between, each with a little overlap at the joints
- **Status:** planned, not loaded yet · **Game id:** `rig-sister-trac`
- **File:** `bronze-drum/game/assets/art/rig-sister-trac.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. A sheet of separate cut-paper puppet parts for Trung Trac, matching the in-game figure: head with crown, torso, upper and lower arms, hands with drumstick, skirt, legs. Each piece is whole and flat, laid out with space between, joints rounded so they overlap when assembled.

### BD-R02 · Part sheet: Trung Nhi

Separate pieces of Trung Nhi for puppet rigging.

- **Spec:** 4096x4096, transparent; pieces laid out apart with space between, each with a little overlap at the joints
- **Status:** planned, not loaded yet · **Game id:** `rig-sister-nhi`
- **File:** `bronze-drum/game/assets/art/rig-sister-nhi.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. A sheet of separate cut-paper puppet parts for Trung Nhi, matching the in-game figure: head with crown, torso, upper and lower arms, two hands with drumsticks, skirt, legs. Each piece is whole and flat, laid out with space between, joints rounded so they overlap when assembled.

### BD-R03 · Part sheet: the war elephant

Separate pieces of the war elephant for puppet rigging.

- **Spec:** 4096x4096, transparent; pieces laid out apart with space between, each with a little overlap at the joints
- **Status:** planned, not loaded yet · **Game id:** `rig-war-elephant`
- **File:** `bronze-drum/game/assets/art/rig-war-elephant.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. A sheet of separate cut-paper puppet parts for the war elephant, matching the in-game figure: head, ear, trunk in three segments, body with howdah, four legs in two segments, tail. Each piece is whole and flat, laid out with space between, joints rounded so they overlap when assembled.

### BD-R04 · Part sheet: the spearwoman

Separate pieces of the spearwoman for puppet rigging.

- **Spec:** 4096x4096, transparent; pieces laid out apart with space between, each with a little overlap at the joints
- **Status:** planned, not loaded yet · **Game id:** `rig-unit-spear`
- **File:** `bronze-drum/game/assets/art/rig-unit-spear.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. A sheet of separate cut-paper puppet parts for the spearwoman, matching the in-game figure: head with crown, torso, arms, spear, skirt, legs. Each piece is whole and flat, laid out with space between, joints rounded so they overlap when assembled.

## Interface (8)

The title logo, the drum-face HUD, chapter cards and interface pieces.

### BD-U01 · Title logo

Replaces the typeset title on the title screen. Must read at small sizes.

- **Spec:** 2048x1024, transparent
- **Status:** stand-in in the prototype · **Stand-in:** `#logo-text (CSS)` · **Game id:** `logo`
- **File:** `bronze-drum/game/assets/art/logo.png`
- **Prompt:** Game title logo in hand-cut paper: the words "BRONZE DRUM" in large, readable, slightly irregular cut letters in rice-paper cream, set over a bronze drum's sun-star and rings cut in bronze, with "TRỐNG ĐỒNG" in small spaced capitals above (keep the Vietnamese diacritics exact). Backlit glow, a soft cast shadow. Transparent background.

### BD-U02 · HUD: the drum face

The rhythm display at the bottom of the screen. The game lights four herons and the star over it, so keep those areas simple.

- **Spec:** 1024x1024, transparent outside the circle
- **Status:** stand-in in the prototype · **Stand-in:** `Renderer.hud` · **Game id:** `hud-drum`
- **File:** `bronze-drum/game/assets/art/hud-drum.png`
- **Prompt:** Top-down view of a Dong Son bronze drum face as a flat bronze paper cut-out disc: a 12-point sun-star at the centre, then bands of rings, tangential circles and zigzags, a plain ring at 80% of the radius where four herons will be overlaid, and a beaded rim. Bronze with darker bronze cut lines, even light, perfectly circular.

### BD-U03 · Drum and command glyphs

Icons for the two strokes and the five commands, for the HUD and the instructions.

- **Spec:** 2048x512, transparent; seven icons in a row on a 256 px grid
- **Status:** planned, not loaded yet · **Game id:** `ui-glyphs`
- **File:** `bronze-drum/game/assets/art/ui-glyphs.png`
- **Prompt:** A row of seven cut-paper icons on a transparent background: 1 a solid bronze disc (the centre stroke, tung); 2 a lacquer-red ring with a dot (the rim stroke, cac); 3 a foot stepping forward (march); 4 a spearhead (strike); 5 a round shield with a star (shields); 6 a raised hand with feathers (rally); 7 an elephant head (charge). Simple, bold, readable at 32 pixels.

### BD-U04 · Dialog panel

The paper sheet behind menus and dialogs, nine-sliced in the production build.

- **Spec:** 1536x1024, transparent outside the sheet
- **Status:** planned, not loaded yet · **Game id:** `ui-panel`
- **File:** `bronze-drum/game/assets/art/ui-panel.png`
- **Prompt:** A sheet of cream rice paper with a hand-cut decorative border: a band of tangential circles and small herons cut through near the edge, corners cut with a sun-star. Plain centre for text. Even light, soft fibres.

### BD-U05 · Utility icons

Instructions, Settings and Fullscreen buttons.

- **Spec:** 768x256, transparent; three icons on a 256 px grid
- **Status:** planned, not loaded yet · **Game id:** `ui-icons`
- **File:** `bronze-drum/game/assets/art/ui-icons.png`
- **Prompt:** Three cut-paper icons in rice-paper cream on a transparent background: an open scroll (instructions), a bronze drum seen from above with a small gear cut in it (settings), four corner brackets (fullscreen). Bold and simple, readable at 26 pixels.

### BD-U06 · Chapter card: The Garden at Me Linh

Background of the chapter-select card; the game lays a pale wash over it for text.

- **Spec:** 1600x900, opaque; keep the left half quiet for text
- **Status:** stand-in in the prototype · **Stand-in:** `buildCards (plain paper)` · **Game id:** `card-garden`
- **File:** `bronze-drum/game/assets/art/card-garden.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. A wide cut-paper vignette: two sisters practising with drumsticks beside a lotus pond and straw targets in a lord's garden, dawn. Main shapes on the right half, the left half mostly open sky or water.

### BD-U07 · Chapter card: The Outpost on the Hat River

Background of the chapter-select card; the game lays a pale wash over it for text.

- **Spec:** 1600x900, opaque; keep the left half quiet for text
- **Status:** stand-in in the prototype · **Stand-in:** `buildCards (plain paper)` · **Game id:** `card-outpost`
- **File:** `bronze-drum/game/assets/art/card-outpost.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. A wide cut-paper vignette: women warriors with shields advancing on a Han timber outpost across a river ford, daylight. Main shapes on the right half, the left half mostly open sky or water.

### BD-U08 · Chapter card: The Citadel at Luy Lau

Background of the chapter-select card; the game lays a pale wash over it for text.

- **Spec:** 1600x900, opaque; keep the left half quiet for text
- **Status:** stand-in in the prototype · **Stand-in:** `buildCards (plain paper)` · **Game id:** `card-luylau`
- **File:** `bronze-drum/game/assets/art/card-luylau.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. A wide cut-paper vignette: the sisters on a war elephant with a bronze drum before a walled citadel under a full moon. Main shapes on the right half, the left half mostly open sky or water.

## Effects (3)

Sprite sheets for hits, projectiles and the drum waking. The prototype draws these procedurally; the sheets are for the production build.

### BD-F01 · Paper scraps sheet

Hits and defeats burst into torn scraps of paper instead of blood.

- **Spec:** 2048x512, transparent; sixteen scraps on a 128 px grid
- **Status:** planned, not loaded yet · **Game id:** `fx-scraps`
- **File:** `bronze-drum/game/assets/art/fx-scraps.png`
- **Prompt:** Sixteen small torn and cut paper scraps on a transparent background, in cream, lacquer red, iron grey and straw: triangles, curls, leaf shapes, feather fragments. Each with a fibrous torn edge on one side and a clean knife cut on the other.

### BD-F02 · Arrows and bolts

Lac Viet arrows and Han crossbow bolts.

- **Spec:** 1024x256, transparent; four pieces in a row
- **Status:** planned, not loaded yet · **Game id:** `fx-projectiles`
- **File:** `bronze-drum/game/assets/art/fx-projectiles.png`
- **Prompt:** Four cut-paper projectiles in a row on a transparent background, all pointing right: a Lac Viet arrow with a bronze head and feather fletching, the same arrow in flight with a motion cut, a short Han crossbow bolt in iron grey, the same bolt with a motion cut.

### BD-F03 · The drum wakes

Plays when four commands chain: the drum's rings spread outward like the call in BD-M08.

- **Spec:** 2048x2048, transparent; one ring pattern, radially symmetric
- **Status:** planned, not loaded yet · **Game id:** `fx-drum-wake`
- **File:** `bronze-drum/game/assets/art/fx-drum-wake.png`
- **Prompt:** A radially symmetric burst of concentric cut-paper rings in bronze and gold on a transparent background, like the bands of a bronze drum face expanding outward: tangential circles, flying herons and a sun-star at the centre. Bright glow through the cuts.
