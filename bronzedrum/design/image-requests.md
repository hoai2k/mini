# Bronze Drum: image requests

Artwork for the Bronze Drum prototype in `bronzedrum/game/`, plus direction pieces for the look and atmosphere. Generated from `source/build_requests.py`; edit the data there and rerun it, which also rewrites `game/assets/manifest.json`.

## How to use this list

1. Generate the three **style frames** (BD-S01 to BD-S03) first and choose a direction; the rest of the list is tuned to that choice before it is generated in full.
2. Then the **inspiration and atmosphere** pieces (BD-M01 to BD-M14). They fix the look; when a later asset disagrees with them, the direction pieces win.
3. Each prompt is complete on its own: paste it as it stands. The shared style text is already included in every prompt that needs it.
4. Save each image under the file name in its **File** line and drop it in `bronzedrum/intake/` (or straight into `bronzedrum/game/assets/` and `bronzedrum/design/`). On integration the request's status flips to `delivered` and the game loads the file in place of its procedural stand-in.
5. Cutouts need transparency. If the generator cannot produce alpha, use a flat pure magenta `#FF00FF` background as the prompts say; it is keyed out on integration.

## Art direction

The game is staged as a **backlit paper-cut theatre**. Every element is a flat silhouette cut from paper, layered in depth and lit from behind: light glows through the cuts, and each layer throws a soft shadow onto the one behind it. The aim is the feeling of standing in a dark room among hanging hand-cut panels, with fire-lit, cave-like shadows.

This direction is inspired by **Sarah Nguyen**'s hand-cut paper and fibre panels: suspended, backlit, built on folklore, plants, animals and a changing moon, often about women's stories. The prompts describe those *qualities* rather than naming her, so the generated art borrows the approach without copying her pieces. If she takes part in the project, her own work replaces these direction pieces.

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
| Style frames: choose the direction first | 3 | 0 | 0 | 0 | 3 |
| Inspiration and atmosphere | 14 | 0 | 0 | 0 | 14 |
| Backgrounds | 9 | 0 | 0 | 0 | 9 |
| Characters and units | 16 | 3 | 0 | 0 | 13 |
| Puppet part sheets | 4 | 0 | 0 | 0 | 4 |
| Interface | 15 | 0 | 0 | 0 | 15 |
| Effects | 3 | 0 | 0 | 0 | 3 |
| Story chapters | 22 | 0 | 0 | 0 | 22 |
| Drum Practice | 6 | 0 | 1 | 0 | 5 |
| **total** | **92** | **3** | **1** | **0** | **88** |

## Style frames: choose the direction first (3)

Generate these three before anything else. They show the same moment (the army marching on a Han palisade at dusk, the sisters and the drum behind it) under three different treatments of the paper, so the treatment can be judged on its own. Pick one, or a mix, and the palette and the prompts below are tuned to it before the full set is generated. The prototype's stand-in currently sits closest to S02; screenshots of it are in `design/screens/`.

### BD-S01 · Style frame A: white paper and lamplight

The closest to hand-cut fibre panels in a gallery: almost no colour; depth and mood come from light, shadow and the density of the cuts.

- **Spec:** 3840x2160, opaque
- **Status:** delivered
- **File:** `bronzedrum/design/references/s01-white-paper.png`
- **Prompt:** A side-on view at dusk of a line of Lac Viet women warriors with spears and feather crowns marching right across rice paddies towards a Han timber palisade with a watchtower; behind the women, two sisters in feather crowns beat a bronze drum on a carried palanquin; limestone karst peaks and areca palms behind; a large low moon ringed by faint concentric drum rings. Wide 16:9 composition, layered in five depths. Every layer is cut from white and cream fibre paper; colour comes only from a warm amber lamp behind the scene and the cool blue shadows each layer casts on the next. Intricate snowflake-like filigree in the hills, leaves and feathers; a kaleidoscope of light and shadow. Only accents of colour: the bronze drum and a thin lacquer-red sash on each woman. Hand-cut paper art, no painterly rendering, no text.

### BD-S02 · Style frame B: coloured papers, lit from behind

The prototype's direction: each depth a different coloured sheet, night indigo to rice cream, with bronze and lacquer-red accents.

- **Spec:** 3840x2160, opaque
- **Status:** delivered
- **File:** `bronzedrum/design/references/s02-coloured-papers.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. A side-on view at dusk of a line of Lac Viet women warriors with spears and feather crowns marching right across rice paddies towards a Han timber palisade with a watchtower; behind the women, two sisters in feather crowns beat a bronze drum on a carried palanquin; limestone karst peaks and areca palms behind; a large low moon ringed by faint concentric drum rings. Wide 16:9 composition, layered in five depths.

### BD-S03 · Style frame C: shadow theatre

The boldest read at game size: solid ink silhouettes in front of glowing translucent coloured paper, like a shadow-puppet screen.

- **Spec:** 3840x2160, opaque
- **Status:** delivered
- **File:** `bronzedrum/design/references/s03-shadow-theatre.png`
- **Prompt:** A side-on view at dusk of a line of Lac Viet women warriors with spears and feather crowns marching right across rice paddies towards a Han timber palisade with a watchtower; behind the women, two sisters in feather crowns beat a bronze drum on a carried palanquin; limestone karst peaks and areca palms behind; a large low moon ringed by faint concentric drum rings. Wide 16:9 composition, layered in five depths. Every near figure and object is a solid ink-black silhouette with fine cut-out detail, set in front of a glowing screen of translucent dyed paper that shifts from amber at the horizon to deep rose and indigo above; the far hills are paler silhouettes printed on the screen. Like a Southeast Asian shadow-puppet performance lit by oil lamps. Hand-cut paper art, no painterly rendering, no text.

## Inspiration and atmosphere (14)

Direction pieces, not game assets. They fix the look, the light and the emotional range before production art is made, and every later request should agree with them. Save delivered pieces to `design/references/` under the file names given.

### BD-M01 · Key art: the sisters ride to war

The single image the game is sold on. Sets scale, hierarchy and the backlit-diorama look.

- **Spec:** 3840x2160, opaque
- **Status:** delivered
- **File:** `bronzedrum/design/references/m01-key-art.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. Key art for a game about the Trung sisters, Vietnam, 40 CE. Trung Trac and Trung Nhi ride a great war elephant into battle, both in gold armour with tall feathered crowns, beating a huge bronze drum carried in the howdah between them. Behind them an army of women with spears, bows and feather headdresses streams across rice paddies; ahead, a Han palisade citadel under a full moon. Built as a stage of five cut-paper layers, one behind another, lit from behind so the moon and the cuts glow; every layer casts a soft shadow on the one behind. The sisters are the brightest, most intricately cut shapes in the frame.

### BD-M02 · Lightbox study: suspended panels

Defines the game's depth and lighting model: how layers glow, how shadows fall, how much the cuts carry.

- **Spec:** 3840x2160, opaque
- **Status:** delivered
- **File:** `bronzedrum/design/references/m02-suspended-panels.png`
- **Prompt:** Photograph of a gallery installation in a dark room: six large hand-cut white fibre-paper panels hang from the ceiling one behind another. A single warm lamp behind the last panel throws their cut patterns as long shadows onto the floor and the near wall. The panels show, back to front: a full moon ringed with herons, limestone karst peaks, areca palms and bamboo, stilt houses, rice paddies, and a row of women warriors with feather crowns. Fire-lit, cave-like atmosphere; the paper fibres visible where the light passes through.

### BD-M03 · Dong Son motif sheet

A shared vocabulary of cut shapes, translated from the bronze drums, for every artist and every later request.

- **Spec:** 3000x3000, opaque cream ground
- **Status:** delivered
- **File:** `bronzedrum/design/references/m03-dong-son-motifs.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. Reference sheet of cut-paper motifs translated from Dong Son bronze drums, arranged in a grid on rice-paper cream: the 12-point sun-star at the drum's centre; bands of tangential circles; zigzag and ladder bands; flying long-beaked herons; feather-crowned dancers and warriors in profile; long boats with crews; deer; stilt houses with saddle roofs; the small frogs that sit on drum rims; a drummer pounding paired drums. Each motif cut as a flat ink-black silhouette with fine interior cuts.

### BD-M04 · Colour script

The palette's journey through the story, so each chapter has its own light.

- **Spec:** 4800x1600, opaque, eight panels in two rows
- **Status:** delivered
- **File:** `bronzedrum/design/references/m04-colour-script.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. A colour script of eight small cut-paper scenes in two rows of four, each a different light: 1 dawn training, rose and bronze; 2 the garden, verdigris and cream; 3 grief, deep indigo with a single lacquer-red shape; 4 casting the drums, molten bronze and orange; 5 the villages answer, cream daylight and verdigris; 6 battle on the river, slate grey and lacquer red; 7 Luy Lau at night, indigo and gold; 8 elegy, ash grey and cream with one bronze shape. Simple compositions, the colour shift readable at thumbnail size.

### BD-M05 · The sisters: character study

Fixes the two leads' silhouettes and personalities before the sprites are made.

- **Spec:** 3000x2000, opaque cream ground
- **Status:** delivered
- **File:** `bronzedrum/design/references/m05-sisters.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. Character study of two Vietnamese sisters as cut-paper figures, side by side, front view and side profile each. Trung Trac, the elder: composed and upright, bronze and gold, hair in a high knot under a crown of tall feathers, holding a drumstick still at her side; her cut patterns are ordered rings and stars. Trung Nhi, the younger: in motion, lacquer red, flowers and leaves cut into her sleeves and hair, laughing, drumstick raised; her cut patterns are vines and birds. Ancient Lac Viet dress, wrapped skirts, bead collars. Dignified, warm, not sexualised.

### BD-M06 · The garden at Me Linh

Atmosphere for chapter one: the training years, intimate and green.

- **Spec:** 3840x2160, opaque
- **Status:** delivered
- **File:** `bronzedrum/design/references/m06-garden.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. The garden of a Lac Viet lord's house at Me Linh, late afternoon, with a pale moon in the sky. Nhi sits among lotus and flowering shrubs with birds around her; across the pond, Trac practises with a spear beside straw training targets. Stilt house with a saddle roof behind. Cut-paper layers backlit by low sun, verdigris and cream, the leaves cut with fine veins.

### BD-M07 · Casting the drums

Atmosphere for the uprising's preparation: the metalworkers of Nhat Nam.

- **Spec:** 3840x2160, opaque
- **Status:** delivered
- **File:** `bronzedrum/design/references/m07-casting.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. Night in a foundry of the Nhat Nam metalworkers: molten bronze poured from crucibles into clay drum moulds stamped with the sun-star; women carry the moulds, sparks drawn as tiny cut holes letting orange light through. Finished bronze drums stacked at the side. Cut-paper layers, bronze and orange glow against ink black.

### BD-M08 · The villages answer

The drum as a call: the sound made visible. Direction for the drum-wake effect and the campaign map.

- **Spec:** 3840x2160, opaque
- **Status:** delivered
- **File:** `bronzedrum/design/references/m08-villages-answer.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. Night over the Red River delta seen from above at a low angle. The sound of a great drum spreads from the centre as concentric cut-paper rings, like the rings on a bronze drum face. In stilt villages along the river, lanterns light one by one and women come down to long boats carrying spears. Indigo, cream and bronze.

### BD-M09 · Battle on the Hat River

Atmosphere for chapter two: daylight battle, shield walls and crossbow volleys.

- **Spec:** 3840x2160, opaque
- **Status:** delivered
- **File:** `bronzedrum/design/references/m09-river-battle.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. A battle at a river ford in low daylight. Han crossbowmen in iron-grey lamellar armour stand on a wooden palisade; a wall of Lac Viet women raises round shields with star patterns cut through them as a volley of bolts arcs over, drawn as clean cut lines. Reeds and lotus in the foreground. Slate grey, cream and lacquer red.

### BD-M10 · Luy Lau at night

Atmosphere for chapter three: the climax.

- **Spec:** 3840x2160, opaque
- **Status:** delivered
- **File:** `bronzedrum/design/references/m10-luy-lau.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. The Han citadel of Luy Lau at night under a full moon. War elephants carrying the sisters and bronze drums break through the gate; gold armour and feather crowns catch the moonlight; the citadel's watchtowers are cut with lattice windows lit from within. Indigo and gold, triumphant but heavy.

### BD-M11 · Elegy: the drums melted

The ending's tone: the victory does not last. Quiet, respectful, no depiction of death.

- **Spec:** 3840x2160, opaque
- **Status:** delivered
- **File:** `bronzedrum/design/references/m11-elegy.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. Quiet aftermath. In a Han workshop, captured bronze drums lie stacked by a furnace, about to be melted down and cast into a bronze horse. Through the open door, the Hat River at dawn with lotus drifting and herons flying. Ash grey and cream with one warm bronze shape. Mournful and still.

### BD-M12 · In-game screen mock-up

Steers the production HUD and checks that the style reads at play size.

- **Spec:** 1920x1080, opaque
- **Status:** delivered
- **File:** `bronzedrum/design/references/m12-screen-mockup.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. A 16:9 video game screen in cut-paper style. Side-scrolling battlefield: a line of women warriors on the left marches right towards Han soldiers and a palisade on the right; behind the women, two sisters stand on a palanquin with a bronze drum. Bottom centre, a round bronze drum face with rings, four herons and a central star as the rhythm display. Bottom left, a small panel listing four drum commands as rows of dots. Top left and top right, thin strength bars. Plenty of empty space around the interface.

### BD-M13 · Army of women: costume line-up

The unit types and their silhouettes, readable at small sizes.

- **Spec:** 4000x2000, opaque cream ground
- **Status:** delivered
- **File:** `bronzedrum/design/references/m13-army-lineup.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. Costume line-up of a Lac Viet women's army, ancient Vietnam, as flat cut-paper figures in profile facing right, all at the same scale: spearwoman, archer with a crossbow, shield bearer with a round star-cut shield, drum bearer, standard bearer, mountain archer with a longbow. Feather crowns of different heights, wrapped skirts, bead collars, lacquer-red sashes. Each silhouette distinct.

### BD-M14 · Han forces: line-up

The opposing side, dignified and specific to the Eastern Han, never caricatured.

- **Spec:** 4000x2000, opaque cream ground
- **Status:** delivered
- **File:** `bronzedrum/design/references/m14-han-lineup.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. Line-up of Eastern Han Chinese soldiers, 1st century, as flat cut-paper figures in profile facing left, at one scale: spearman with a ji halberd, kneeling crossbowman, officer with a banner, the provincial governor in robes and a scholar's cap. Lamellar armour shown as rows of small cut slots, iron grey and black. Ordinary, human faces; no caricature.

## Backgrounds (9)

One sky per chapter and four parallax strips. The game draws each strip at the full 720-pixel screen height, so composition is given as a fraction of the image height. The ground line sits at 69% of the height; the band below it holds the drum HUD.

### BD-B01 · Sky: dawn

Chapter one, the garden at Me Linh. The furthest backdrop; everything else is layered over it.

- **Spec:** 2560x1440, opaque; keep the lower third plain, it is covered by hills
- **Status:** delivered · **Stand-in:** `Renderer.buildSky` · **Game id:** `sky-dawn`
- **File:** `bronzedrum/game/assets/art/sky-dawn.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. Backdrop of a dawn sky: indigo at the top, rose in the middle, warm bronze near the horizon; the sun as a cut 12-point star low on the right with a glowing halo; a few long scalloped paper clouds. Sky only, no land.

### BD-B02 · Sky: day

Chapter two, the Hat River. The furthest backdrop; everything else is layered over it.

- **Spec:** 2560x1440, opaque; keep the lower third plain, it is covered by hills
- **Status:** delivered · **Stand-in:** `Renderer.buildSky` · **Game id:** `sky-day`
- **File:** `bronzedrum/game/assets/art/sky-day.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. Backdrop of a hazy daylight sky: pale verdigris at the top fading to cream at the horizon; the sun as a cut 12-point star at upper right; long scalloped paper clouds. Sky only, no land.

### BD-B03 · Sky: night

Chapter three, Luy Lau. The furthest backdrop; everything else is layered over it.

- **Spec:** 2560x1440, opaque; keep the lower third plain, it is covered by hills
- **Status:** delivered · **Stand-in:** `Renderer.buildSky` · **Game id:** `sky-night`
- **File:** `bronzedrum/game/assets/art/sky-night.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. Backdrop of a night sky: deep indigo, a large full moon at upper right with crater shapes cut out of it, a scatter of small stars, a few long indigo paper clouds. Sky only, no land.

### BD-B04 · Far layer: karst peaks

The far hills, moving at 15% of the camera speed.

- **Spec:** 5120x1440. Peaks between 10% and 60% of the height; the base solid to the bottom edge. Seamless horizontally: the left and right edges must join with no visible seam. Transparent above the silhouette (PNG with alpha); the game layers it over the sky.
- **Status:** delivered · **Stand-in:** `Renderer.buildKarst` · **Game id:** `layer-karst`
- **File:** `bronzedrum/game/assets/art/layer-karst.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. A long horizontal strip of steep limestone karst peaks with rounded tops, cut from one sheet of paper in a single muted indigo-violet, with thin mist bands and small flying herons cut out of it so the light shows through. Flat silhouette, no interior shading.

### BD-B09 · Farthest layer: pale karst peaks

A paler, lower row of peaks behind BD-B04, moving at 7% of the camera speed, so the hills read in two depths.

- **Spec:** 5120x1440. Peaks between 25% and 52% of the height; the base solid to the bottom edge. Seamless horizontally: the left and right edges must join with no visible seam. Transparent above the silhouette (PNG with alpha); the game layers it over the sky.
- **Status:** delivered · **Stand-in:** `Renderer.buildKarst(far)` · **Game id:** `layer-karst-far`
- **File:** `bronzedrum/game/assets/art/layer-karst-far.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. A long horizontal strip of distant limestone karst peaks with rounded tops, cut from one pale, misty violet-grey sheet that lets a lot of light through, with a dotted seam of tiny cut holes following the inside of each peak and thin mist bands cut across.

### BD-B05 · Middle layer: palms, bamboo, stilt houses

The middle distance, moving at 45% of the camera speed.

- **Spec:** 5120x1440. Tree bases on a solid band at 63-71% of the height; tallest crowns at about 25%. Seamless horizontally: the left and right edges must join with no visible seam. Transparent above the silhouette (PNG with alpha); the game layers it over the sky.
- **Status:** delivered · **Stand-in:** `Renderer.buildGrove` · **Game id:** `layer-grove`
- **File:** `bronzedrum/game/assets/art/layer-grove.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. A long horizontal strip of areca palms, clumps of bamboo and stilt houses with saddle-shaped roofs like those on Dong Son drums, cut from one dark indigo-green sheet; leaf veins and lattice windows cut out so the light shows through.

### BD-B06 · Ground layer: rice paddies

The ground the armies stand on.

- **Spec:** 5120x1440. Top edge a gentle scalloped line at 69% of the height; solid below, with the water slits kept faint so the HUD reads over it. Seamless horizontally: the left and right edges must join with no visible seam. Transparent above the silhouette (PNG with alpha); the game layers it over the sky.
- **Status:** delivered · **Stand-in:** `Renderer.buildPaddy` · **Game id:** `layer-paddy`
- **File:** `bronzedrum/game/assets/art/layer-paddy.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. A long horizontal strip of flooded rice paddies seen from the side, one dark sheet with a softly scalloped top edge; rows of thin horizontal slits cut through it suggest water catching light between rows of rice.

### BD-B07 · Foreground layer: reeds and lotus

The nearest layer, in front of the armies, moving at 125% of the camera speed.

- **Spec:** 5120x1440. Reeds rising from the bottom edge up to about 25% of the height; sparse enough that most of the bottom stays open. Seamless horizontally: the left and right edges must join with no visible seam. Transparent above the silhouette (PNG with alpha); the game layers it over the sky.
- **Status:** delivered · **Stand-in:** `Renderer.buildReeds` · **Game id:** `layer-reeds`
- **File:** `bronzedrum/game/assets/art/layer-reeds.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. A long horizontal strip of reeds, grasses and lotus pads rising from the bottom edge, ink-black silhouettes with very fine cut detail, sparse with gaps between clumps.

### BD-B08 · Paper fibre texture

Laid over the whole screen at low opacity, so the scene reads as one sheet of paper.

- **Spec:** 1024x1024, opaque, tileable in both directions
- **Status:** delivered · **Stand-in:** `fiberTexture` · **Game id:** `paper-fiber`
- **File:** `bronzedrum/game/assets/art/paper-fiber.png`
- **Prompt:** Seamless tileable texture of handmade mulberry rice paper lit from behind: warm cream, long pale fibres and a few darker flecks, even lighting, no folds, no shadows, no objects.

## Characters and units (16)

In-game cutouts. Lac Viet figures face right (the direction of the march); Han figures face left. The game scales each sprite to a fixed on-screen height, given in the spec, and adds the backlit shadow itself.

### BD-C01 · Trung Trac, drumming

The elder sister at the drum: plays the deep centre stroke (tung). Shown 96 px tall.

- **Spec:** 1024x1536. Single cut-paper figure, side profile, full body, feet on the bottom edge, centred, transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow: the game adds its own shadow.
- **Status:** delivered · **Stand-in:** `Renderer.sisters` · **Game id:** `sister-trac`
- **File:** `bronzedrum/game/assets/art/sister-trac.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. Trung Trac, a Lac Viet noblewoman and war leader, standing in profile facing right, both hands gripping a long drumstick raised for a strike. Gold armour of small plates over a wrapped skirt, a tall crown of feathers, hair in a high knot. Composed and upright. Bronze and ink-black paper, her armour cut with rings and small stars.

### BD-C02 · Trung Nhi, drumming

The younger sister at the drum: plays the rim stroke (cac) and the off-beat flourishes. Shown 96 px tall.

- **Spec:** 1024x1536. Single cut-paper figure, side profile, full body, feet on the bottom edge, centred, transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow: the game adds its own shadow.
- **Status:** delivered · **Stand-in:** `Renderer.sisters` · **Game id:** `sister-nhi`
- **File:** `bronzedrum/game/assets/art/sister-nhi.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. Trung Nhi, a young Lac Viet war leader, in profile facing right, mid-swing with a short drumstick in each hand, body turning with energy. Gold armour over a lacquer-red wrapped skirt, a crown of feathers with flowers tucked in, vines and birds cut into her sleeves. Lively and fierce.

### BD-C03 · War elephant with howdah

Chapter three: the sisters ride it with the great drum. The game draws the sisters and drum on top, so the howdah is empty. Shown 230 px tall.

- **Spec:** 2048x1536. Empty howdah floor at about 70% of the height above the feet, centred slightly behind the middle. Single cut-paper figure, side profile, full body, feet on the bottom edge, centred, transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow: the game adds its own shadow.
- **Status:** delivered · **Stand-in:** `Renderer.elephant` · **Game id:** `war-elephant`
- **File:** `bronzedrum/game/assets/art/war-elephant.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. An Asian war elephant walking right in profile, an empty open howdah with a lacquer-red rail on its back, a caparison cut with concentric rings and a sun-star, tusks and trunk curled forward. Ink-black paper with red and bronze inlays.

### BD-C04 · The drum on its palanquin

Chapters one and two: four women carry the bronze drum on a low platform; the sisters stand on its deck (drawn separately). Shown 150 px tall.

- **Spec:** 2048x1024. Platform deck at about 35% of the height. Single cut-paper figure, side profile, full body, feet on the bottom edge, centred, transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow: the game adds its own shadow.
- **Status:** delivered · **Stand-in:** `Renderer.drumCrew` · **Game id:** `drum-bearers`
- **File:** `bronzedrum/game/assets/art/drum-bearers.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. Four Lac Viet women in feather crowns carry a low wooden palanquin on poles, walking right; on it sits a large bronze drum, its side banded with rings and its top a sun-star. The deck is empty apart from the drum. Ink-black figures, a bronze drum.

### BD-C14 · The drum palanquin with room for the sisters

Replaces BD-C04 in the battle chapters. The sisters ride with the drum and beat it: the game draws them separately (Trưng Trắc as a jointed puppet, Trưng Nhị as a cut-out, each about half the palanquin's height) standing on the deck at the two ends, so their arms can move on every stroke. BD-C04's deck is filled by the drum, so they had nowhere to stand and read as floating; until this arrives they walk on the ground beside the bearers. Shown 190 px tall; the bearers walk, so keep their legs in a mid stride.

- **Spec:** 2400x1200, transparent. The deck's top is one straight, level line at exactly 42% of the height measured up from the bottom edge (58% down from the top), spanning the middle 80% of the width. The drum sits on the deck in the middle third. Two empty standing places on the deck, centred at 22% and 78% of the width and each about 16% wide, with nothing drawn above the deck there (no railing taller than 3% of the height, no canopy, no posts). Four bearers carry the poles on their shoulders, the poles just under the deck, their feet on the bottom edge. One cut-paper group, side profile, full bodies, feet on the bottom edge, centred, transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow: the game adds its own shadow.
- **Status:** delivered · **Stand-in:** `Renderer.drumCrew (the sisters walk beside BD-C04)` · **Game id:** `drum-palanquin`
- **File:** `bronzedrum/game/assets/art/drum-palanquin.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. A long, low ceremonial wooden palanquin carried on two poles by four Lac Viet women in feather crowns, walking right, the poles on their shoulders. On its flat deck, in the middle, a large Dong Son bronze drum banded with rings, its top a sun-star. The two ends of the deck are empty and level, room for two people to stand and drum. The deck's edge is carved with a band of herons and boats in cut detail. Ink-black bearers and wood, a warm bronze drum.

### BD-C11 · Companion drummer: the barrel drum

Walks with the drum crew, just in front of the palanquin. When the shields go up she strikes her drum and the game shakes the whole figure. Shown 88 px tall, so keep the shapes bold.

- **Spec:** 1024x1536. Single cut-paper figure, side profile, full body, feet on the bottom edge, centred, transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow: the game adds its own shadow.
- **Status:** delivered · **Stand-in:** `Renderer.companions` · **Game id:** `drummer-chau`
- **File:** `bronzedrum/game/assets/art/drummer-chau.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. A Lac Viet woman drummer walking in profile facing right, a trống chầu slung at her hip on a strap: a small barrel drum lacquered red with a bronze band, its pale buffalo-hide head facing forward. Her right hand raises a wooden beater with a red tip. Short feather crown, wrapped skirt, a lacquer-red sash. Ink-black silhouette with fine cut details in the feathers.

### BD-C12 · Companion drummer: the mõ

Walks beside the barrel drummer. When the rhythm is reset she knocks her mõ and the game shakes the whole figure. Shown 84 px tall.

- **Spec:** 1024x1536. Single cut-paper figure, side profile, full body, feet on the bottom edge, centred, transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow: the game adds its own shadow.
- **Status:** delivered · **Stand-in:** `Renderer.companions` · **Game id:** `drummer-mo`
- **File:** `bronzedrum/game/assets/art/drummer-mo.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. A Lac Viet woman walking in profile facing right, holding out a mõ in her left hand: a small round wooden slit drum of dark polished wood with a long slit cut across its front. Her right hand lifts a short wooden mallet. Short feather crown, wrapped skirt, a lacquer-red sash. Ink-black silhouette with the mõ in warm brown, fine cut details in the feathers.

### BD-C05 · Spearwoman

The front line. Shown 92 px tall; the game bobs, levels and tilts it for march and strike.

- **Spec:** 1024x1536. Spear held upright. Single cut-paper figure, side profile, full body, feet on the bottom edge, centred, transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow: the game adds its own shadow.
- **Status:** delivered · **Stand-in:** `Renderer.warrior` · **Game id:** `unit-spear`
- **File:** `bronzedrum/game/assets/art/unit-spear.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. A Lac Viet woman warrior in profile facing right, holding a long bronze-headed spear upright, a feather crown fanning backwards, wrapped skirt, a lacquer-red sash. Ink-black silhouette with fine cut details in the feathers.

### BD-C06 · Archer

The back line. Shown 92 px tall.

- **Spec:** 1024x1536. Single cut-paper figure, side profile, full body, feet on the bottom edge, centred, transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow: the game adds its own shadow.
- **Status:** delivered · **Stand-in:** `Renderer.warrior` · **Game id:** `unit-archer`
- **File:** `bronzedrum/game/assets/art/unit-archer.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. A Lac Viet woman archer in profile facing right, drawing a bow, a short feather crown, quiver on her back, a lacquer-red sash. Ink-black silhouette with fine cut details.

### BD-C15 · Village children throwing stones

The first chapter's lesson in blocking: two children run in from the right, stop a little way ahead of the women and lob small stones at them until the player blocks, then run off the way they came (the game flips them). The game draws the stones. Shown 74 px tall, so keep the shapes bold and the poses easy to read.

- **Spec:** 1536x1024, transparent; a grid of 4 columns (poses) by 2 rows (children), 384x512 cells, each child standing on the bottom of its cell, facing LEFT, centred. Columns: 1 running, one leg forward; 2 running, the other leg forward; 3 one arm drawn far back with a stone in the hand; 4 the throw, arm flung forward, hand open. Row 1 a boy with a shaved head and a topknot, in a loincloth; row 2 a girl with her hair in two short tufts, in a wrapped skirt. Same scale in every cell. transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow: the game adds its own shadow.
- **Status:** stand-in in the prototype · **Stand-in:** `Renderer.child (drawn children)` · **Game id:** `children-sheet`
- **File:** `bronzedrum/game/assets/art/children-sheet.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. A sprite sheet of two cheeky Lạc Việt village children, about seven years old, in profile facing left, on a grid of 4 columns by 2 rows: row 1 a barefoot boy with a shaved head and a little topknot, in a loincloth; row 2 a barefoot girl with two short tufts of hair, in a wrapped skirt with a lacquer-red sash. Columns: running with one leg forward; running with the other leg forward; winding up with one arm drawn far back, a small stone in the hand; the throw, arm flung forward, hand open. Ink-black silhouettes with fine cut details, mischievous rather than menacing.

### BD-C16 · Spearwoman covering her face

The spearwoman of BD-C05 blocking the children's stones in the first chapter: shown in place of her usual figure while the player holds the block (A). Shown 92 px tall, the same size and stance as BD-C05, so the two can swap without a jump.

- **Spec:** 1024x1536. Single cut-paper figure, side profile, full body, feet on the bottom edge, centred, transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow: the game adds its own shadow.
- **Status:** stand-in in the prototype · **Stand-in:** `Renderer.warrior (a drawn forearm)` · **Game id:** `unit-spear-cover`
- **File:** `bronzedrum/game/assets/art/unit-spear-cover.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. The same Lac Viet woman as BD-C05, in profile facing right, standing as in BD-C05 but flinching from thrown stones: her spear held upright in her right hand, her left forearm raised across her face, elbow out, head ducked behind it. Feather crown, wrapped skirt, a lacquer-red sash. Ink-black silhouette with fine cut details in the feathers.

### BD-C17 · Archer covering her face

The archer of BD-C06 blocking the children's stones in the first chapter: shown in place of her usual figure while the player holds the block (A). Shown 92 px tall, the same size and stance as BD-C06, so the two can swap without a jump.

- **Spec:** 1024x1536. Single cut-paper figure, side profile, full body, feet on the bottom edge, centred, transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow: the game adds its own shadow.
- **Status:** stand-in in the prototype · **Stand-in:** `Renderer.warrior (a drawn forearm)` · **Game id:** `unit-archer-cover`
- **File:** `bronzedrum/game/assets/art/unit-archer-cover.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. The same Lac Viet woman as BD-C06, in profile facing right, standing as in BD-C06 but flinching from thrown stones: her bow lowered in her left hand, her right forearm raised across her face, elbow out, head ducked behind it. Feather crown, wrapped skirt, a lacquer-red sash. Ink-black silhouette with fine cut details in the feathers.

### BD-C07 · Han spearman

Advances and attacks at close range. Shown 96 px tall.

- **Spec:** 1024x1536. Faces left. Single cut-paper figure, side profile, full body, feet on the bottom edge, centred, transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow: the game adds its own shadow.
- **Status:** delivered · **Stand-in:** `Renderer.hanSoldier` · **Game id:** `han-spear`
- **File:** `bronzedrum/game/assets/art/han-spear.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. An Eastern Han Chinese soldier, 1st century, in profile facing left, holding a ji halberd upright, lamellar armour shown as rows of small cut slots, a soft cap. Iron grey and dark grey paper. An ordinary soldier, no caricature.

### BD-C08 · Han crossbowman

Fires a bolt every measure from range. Shown 96 px tall.

- **Spec:** 1024x1536. Faces left. Single cut-paper figure, side profile, full body, feet on the bottom edge, centred, transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow: the game adds its own shadow.
- **Status:** delivered · **Stand-in:** `Renderer.hanSoldier` · **Game id:** `han-crossbow`
- **File:** `bronzedrum/game/assets/art/han-crossbow.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. An Eastern Han Chinese crossbowman, 1st century, kneeling in profile facing left, aiming a bronze-triggered crossbow, lamellar armour as rows of small cut slots. Iron grey and dark grey paper, no caricature.

### BD-C09 · Han palisade fort

The goal of chapters two and three. Shown 300 px tall; the game tears pieces out as it takes damage.

- **Spec:** 2048x2048. Gate on the left side, facing the army. Single cut-paper structure, side view, base on the bottom edge, centred, transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow: the game adds its own shadow.
- **Status:** delivered · **Stand-in:** `Renderer.fort` · **Game id:** `fort-palisade`
- **File:** `bronzedrum/game/assets/art/fort-palisade.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. A Han frontier fort seen from the side: a wall of pointed timber stakes, a gate on the left, a two-storey watchtower with a tiled roof and a pennant, lattice windows cut through. Dark iron-grey paper.

### BD-C10 · Straw training target

Chapter one's goal. Shown 110 px tall.

- **Spec:** 1024x1024. Single cut-paper object, side view, base on the bottom edge, centred, transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow: the game adds its own shadow.
- **Status:** delivered · **Stand-in:** `Renderer.target` · **Game id:** `straw-target`
- **File:** `bronzedrum/game/assets/art/straw-target.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. A straw training dummy on a wooden post with a crossbar, bound with rope in three places. Straw-coloured paper with ink-black post and ropes.

## Puppet part sheets (4)

The same figures split into separate pieces so they can be rigged and animated like shadow puppets. `design/source/build_rigs.py` cuts the sisters' sheets (BD-R01, BD-R02) into the jointed puppets that beat the drum in the game; the elephant and the spearwoman are not rigged yet.

### BD-R01 · Part sheet: Trung Trac

Separate pieces of Trung Trac for puppet rigging.

- **Spec:** 4096x4096, transparent; pieces laid out apart with space between, each with a little overlap at the joints
- **Status:** delivered · **Game id:** `rig-sister-trac`
- **File:** `bronzedrum/game/assets/art/rig-sister-trac.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. A sheet of separate cut-paper puppet parts for Trung Trac, matching the in-game figure: head with crown, torso, upper and lower arms, hands with drumstick, skirt, legs. Each piece is whole and flat, laid out with space between, joints rounded so they overlap when assembled.

### BD-R02 · Part sheet: Trung Nhi

Separate pieces of Trung Nhi for puppet rigging.

- **Spec:** 4096x4096, transparent; pieces laid out apart with space between, each with a little overlap at the joints
- **Status:** delivered · **Game id:** `rig-sister-nhi`
- **File:** `bronzedrum/game/assets/art/rig-sister-nhi.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. A sheet of separate cut-paper puppet parts for Trung Nhi, matching the in-game figure: head with crown, torso, upper and lower arms, two hands with drumsticks, skirt, legs. Each piece is whole and flat, laid out with space between, joints rounded so they overlap when assembled.

### BD-R03 · Part sheet: the war elephant

Separate pieces of the war elephant for puppet rigging.

- **Spec:** 4096x4096, transparent; pieces laid out apart with space between, each with a little overlap at the joints
- **Status:** delivered · **Game id:** `rig-war-elephant`
- **File:** `bronzedrum/game/assets/art/rig-war-elephant.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. A sheet of separate cut-paper puppet parts for the war elephant, matching the in-game figure: head, ear, trunk in three segments, body with howdah, four legs in two segments, tail. Each piece is whole and flat, laid out with space between, joints rounded so they overlap when assembled.

### BD-R04 · Part sheet: the spearwoman

Separate pieces of the spearwoman for puppet rigging.

- **Spec:** 4096x4096, transparent; pieces laid out apart with space between, each with a little overlap at the joints
- **Status:** delivered · **Game id:** `rig-unit-spear`
- **File:** `bronzedrum/game/assets/art/rig-unit-spear.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. A sheet of separate cut-paper puppet parts for the spearwoman, matching the in-game figure: head with crown, torso, arms, spear, skirt, legs. Each piece is whole and flat, laid out with space between, joints rounded so they overlap when assembled.

## Interface (15)

The title logo, the drum-face HUD, chapter cards and interface pieces.

### BD-U01 · Title logo

Replaces the typeset title on the title screen. Must read at small sizes.

- **Spec:** 2048x1024, transparent
- **Status:** delivered · **Stand-in:** `#logo-text (CSS)` · **Game id:** `logo`
- **File:** `bronzedrum/game/assets/art/logo.png`
- **Prompt:** Game title logo in hand-cut paper: the words "BRONZE DRUM" in large, readable, slightly irregular cut letters in rice-paper cream, set over a bronze drum's sun-star and rings cut in bronze, with "TRỐNG ĐỒNG" in small spaced capitals above (keep the Vietnamese diacritics exact). Backlit glow, a soft cast shadow. Transparent background.

### BD-U02 · HUD: the drum face

The rhythm display at the bottom of the screen. The game lights four herons and the star over it, so keep those areas simple.

- **Spec:** 1024x1024, transparent outside the circle
- **Status:** delivered · **Stand-in:** `Renderer.hud` · **Game id:** `hud-drum`
- **File:** `bronzedrum/game/assets/art/hud-drum.png`
- **Prompt:** Top-down view of a Dong Son bronze drum face as a flat bronze paper cut-out disc: a 12-point sun-star at the centre, then bands of rings, tangential circles and zigzags, a plain ring at 80% of the radius where four herons will be overlaid, and a beaded rim. Bronze with darker bronze cut lines, even light, perfectly circular.

### BD-U03 · Drum and command glyphs

Icons for the two strokes and the five commands, for the HUD and the instructions.

- **Spec:** 2048x512, transparent; seven icons in a row on a 256 px grid
- **Status:** delivered · **Game id:** `ui-glyphs`
- **File:** `bronzedrum/game/assets/art/ui-glyphs.png`
- **Prompt:** A row of seven cut-paper icons on a transparent background: 1 a solid bronze disc (the centre stroke, tung); 2 a lacquer-red ring with a dot (the rim stroke, cac); 3 a foot stepping forward (march); 4 a spearhead (strike); 5 a round shield with a star (shields); 6 a raised hand with feathers (rally); 7 an elephant head (charge). Simple, bold, readable at 32 pixels.

### BD-U04 · Dialog panel

The paper sheet behind the pause menu and the other dialogs, nine-sliced so the cut border keeps its shape at any size.

- **Spec:** 1536x1024, transparent outside the sheet
- **Status:** delivered · **Stand-in:** `CSS .panel (plain paper)` · **Game id:** `ui-panel`
- **File:** `bronzedrum/game/assets/art/ui-panel.png`
- **Prompt:** A sheet of cream rice paper with a hand-cut decorative border: a band of tangential circles and small herons cut through near the edge, corners cut with a sun-star. Plain centre for text. Even light, soft fibres.

### BD-U05 · Utility icons

Instructions, Settings and Fullscreen buttons.

- **Spec:** 768x256, transparent; three icons on a 256 px grid
- **Status:** delivered · **Game id:** `ui-icons`
- **File:** `bronzedrum/game/assets/art/ui-icons.png`
- **Prompt:** Three cut-paper icons in rice-paper cream on a transparent background: an open scroll (instructions), a bronze drum seen from above with a small gear cut in it (settings), four corner brackets (fullscreen). Bold and simple, readable at 26 pixels.

### BD-U20 · Close-up stick: Trắc's beater (the centre)

Over the HUD drum, Trưng Trắc's forearm and beater swing in from the bottom left and land on the sun-star at the centre on every deep stroke (tùng), then lift away. Drawn about 1.8 times the drum's radius from wrist to head: about 105 px over the desktop drum, 180 px over the big touch drum.

- **Spec:** 1024x1024, transparent (or flat magenta #FF00FF, keyed out). One forearm and stick on the diagonal: the forearm leaves the image at the bottom-left corner, cut off clean by the edge; the wrist sits at 22% across and 78% down; the centre of the stick's striking head sits at 80% across and 20% down. The game turns it about the wrist and lands the head on the drum, so keep those three points where they are given.
- **Status:** delivered · **Stand-in:** `Renderer.standinStick` · **Game id:** `hud-stick-trac`
- **File:** `bronzedrum/game/assets/art/hud-stick-trac.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. A close-up of one woman's forearm and hand gripping a heavy wooden drum beater, seen from just behind her shoulder, matching Trưng Trắc's puppet (BD-R01): cream skin, a wide cuff of bronze and gold bands cut with dots and diamonds at the wrist, the edge of a black and bronze sleeve where the forearm leaves the image at the bottom-left corner. The beater is a stout dark wooden shaft with a flat round padded head wrapped in bronze-brown cloth, pointing to the upper right. Cut paper with crisp edges, lit from behind, a soft glow along the rim. No drum, nothing else in the image.

### BD-U21 · Close-up stick: Nhị's stick (the rim)

Over the HUD drum, Trưng Nhị's forearm and stick swing in from the right and strike the rim on every high stroke (cắc), then lift away. Drawn at the same size as BD-U20.

- **Spec:** 1024x1024, transparent (or flat magenta #FF00FF, keyed out). One forearm and stick on the diagonal: the forearm leaves the image at the bottom-right corner, cut off clean by the edge; the wrist sits at 78% across and 78% down; the centre of the stick's striking head sits at 20% across and 20% down. The game turns it about the wrist and lands the head on the drum, so keep those three points where they are given.
- **Status:** delivered · **Stand-in:** `Renderer.standinStick` · **Game id:** `hud-stick-nhi`
- **File:** `bronzedrum/game/assets/art/hud-stick-nhi.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. A close-up of one woman's forearm and hand gripping a slender wooden drumstick, seen from just behind her shoulder, matching Trưng Nhị's puppet (BD-R02): cream skin, a brown and gold cuff cut with a row of cream diamonds at the wrist, a lacquer-red sleeve cut with white leaves where the forearm leaves the image at the bottom-right corner. The stick is a thin dark wooden rod ending in a small round polished wooden knob, pointing to the upper left. Cut paper with crisp edges, lit from behind, a soft glow along the rim. No drum, nothing else in the image.

### BD-U22 · Close-up stick, another kind: Trắc's pestle

An alternative to BD-U20, drawn and animated the same way: the player picks a pair under Settings, Drumsticks (Folk: BD-U22 and BD-U24; Ceremonial: BD-U23 and BD-U25).

- **Spec:** 1024x1024, transparent (or flat magenta #FF00FF, keyed out). One forearm and stick on the diagonal: the forearm leaves the image at the bottom-left corner, cut off clean by the edge; the wrist sits at 22% across and 78% down; the centre of the stick's striking head sits at 80% across and 20% down. The game turns it about the wrist and lands the head on the drum, so keep those three points where they are given.
- **Status:** delivered · **Stand-in:** `Renderer.standinStick` · **Game id:** `hud-stick-trac-pestle`
- **File:** `bronzedrum/game/assets/art/hud-stick-trac-pestle.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. A close-up of one woman's forearm and hand gripping a drumstick, seen from just behind her shoulder, matching Trưng Trắc's puppet (BD-R01): cream skin, a wide cuff of bronze and gold bands at the wrist, the edge of a black and bronze sleeve where the forearm leaves the image at the bottom-left corner. The stick is a long plain wooden pole like a rice pestle, thick and smooth with a rounded blunt end, the way drummers on the Đông Sơn drum friezes strike their drums, pointing to the upper right. Cut paper with crisp edges, lit from behind, a soft glow along the rim. No drum, nothing else in the image.

### BD-U23 · Close-up stick, another kind: Trắc's lacquer

An alternative to BD-U20, drawn and animated the same way: the player picks a pair under Settings, Drumsticks (Folk: BD-U22 and BD-U24; Ceremonial: BD-U23 and BD-U25).

- **Spec:** 1024x1024, transparent (or flat magenta #FF00FF, keyed out). One forearm and stick on the diagonal: the forearm leaves the image at the bottom-left corner, cut off clean by the edge; the wrist sits at 22% across and 78% down; the centre of the stick's striking head sits at 80% across and 20% down. The game turns it about the wrist and lands the head on the drum, so keep those three points where they are given.
- **Status:** delivered · **Stand-in:** `Renderer.standinStick` · **Game id:** `hud-stick-trac-lacquer`
- **File:** `bronzedrum/game/assets/art/hud-stick-trac-lacquer.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. A close-up of one woman's forearm and hand gripping a drumstick, seen from just behind her shoulder, matching Trưng Trắc's puppet (BD-R01): cream skin, a wide cuff of bronze and gold bands at the wrist, the edge of a black and bronze sleeve where the forearm leaves the image at the bottom-left corner. The stick is a ceremonial beater with a lacquer-red shaft banded in gold, and a round head wrapped in cream cloth tied with red cord, pointing to the upper right. Cut paper with crisp edges, lit from behind, a soft glow along the rim. No drum, nothing else in the image.

### BD-U24 · Close-up stick, another kind: Nhị's bamboo

An alternative to BD-U21, drawn and animated the same way: the player picks a pair under Settings, Drumsticks (Folk: BD-U22 and BD-U24; Ceremonial: BD-U23 and BD-U25).

- **Spec:** 1024x1024, transparent (or flat magenta #FF00FF, keyed out). One forearm and stick on the diagonal: the forearm leaves the image at the bottom-right corner, cut off clean by the edge; the wrist sits at 78% across and 78% down; the centre of the stick's striking head sits at 20% across and 20% down. The game turns it about the wrist and lands the head on the drum, so keep those three points where they are given.
- **Status:** delivered · **Stand-in:** `Renderer.standinStick` · **Game id:** `hud-stick-nhi-bamboo`
- **File:** `bronzedrum/game/assets/art/hud-stick-nhi-bamboo.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. A close-up of one woman's forearm and hand gripping a drumstick, seen from just behind her shoulder, matching Trưng Nhị's puppet (BD-R02): cream skin, a brown and gold cuff cut with cream diamonds at the wrist, a lacquer-red sleeve cut with white leaves where the forearm leaves the image at the bottom-right corner. The stick is a slim stick of pale split bamboo with its nodes showing, the tip bound with a few turns of red thread, pointing to the upper left. Cut paper with crisp edges, lit from behind, a soft glow along the rim. No drum, nothing else in the image.

### BD-U25 · Close-up stick, another kind: Nhị's horn

An alternative to BD-U21, drawn and animated the same way: the player picks a pair under Settings, Drumsticks (Folk: BD-U22 and BD-U24; Ceremonial: BD-U23 and BD-U25).

- **Spec:** 1024x1024, transparent (or flat magenta #FF00FF, keyed out). One forearm and stick on the diagonal: the forearm leaves the image at the bottom-right corner, cut off clean by the edge; the wrist sits at 78% across and 78% down; the centre of the stick's striking head sits at 20% across and 20% down. The game turns it about the wrist and lands the head on the drum, so keep those three points where they are given.
- **Status:** delivered · **Stand-in:** `Renderer.standinStick` · **Game id:** `hud-stick-nhi-horn`
- **File:** `bronzedrum/game/assets/art/hud-stick-nhi-horn.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. A close-up of one woman's forearm and hand gripping a drumstick, seen from just behind her shoulder, matching Trưng Nhị's puppet (BD-R02): cream skin, a brown and gold cuff cut with cream diamonds at the wrist, a lacquer-red sleeve cut with white leaves where the forearm leaves the image at the bottom-right corner. The stick is a dark hardwood stick with a small polished buffalo-horn tip, a tassel of red thread hanging from the grip, pointing to the upper left. Cut paper with crisp edges, lit from behind, a soft glow along the rim. No drum, nothing else in the image.

### BD-U16 · Touch buttons: the companion drums

On phones and tablets the game draws on-screen buttons beside the big touch drum, made as the instruments that accompany a bronze drum in a temple or village hall. The shield is a trống chầu barrel drum (bottom right, drawn about 150 px across). Reset is a mõ wooden slit drum (next to it, about 75 px). Pause is a small plain disc at the top. The game adds the glow, the press animation and the labels, so draw each one at rest with nothing written on it.

- **Spec:** 768x256, transparent; three pieces on a 256 px grid, each centred and filling about 90% of its cell
- **Status:** delivered · **Stand-in:** `Renderer.chauDrum / moDrum` · **Game id:** `touch-buttons`
- **File:** `bronzedrum/game/assets/art/touch-buttons.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. Three cut-paper objects in a row on a transparent background, each centred in its third. 1: a trống chầu, a Vietnamese barrel drum with a buffalo-hide head, seen from the front and a little above so the round cream hide head fills most of the piece. The head has a red painted disc with a small sun-star at its centre and a ring of bronze tacks round its edge. The barrel below is lacquered red with a bronze band, and a wooden beater with a red tip rests across the top right. 2: a mõ, a round wooden slit drum from a pagoda, squat and a little wider than tall, in dark polished brown wood. A long curved slit is cut across its front like a mouth, and it sits on a small red cushion with a short wooden mallet leaning on it. 3: a plain round disc of dark indigo paper with a beaded bronze rim and two upright cream bars cut in the middle (pause). Flat even light, soft shadow under each, bold shapes that read at 48 pixels.

### BD-U06 · Chapter card: The Garden at Me Linh

Background of the chapter-select card; the game lays a pale wash over it for text.

- **Spec:** 1600x900, opaque; keep the left half quiet for text
- **Status:** delivered · **Stand-in:** `buildCards (plain paper)` · **Game id:** `card-garden`
- **File:** `bronzedrum/game/assets/art/card-garden.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. A wide cut-paper vignette: two sisters practising with drumsticks beside a lotus pond and straw targets in a lord's garden, dawn. Main shapes on the right half, the left half mostly open sky or water.

### BD-U07 · Chapter card: The Outpost on the Hat River

Background of the chapter-select card; the game lays a pale wash over it for text.

- **Spec:** 1600x900, opaque; keep the left half quiet for text
- **Status:** delivered · **Stand-in:** `buildCards (plain paper)` · **Game id:** `card-outpost`
- **File:** `bronzedrum/game/assets/art/card-outpost.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. A wide cut-paper vignette: women warriors with shields advancing on a Han timber outpost across a river ford, daylight. Main shapes on the right half, the left half mostly open sky or water.

### BD-U08 · Chapter card: The Citadel at Luy Lau

Background of the chapter-select card; the game lays a pale wash over it for text.

- **Spec:** 1600x900, opaque; keep the left half quiet for text
- **Status:** delivered · **Stand-in:** `buildCards (plain paper)` · **Game id:** `card-luylau`
- **File:** `bronzedrum/game/assets/art/card-luylau.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. A wide cut-paper vignette: the sisters on a war elephant with a bronze drum before a walled citadel under a full moon. Main shapes on the right half, the left half mostly open sky or water.

## Effects (3)

Sprite sheets for hits, projectiles and the drum waking, all used by the game (it falls back to drawing its own if a sheet is missing).

### BD-F01 · Paper scraps sheet

Hits and defeats burst into torn scraps of paper instead of blood.

- **Spec:** 2048x512, transparent; sixteen scraps on a 128 px grid
- **Status:** delivered · **Stand-in:** `Renderer.scraps` · **Game id:** `fx-scraps`
- **File:** `bronzedrum/game/assets/art/fx-scraps.png`
- **Prompt:** Sixteen small torn and cut paper scraps on a transparent background, in cream, lacquer red, iron grey and straw: triangles, curls, leaf shapes, feather fragments. Each with a fibrous torn edge on one side and a clean knife cut on the other.

### BD-F02 · Arrows and bolts

Lac Viet arrows and Han crossbow bolts.

- **Spec:** 1024x256, transparent; four pieces in a row
- **Status:** delivered · **Stand-in:** `Renderer.drawParticles` · **Game id:** `fx-projectiles`
- **File:** `bronzedrum/game/assets/art/fx-projectiles.png`
- **Prompt:** Four cut-paper projectiles in a row on a transparent background, all pointing right: a Lac Viet arrow with a bronze head and feather fletching, the same arrow in flight with a motion cut, a short Han crossbow bolt in iron grey, the same bolt with a motion cut.

### BD-F03 · The drum wakes

Plays when four commands chain: the drum's rings spread outward like the call in BD-M08.

- **Spec:** 2048x2048, transparent; one ring pattern, radially symmetric
- **Status:** delivered · **Stand-in:** `Renderer.wakeBurst` · **Game id:** `fx-drum-wake`
- **File:** `bronzedrum/game/assets/art/fx-drum-wake.png`
- **Prompt:** A radially symmetric burst of concentric cut-paper rings in bronze and gold on a transparent background, like the bands of a bronze drum face expanding outward: tangential circles, flying herons and a sun-star at the centre. Bright glow through the cuts.

## Story chapters (22)

Art for the six chapters added after the first three: The Oath, Casting the Drums, The Villages Answer, The Coronation at Mê Linh, Mã Viện Returns and The Drums Are Melted. Same coloured-paper direction (BD-S02) and the same rules: Lạc Việt face right, Han face left. Props are drawn at fixed sizes in quiet scenes, so they can carry more cut detail than the battle sprites.

### BD-B10 · Sky: dusk

The Oath and Mã Viện Returns. The furthest backdrop, like BD-B01 to BD-B03.

- **Spec:** 2560x1440, opaque; keep the lower third plain, it is covered by hills
- **Status:** delivered · **Stand-in:** `Renderer.buildSky` · **Game id:** `sky-dusk`
- **File:** `bronzedrum/game/assets/art/sky-dusk.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. Backdrop of a dusk sky: violet at the top, dusty rose in the middle, a large low sun as a cut 12-point star sinking at the right, long scalloped paper clouds edged with light. Sky only, no land.

### BD-B11 · Sky: the foundry

Casting the Drums. The furthest backdrop, like BD-B01 to BD-B03.

- **Spec:** 2560x1440, opaque; keep the lower third plain, it is covered by hills
- **Status:** delivered · **Stand-in:** `Renderer.buildSky` · **Game id:** `sky-foundry`
- **File:** `bronzedrum/game/assets/art/sky-foundry.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. Backdrop of a night sky over a foundry: near-black at the top, deep red-brown haze near the horizon lit orange from below by furnaces, embers cut as tiny holes drifting up, no moon. Sky only, no land.

### BD-B12 · Sky: ash dawn

The Drums Are Melted. The furthest backdrop, like BD-B01 to BD-B03.

- **Spec:** 2560x1440, opaque; keep the lower third plain, it is covered by hills
- **Status:** delivered · **Stand-in:** `Renderer.buildSky` · **Game id:** `sky-ash`
- **File:** `bronzedrum/game/assets/art/sky-ash.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. Backdrop of a quiet dawn: ash grey at the top fading to warm cream at the horizon, a pale hazy sun, thin streaks of cloud, a few herons far away. Sky only, no land.

### BD-U10 · Chapter card: The Oath

Background band of the chapter-select card.

- **Spec:** 1600x900, opaque; the band is cropped from the middle, so keep the subject central
- **Status:** delivered · **Stand-in:** `buildCards (plain paper)` · **Game id:** `card-oath`
- **File:** `bronzedrum/game/assets/art/card-oath.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. A wide cut-paper vignette: two sisters kneeling before their father's memorial altar at dusk, incense smoke rising, a mourning drum beside them.

### BD-U11 · Chapter card: Casting the Drums

Background band of the chapter-select card.

- **Spec:** 1600x900, opaque; the band is cropped from the middle, so keep the subject central
- **Status:** delivered · **Stand-in:** `buildCards (plain paper)` · **Game id:** `card-casting`
- **File:** `bronzedrum/game/assets/art/card-casting.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. A wide cut-paper vignette: metalworkers pouring glowing bronze from a crucible into drum moulds in a night foundry.

### BD-U12 · Chapter card: The Villages Answer

Background band of the chapter-select card.

- **Spec:** 1600x900, opaque; the band is cropped from the middle, so keep the subject central
- **Status:** delivered · **Stand-in:** `buildCards (plain paper)` · **Game id:** `card-villages`
- **File:** `bronzedrum/game/assets/art/card-villages.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. A wide cut-paper vignette: stilt villages along a river at night, lanterns lighting one after another, a drummer on a jetty.

### BD-U13 · Chapter card: The Coronation at Mê Linh

Background band of the chapter-select card.

- **Spec:** 1600x900, opaque; the band is cropped from the middle, so keep the subject central
- **Status:** delivered · **Stand-in:** `buildCards (plain paper)` · **Game id:** `card-coronation`
- **File:** `bronzedrum/game/assets/art/card-coronation.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. A wide cut-paper vignette: two queens crowned before a palace gate at Mê Linh, festival drummers, lantern strings and banners.

### BD-U14 · Chapter card: Mã Viện Returns

Background band of the chapter-select card.

- **Spec:** 1600x900, opaque; the band is cropped from the middle, so keep the subject central
- **Status:** delivered · **Stand-in:** `buildCards (plain paper)` · **Game id:** `card-mavien`
- **File:** `bronzedrum/game/assets/art/card-mavien.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. A wide cut-paper vignette: a Han general on horseback leading dense columns of soldiers to a river ford at dusk, Lạc Việt shields across the water.

### BD-U15 · Chapter card: The Drums Are Melted

Background band of the chapter-select card.

- **Spec:** 1600x900, opaque; the band is cropped from the middle, so keep the subject central
- **Status:** delivered · **Stand-in:** `buildCards (plain paper)` · **Game id:** `card-elegy`
- **File:** `bronzedrum/game/assets/art/card-elegy.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. A wide cut-paper vignette: bronze drums lined up beside a furnace at grey dawn, a river and drifting lotus beyond.

### BD-P01 · Memorial altar

The Oath: the father's altar; the game adds the incense sticks and smoke. Shown 170 px tall.

- **Spec:** 1024x1024. Single cut-paper object, side view, standing on the bottom edge, centred, transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow.
- **Status:** delivered · **Stand-in:** `Renderer.scene` · **Game id:** `prop-altar`
- **File:** `bronzedrum/game/assets/art/prop-altar.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. A Lạc Việt ancestral altar: a low dark wooden table with carved legs, a tall memorial tablet with a rounded top standing on it, its inscription cut through so light shows, a bronze bowl for incense in front, offerings of fruit. Ink black and bronze.

### BD-P02 · Mourning drummer

The Oath: the caller, striking a funeral drum on a stand. Shown 160 px tall; the game bobs it on each stroke.

- **Spec:** 1536x1024, the drummer on the left facing right towards the drum. Single cut-paper object, side view, standing on the bottom edge, centred, transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow.
- **Status:** delivered · **Stand-in:** `Renderer.scene` · **Game id:** `prop-mourning-drummer`
- **File:** `bronzedrum/game/assets/art/prop-mourning-drummer.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. An old Lạc Việt man in mourning white robes and a plain headband beating a large dark drum on a wooden stand with one long stick, solemn. Ink black with cream robes.

### BD-P03 · Festival drummers

The Coronation: the callers on a small stage. Shown 170 px tall.

- **Spec:** 1536x1024. Single cut-paper object, side view, standing on the bottom edge, centred, transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow.
- **Status:** delivered · **Stand-in:** `Renderer.scene` · **Game id:** `prop-festival-drummers`
- **File:** `bronzedrum/game/assets/art/prop-festival-drummers.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. Two joyful Lạc Việt drummers, a woman and a man in festival dress with feather crowns, beating a big lacquer-red drum on a carved stand hung with tassels and streamers.

### BD-P04 · River village house

The Villages Answer: one per village; the game hangs two lanterns from the eaves and lights them. Shown 130 px tall.

- **Spec:** 1024x1024. Single cut-paper object, side view, standing on the bottom edge, centred, transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow.
- **Status:** delivered · **Stand-in:** `Renderer.scene` · **Game id:** `prop-village-house`
- **File:** `bronzedrum/game/assets/art/prop-village-house.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. A Lạc Việt stilt house on a riverbank with a saddle-shaped roof like those on Dong Son drums, a ladder, woven walls with lattice windows cut through, a small jetty. Dark indigo-green paper, unlit.

### BD-P05 · Lit paper lantern

A lit lantern, hung from the village houses once a village answers. Shown 26 px tall.

- **Spec:** 256x384. Single cut-paper object, side view, standing on the bottom edge, centred, transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow.
- **Status:** delivered · **Stand-in:** `Renderer.scene` · **Game id:** `prop-lantern`
- **File:** `bronzedrum/game/assets/art/prop-lantern.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. A round paper lantern glowing warm orange from inside, cut with a small sun-star, a red tassel below, a short cord above.

### BD-P06 · Bronze drum (standing)

The Drums Are Melted: five stand in a row; the game greys out each as it falls silent. Shown 90 px tall.

- **Spec:** 1024x1024. Single cut-paper object, side view, standing on the bottom edge, centred, transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow.
- **Status:** delivered · **Stand-in:** `Renderer.scene` · **Game id:** `prop-bronze-drum`
- **File:** `bronzedrum/game/assets/art/prop-bronze-drum.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. A Dong Son bronze kettle drum seen from the side, slightly from above: a flat top with the sun-star and rings, a bulging upper body, a waist and a flared foot, bands of herons and boats in relief, four small handles, warm bronze.

### BD-P07 · Furnace and crucible

Casting the Drums: the furnace the bronze is poured from. Shown 190 px tall.

- **Spec:** 1024x1024. Single cut-paper object, side view, standing on the bottom edge, centred, transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow.
- **Status:** delivered · **Stand-in:** `Renderer.scene` · **Game id:** `prop-furnace`
- **File:** `bronzedrum/game/assets/art/prop-furnace.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. An ancient clay foundry furnace with an arched mouth glowing orange, a clay crucible of molten bronze held above it on a wooden frame, sparks cut as small holes. Dark clay, orange glow.

### BD-P08 · Drum mould

Casting the Drums: an empty clay mould; the game fills it with glowing bronze, pour by pour. Shown 100 px tall.

- **Spec:** 1024x1024. Single cut-paper object, side view, standing on the bottom edge, centred, transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow.
- **Status:** delivered · **Stand-in:** `Renderer.scene` · **Game id:** `prop-mould`
- **File:** `bronzedrum/game/assets/art/prop-mould.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. A tall clay casting mould for a bronze drum, bound with rope, the sun-star pattern stamped on its lid, a pouring cup at the top. Earthy brown clay.

### BD-P09 · Freshly cast drum

Casting the Drums: shown once a mould is full. Shown 100 px tall.

- **Spec:** 1024x1024. Single cut-paper object, side view, standing on the bottom edge, centred, transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow.
- **Status:** delivered · **Stand-in:** `Renderer.scene` · **Game id:** `prop-drum-cast`
- **File:** `bronzedrum/game/assets/art/prop-drum-cast.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. A freshly cast bronze kettle drum still glowing faintly orange at the edges, clay mould pieces broken away around its foot, the sun-star crisp on its top.

### BD-P10 · Mã Viện on horseback

Mã Viện Returns: the Han general watching from the rear of his columns, always near the right edge of the screen. Shown 180 px tall, slightly faded behind the field.

- **Spec:** 1536x1536. Faces left. Single cut-paper figure on horseback, side profile, hooves on the bottom edge, centred, transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow: the game adds its own shadow.
- **Status:** delivered · **Stand-in:** `Renderer.general` · **Game id:** `han-general`
- **File:** `bronzedrum/game/assets/art/han-general.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. The Eastern Han general Mã Viện, 1st century, an old but upright commander on a dark warhorse in profile facing left, lamellar armour cut as rows of small slots, a crested helmet with a red plume, one hand raised to signal the advance, a long red banner on a pole behind him. Iron grey, black and lacquer red. Dignified and formidable, not caricatured.

### BD-M15 · The Oath: the father's funeral

Atmosphere for The Oath: grief turning into resolve.

- **Spec:** 3840x2160, opaque
- **Status:** delivered
- **File:** `bronzedrum/design/references/m15-oath.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. At dusk in a lord's house at Mê Linh, two young sisters in white mourning clothes kneel before their father's memorial altar; incense smoke rises in cut-paper curls; an old drummer beats a funeral drum; the elder sister's face is set and the younger's fierce. Violet and rose light, one lacquer-red shape.

### BD-M16 · The coronation at Mê Linh

Atmosphere for The Coronation: the high point before the fall.

- **Spec:** 3840x2160, opaque
- **Status:** delivered
- **File:** `bronzedrum/design/references/m16-coronation.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. Trưng Trắc and Trưng Nhị crowned queens before the palace gate of Mê Linh, a festival crowd of women and men with feather crowns, drummers on a stage, strings of glowing lanterns and banners, herons overhead. Day light, cream, bronze and lacquer red, joyful.

### BD-M17 · Mã Viện at the ford

Atmosphere for Mã Viện Returns: the overwhelming army and the last stand.

- **Spec:** 3840x2160, opaque
- **Status:** delivered
- **File:** `bronzedrum/design/references/m17-mavien.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. At dusk, the Han general Mã Viện on a horse at the head of dense columns of soldiers with halberds and crossbows coming down to a wide river ford; on the near bank a thin line of Lạc Việt women raises star-cut shields. Grave, red-violet sky, iron grey and lacquer red. The Han are dignified, not caricatured.

## Drum Practice (6)

Art for Drum Practice, chosen from the title screen: free drumming and call and answer on a village green at dusk. The scene reuses the dusk sky and the parallax strips; the game draws the fire, the lantern string and the partner drummers (BD-P03). Until these are delivered the game draws paper-cut stand-ins, so each piece replaces one drawing and must keep its proportions.

### BD-U17 · Practice card: Free drumming

Background band of the card on the Drum Practice screen.

- **Spec:** 1600x900, opaque; the band is cropped from the middle, so keep the subject central
- **Status:** delivered · **Stand-in:** `buildPracticeCards (plain paper)` · **Game id:** `card-practice-free`
- **File:** `bronzedrum/game/assets/art/card-practice-free.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. A wide cut-paper vignette: feather-crowned Lạc Việt dancers circling a fire on a village green at dusk, a bronze drum beside them, a communal house with a sweeping saddle roof behind, lanterns overhead.

### BD-U18 · Practice card: Call and answer

Background band of the card on the Drum Practice screen.

- **Spec:** 1600x900, opaque; the band is cropped from the middle, so keep the subject central
- **Status:** delivered · **Stand-in:** `buildPracticeCards (plain paper)` · **Game id:** `card-practice-call`
- **File:** `bronzedrum/game/assets/art/card-practice-call.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. A wide cut-paper vignette: two drummers facing each other across a fire, one at a bronze drum and one at a lacquer-red festival drum, trading rhythms while villagers watch, dusk.

### BD-U26 · Practice card: Training

Background band of the Training card on the Drum Practice screen (a third card beside Free drumming and Call and answer), where the player practises the game's rhythms level by level.

- **Spec:** 1600x900, opaque; the band is cropped from the middle, so keep the subject central
- **Status:** planned, not loaded yet · **Stand-in:** `buildPracticeCards (plain paper)` · **Game id:** `card-practice-training`
- **File:** `bronzedrum/game/assets/art/card-practice-training.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. A wide cut-paper vignette: an old drum master and a young feather-crowned drummer kneeling at a bronze drum in a courtyard at dusk, the master's stick raised to show a stroke while the student watches, a row of smaller drums and wooden beaters laid out in order along a low lacquer-red bench behind them, lanterns overhead.

### BD-P11 · The communal house (đình)

The back of the practice green: a village communal house, dim against the dusk sky, its lattice lit from inside. Shown 230 px tall, centred about two thirds of the way across the screen; the fire and the dancers stand in front of it.

- **Spec:** 2048x1024. Single cut-paper object, side view, standing on the bottom edge, centred, transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow.
- **Status:** delivered · **Stand-in:** `Renderer.dinh` · **Game id:** `prop-dinh`
- **File:** `bronzedrum/game/assets/art/prop-dinh.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. A Lạc Việt communal house (đình) seen from the side: a long low hall raised on wooden stilts, under a huge saddle-shaped roof whose two ends sweep up like a boat's prow, as on the houses of the Đông Sơn drums. Woven walls with rows of lattice windows cut through so warm light shows. Dark indigo-violet paper, a single sheet.

### BD-C13 · Dancers: three poses each

The dancers who gather as the player drums: four figures, each in three poses the game switches between on every stroke it hears (at rest or walking; a stamp on the deep stroke with both arms thrown up; a hop on the rim stroke with one wrist flicked out). The game flips them to face the fire, bobs and tilts them. Shown 96 px tall, so keep the shapes bold.

- **Spec:** 1536x2048, transparent; a grid of 3 columns (poses) by 4 rows (dancers), 512x512 cells, each figure standing on the bottom of its cell, facing right, centred. Rows: a woman with a tall feather crown; a man in a loincloth with a feather crown; a woman holding two feathers; a man with a small hand drum. Same scale in every cell. Single cut-paper figure, side profile, full body, feet on the bottom edge, centred, transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow: the game adds its own shadow.
- **Status:** delivered · **Stand-in:** `Renderer.dancer` · **Game id:** `dancer-sheet`
- **File:** `bronzedrum/game/assets/art/dancer-sheet.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. A sprite sheet of feather-crowned Lạc Việt dancers like the figures on the face of a Đông Sơn bronze drum, in profile facing right, on a grid of 3 columns by 4 rows. Each row is one dancer, each column a pose: 1 standing at rest, arms low; 2 stamping, knees bent, both arms thrown up high; 3 hopping on one foot, one wrist flicked out to the side. Row 1 a woman with a tall feather crown and a wrapped skirt; row 2 a man in a loincloth with a feather crown; row 3 a woman holding a long feather in each hand; row 4 a man with a small hand drum. Ink-black silhouettes with lacquer-red sashes and fine cut details in the feathers.

### BD-U19 · Practice kits: drum faces

In Drum Practice the player can swap the bronze drum for another pair of instruments. The big HUD drum (and the kit button on touch screens) shows the kit's face, seen from above and drawn as a disc: its centre is the deep stroke, its rim the high one. The game adds the glow and the flash on each stroke.

- **Spec:** 1536x256, transparent; six discs on a 256 px grid, each centred and filling about 94% of its cell, in this order: bronze drum (not used; the game has BD-U02), barrel drum and mõ, rice drum, gongs, bamboo, lion-dance drum and cymbals
- **Status:** delivered · **Stand-in:** `Renderer.kitFace` · **Game id:** `kit-faces`
- **File:** `bronzedrum/game/assets/art/kit-faces.png`
- **Prompt:** Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) that let light through. Lit from behind: light glows through the cuts and each layer casts a soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the backlight, no photorealism, no 3D render look, no text, no watermark. Six round instrument faces in a row, seen straight from above, each a flat disc: 1 a Đông Sơn bronze drum's tympanum with a sun-star and rings of herons; 2 the cream buffalo-hide head of a trống chầu with a red centre disc and a ring of bronze tacks, a small dark wooden mõ resting at its edge; 3 the pale hide head of a trống cơm rice drum with a round darker patch of rice paste in its centre and a brown wooden rim; 4 a flat bronze gong with concentric rings and a raised polished boss; 5 a round mat with five green bamboo tubes of a đàn t'rưng laid side by side, shortest to longest; 6 the cream head of a lion-dance drum with a lacquer-red rim and a gold ring, a small brass cymbal at its edge. Bold shapes that read at 100 pixels.
