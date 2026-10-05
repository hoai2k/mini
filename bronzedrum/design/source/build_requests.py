#!/usr/bin/env python3
"""Generate the Bronze Drum image requests and the game's asset manifest.

Edit the data in this file, then run:

    python3 bronzedrum/design/source/build_requests.py          # write
    python3 bronzedrum/design/source/build_requests.py --check  # verify up to date

Outputs:
    bronzedrum/design/image-requests.md   - the request document
    bronzedrum/game/assets/manifest.json  - what the game loads

Statuses:
    stand-in   the game draws a procedural paper-cut stand-in and loads the
               file from game/assets/art/ once the status is flipped to
               "delivered"
    planned    requested for a later build; the prototype does not load it
    reference  inspiration and direction only; lives in design/references/
    delivered  the file is in the repository and the game loads it
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DOC = ROOT / "design" / "image-requests.md"
MANIFEST = ROOT / "game" / "assets" / "manifest.json"

# Same values as game/src/palette.js.
PALETTE = {
    "rice paper": "#F2E8D5",
    "paper shade": "#D9C9A8",
    "ink": "#16151A",
    "night indigo": "#1E2A44",
    "dusk indigo": "#3A4C6E",
    "bronze": "#B07A3A",
    "bronze light": "#D9A55B",
    "verdigris": "#4F8A7B",
    "lacquer red": "#A8322D",
    "moon": "#F6F0DC",
    "Han iron": "#5E6470",
    "Han iron dark": "#33373F",
    "straw": "#C9A866",
}

STYLE = (
    "Hand-cut paper art. Flat silhouettes cut with a knife from thick handmade rice paper and "
    "white fibre sheets, with intricate cut-out holes (leaf veins, crescents, scallops, lattice) "
    "that let light through. Lit from behind: light glows through the cuts and each layer casts a "
    "soft shadow on the layer behind it. Motifs from Dong Son bronze drums (a 12-point sun-star, "
    "concentric rings, flying herons, feather-crowned figures in profile, long boats, stilt houses "
    "with saddle roofs) and northern Vietnamese plants (areca palms, bamboo, lotus, rice). "
    "Folkloric, intimate and ceremonial. Limited palette: rice paper cream, ink black, night "
    "indigo, bronze, verdigris and lacquer red. No painterly gradients except the glow of the "
    "backlight, no photorealism, no 3D render look, no text, no watermark."
)

CUTOUT = (
    "Single cut-paper figure, side profile, full body, feet on the bottom edge, centred, "
    "transparent background (PNG with alpha). If transparency is not possible, use a flat pure "
    "magenta #FF00FF background with nothing else on it and no cast shadow: the game adds its "
    "own shadow."
)

STRIP = (
    "Seamless horizontally: the left and right edges must join with no visible seam. "
    "Transparent above the silhouette (PNG with alpha); the game layers it over the sky."
)

# id, game asset id, title, purpose, spec, status, stand-in, file, prompt
REQUESTS: list[dict] = []


def req(section, rid, asset, title, purpose, spec, status, standin, file, prompt):
    # Direction pieces carry the shared style too, except the installation photograph.
    if section == "mood" and rid != "BD-M02":  # style frames set their own treatment
        prompt = f"{STYLE} {prompt}"
    REQUESTS.append(
        dict(section=section, id=rid, asset=asset, title=title, purpose=purpose, spec=spec,
             status=status, standin=standin, file=file, prompt=prompt)
    )


SECTIONS = {
    "style": (
        "Style frames: choose the direction first",
        "Generate these three before anything else. They show the same moment (the "
        "army marching on a Han palisade at dusk, the sisters and the drum behind it) under "
        "three different treatments of the paper, so the treatment can be judged on its own. "
        "Pick one, or a mix, and the palette and the prompts below are tuned to it before the "
        "full set is generated. The prototype's stand-in currently sits closest to S02; "
        "screenshots of it are in `design/screens/`.",
    ),
    "mood": (
        "Inspiration and atmosphere",
        "Direction pieces, not game assets. They fix the look, the light and the emotional "
        "range before production art is made, and every later request should agree with them. "
        "Save delivered pieces to `design/references/` under the file names given.",
    ),
    "world": (
        "Backgrounds",
        "One sky per chapter and four parallax strips. The game draws each strip at the full "
        "720-pixel screen height, so composition is given as a fraction of the image height. "
        "The ground line sits at 69% of the height; the band below it holds the drum HUD.",
    ),
    "cast": (
        "Characters and units",
        "In-game cutouts. Lac Viet figures face right (the direction of the march); Han figures "
        "face left. The game scales each sprite to a fixed on-screen height, given in the spec, "
        "and adds the backlit shadow itself.",
    ),
    "rig": (
        "Puppet part sheets",
        "For the production build: the same figures split into separate pieces so they can be "
        "rigged and animated like shadow puppets. The prototype does not load these.",
    ),
    "ui": (
        "Interface",
        "The title logo, the drum-face HUD, chapter cards and interface pieces.",
    ),
    "fx": (
        "Effects",
        "Sprite sheets for hits, projectiles and the drum waking. The prototype draws these "
        "procedurally; the sheets are for the production build.",
    ),
    "story": (
        "Story chapters",
        "Art for the six chapters added after the first three: The Oath, Casting the Drums, The "
        "Villages Answer, The Coronation at Mê Linh, Mã Viện Returns and The Drums Are Melted. "
        "Same coloured-paper direction (BD-S02) and the same rules: Lạc Việt face right, Han "
        "face left. Props are drawn at fixed sizes in quiet scenes, so they can carry more cut "
        "detail than the battle sprites.",
    ),
}


# ------------------------------------------------------------------ style

SCENE = (
    "A side-on view at dusk of a line of Lac Viet women warriors with spears and feather crowns "
    "marching right across rice paddies towards a Han timber palisade with a watchtower; behind "
    "the women, two sisters in feather crowns beat a bronze drum on a carried palanquin; "
    "limestone karst peaks and areca palms behind; a large low moon ringed by faint concentric "
    "drum rings. Wide 16:9 composition, layered in five depths."
)
req("style", "BD-S01", None, "Style frame A: white paper and lamplight",
    "The closest to hand-cut fibre panels in a gallery: almost no colour; depth and mood come "
    "from light, shadow and the density of the cuts.",
    "3840x2160, opaque", "delivered", None, "references/s01-white-paper.png",
    f"{SCENE} Every layer is cut from white and cream fibre paper; colour comes only from a "
    "warm amber lamp behind the scene and the cool blue shadows each layer casts on the next. "
    "Intricate snowflake-like filigree in the hills, leaves and feathers; a kaleidoscope of light "
    "and shadow. Only accents of colour: the bronze drum and a thin lacquer-red sash on each "
    "woman. Hand-cut paper art, no painterly rendering, no text.")
req("style", "BD-S02", None, "Style frame B: coloured papers, lit from behind",
    "The prototype's direction: each depth a different coloured sheet, night indigo to rice "
    "cream, with bronze and lacquer-red accents.",
    "3840x2160, opaque", "delivered", None, "references/s02-coloured-papers.png",
    f"{STYLE} {SCENE}")
req("style", "BD-S03", None, "Style frame C: shadow theatre",
    "The boldest read at game size: solid ink silhouettes in front of glowing translucent "
    "coloured paper, like a shadow-puppet screen.",
    "3840x2160, opaque", "delivered", None, "references/s03-shadow-theatre.png",
    f"{SCENE} Every near figure and object is a solid ink-black silhouette with fine cut-out "
    "detail, set in front of a glowing screen of translucent dyed paper that shifts from amber "
    "at the horizon to deep rose and indigo above; the far hills are paler silhouettes printed "
    "on the screen. Like a Southeast Asian shadow-puppet performance lit by oil lamps. "
    "Hand-cut paper art, no painterly rendering, no text.")

# ------------------------------------------------------------------ mood

M = "mood"
req(M, "BD-M01", None, "Key art: the sisters ride to war",
    "The single image the game is sold on. Sets scale, hierarchy and the backlit-diorama look.",
    "3840x2160, opaque", "delivered", None, "references/m01-key-art.png",
    "Key art for a game about the Trung sisters, Vietnam, 40 CE. Trung Trac and Trung Nhi ride a "
    "great war elephant into battle, both in gold armour with tall feathered crowns, beating a "
    "huge bronze drum carried in the howdah between them. Behind them an army of women with "
    "spears, bows and feather headdresses streams across rice paddies; ahead, a Han palisade "
    "citadel under a full moon. Built as a stage of five cut-paper layers, one behind another, lit "
    "from behind so the moon and the cuts glow; every layer casts a soft shadow on the one behind. "
    "The sisters are the brightest, most intricately cut shapes in the frame.")
req(M, "BD-M02", None, "Lightbox study: suspended panels",
    "Defines the game's depth and lighting model: how layers glow, how shadows fall, how much "
    "the cuts carry.",
    "3840x2160, opaque", "delivered", None, "references/m02-suspended-panels.png",
    "Photograph of a gallery installation in a dark room: six large hand-cut white fibre-paper "
    "panels hang from the ceiling one behind another. A single warm lamp behind the last panel "
    "throws their cut patterns as long shadows onto the floor and the near wall. The panels show, "
    "back to front: a full moon ringed with herons, limestone karst peaks, areca palms and bamboo, "
    "stilt houses, rice paddies, and a row of women warriors with feather crowns. Fire-lit, "
    "cave-like atmosphere; the paper fibres visible where the light passes through.")
req(M, "BD-M03", None, "Dong Son motif sheet",
    "A shared vocabulary of cut shapes, translated from the bronze drums, for every artist "
    "and every later request.",
    "3000x3000, opaque cream ground", "delivered", None, "references/m03-dong-son-motifs.png",
    "Reference sheet of cut-paper motifs translated from Dong Son bronze drums, arranged in a grid "
    "on rice-paper cream: the 12-point sun-star at the drum's centre; bands of tangential circles; "
    "zigzag and ladder bands; flying long-beaked herons; feather-crowned dancers and warriors in "
    "profile; long boats with crews; deer; stilt houses with saddle roofs; the small frogs that "
    "sit on drum rims; a drummer pounding paired drums. Each motif cut as a flat ink-black "
    "silhouette with fine interior cuts.")
req(M, "BD-M04", None, "Colour script",
    "The palette's journey through the story, so each chapter has its own light.",
    "4800x1600, opaque, eight panels in two rows", "delivered", None, "references/m04-colour-script.png",
    "A colour script of eight small cut-paper scenes in two rows of four, each a different light: "
    "1 dawn training, rose and bronze; 2 the garden, verdigris and cream; 3 grief, deep indigo with "
    "a single lacquer-red shape; 4 casting the drums, molten bronze and orange; 5 the villages "
    "answer, cream daylight and verdigris; 6 battle on the river, slate grey and lacquer red; 7 "
    "Luy Lau at night, indigo and gold; 8 elegy, ash grey and cream with one bronze shape. Simple "
    "compositions, the colour shift readable at thumbnail size.")
req(M, "BD-M05", None, "The sisters: character study",
    "Fixes the two leads' silhouettes and personalities before the sprites are made.",
    "3000x2000, opaque cream ground", "delivered", None, "references/m05-sisters.png",
    "Character study of two Vietnamese sisters as cut-paper figures, side by side, front view and "
    "side profile each. Trung Trac, the elder: composed and upright, bronze and gold, hair in a "
    "high knot under a crown of tall feathers, holding a drumstick still at her side; her cut "
    "patterns are ordered rings and stars. Trung Nhi, the younger: in motion, lacquer red, flowers "
    "and leaves cut into her sleeves and hair, laughing, drumstick raised; her cut patterns are "
    "vines and birds. Ancient Lac Viet dress, wrapped skirts, bead collars. Dignified, warm, not "
    "sexualised.")
req(M, "BD-M06", None, "The garden at Me Linh",
    "Atmosphere for chapter one: the training years, intimate and green.",
    "3840x2160, opaque", "delivered", None, "references/m06-garden.png",
    "The garden of a Lac Viet lord's house at Me Linh, late afternoon, with a pale moon in the sky. "
    "Nhi sits among lotus and flowering shrubs with birds around her; across the pond, Trac "
    "practises with a spear beside straw training targets. Stilt house with a saddle roof behind. "
    "Cut-paper layers backlit by low sun, verdigris and cream, the leaves cut with fine veins.")
req(M, "BD-M07", None, "Casting the drums",
    "Atmosphere for the uprising's preparation: the metalworkers of Nhat Nam.",
    "3840x2160, opaque", "delivered", None, "references/m07-casting.png",
    "Night in a foundry of the Nhat Nam metalworkers: molten bronze poured from crucibles into "
    "clay drum moulds stamped with the sun-star; women carry the moulds, sparks drawn as tiny cut "
    "holes letting orange light through. Finished bronze drums stacked at the side. Cut-paper "
    "layers, bronze and orange glow against ink black.")
req(M, "BD-M08", None, "The villages answer",
    "The drum as a call: the sound made visible. Direction for the drum-wake effect and the "
    "campaign map.",
    "3840x2160, opaque", "delivered", None, "references/m08-villages-answer.png",
    "Night over the Red River delta seen from above at a low angle. The sound of a great drum "
    "spreads from the centre as concentric cut-paper rings, like the rings on a bronze drum face. "
    "In stilt villages along the river, lanterns light one by one and women come down to long "
    "boats carrying spears. Indigo, cream and bronze.")
req(M, "BD-M09", None, "Battle on the Hat River",
    "Atmosphere for chapter two: daylight battle, shield walls and crossbow volleys.",
    "3840x2160, opaque", "delivered", None, "references/m09-river-battle.png",
    "A battle at a river ford in low daylight. Han crossbowmen in iron-grey lamellar armour stand "
    "on a wooden palisade; a wall of Lac Viet women raises round shields with star patterns cut "
    "through them as a volley of bolts arcs over, drawn as clean cut lines. Reeds and lotus in "
    "the foreground. Slate grey, cream and lacquer red.")
req(M, "BD-M10", None, "Luy Lau at night",
    "Atmosphere for chapter three: the climax.",
    "3840x2160, opaque", "delivered", None, "references/m10-luy-lau.png",
    "The Han citadel of Luy Lau at night under a full moon. War elephants carrying the sisters "
    "and bronze drums break through the gate; gold armour and feather crowns catch the moonlight; "
    "the citadel's watchtowers are cut with lattice windows lit from within. Indigo and gold, "
    "triumphant but heavy.")
req(M, "BD-M11", None, "Elegy: the drums melted",
    "The ending's tone: the victory does not last. Quiet, respectful, no depiction of death.",
    "3840x2160, opaque", "delivered", None, "references/m11-elegy.png",
    "Quiet aftermath. In a Han workshop, captured bronze drums lie stacked by a furnace, about to "
    "be melted down and cast into a bronze horse. Through the open door, the Hat River at dawn "
    "with lotus drifting and herons flying. Ash grey and cream with one warm bronze shape. "
    "Mournful and still.")
req(M, "BD-M12", None, "In-game screen mock-up",
    "Steers the production HUD and checks that the style reads at play size.",
    "1920x1080, opaque", "delivered", None, "references/m12-screen-mockup.png",
    "A 16:9 video game screen in cut-paper style. Side-scrolling battlefield: a line of women "
    "warriors on the left marches right towards Han soldiers and a palisade on the right; "
    "behind the women, two sisters stand on a palanquin with a bronze drum. Bottom centre, a "
    "round bronze drum face with rings, four herons and a central star as the rhythm display. "
    "Bottom left, a small panel listing four drum commands as rows of dots. Top left and top "
    "right, thin strength bars. Plenty of empty space around the interface.")
req(M, "BD-M13", None, "Army of women: costume line-up",
    "The unit types and their silhouettes, readable at small sizes.",
    "4000x2000, opaque cream ground", "delivered", None, "references/m13-army-lineup.png",
    "Costume line-up of a Lac Viet women's army, ancient Vietnam, as flat cut-paper figures in "
    "profile facing right, all at the same scale: spearwoman, archer with a crossbow, shield "
    "bearer with a round star-cut shield, drum bearer, standard bearer, mountain archer with a "
    "longbow. Feather crowns of different heights, wrapped skirts, bead collars, lacquer-red "
    "sashes. Each silhouette distinct.")
req(M, "BD-M14", None, "Han forces: line-up",
    "The opposing side, dignified and specific to the Eastern Han, never caricatured.",
    "4000x2000, opaque cream ground", "delivered", None, "references/m14-han-lineup.png",
    "Line-up of Eastern Han Chinese soldiers, 1st century, as flat cut-paper figures in profile "
    "facing left, at one scale: spearman with a ji halberd, kneeling crossbowman, officer with a "
    "banner, the provincial governor in robes and a scholar's cap. Lamellar armour shown as rows "
    "of small cut slots, iron grey and black. Ordinary, human faces; no caricature.")

# ------------------------------------------------------------------ world

W_ = "world"
for sky, desc, light in [
    ("dawn", "Chapter one, the garden at Me Linh", "a dawn sky: indigo at the top, rose in the middle, warm bronze near the horizon; the sun as a cut 12-point star low on the right with a glowing halo; a few long scalloped paper clouds"),
    ("day", "Chapter two, the Hat River", "a hazy daylight sky: pale verdigris at the top fading to cream at the horizon; the sun as a cut 12-point star at upper right; long scalloped paper clouds"),
    ("night", "Chapter three, Luy Lau", "a night sky: deep indigo, a large full moon at upper right with crater shapes cut out of it, a scatter of small stars, a few long indigo paper clouds"),
]:
    req(W_, f"BD-B0{['dawn','day','night'].index(sky)+1}", f"sky-{sky}", f"Sky: {sky}",
        f"{desc}. The furthest backdrop; everything else is layered over it.",
        "2560x1440, opaque; keep the lower third plain, it is covered by hills",
        "delivered", "Renderer.buildSky", f"art/sky-{sky}.png",
        f"{STYLE} Backdrop of {light}. Sky only, no land.")

req(W_, "BD-B04", "layer-karst", "Far layer: karst peaks",
    "The far hills, moving at 15% of the camera speed.",
    "5120x1440. Peaks between 10% and 60% of the height; the base solid to the bottom edge. " + STRIP,
    "delivered", "Renderer.buildKarst", "art/layer-karst.png",
    f"{STYLE} A long horizontal strip of steep limestone karst peaks with rounded tops, cut from "
    "one sheet of paper in a single muted indigo-violet, with thin mist bands and small flying "
    "herons cut out of it so the light shows through. Flat silhouette, no interior shading.")
req(W_, "BD-B09", "layer-karst-far", "Farthest layer: pale karst peaks",
    "A paler, lower row of peaks behind BD-B04, moving at 7% of the camera speed, so the "
    "hills read in two depths.",
    "5120x1440. Peaks between 25% and 52% of the height; the base solid to the bottom edge. " + STRIP,
    "delivered", "Renderer.buildKarst(far)", "art/layer-karst-far.png",
    f"{STYLE} A long horizontal strip of distant limestone karst peaks with rounded tops, "
    "cut from one pale, misty violet-grey sheet that lets a lot of light through, with a dotted "
    "seam of tiny cut holes following the inside of each peak and thin mist bands cut across.")
req(W_, "BD-B05", "layer-grove", "Middle layer: palms, bamboo, stilt houses",
    "The middle distance, moving at 45% of the camera speed.",
    "5120x1440. Tree bases on a solid band at 63-71% of the height; tallest crowns at about 25%. " + STRIP,
    "delivered", "Renderer.buildGrove", "art/layer-grove.png",
    f"{STYLE} A long horizontal strip of areca palms, clumps of bamboo and stilt houses with "
    "saddle-shaped roofs like those on Dong Son drums, cut from one dark indigo-green sheet; leaf "
    "veins and lattice windows cut out so the light shows through.")
req(W_, "BD-B06", "layer-paddy", "Ground layer: rice paddies",
    "The ground the armies stand on.",
    "5120x1440. Top edge a gentle scalloped line at 69% of the height; solid below, with the water slits kept faint so the HUD reads over it. " + STRIP,
    "delivered", "Renderer.buildPaddy", "art/layer-paddy.png",
    f"{STYLE} A long horizontal strip of flooded rice paddies seen from the side, one dark sheet "
    "with a softly scalloped top edge; rows of thin horizontal slits cut through it suggest water "
    "catching light between rows of rice.")
req(W_, "BD-B07", "layer-reeds", "Foreground layer: reeds and lotus",
    "The nearest layer, in front of the armies, moving at 125% of the camera speed.",
    "5120x1440. Reeds rising from the bottom edge up to about 25% of the height; sparse enough "
    "that most of the bottom stays open. " + STRIP,
    "delivered", "Renderer.buildReeds", "art/layer-reeds.png",
    f"{STYLE} A long horizontal strip of reeds, grasses and lotus pads rising from the bottom "
    "edge, ink-black silhouettes with very fine cut detail, sparse with gaps between clumps.")
req(W_, "BD-B08", "paper-fiber", "Paper fibre texture",
    "Laid over the whole screen at low opacity, so the scene reads as one sheet of paper.",
    "1024x1024, opaque, tileable in both directions",
    "delivered", "fiberTexture", "art/paper-fiber.png",
    "Seamless tileable texture of handmade mulberry rice paper lit from behind: warm cream, long "
    "pale fibres and a few darker flecks, even lighting, no folds, no shadows, no objects.")

# ------------------------------------------------------------------ cast

C = "cast"
req(C, "BD-C01", "sister-trac", "Trung Trac, drumming",
    "The elder sister at the drum: plays the deep centre stroke (tung). Shown 96 px tall.",
    "1024x1536. " + CUTOUT,
    "delivered", "Renderer.sisters", "art/sister-trac.png",
    f"{STYLE} Trung Trac, a Lac Viet noblewoman and war leader, standing in profile facing right, "
    "both hands gripping a long drumstick raised for a strike. Gold armour of small plates over a "
    "wrapped skirt, a tall crown of feathers, hair in a high knot. Composed and upright. Bronze "
    "and ink-black paper, her armour cut with rings and small stars.")
req(C, "BD-C02", "sister-nhi", "Trung Nhi, drumming",
    "The younger sister at the drum: plays the rim stroke (cac) and the off-beat flourishes. "
    "Shown 96 px tall.",
    "1024x1536. " + CUTOUT,
    "delivered", "Renderer.sisters", "art/sister-nhi.png",
    f"{STYLE} Trung Nhi, a young Lac Viet war leader, in profile facing right, mid-swing with a "
    "short drumstick in each hand, body turning with energy. Gold armour over a lacquer-red "
    "wrapped skirt, a crown of feathers with flowers tucked in, vines and birds cut into her "
    "sleeves. Lively and fierce.")
req(C, "BD-C03", "war-elephant", "War elephant with howdah",
    "Chapter three: the sisters ride it with the great drum. The game draws the sisters and "
    "drum on top, so the howdah is empty. Shown 230 px tall.",
    "2048x1536. Empty howdah floor at about 70% of the height above the feet, centred slightly "
    "behind the middle. " + CUTOUT,
    "delivered", "Renderer.elephant", "art/war-elephant.png",
    f"{STYLE} An Asian war elephant walking right in profile, an empty open howdah with a "
    "lacquer-red rail on its back, a caparison cut with concentric rings and a sun-star, tusks "
    "and trunk curled forward. Ink-black paper with red and bronze inlays.")
req(C, "BD-C04", "drum-bearers", "The drum on its palanquin",
    "Chapters one and two: four women carry the bronze drum on a low platform; the sisters "
    "stand on its deck (drawn separately). Shown 150 px tall.",
    "2048x1024. Platform deck at about 35% of the height. " + CUTOUT,
    "delivered", "Renderer.drumCrew", "art/drum-bearers.png",
    f"{STYLE} Four Lac Viet women in feather crowns carry a low wooden palanquin on poles, "
    "walking right; on it sits a large bronze drum, its side banded with rings and its top a "
    "sun-star. The deck is empty apart from the drum. Ink-black figures, a bronze drum.")
req(C, "BD-C05", "unit-spear", "Spearwoman",
    "The front line. Shown 92 px tall; the game bobs, levels and tilts it for march and strike.",
    "1024x1536. Spear held upright. " + CUTOUT,
    "delivered", "Renderer.warrior", "art/unit-spear.png",
    f"{STYLE} A Lac Viet woman warrior in profile facing right, holding a long bronze-headed "
    "spear upright, a feather crown fanning backwards, wrapped skirt, a lacquer-red sash. "
    "Ink-black silhouette with fine cut details in the feathers.")
req(C, "BD-C06", "unit-archer", "Archer",
    "The back line. Shown 92 px tall.",
    "1024x1536. " + CUTOUT,
    "delivered", "Renderer.warrior", "art/unit-archer.png",
    f"{STYLE} A Lac Viet woman archer in profile facing right, drawing a bow, a short feather "
    "crown, quiver on her back, a lacquer-red sash. Ink-black silhouette with fine cut details.")
req(C, "BD-C07", "han-spear", "Han spearman",
    "Advances and attacks at close range. Shown 96 px tall.",
    "1024x1536. Faces left. " + CUTOUT,
    "delivered", "Renderer.hanSoldier", "art/han-spear.png",
    f"{STYLE} An Eastern Han Chinese soldier, 1st century, in profile facing left, holding a ji "
    "halberd upright, lamellar armour shown as rows of small cut slots, a soft cap. Iron grey "
    "and dark grey paper. An ordinary soldier, no caricature.")
req(C, "BD-C08", "han-crossbow", "Han crossbowman",
    "Fires a bolt every measure from range. Shown 96 px tall.",
    "1024x1536. Faces left. " + CUTOUT,
    "delivered", "Renderer.hanSoldier", "art/han-crossbow.png",
    f"{STYLE} An Eastern Han Chinese crossbowman, 1st century, kneeling in profile facing left, "
    "aiming a bronze-triggered crossbow, lamellar armour as rows of small cut slots. Iron grey "
    "and dark grey paper, no caricature.")
req(C, "BD-C09", "fort-palisade", "Han palisade fort",
    "The goal of chapters two and three. Shown 300 px tall; the game tears pieces out as it "
    "takes damage.",
    "2048x2048. Gate on the left side, facing the army. " + CUTOUT.replace("figure, side profile, full body, feet", "structure, side view, base"),
    "delivered", "Renderer.fort", "art/fort-palisade.png",
    f"{STYLE} A Han frontier fort seen from the side: a wall of pointed timber stakes, a gate on "
    "the left, a two-storey watchtower with a tiled roof and a pennant, lattice windows cut "
    "through. Dark iron-grey paper.")
req(C, "BD-C10", "straw-target", "Straw training target",
    "Chapter one's goal. Shown 110 px tall.",
    "1024x1024. " + CUTOUT.replace("figure, side profile, full body, feet", "object, side view, base"),
    "delivered", "Renderer.target", "art/straw-target.png",
    f"{STYLE} A straw training dummy on a wooden post with a crossbar, bound with rope in three "
    "places. Straw-coloured paper with ink-black post and ropes.")

# ------------------------------------------------------------------ rig

R = "rig"
for rid, asset, who, parts in [
    ("BD-R01", "rig-sister-trac", "Trung Trac", "head with crown, torso, upper and lower arms, hands with drumstick, skirt, legs"),
    ("BD-R02", "rig-sister-nhi", "Trung Nhi", "head with crown, torso, upper and lower arms, two hands with drumsticks, skirt, legs"),
    ("BD-R03", "rig-war-elephant", "the war elephant", "head, ear, trunk in three segments, body with howdah, four legs in two segments, tail"),
    ("BD-R04", "rig-unit-spear", "the spearwoman", "head with crown, torso, arms, spear, skirt, legs"),
]:
    req(R, rid, asset, f"Part sheet: {who}",
        f"Separate pieces of {who} for puppet rigging.",
        "4096x4096, transparent; pieces laid out apart with space between, each with a little "
        "overlap at the joints",
        "delivered", None, f"art/{asset}.png",
        f"{STYLE} A sheet of separate cut-paper puppet parts for {who}, matching the in-game "
        f"figure: {parts}. Each piece is whole and flat, laid out with space between, joints "
        "rounded so they overlap when assembled.")

# ------------------------------------------------------------------ ui

U_ = "ui"
req(U_, "BD-U01", "logo", "Title logo",
    "Replaces the typeset title on the title screen. Must read at small sizes.",
    "2048x1024, transparent",
    "delivered", "#logo-text (CSS)", "art/logo.png",
    "Game title logo in hand-cut paper: the words \"BRONZE DRUM\" in large, readable, slightly "
    "irregular cut letters in rice-paper cream, set over a bronze drum's sun-star and rings cut "
    "in bronze, with \"TRỐNG ĐỒNG\" in small spaced capitals above (keep the Vietnamese "
    "diacritics exact). Backlit glow, a soft cast shadow. Transparent background.")
req(U_, "BD-U02", "hud-drum", "HUD: the drum face",
    "The rhythm display at the bottom of the screen. The game lights four herons and the star "
    "over it, so keep those areas simple.",
    "1024x1024, transparent outside the circle",
    "delivered", "Renderer.hud", "art/hud-drum.png",
    "Top-down view of a Dong Son bronze drum face as a flat bronze paper cut-out disc: a "
    "12-point sun-star at the centre, then bands of rings, tangential circles and zigzags, a "
    "plain ring at 80% of the radius where four herons will be overlaid, and a beaded rim. "
    "Bronze with darker bronze cut lines, even light, perfectly circular.")
req(U_, "BD-U03", "ui-glyphs", "Drum and command glyphs",
    "Icons for the two strokes and the five commands, for the HUD and the instructions.",
    "2048x512, transparent; seven icons in a row on a 256 px grid",
    "delivered", None, "art/ui-glyphs.png",
    "A row of seven cut-paper icons on a transparent background: 1 a solid bronze disc (the "
    "centre stroke, tung); 2 a lacquer-red ring with a dot (the rim stroke, cac); 3 a foot "
    "stepping forward (march); 4 a spearhead (strike); 5 a round shield with a star (shields); 6 a "
    "raised hand with feathers (rally); 7 an elephant head (charge). Simple, bold, readable at "
    "32 pixels.")
req(U_, "BD-U04", "ui-panel", "Dialog panel",
    "The paper sheet behind menus and dialogs, nine-sliced in the production build.",
    "1536x1024, transparent outside the sheet",
    "delivered", None, "art/ui-panel.png",
    "A sheet of cream rice paper with a hand-cut decorative border: a band of tangential circles "
    "and small herons cut through near the edge, corners cut with a sun-star. Plain centre for "
    "text. Even light, soft fibres.")
req(U_, "BD-U05", "ui-icons", "Utility icons",
    "Instructions, Settings and Fullscreen buttons.",
    "768x256, transparent; three icons on a 256 px grid",
    "delivered", None, "art/ui-icons.png",
    "Three cut-paper icons in rice-paper cream on a transparent background: an open scroll "
    "(instructions), a bronze drum seen from above with a small gear cut in it (settings), four "
    "corner brackets (fullscreen). Bold and simple, readable at 26 pixels.")
req(U_, "BD-U16", "touch-buttons", "Touch buttons",
    "On phones and tablets the game draws on-screen buttons beside the big touch drum: a "
    "shield button at the bottom right (drawn about 150 px across), a smaller reset button "
    "next to it and a pause button at the top. The game adds its own glow and press "
    "animation, so each icon should be a plain, flat button face.",
    "768x256, transparent; three round buttons on a 256 px grid, each filling about 90% of "
    "its cell",
    "stand-in", "Renderer.touchButtons", "art/touch-buttons.png",
    "Three round cut-paper buttons in a row on a transparent background, each a disc of dark "
    "indigo paper with a thin beaded bronze rim and a bold cream cut-out icon in the middle: "
    "1 a round Lạc Việt war shield with a sun-star boss (shield); 2 a curved arrow turning "
    "back on itself, like a ribbon of paper (reset the rhythm); 3 two upright bars (pause). "
    "Flat even light, soft shadow under each disc, bold enough to read at 48 pixels.")
for i, (cid, name, scene) in enumerate([
    ("garden", "The Garden at Me Linh", "two sisters practising with drumsticks beside a lotus pond and straw targets in a lord's garden, dawn"),
    ("outpost", "The Outpost on the Hat River", "women warriors with shields advancing on a Han timber outpost across a river ford, daylight"),
    ("luylau", "The Citadel at Luy Lau", "the sisters on a war elephant with a bronze drum before a walled citadel under a full moon"),
]):
    req(U_, f"BD-U0{6+i}", f"card-{cid}", f"Chapter card: {name}",
        "Background of the chapter-select card; the game lays a pale wash over it for text.",
        "1600x900, opaque; keep the left half quiet for text",
        "delivered", "buildCards (plain paper)", f"art/card-{cid}.png",
        f"{STYLE} A wide cut-paper vignette: {scene}. Main shapes on the right half, the left half "
        "mostly open sky or water.")

# ------------------------------------------------------------------ fx

F = "fx"
req(F, "BD-F01", "fx-scraps", "Paper scraps sheet",
    "Hits and defeats burst into torn scraps of paper instead of blood.",
    "2048x512, transparent; sixteen scraps on a 128 px grid",
    "delivered", None, "art/fx-scraps.png",
    "Sixteen small torn and cut paper scraps on a transparent background, in cream, lacquer red, "
    "iron grey and straw: triangles, curls, leaf shapes, feather fragments. Each with a fibrous "
    "torn edge on one side and a clean knife cut on the other.")
req(F, "BD-F02", "fx-projectiles", "Arrows and bolts",
    "Lac Viet arrows and Han crossbow bolts.",
    "1024x256, transparent; four pieces in a row",
    "delivered", None, "art/fx-projectiles.png",
    "Four cut-paper projectiles in a row on a transparent background, all pointing right: a Lac "
    "Viet arrow with a bronze head and feather fletching, the same arrow in flight with a motion "
    "cut, a short Han crossbow bolt in iron grey, the same bolt with a motion cut.")
req(F, "BD-F03", "fx-drum-wake", "The drum wakes",
    "Plays when four commands chain: the drum's rings spread outward like the call in BD-M08.",
    "2048x2048, transparent; one ring pattern, radially symmetric",
    "delivered", None, "art/fx-drum-wake.png",
    "A radially symmetric burst of concentric cut-paper rings in bronze and gold on a transparent "
    "background, like the bands of a bronze drum face expanding outward: tangential circles, "
    "flying herons and a sun-star at the centre. Bright glow through the cuts.")



# ------------------------------------------------------------------ story chapters

ST = "story"
for sky, name, chapters, light in [
    ("dusk", "dusk", "The Oath and Mã Viện Returns",
     "a dusk sky: violet at the top, dusty rose in the middle, a large low sun as a cut 12-point "
     "star sinking at the right, long scalloped paper clouds edged with light"),
    ("foundry", "the foundry", "Casting the Drums",
     "a night sky over a foundry: near-black at the top, deep red-brown haze near the horizon "
     "lit orange from below by furnaces, embers cut as tiny holes drifting up, no moon"),
    ("ash", "ash dawn", "The Drums Are Melted",
     "a quiet dawn: ash grey at the top fading to warm cream at the horizon, a pale hazy sun, "
     "thin streaks of cloud, a few herons far away"),
]:
    req(ST, f"BD-B1{['dusk', 'foundry', 'ash'].index(sky)}", f"sky-{sky}", f"Sky: {name}",
        f"{chapters}. The furthest backdrop, like BD-B01 to BD-B03.",
        "2560x1440, opaque; keep the lower third plain, it is covered by hills",
        "delivered", "Renderer.buildSky", f"art/sky-{sky}.png",
        f"{STYLE} Backdrop of {light}. Sky only, no land.")

for i, (cid, name, scene) in enumerate([
    ("oath", "The Oath", "two sisters kneeling before their father's memorial altar at dusk, incense smoke rising, a mourning drum beside them"),
    ("casting", "Casting the Drums", "metalworkers pouring glowing bronze from a crucible into drum moulds in a night foundry"),
    ("villages", "The Villages Answer", "stilt villages along a river at night, lanterns lighting one after another, a drummer on a jetty"),
    ("coronation", "The Coronation at Mê Linh", "two queens crowned before a palace gate at Mê Linh, festival drummers, lantern strings and banners"),
    ("mavien", "Mã Viện Returns", "a Han general on horseback leading dense columns of soldiers to a river ford at dusk, Lạc Việt shields across the water"),
    ("elegy", "The Drums Are Melted", "bronze drums lined up beside a furnace at grey dawn, a river and drifting lotus beyond"),
]):
    req(ST, f"BD-U{10 + i}", f"card-{cid}", f"Chapter card: {name}",
        "Background band of the chapter-select card.",
        "1600x900, opaque; the band is cropped from the middle, so keep the subject central",
        "delivered", "buildCards (plain paper)", f"art/card-{cid}.png",
        f"{STYLE} A wide cut-paper vignette: {scene}.")

PROP = (
    "Single cut-paper object, side view, standing on the bottom edge, centred, transparent "
    "background (PNG with alpha). If transparency is not possible, use a flat pure magenta "
    "#FF00FF background with nothing else on it and no cast shadow."
)
for rid, asset, title, purpose, spec, prompt in [
    ("BD-P01", "prop-altar", "Memorial altar", "The Oath: the father's altar; the game adds the incense sticks and smoke. Shown 170 px tall.",
     "1024x1024. " + PROP,
     "A Lạc Việt ancestral altar: a low dark wooden table with carved legs, a tall memorial "
     "tablet with a rounded top standing on it, its inscription cut through so light shows, a "
     "bronze bowl for incense in front, offerings of fruit. Ink black and bronze."),
    ("BD-P02", "prop-mourning-drummer", "Mourning drummer", "The Oath: the caller, striking a funeral drum on a stand. Shown 160 px tall; the game bobs it on each stroke.",
     "1536x1024, the drummer on the left facing right towards the drum. " + PROP,
     "An old Lạc Việt man in mourning white robes and a plain headband beating a large dark "
     "drum on a wooden stand with one long stick, solemn. Ink black with cream robes."),
    ("BD-P03", "prop-festival-drummers", "Festival drummers", "The Coronation: the callers on a small stage. Shown 170 px tall.",
     "1536x1024. " + PROP,
     "Two joyful Lạc Việt drummers, a woman and a man in festival dress with feather crowns, "
     "beating a big lacquer-red drum on a carved stand hung with tassels and streamers."),
    ("BD-P04", "prop-village-house", "River village house", "The Villages Answer: one per village; the game hangs two lanterns from the eaves and lights them. Shown 130 px tall.",
     "1024x1024. " + PROP,
     "A Lạc Việt stilt house on a riverbank with a saddle-shaped roof like those on Dong Son "
     "drums, a ladder, woven walls with lattice windows cut through, a small jetty. Dark "
     "indigo-green paper, unlit."),
    ("BD-P05", "prop-lantern", "Lit paper lantern", "A lit lantern, hung from the village houses once a village answers. Shown 26 px tall.",
     "256x384. " + PROP,
     "A round paper lantern glowing warm orange from inside, cut with a small sun-star, a red "
     "tassel below, a short cord above."),
    ("BD-P06", "prop-bronze-drum", "Bronze drum (standing)", "The Drums Are Melted: five stand in a row; the game greys out each as it falls silent. Shown 90 px tall.",
     "1024x1024. " + PROP,
     "A Dong Son bronze kettle drum seen from the side, slightly from above: a flat top with "
     "the sun-star and rings, a bulging upper body, a waist and a flared foot, bands of herons "
     "and boats in relief, four small handles, warm bronze."),
    ("BD-P07", "prop-furnace", "Furnace and crucible", "Casting the Drums: the furnace the bronze is poured from. Shown 190 px tall.",
     "1024x1024. " + PROP,
     "An ancient clay foundry furnace with an arched mouth glowing orange, a clay crucible of "
     "molten bronze held above it on a wooden frame, sparks cut as small holes. Dark clay, "
     "orange glow."),
    ("BD-P08", "prop-mould", "Drum mould", "Casting the Drums: an empty clay mould; the game fills it with glowing bronze, pour by pour. Shown 100 px tall.",
     "1024x1024. " + PROP,
     "A tall clay casting mould for a bronze drum, bound with rope, the sun-star pattern "
     "stamped on its lid, a pouring cup at the top. Earthy brown clay."),
    ("BD-P09", "prop-drum-cast", "Freshly cast drum", "Casting the Drums: shown once a mould is full. Shown 100 px tall.",
     "1024x1024. " + PROP,
     "A freshly cast bronze kettle drum still glowing faintly orange at the edges, clay mould "
     "pieces broken away around its foot, the sun-star crisp on its top."),
]:
    req(ST, rid, asset, title, purpose, spec, "delivered", "Renderer.scene", f"art/{asset}.png",
        f"{STYLE} {prompt}")

req(ST, "BD-P10", "han-general", "Mã Viện on horseback",
    "Mã Viện Returns: the Han general watching from the rear of his columns, always near the "
    "right edge of the screen. Shown 180 px tall, slightly faded behind the field.",
    "1536x1536. Faces left. " + CUTOUT.replace("figure, side profile, full body, feet", "figure on horseback, side profile, hooves"),
    "stand-in", "Renderer.general", "art/han-general.png",
    f"{STYLE} The Eastern Han general Mã Viện, 1st century, an old but upright commander on a "
    "dark warhorse in profile facing left, lamellar armour cut as rows of small slots, a "
    "crested helmet with a red plume, one hand raised to signal the advance, a long red "
    "banner on a pole behind him. Iron grey, black and lacquer red. Dignified and formidable, "
    "not caricatured.")

for rid, title, purpose, file, prompt in [
    ("BD-M15", "The Oath: the father's funeral",
     "Atmosphere for The Oath: grief turning into resolve.", "references/m15-oath.png",
     "At dusk in a lord's house at Mê Linh, two young sisters in white mourning clothes kneel "
     "before their father's memorial altar; incense smoke rises in cut-paper curls; an old "
     "drummer beats a funeral drum; the elder sister's face is set and the younger's fierce. "
     "Violet and rose light, one lacquer-red shape."),
    ("BD-M16", "The coronation at Mê Linh",
     "Atmosphere for The Coronation: the high point before the fall.", "references/m16-coronation.png",
     "Trưng Trắc and Trưng Nhị crowned queens before the palace gate of Mê Linh, a festival "
     "crowd of women and men with feather crowns, drummers on a stage, strings of glowing "
     "lanterns and banners, herons overhead. Day light, cream, bronze and lacquer red, joyful."),
    ("BD-M17", "Mã Viện at the ford",
     "Atmosphere for Mã Viện Returns: the overwhelming army and the last stand.", "references/m17-mavien.png",
     "At dusk, the Han general Mã Viện on a horse at the head of dense columns of soldiers "
     "with halberds and crossbows coming down to a wide river ford; on the near bank a thin "
     "line of Lạc Việt women raises star-cut shields. Grave, red-violet sky, iron grey and "
     "lacquer red. The Han are dignified, not caricatured."),
]:
    req(ST, rid, None, title, purpose, "3840x2160, opaque", "delivered", None, file, f"{STYLE} {prompt}")

# ------------------------------------------------------------------ output

STATUS_TEXT = {
    "stand-in": "stand-in in the prototype",
    "planned": "planned, not loaded yet",
    "reference": "reference only",
    "delivered": "delivered",
}


def build_doc() -> str:
    out = []
    out.append("# Bronze Drum: image requests\n")
    out.append(
        "Artwork for the Bronze Drum prototype in `bronzedrum/game/`, plus direction pieces for the "
        "look and atmosphere. Generated from `source/build_requests.py`; edit the data there and "
        "rerun it, which also rewrites `game/assets/manifest.json`.\n")
    out.append("## How to use this list\n")
    out.append(
        "1. Generate the three **style frames** (BD-S01 to BD-S03) first and choose a direction; "
        "the rest of the list is tuned to that choice before it is generated in full.\n"
        "2. Then the **inspiration and atmosphere** pieces (BD-M01 to BD-M14). They fix the "
        "look; when a later asset disagrees with them, the direction pieces win.\n"
        "3. Each prompt is complete on its own: paste it as it stands. The shared style text is "
        "already included in every prompt that needs it.\n"
        "4. Save each image under the file name in its **File** line and drop it in "
        "`bronzedrum/intake/` (or straight into `bronzedrum/game/assets/` and "
        "`bronzedrum/design/`). On integration the request's status flips to `delivered` and "
        "the game loads the file in place of its procedural stand-in.\n"
        "5. Cutouts need transparency. If the generator cannot produce alpha, use a flat pure "
        "magenta `#FF00FF` background as the prompts say; it is keyed out on integration.\n")
    out.append("## Art direction\n")
    out.append(
        "The game is staged as a **backlit paper-cut theatre**. Every element is a flat silhouette "
        "cut from paper, layered in depth and lit from behind: light glows through the cuts, and "
        "each layer throws a soft shadow onto the one behind it. The aim is the feeling of standing "
        "in a dark room among hanging hand-cut panels, with fire-lit, cave-like shadows.\n")
    out.append(
        "This direction is inspired by **Sarah Nguyen**'s hand-cut paper and fibre panels: "
        "suspended, backlit, built on folklore, plants, animals and a changing moon, often "
        "about women's stories. The prompts describe those *qualities* rather than naming her, "
        "so the generated art borrows the approach without copying her pieces. If she takes part "
        "in the project, her own work replaces these direction pieces.\n")
    out.append(
        "The second source is the **Dong Son bronze drum** (Lac Viet, before and around the "
        "Trung sisters' time). Its face is already a flat, concentric, stylised frieze of "
        "herons, feather-crowned figures, boats and stilt houses around a sun-star, so it "
        "translates naturally into cut paper. The drum face also serves as the HUD and, "
        "later, as the campaign map.\n")
    out.append("**Rules for every piece**\n")
    out.append(
        "- Flat colour fields. The only gradient is the glow of the backlight.\n"
        "- Silhouettes read first. Faces and armour are carried by cut holes, not by painted "
        "detail.\n"
        "- Lac Viet figures face right, Han figures face left.\n"
        "- The Han are people, not monsters: specific Eastern Han kit (ji halberds, crossbows, "
        "lamellar armour), ordinary faces.\n"
        "- Vietnamese names keep their diacritics wherever text appears (Trưng Trắc, Trưng Nhị, "
        "Mê Linh, Luy Lâu, Hát). The prompts are written without them so generators parse them "
        "cleanly; anything with lettering, like the logo, spells them exactly.\n"
        "- No gore. Hits burst into paper scraps.\n")
    out.append("**Palette** (the same values as `game/src/palette.js`)\n")
    out.append("| Name | Hex |\n| --- | --- |")
    for k, v in PALETTE.items():
        out.append(f"| {k} | `{v}` |")
    out.append("")
    out.append("## Summary\n")
    out.append("| Section | Requests | Stand-in | Planned | Reference | Delivered |")
    out.append("| --- | ---: | ---: | ---: | ---: | ---: |")
    totals = [0, 0, 0, 0, 0]
    for key, (title, _) in SECTIONS.items():
        rows = [r for r in REQUESTS if r["section"] == key]
        counts = [len(rows)] + [sum(r["status"] == s for r in rows) for s in ("stand-in", "planned", "reference", "delivered")]
        totals = [a + b for a, b in zip(totals, counts)]
        out.append(f"| {title} | " + " | ".join(str(c) for c in counts) + " |")
    out.append("| **total** | " + " | ".join(f"**{c}**" for c in totals) + " |")
    out.append("")
    for key, (title, intro) in SECTIONS.items():
        rows = [r for r in REQUESTS if r["section"] == key]
        out.append(f"## {title} ({len(rows)})\n")
        out.append(intro + "\n")
        for r in rows:
            out.append(f"### {r['id']} · {r['title']}\n")
            out.append(r["purpose"] + "\n")
            out.append(f"- **Spec:** {r['spec']}")
            status = STATUS_TEXT[r["status"]]
            if r["standin"]:
                status += f" · **Stand-in:** `{r['standin']}`"
            if r["asset"]:
                status += f" · **Game id:** `{r['asset']}`"
            out.append(f"- **Status:** {status}")
            where = "bronzedrum/design/" if not r["asset"] else "bronzedrum/game/assets/"
            out.append(f"- **File:** `{where}{r['file']}`")
            out.append(f"- **Prompt:** {r['prompt']}\n")
    return "\n".join(out).rstrip() + "\n"


def build_manifest() -> str:
    assets = []
    for r in REQUESTS:
        if not r["asset"]:
            continue
        entry = {"id": r["asset"], "request": r["id"], "file": r["file"], "status": r["status"],
                 "section": r["section"], "runtime": bool(r["standin"])}
        # The game loads the web copy made by build_web_art.py, not the master.
        if entry["runtime"] and (ROOT / "game" / "assets" / "web" / f"{r['asset']}.webp").exists():
            entry["web"] = f"web/{r['asset']}.webp"
        assets.append(entry)
    return json.dumps({"generatedBy": "bronzedrum/design/source/build_requests.py", "assets": assets}, indent=2, ensure_ascii=False) + "\n"


def validate() -> None:
    ids = [r["id"] for r in REQUESTS]
    assert len(ids) == len(set(ids)), "duplicate request id"
    assets = [r["asset"] for r in REQUESTS if r["asset"]]
    assert len(assets) == len(set(assets)), "duplicate game id"
    for r in REQUESTS:
        assert r["status"] in STATUS_TEXT, r["id"]
        assert r["section"] in SECTIONS, r["id"]
        if r["status"] == "stand-in":
            assert r["asset"] and r["standin"], f"{r['id']}: a stand-in needs a game id and a stand-in"
        if r["status"] == "delivered":
            base = ROOT / "game" / "assets" if r["asset"] else ROOT / "design"
            assert (base / r["file"]).exists(), f"{r['id']}: delivered file missing"


def main() -> int:
    validate()
    outputs = {DOC: build_doc(), MANIFEST: build_manifest()}
    if "--check" in sys.argv:
        stale = [p for p, text in outputs.items() if not p.exists() or p.read_text(encoding="utf-8") != text]
        for p in stale:
            print(f"out of date: {p.relative_to(ROOT.parent)} (run build_requests.py)")
        return 1 if stale else 0
    for p, text in outputs.items():
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(text, encoding="utf-8")
        print(f"wrote {p.relative_to(ROOT.parent)}")
    print(f"{len(REQUESTS)} requests")
    return 0


if __name__ == "__main__":
    sys.exit(main())
