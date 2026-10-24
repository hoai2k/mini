#!/usr/bin/env python3
"""Generate Smoothcraft's image requests from the vanilla texture list.

Inputs (all in this folder):
  vanilla_textures.tsv  every vanilla block, entity and environment texture with its
                        size, animation frames and transparency (tools/list_vanilla_textures.py)
  PROMPTS below         hand-written prompts for the common things, tier 1
  ../../mod/src/main/resources/assets/smoothcraft/materials.json
                        the material rules, reused to describe each surface

Outputs (in design/):
  image-requests.md           how to deliver, plus every tier 1 request in full
  image-requests-blocks.md    every other block texture (tier 2)
  image-requests-entities.md  every other entity and sky texture (tier 3)
  image-requests.json         the same list, machine readable, with each status

A request is "delivered" when its file exists in the HD resource pack
(mod/src/main/resources/resourcepacks/hd/assets/minecraft/textures/...).
Edit the data here and rerun:  python3 design/source/build_requests.py
"""
from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
DESIGN = HERE.parent
PACK = "mod/src/main/resources/resourcepacks/hd/assets/minecraft/textures"
MATERIALS = ROOT / "mod/src/main/resources/assets/smoothcraft/materials.json"

# Textures that are tools, debug art or screen overlays rather than things in the world.
SKIP = re.compile(
    r"^block/(debug|debug2|destroy_oit_stage_\d|jigsaw_.*|structure_block.*|test_block_.*|test_instance_block|barrier|light_\d+)$"
    r"|^environment/(clouds|end_sky|rain|snow)$"
    r"|^entity/(experience/.*|end_portal|beacon_beam|enchantment/.*|guardian_beam|fishing/.*)$"
)

STYLE = (
    "Photoreal, finely detailed base-colour (albedo) map. Flat, even, shadowless lighting: "
    "no baked shadows, ambient occlusion, highlights or reflections (Smoothcraft lights every "
    "surface itself). Keep the vanilla colours and overall read so the game is still recognisable."
)

# Material name -> words that tell the image model what the surface is made of.
MATERIAL_WORDS = {
    "default": "a believable real-world material",
    "stone": "natural rough rock with grain, small fractures and mineral variation",
    "polished_stone": "cut and polished stone with subtle veining",
    "soil": "loose earthy soil with small pebbles, roots and crumbs",
    "grass": "dense living grass and soil",
    "sand": "fine loose granular sand or gravel, individual grains visible",
    "wood": "sawn and planed timber with clear grain, knots and joints",
    "bark": "natural tree bark, or end grain with growth rings on end faces",
    "foliage": "living plant matter, leaves and stems with veins",
    "iron": "forged and worn iron or steel, scratches and slight rust in the crevices",
    "gold": "polished gold with soft wear",
    "copper": "fresh salmon-orange copper with hammer marks",
    "patina": "weathered copper with blue-green verdigris patina",
    "glass": "clear glass with faint imperfections",
    "ice": "compacted clear ice with trapped bubbles and cracks",
    "snow": "soft packed snow with crystalline sparkle",
    "water": "clear water surface",
    "lava": "molten glowing lava with dark cooling crust",
    "glowing": "a self-lit glowing material: bright light-emitting parts with darker structure",
    "gem": "faceted crystalline gemstone",
    "cloth": "woven wool or felt with visible fibres and weave",
    "concrete": "smooth matte concrete with fine pores",
    "ceramic": "fired clay, brick or terracotta with mortar and small chips",
    "glazed": "glossy glazed ceramic tile",
    "obsidian": "glassy black volcanic obsidian with conchoidal fractures",
    "nether": "hellish porous rock, fungal growth and flesh-like matter",
    "gel": "translucent glossy gel",
    "bone": "bleached bone, calcite or dripstone",
    "organic": "organic living matter (coral, fungus, sponge, wax)",
    "paper": "paper, books and worked wood",
    "ore": "natural rock with embedded raw mineral crystals or nuggets",
}

# Tier 1: the common things, by texture path. Each prompt is what to paint;
# the delivery rules (size, layout, transparency) are added for every request.
PROMPTS: dict[str, str] = {
    # Terrain
    "block/grass_block_top": "Top of a grass block seen straight down: dense short meadow grass blades with a few clover leaves, painted greyscale-to-light-green because the game tints it by biome; no flowers.",
    "block/grass_block_side": "Side of a grass block: a cross-section of rich brown soil with small stones and roots; the top 3/16 is a ragged fringe of grass overhanging the edge.",
    "block/grass_block_side_overlay": "Only the grass fringe from the side of a grass block, greyscale (biome-tinted in game), on a fully transparent background.",
    "block/grass_block_snow": "Side of a snowy grass block: brown soil with roots and a thick, soft layer of snow with a rounded lip along the top.",
    "block/dirt": "Moist dark-brown topsoil with small pebbles, fine roots and crumbly clods.",
    "block/coarse_dirt": "Dry coarse dirt with lots of gravel and small stones mixed in.",
    "block/podzol_top": "Forest floor: brown soil covered in spruce needles, small twigs and decayed leaves.",
    "block/podzol_side": "Side of podzol: soil cross-section with a layer of needle litter on top.",
    "block/mycelium_top": "Purple-grey fungal mat over soil, fine white threads and tiny spore specks.",
    "block/mycelium_side": "Soil cross-section topped with a purple-grey fungal mat.",
    "block/dirt_path_top": "Trampled, compacted dirt footpath with fine dust, a few flattened grass blades at the edges.",
    "block/farmland": "Dry tilled farmland, parallel furrows of loose soil.",
    "block/farmland_moist": "Wet dark tilled farmland, parallel furrows glistening with moisture (paint it dark, not shiny).",
    "block/mud": "Wet dark grey-brown mud with puddle shapes and footprints, no reflections.",
    "block/clay": "Smooth pale blue-grey clay with fine sculpted ridges.",
    "block/sand": "Fine pale-yellow beach sand with ripples and a few shell fragments.",
    "block/red_sand": "Fine rust-red desert sand with gentle ripples.",
    "block/gravel": "Loose river gravel of rounded grey and brown pebbles of mixed sizes.",
    "block/stone": "Grey limestone bedrock face with natural cracks and subtle strata.",
    "block/cobblestone": "Rough rounded grey stones packed together with dark gaps of mortar and dirt between them.",
    "block/mossy_cobblestone": "Rough rounded grey stones with thick green moss growing in the gaps and over the tops.",
    "block/stone_bricks": "Dressed rectangular grey stone blocks laid in a running bond with mortar joints, slightly weathered.",
    "block/mossy_stone_bricks": "Dressed grey stone blocks with moss growing along the joints.",
    "block/cracked_stone_bricks": "Dressed grey stone blocks with deep cracks and chipped corners.",
    "block/smooth_stone": "Smooth, honed grey stone slab surface with a faint bevelled border.",
    "block/granite": "Pink-red granite, coarse crystals of feldspar, quartz and black mica.",
    "block/diorite": "White and grey speckled diorite, salt-and-pepper crystals.",
    "block/andesite": "Fine grey andesite with small darker flecks.",
    "block/polished_granite": "Polished pink granite tile.",
    "block/polished_diorite": "Polished speckled diorite tile.",
    "block/polished_andesite": "Polished grey andesite tile.",
    "block/deepslate": "Dark grey-blue slate rock with fine vertical foliation lines.",
    "block/deepslate_top": "End face of deepslate: dark slate with concentric layered grain.",
    "block/cobbled_deepslate": "Rough broken pieces of dark slate packed together.",
    "block/tuff": "Grey-green volcanic tuff, porous with small embedded fragments.",
    "block/calcite": "White calcite with soft crystalline texture and faint veins.",
    "block/bedrock": "Unbreakable bedrock: chaotic mix of very dark and grey hard rock.",
    "block/obsidian": "Black volcanic obsidian with deep purple sheen streaks and conchoidal fracture shapes.",
    "block/sandstone": "Layered yellow sandstone, horizontal strata, wind-worn.",
    "block/sandstone_top": "Top of sandstone: flat, fine-grained yellow sandstone.",
    "block/snow": "Fresh fluffy snow surface with soft dimples.",
    "block/ice": "Clear blue lake ice with internal cracks and trapped bubbles (semi-transparent as in vanilla).",
    "block/packed_ice": "Dense opaque pale-blue compacted ice with long fracture lines.",
    "block/water_still": "Animated still water: clear rippling surface, greyscale (the game tints it by biome); same frame count as vanilla, each frame flowing into the next.",
    "block/water_flow": "Animated flowing water streaks, greyscale for biome tint; same frame count, seamless loop.",
    "block/lava_still": "Animated molten lava: bright orange-yellow liquid rock with slowly drifting dark crust; seamless loop.",
    "block/lava_flow": "Animated flowing lava streaks with crust breaking up; seamless loop.",
    # Ores
    "block/coal_ore": "Grey stone with embedded black lumps of coal.",
    "block/iron_ore": "Grey stone with embedded beige-orange iron ore nuggets.",
    "block/copper_ore": "Grey stone with orange and green-tinged copper ore veins.",
    "block/gold_ore": "Grey stone with bright gold ore nuggets.",
    "block/redstone_ore": "Grey stone with glittering deep red crystal clusters.",
    "block/lapis_ore": "Grey stone with deep blue lapis lazuli flecks.",
    "block/diamond_ore": "Grey stone with pale cyan diamond crystals poking out.",
    "block/emerald_ore": "Grey stone with small hexagonal green emerald crystals.",
    "block/deepslate_diamond_ore": "Dark slate with pale cyan diamond crystals.",
    "block/deepslate_iron_ore": "Dark slate with beige-orange iron ore nuggets.",
    # Wood
    "block/oak_log": "Oak bark: thick, deeply furrowed grey-brown bark running vertically.",
    "block/oak_log_top": "End grain of an oak log: growth rings, pale heartwood and a bark rim around the edge.",
    "block/oak_planks": "Oak floor planks: four horizontal boards with visible grain, small knots and butt joints.",
    "block/oak_leaves": "Clusters of oak leaves with lobed edges, greyscale for biome tint, gaps transparent.",
    "block/birch_log": "Birch bark: white papery bark with black horizontal lenticels and peeling strips.",
    "block/birch_log_top": "End grain of a birch log with pale rings and a white bark rim.",
    "block/birch_planks": "Pale cream birch planks with fine grain.",
    "block/birch_leaves": "Small toothed birch leaves, greyscale for tint, gaps transparent.",
    "block/spruce_log": "Spruce bark: dark brown scaly bark.",
    "block/spruce_log_top": "End grain of a spruce log with tight rings and dark bark rim.",
    "block/spruce_planks": "Mid-brown spruce planks with straight grain.",
    "block/spruce_leaves": "Spruce needle sprays, greyscale for tint, gaps transparent.",
    "block/jungle_log": "Jungle tree bark: tan bark with moss and vertical ridges.",
    "block/dark_oak_log": "Dark oak bark: very dark, thick, blocky bark.",
    "block/dark_oak_planks": "Rich chocolate-brown dark oak planks.",
    "block/acacia_log": "Acacia bark: grey, rough bark with orange inner wood showing in the cracks.",
    "block/cherry_log": "Cherry bark: dark maroon bark with horizontal lenticels.",
    "block/cherry_leaves": "Pink cherry blossom clusters with a few leaves, gaps transparent.",
    "block/mangrove_log": "Mangrove bark: reddish-brown smooth bark.",
    "block/crafting_table_top": "Top of a crafting table: a 3x3 grid of engraved squares in an oak work top, tool scratches.",
    "block/crafting_table_front": "Front of a crafting table: oak boards with a saw and hammer hanging on it.",
    "block/crafting_table_side": "Side of a crafting table: oak boards with hanging tools.",
    "block/bookshelf": "Shelf of old leather-bound books in varied colours, worn spines and gold lettering, oak shelf boards top and bottom.",
    "block/glass": "Clear window pane with a thin wooden-free bevelled edge and faint streaks; transparent interior as in vanilla.",
    # Building blocks
    "block/bricks": "Red clay bricks in a running bond with pale grey mortar, slightly chipped edges.",
    "block/white_wool": "White sheep's wool felt with soft visible fibres.",
    "block/terracotta": "Plain orange-brown fired clay, matte, faint tool marks.",
    "block/furnace_front": "Front of a stone furnace: cobblestone with an iron-framed opening, cold and dark inside.",
    "block/furnace_front_on": "Front of a lit stone furnace: iron-framed opening with glowing embers and flames inside.",
    "block/furnace_side": "Side of a stone furnace: smooth cut stone.",
    "block/furnace_top": "Top of a stone furnace: smooth cut stone.",
    "block/torch": "A wooden torch stick with a burning cloth-wrapped head, on transparent background, in the same thin column as vanilla.",
    "block/iron_block": "Block of iron: riveted brushed steel plates.",
    "block/gold_block": "Block of gold: polished stamped gold plates.",
    "block/diamond_block": "Block of diamond: cut pale cyan gem tiles.",
    "block/glowstone": "Glowing yellow crystalline clusters packed together, bright and self-lit.",
    "block/netherrack": "Fleshy dark-red porous rock of the Nether.",
    "block/soul_sand": "Dark brown sand with faint anguished faces pressed into it.",
    "block/end_stone": "Pale yellow pitted alien stone.",
    "block/tnt_side": "A bundle of red dynamite sticks wrapped with a white paper band reading TNT.",
    # Environment
    "environment/celestial/sun": "The sun: a bright white-yellow disc with a soft limb and faint glow, centred, on black; square image.",
    "environment/celestial/moon/full_moon": "The full moon, realistic craters and maria, on black.",
    # Mobs and people
    "entity/villager/villager": "Villager base skin on the vanilla UV layout. Realistic weathered human face: long face, heavy single dark unibrow, deep-set green eyes with real irises and catchlights, very large long nose (the nose has its own small box in the layout: paint it as a fleshy, real nose), fine wrinkles, tanned skin; plain brown homespun robe with folds and stitching; hands as real hands on the crossed-arms box.",
    "entity/villager/type/plains": "Plains villager outfit overlay (biome clothing) on the vanilla UV layout: brown and green wool tunic with a rope belt; transparent wherever vanilla is transparent.",
    "entity/villager/type/desert": "Desert villager outfit overlay: sun-bleached cotton robes and a head wrap in sand tones.",
    "entity/villager/type/snow": "Snowy villager outfit overlay: fur-lined coat and hood.",
    "entity/villager/type/taiga": "Taiga villager outfit overlay: woollen layers and a fur hat.",
    "entity/villager/type/jungle": "Jungle villager outfit overlay: woven leaf and bark fibre garments.",
    "entity/villager/type/savanna": "Savanna villager outfit overlay: warm orange woven cloth and beads.",
    "entity/villager/type/swamp": "Swamp villager outfit overlay: damp green-brown oilcloth with reeds.",
    "entity/villager/profession/librarian": "Librarian profession overlay: a white cloth cap and a red-leather apron with pen and paper.",
    "entity/villager/profession/farmer": "Farmer profession overlay: a wide straw hat and a work apron.",
    "entity/villager/profession/armorer": "Armorer profession overlay: a dark welding mask pushed up and a heavy leather apron.",
    "entity/villager/profession/butcher": "Butcher profession overlay: a white apron with stains and a red headband.",
    "entity/villager/profession/cartographer": "Cartographer profession overlay: a monocle, gold-trimmed vest.",
    "entity/villager/profession/cleric": "Cleric profession overlay: purple and gold vestments.",
    "entity/villager/profession/fisherman": "Fisherman profession overlay: a woven fishing hat and an oilskin apron.",
    "entity/villager/profession/fletcher": "Fletcher profession overlay: a feathered hat and a quiver strap.",
    "entity/villager/profession/leatherworker": "Leatherworker profession overlay: a tooled leather apron and cap.",
    "entity/villager/profession/mason": "Mason profession overlay: a dusty apron and a leather bucket hat.",
    "entity/villager/profession/shepherd": "Shepherd profession overlay: a wool hat and a sheepskin vest.",
    "entity/villager/profession/toolsmith": "Toolsmith profession overlay: a blacksmith's apron with tool pockets.",
    "entity/villager/profession/weaponsmith": "Weaponsmith profession overlay: an eye patch and a scarred leather apron.",
    "entity/villager/profession/nitwit": "Nitwit profession overlay: a green smock.",
    "entity/wandering_trader/wandering_trader": "Wandering trader on the villager UV layout: same realistic face style as the villager, a dark blue travelling cloak with hood and patches.",
    "entity/zombie/zombie": "Zombie on the player UV layout: decaying green-grey human skin, sunken dark eye sockets with dim eyes, torn cyan shirt and dark blue trousers, realistic rot and stitch detail.",
    "entity/zombie/husk": "Husk on the player UV layout: desiccated sun-dried zombie, cracked leathery tan skin, tattered desert clothing.",
    "entity/zombie/drowned": "Drowned on the player UV layout: waterlogged blue-green zombie with seaweed and barnacles.",
    "entity/zombie_villager/zombie_villager": "Zombie villager base on the villager layout: the realistic villager face rotting green-grey, big nose, torn robe.",
    "entity/skeleton/skeleton": "Skeleton on its UV layout: real bleached human bones, skull with deep eye sockets and teeth, ribcage detail.",
    "entity/skeleton/stray": "Stray: frost-covered skeleton with tattered ice-blue rags.",
    "entity/skeleton/wither_skeleton": "Wither skeleton: charred black bones, cracked skull.",
    "entity/creeper/creeper": "Creeper on its UV layout: mottled green leafy-scaly hide like a plant-reptile, the iconic black frowning face rendered as dark hollow pits.",
    "entity/spider/spider": "Spider on its UV layout: realistic dark hairy tarantula body, glossy red multiple eyes.",
    "entity/spider/cave_spider": "Cave spider: blue-teal hairy spider with red eyes.",
    "entity/enderman/enderman": "Enderman on its UV layout: very dark charcoal-black skin with a faint purple sheen, textured like smooth stone-flesh.",
    "entity/enderman/enderman_eyes": "Enderman eyes glow layer: bright purple-magenta glowing eyes only, everything else transparent.",
    "entity/iron_golem/iron_golem": "Iron golem on its UV layout: riveted iron plates with rust streaks and vines, a long stony nose, deep-set red eyes.",
    "entity/cow/cow_temperate": "Cow on its UV layout: realistic Holstein hide, black and white short fur, pink muzzle, real cow eyes, small horns.",
    "entity/pig/pig_temperate": "Pig on its UV layout: realistic pink pig skin with sparse bristles, wet snout with nostrils, small eyes.",
    "entity/sheep/sheep": "Sheep (shorn body) on its UV layout: pale skin with short fleece stubble, a realistic sheep face.",
    "entity/sheep/sheep_wool": "Sheep wool coat on its UV layout: thick curly white fleece, greyscale-white (the game dyes it).",
    "entity/chicken/chicken_temperate": "Chicken on its UV layout: white feathers with realistic barbs, red comb and wattle, yellow beak and scaly legs.",
    "entity/horse/horse_brown": "Brown horse on its UV layout: glossy short bay coat, dark mane and tail, realistic horse eyes and nostrils.",
    "entity/wolf/wolf": "Wild wolf on its UV layout: grey-white thick fur, amber eyes, dark nose.",
    "entity/wolf/wolf_tame": "Tame wolf on its UV layout: same fur, friendlier eyes.",
    "entity/cat/cat_tabby": "Tabby cat on its UV layout: striped brown tabby fur, green eyes, pink nose.",
    "entity/slime/slime": "Slime cube on its UV layout: translucent green gel with suspended bubbles and a darker inner core with face.",
    "entity/player/wide/steve": "Steve on the player UV layout: realistic young man, short brown hair, blue eyes, light stubble, cyan t-shirt, blue jeans, grey shoes.",
    "entity/player/slim/alex": "Alex on the slim player UV layout: realistic young woman, ginger hair in a side ponytail, green eyes, freckles, light green shirt, brown trousers.",
    "entity/bee/bee": "Bee on its UV layout: fuzzy yellow and black banded bee with translucent wings.",
    "entity/fox/fox": "Red fox on its UV layout: orange fur, white chest and muzzle, black legs.",
    "entity/axolotl/axolotl_lucy": "Pink axolotl on its UV layout: smooth wet skin, feathery gills.",
    "entity/bat/bat": "Bat on its UV layout: furry brown body, thin leathery wings.",
}


@dataclass
class Texture:
    path: str
    width: int
    height: int
    frames: int
    alpha: str


def load_textures() -> list[Texture]:
    rows = (HERE / "vanilla_textures.tsv").read_text().strip().split("\n")[1:]
    out = []
    for row in rows:
        path, w, h, frames, alpha = row.split("\t")
        if not SKIP.search(path):
            out.append(Texture(path, int(w), int(h), int(frames), alpha))
    return out


def material_for(name: str, rules) -> str:
    for pattern, material in rules:
        if pattern.search(name):
            return material
    return "default"


def scale_for(tex: Texture) -> int:
    """Blocks 16x (a 16 px face becomes 256 px); everything else 8x, capped at 2048 px."""
    if tex.path.startswith("block/") and tex.width <= 16:
        scale = 16
    else:
        scale = 8
    while max(tex.width, tex.height) * scale > 2048 and scale > 1:
        scale //= 2
    return scale


SUFFIXES = [
    (r"_top$", "top face"), (r"_bottom$", "bottom face"), (r"_side\d?$", "side face"),
    (r"_front$", "front face"), (r"_back$", "back face"), (r"_end$", "end face"),
    (r"_inner$", "inside face"), (r"_on$", "switched-on state"), (r"_lit$", "lit state"),
    (r"_stage_?(\d+)$", r"growth stage \1"), (r"_open$", "open state"), (r"_overlay$", "overlay layer"),
    (r"_baby$", "baby"),
]


def describe_name(name: str) -> str:
    leaf = name.split("/")[-1]
    notes = []
    for pattern, words in SUFFIXES:
        m = re.search(pattern, leaf)
        if m:
            notes.append(m.expand(words))
            leaf = leaf[: m.start()]
    thing = leaf.replace("_", " ").strip()
    return thing + (f" ({', '.join(notes)})" if notes else "")


def auto_prompt(tex: Texture, material: str) -> str:
    what = describe_name(tex.path)
    if tex.path.startswith("block/"):
        words = MATERIAL_WORDS[material]
        if material == "bark":
            words = ("end grain with growth rings inside a rim of bark" if tex.path.endswith("_top")
                     else "deeply furrowed natural tree bark")
        return f"Realistic, high-detail {what}: {words}."
    if tex.path.startswith("entity/"):
        group = tex.path.split("/")[1].replace("_", " ")
        return (f"Realistic {what} ({group}) painted onto the vanilla UV layout: real fur, skin, scales, "
                f"cloth or material as the creature or object would have, faces and eyes rendered lifelike.")
    return f"Realistic {what}."


def delivery_notes(tex: Texture, scale: int) -> list[str]:
    w, h = tex.width * scale, tex.height * scale
    notes = [f"{w}x{h} px PNG"]
    if tex.frames > 1:
        fw, fh = (w, h // tex.frames) if h >= w else (w // tex.frames, h)
        notes.append(f"animation strip of {tex.frames} frames ({fw}x{fh} each), stacked as in vanilla; keep the vanilla .mcmeta timing")
    if tex.path.startswith("block/"):
        notes.append("tiles seamlessly on all four edges")
    else:
        notes.append("keep the vanilla UV layout exactly: every region where vanilla puts it (use the reference from tools/make_references.py)")
    if tex.alpha == "cutout":
        notes.append("transparent wherever vanilla is transparent, hard alpha edges (0 or 255)")
    elif tex.alpha == "translucent":
        notes.append("keep vanilla's partial transparency")
    return notes


def main() -> None:
    data = json.loads(MATERIALS.read_text())
    rules = [(re.compile(p), m) for p, m in data["rules"]]
    textures = load_textures()
    known = {t.path for t in textures}
    missing = sorted(set(PROMPTS) - known)
    if missing:
        raise SystemExit(f"PROMPTS name textures that are not in vanilla_textures.tsv: {missing}")

    requests = []
    for tex in textures:
        name = tex.path.split("/", 1)[1] if tex.path.startswith("block/") else tex.path
        material = material_for(name, rules) if tex.path.startswith("block/") else "-"
        scale = scale_for(tex)
        tier = 1 if tex.path in PROMPTS else (2 if tex.path.startswith("block/") else 3)
        target = f"{PACK}/{tex.path}.png"
        requests.append({
            "id": tex.path,
            "tier": tier,
            "vanilla_size": [tex.width, tex.height],
            "size": [tex.width * scale, tex.height * scale],
            "frames": tex.frames,
            "alpha": tex.alpha,
            "material": material,
            "target": f"smoothcraft/{target}",
            "prompt": PROMPTS.get(tex.path) or auto_prompt(tex, material if material != "-" else "default"),
            "delivery": delivery_notes(tex, scale),
            "status": "delivered" if (ROOT / target).exists() else "requested",
        })

    lines = ",\n".join("  " + json.dumps({k: v for k, v in r.items() if k != "delivery"}, separators=(",", ":"))
                        for r in requests)
    (DESIGN / "image-requests.json").write_text(
        "{\"style\":" + json.dumps(STYLE) + ",\n\"requests\":[\n" + lines + "\n]}\n")

    tier1 = [r for r in requests if r["tier"] == 1]
    tier2 = [r for r in requests if r["tier"] == 2]
    tier3 = [r for r in requests if r["tier"] == 3]
    done = sum(r["status"] == "delivered" for r in requests)

    def full(r) -> str:
        return (f"### `{r['id']}`  ({r['status']})\n\n{r['prompt']}\n\n"
                f"- Deliver: {'; '.join(r['delivery'])}\n"
                + (f"- Material: {r['material']}\n" if r["material"] != "-" else "")
                + f"- File: `{r['target']}`\n")

    def row(r) -> str:
        w, h = r["size"]
        extra = []
        if r["frames"] > 1:
            extra.append(f"{r['frames']} frames")
        if r["alpha"] != "opaque":
            extra.append(r["alpha"])
        return (f"| `{r['id']}` | {w}x{h}{' (' + ', '.join(extra) + ')' if extra else ''} | "
                f"{r['material']} | {r['prompt']} | {r['status']} |")

    header = "<!-- Generated by design/source/build_requests.py. Edit the data there and rerun. -->\n\n"
    table_head = "| Texture | Size | Material | Prompt | Status |\n| --- | --- | --- | --- | --- |\n"

    (DESIGN / "image-requests.md").write_text(header + f"""# Smoothcraft image requests

Smoothcraft replaces Minecraft's 16 px textures with high-resolution, realistic
ones: "the thing itself, imagined in detail". There are {len(requests)} requests;
{done} delivered so far.

- **Tier 1** (below, {len(tier1)}): the common things, each with its own prompt.
  Do these first; they cover most of what is on screen.
- **Tier 2** ([image-requests-blocks.md](image-requests-blocks.md), {len(tier2)}): every other block texture.
- **Tier 3** ([image-requests-entities.md](image-requests-entities.md), {len(tier3)}): every other mob, object and sky texture.
- Machine-readable: [image-requests.json](image-requests.json).

## Rules for every image

{STYLE}

1. **Size.** Block textures are 16x the vanilla size (a 16x16 face becomes
   256x256); mobs, objects and the sky are 8x (a 64x64 skin becomes 512x512),
   capped at 2048 px. Generate larger if you like and downscale to exactly the
   listed size: the game needs the exact multiple.
2. **Block textures tile.** Each one repeats edge to edge across the world, so
   every edge must continue seamlessly into the opposite edge. No borders,
   vignettes or frames (unless the vanilla texture has one, like a furnace).
3. **Mob and object textures are UV maps**, not pictures. Each region of the
   image wraps one face of one box of the model (head front, head top, arm
   side...). Paint over the vanilla layout and keep every region where it is.
   Run `python3 smoothcraft/tools/make_references.py` to get an upscaled copy
   of every vanilla texture (from your own Minecraft jar) in
   `local/smoothcraft/references/`, and use it as the image-to-image or
   inpainting source. Smoothcraft rounds the boxes, so a face painted across
   the head-front region shows as a real, rounded face.
4. **Transparency.** Where vanilla is transparent (leaf gaps, flower
   backgrounds, unused UV space), stay transparent. "cutout" means hard 0/255
   alpha; "translucent" means keep the partial alpha (glass, ice, water).
5. **Animated textures** are vertical strips of frames, same count and order as
   vanilla.
6. **Tinted textures** (grass, leaves, water, sheep wool) are greyscale or
   pale in vanilla because the game colours them per biome or dye. Keep them
   light and nearly neutral.
7. **No lighting in the image.** Smoothcraft adds sun, sky, torch light,
   shadows-from-sky-access, specular shine and bumps itself from each block's
   material (listed per request), so baked shadows or shine would double up.

Drop finished images in `smoothcraft/intake/` named by their texture id
(`block/oak_log.png` or `block__oak_log.png`); they are moved into the HD
resource pack at the listed file path.

## Tier 1: the common things

""" + "\n".join(full(r) for r in tier1))

    (DESIGN / "image-requests-blocks.md").write_text(header + f"""# Smoothcraft image requests, tier 2: blocks

{len(tier2)} block textures. The rules in [image-requests.md](image-requests.md)
apply to every one: {STYLE} Block textures tile seamlessly, 16x the vanilla
size. File: `smoothcraft/{PACK}/<texture>.png`.

{table_head}""" + "\n".join(row(r) for r in tier2) + "\n")

    (DESIGN / "image-requests-entities.md").write_text(header + f"""# Smoothcraft image requests, tier 3: mobs, objects and sky

{len(tier3)} textures. The rules in [image-requests.md](image-requests.md) apply:
{STYLE} These are UV maps at 8x the vanilla size: paint over the reference from
`tools/make_references.py` and keep every region in place.
File: `smoothcraft/{PACK}/<texture>.png`.

{table_head}""" + "\n".join(row(r) for r in tier3) + "\n")

    print(f"{len(requests)} requests: tier 1 {len(tier1)}, tier 2 {len(tier2)}, tier 3 {len(tier3)}; {done} delivered")


if __name__ == "__main__":
    main()
