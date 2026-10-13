#!/usr/bin/env python3
"""Generate the Percy Jackson concept-art requests.

Edit the data in this file, then run:

    python3 percyjackson/design/source/build_requests.py          # write
    python3 percyjackson/design/source/build_requests.py --check  # verify up to date

Output:
    percyjackson/design/image-requests.md

Statuses:
    requested  not generated yet
    delivered  the file is at percyjackson/design/concept/<id>.png
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOC = ROOT / "image-requests.md"
CONCEPT = ROOT / "concept"

# The chosen direction: "cartoon heroes in an ornamental world" (see
# ../../reference/README.md, families 5, 6 and 10). Prompts describe the look
# rather than naming living artists, and every image is original.
PALETTE = (
    "Palette: camp orange #f28c28, sea teal #0f6f73, deep navy #10233d, jade #2e8b6e, "
    "coral #e8664a, bronze gold #c9963a, lightning yellow #ffd84a, parchment cream #f4ead5, "
    "vase black #17130f and owl grey #8c96a3."
)

CHARACTER_STYLE = (
    "Clean, bright cartoon illustration for a 2D adventure game for players aged 8 to 14: "
    "confident ink outlines of varying weight, flat cel-shaded colour with one shadow tone and a "
    "small highlight, expressive faces with large readable eyes but natural proportions (the "
    "twelve-year-olds about six heads tall), lively poses and strong silhouettes that read at "
    "small size. Original character designs, not likenesses of any actor. " + PALETTE
)

WORLD_STYLE = (
    "Cartoon heroes in an ornamental world: the characters are drawn in a clean, bright cartoon "
    "style (ink outlines, flat cel-shaded colour, expressive faces) and stand in front of a world "
    "painted as flat decorative illustration: layered patterned shapes, waves, clouds and smoke "
    "drawn as curling ornamental ribbons, Greek-key and wave-scroll borders, black-figure and "
    "red-figure vase motifs, fine gold-leaf linework on deep teal, navy and black grounds, a subtle "
    "paper grain. Modern places (New York, highways, Las Vegas) get the same ornamental treatment, "
    "so that skyscrapers and neon look as if painted on an ancient vase. Exciting rather than "
    "frightening: monsters are bold and dramatic, never gory. " + PALETTE
)

NO_TEXT = "No lettering, logos, captions or watermark."

SHEET_LAYOUT = (
    "A character model sheet on a flat parchment-cream background: one full figure seen "
    "front-on, one three-quarter view and one from behind, standing side by side at the same "
    "scale, with three small head studies showing different expressions and two or three small "
    "prop details along the bottom. No cast shadow."
)

# Shared descriptions so every prompt draws the cast the same way.
PERCY = (
    "Percy Jackson, twelve, son of Poseidon: slim, messy jet-black hair, sea-green eyes, a "
    "lopsided troublemaker grin; orange Camp Half-Blood T-shirt (a small black pegasus emblem), "
    "faded jeans, worn sneakers; Riptide, a leaf-shaped celestial-bronze sword that turns into a "
    "ballpoint pen when capped"
)
ANNABETH = (
    "Annabeth Chase, twelve, daughter of Athena: athletic, tanned, curly honey-blonde hair in a "
    "high ponytail, sharp storm-grey eyes, a confident, calculating look; orange Camp Half-Blood "
    "T-shirt, shorts, a clay-bead camp necklace, a bronze dagger at her belt and a navy New York "
    "Yankees-style baseball cap (no logo) that makes her invisible"
)
GROVER = (
    "Grover Underwood, a satyr who looks about twelve: lanky, curly brown hair hiding two small "
    "horns, a wispy goatee, kind nervous eyes; in disguise a cap, a T-shirt, baggy jeans over "
    "furry goat legs and oversized fake sneakers; carries reed pipes and nibbles a tin can"
)
CHIRON = (
    "Chiron, the wise centaur and camp director: a kindly bearded man with brown curly hair and "
    "a tweed jacket, from the waist down a white stallion; a quiver and bow on his back"
)
TRIO = f"{PERCY}; {ANNABETH}; {GROVER}"

REQUESTS: list[dict] = [
    # ---- Style key: generate first; attach it as a reference to everything else.
    {
        "id": "key-art",
        "group": "Style key",
        "title": "Key art: the three heroes set out",
        "size": "2560 × 1440",
        "references": [],
        "use": "Fixes the look. Generate it first and attach it to every later request.",
        "prompt": (
            f"Key art for a game of Rick Riordan's The Lightning Thief. The three heroes stand on "
            f"Half-Blood Hill at golden hour beside a tall, lone pine tree, looking out toward a distant ornamental New York skyline and a stormy "
            f"sky crackling with stylised lightning bolts. {TRIO}. Percy holds Riptide drawn, Annabeth "
            f"points the way, Grover clutches his pipes. The scene sits inside a black-and-gold "
            f"ornamental frame of Greek-key borders with small emblems in the corners (a trident, an "
            f"owl, a lightning bolt, a pan pipe) and an empty cartouche at the top for the title. "
            f"{WORLD_STYLE} {NO_TEXT}"
        ),
    },
    # ---- Character sheets
    {
        "id": "char-percy",
        "group": "Character sheets",
        "title": "Percy Jackson",
        "size": "2400 × 1600",
        "references": ["key-art"],
        "use": "Player character.",
        "prompt": (
            f"{PERCY}. Props: Riptide as a sword and as a capped pen, a small swirl of water curling "
            f"around his free hand. Body language: restless, brave, a little sarcastic. "
            f"{SHEET_LAYOUT} {CHARACTER_STYLE} {NO_TEXT}"
        ),
    },
    {
        "id": "char-annabeth",
        "group": "Character sheets",
        "title": "Annabeth Chase",
        "size": "2400 × 1600",
        "references": ["key-art"],
        "use": "Second playable hero.",
        "prompt": (
            f"{ANNABETH}. Add one small extra figure of her in battle gear: a bronze Greek "
            f"breastplate over the camp shirt and a bronze helmet with a grey horsehair crest, and "
            f"one small figure half-faded to show the cap's invisibility. Props: the bronze dagger, "
            f"the cap, a rolled architectural sketch. Body language: poised, quick, always planning. "
            f"{SHEET_LAYOUT} {CHARACTER_STYLE} {NO_TEXT}"
        ),
    },
    {
        "id": "char-grover",
        "group": "Character sheets",
        "title": "Grover Underwood",
        "size": "2400 × 1600",
        "references": ["key-art"],
        "use": "Third playable hero.",
        "prompt": (
            f"{GROVER}. Show the full figure twice: once in disguise (cap, jeans, fake sneakers) and "
            f"once at camp with the furry goat legs and hooves showing and the horns visible. Props: "
            f"reed pipes, winged sneakers fluttering with small white wings, a tin can. Body "
            f"language: jittery, loyal, gentle, braver than he looks. {SHEET_LAYOUT} "
            f"{CHARACTER_STYLE} {NO_TEXT}"
        ),
    },
    {
        "id": "char-camp",
        "group": "Character sheets",
        "title": "Camp Half-Blood: Chiron, Luke, Clarisse and Mr. D",
        "size": "2400 × 1600",
        "references": ["key-art", "char-percy"],
        "use": "Camp cast for the hub.",
        "prompt": (
            f"A line-up model sheet of four Camp Half-Blood characters at the same scale, each shown "
            f"front-on and three-quarter: {CHIRON}; Luke Castellan, nineteen, son of Hermes, friendly "
            f"sandy-haired counsellor with a thin pale scar from his eye to his jaw, orange camp shirt, "
            f"a sword; Clarisse La Rue, thirteen, daughter of Ares, tall and tough with a brown "
            f"ponytail, a camouflage jacket over the camp shirt and an electric spear; and Mr. D "
            f"(Dionysus), a short, plump, bored man with curly black hair, a leopard-print Hawaiian "
            f"shirt and a can of diet cola, grapevines sprouting at his feet. Small head studies "
            f"underneath. Flat parchment-cream background, no cast shadow. {CHARACTER_STYLE} {NO_TEXT}"
        ),
    },
    {
        "id": "char-gods",
        "group": "Character sheets",
        "title": "The gods: Poseidon, Zeus, Hades and Ares",
        "size": "2400 × 1600",
        "references": ["key-art"],
        "use": "Bosses and story figures.",
        "prompt": (
            "A line-up model sheet of four Greek gods as they appear in modern America, each standing "
            "full-figure on a decorative vase-like plinth with their emblem behind them in gold "
            "linework: Poseidon, tanned and weathered with a black beard and sea-green eyes, in a "
            "Hawaiian shirt, shorts and sandals, a fishing cap, a bronze trident; Zeus, tall and "
            "grey-bearded in a sharp pinstriped suit, storm-grey eyes, holding a crackling lightning "
            "bolt; Hades, pale and gaunt with shoulder-length black hair, a black silk robe embroidered "
            "with tormented faces in gold, a helm of darkness under his arm; Ares, a huge biker in a "
            "black leather jacket, red wraparound sunglasses with fire behind them, a scarred face and "
            "a huge bronze sword. Each a little larger than a human. Flat deep "
            f"navy background with a Greek-key border. {CHARACTER_STYLE} {NO_TEXT}"
        ),
    },
    {
        "id": "char-monsters",
        "group": "Character sheets",
        "title": "The monsters of The Lightning Thief",
        "size": "2400 × 1600",
        "references": ["key-art"],
        "use": "Enemies and bosses, each a different silhouette.",
        "prompt": (
            "A bestiary sheet of six monsters, each in its own black-figure-vase roundel with a "
            "Greek-key rim: the Minotaur, a towering bull-headed giant in only white briefs, glowing "
            "red eyes; Mrs. Dodds the Fury, a withered maths teacher turning into a leathery-winged "
            "hag with a flaming whip; Medusa, a veiled woman in a black dress whose veil hides hissing "
            "snakes for hair (her face never shown, only the snakes and her hands); the Chimera, a "
            "lion-headed beast with a goat body and a diamondback-rattlesnake tail, breathing fire; "
            "Procrustes, a big smooth salesman with a stretched bed; and Cerberus, a gigantic "
            "three-headed black dog with drooling jaws and a friendly side. Dramatic and fun for "
            f"ages 8 to 14, never gory. {CHARACTER_STYLE} {NO_TEXT}"
        ),
    },
    # ---- Places and situations, in story order
    {
        "id": "scene-museum",
        "group": "Places and situations",
        "title": "The museum: Mrs. Dodds attacks",
        "size": "2560 × 1440",
        "references": ["key-art", "char-percy", "char-monsters"],
        "use": "Opening tutorial.",
        "prompt": (
            f"Inside the Greek and Roman gallery of a grand New York museum, empty and echoing: "
            f"marble statues, painted vases in glass cases, a stone stele. Mrs. Dodds has just "
            f"transformed into a Fury with leathery wings and a flaming whip and dives at {PERCY}, "
            f"who catches a ballpoint pen as it springs into a bronze sword. Through a doorway a "
            f"teacher in a wheelchair (Mr. Brunner, secretly Chiron) has just thrown the pen. The "
            f"vases and friezes in the cases come alive as gold linework echoing the action. "
            f"{WORLD_STYLE} {NO_TEXT}"
        ),
    },
    {
        "id": "scene-minotaur",
        "group": "Places and situations",
        "title": "Half-Blood Hill: the Minotaur in the storm",
        "size": "2560 × 1440",
        "references": ["key-art", "char-percy", "char-grover", "char-monsters"],
        "use": "First boss.",
        "prompt": (
            f"Night, a violent rainstorm on a Long Island hill. A wrecked blue car smokes in the "
            f"ditch. The Minotaur charges uphill; {PERCY} (soaked, no sword yet) stands his ground "
            f"under a great pine tree at the top of the hill, about to grab one of the Minotaur's "
            f"horns, while an injured Grover (goat legs showing) lies half-conscious behind him. "
            f"Where Percy's mother vanished, a shimmer of golden light dissolves in the rain. "
            f"Lightning is drawn as stylised gold zigzag ornament; rain as fine diagonal lines. "
            f"{WORLD_STYLE} {NO_TEXT}"
        ),
    },
    {
        "id": "map-camp",
        "group": "Places and situations",
        "title": "Map of Camp Half-Blood",
        "size": "2400 × 1600",
        "references": ["key-art"],
        "use": "The camp hub and its level-select screen.",
        "prompt": (
            "A bird's-eye illustrated map of Camp Half-Blood as an ornamental painted map: Half-Blood "
            "Hill with its pine tree at the edge, the blue four-storey Big House farmhouse with a "
            "wraparound porch, twelve cabins in a U-shape around a green each with its own character "
            "(Zeus's marble cabin with bronze columns, Poseidon's low grey sea-stone cabin with "
            "shells, Ares's red cabin with barbed wire and a boar's head, Athena's silver-grey cabin "
            "with an owl, Hermes's crowded old brown cabin), the open-air dining pavilion of white "
            "Greek columns, the amphitheatre with its campfire, the canoe lake, strawberry fields, the "
            "climbing wall pouring lava, the archery range, the stables of winged pegasi, the arena and "
            "the dark woods by the creek, all inside a Greek-key border with a compass rose shaped "
            "like a sun. Small figures of campers in orange shirts doing activities. "
            f"{WORLD_STYLE} {NO_TEXT}"
        ),
    },
    {
        "id": "scene-capture-the-flag",
        "group": "Places and situations",
        "title": "Capture the flag in the woods",
        "size": "2560 × 1440",
        "references": ["key-art", "char-percy", "char-annabeth", "char-camp"],
        "use": "A team game at camp.",
        "prompt": (
            f"Night in the camp woods during capture the flag. {PERCY}, in an oversized bronze helmet "
            f"with a blue plume and a too-big shield, stands in a shallow creek and glows as the water "
            f"heals him while Clarisse and two hulking Ares campers in red-plumed helmets charge with "
            f"electric spears. Behind them {ANNABETH} is half-invisible, only her outline shimmering, "
            f"as she runs off with the enemy team's red flag. A glowing green trident sign is "
            f"beginning to appear in the air above Percy's head. Trees drawn as tall ornamental "
            f"shapes, the creek as rippling teal ribbon patterns. {WORLD_STYLE} {NO_TEXT}"
        ),
    },
    {
        "id": "map-quest",
        "group": "Places and situations",
        "title": "Map of the quest west",
        "size": "2400 × 1600",
        "references": ["key-art", "char-percy", "char-annabeth", "char-grover"],
        "use": "The journey map between chapters.",
        "prompt": (
            "An ornamental map of the United States drawn like a painted Greek map, with the route of "
            "the quest as a dotted gold line from New York (a tiny Empire State Building) through New "
            "Jersey (a garden of stone statues), Washington DC, St. Louis (the Gateway Arch), Denver "
            "(a water park), the desert (a hitched ride in an animal truck), Las Vegas (a lotus-flower "
            "casino), to Los Angeles and the Santa Monica pier, with a small dark entrance to the "
            "Underworld beneath. Sea monsters and ships in the oceans, wind gods blowing at the corners, "
            "a small cartoon trio travelling along the route. Greek-key border, deep navy sea, cream "
            f"land. {WORLD_STYLE} {NO_TEXT}"
        ),
    },
    {
        "id": "scene-medusa",
        "group": "Places and situations",
        "title": "Aunty Em's garden-gnome emporium",
        "size": "2560 × 1440",
        "references": ["key-art", "char-percy", "char-annabeth", "char-grover", "char-monsters"],
        "use": "A stealth chapter: don't look at her.",
        "prompt": (
            f"Twilight in the overgrown yard of a roadside garden-statue shop in New Jersey, full of "
            f"lifelike stone statues of frightened people and satyrs. Medusa, veiled in black, glides "
            f"between them; we see only the snakes stirring under her veil and her long hands. "
            f"{PERCY} walks backwards, eyes shut, watching her only in the reflection of a mirrored "
            f"garden gazing ball; {ANNABETH} is invisible except for a shimmer; {GROVER} hovers above "
            f"on winged sneakers swinging a road sign. A smoky hamburger grill glows in the "
            f"background. {WORLD_STYLE} {NO_TEXT}"
        ),
    },
    {
        "id": "scene-arch",
        "group": "Places and situations",
        "title": "The Gateway Arch and the Chimera",
        "size": "2560 × 1440",
        "references": ["key-art", "char-percy", "char-monsters"],
        "use": "A chase that ends in a leap.",
        "prompt": (
            f"High inside the observation deck at the top of the Gateway Arch in St. Louis: a "
            f"narrow curved room with tiny windows. The Chimera bursts through, breathing fire, its "
            f"rattlesnake tail lashing, while a sweet old lady (Echidna) cackles behind it. {PERCY} "
            f"backs toward a broken window. A second, wider inset shows him falling from the Arch "
            f"toward the Mississippi far below, the river rising to meet him as a curling teal wave. "
            f"The Arch drawn as a sweeping silver ornamental curve over a patterned city. "
            f"{WORLD_STYLE} {NO_TEXT}"
        ),
    },
    {
        "id": "scene-lotus",
        "group": "Places and situations",
        "title": "The Lotus Hotel and Casino",
        "size": "2560 × 1440",
        "references": ["key-art", "char-percy", "char-annabeth", "char-grover"],
        "use": "A trap level where time runs away.",
        "prompt": (
            f"Inside a dazzling Las Vegas hotel built to keep you forever: a gigantic games hall with "
            f"water slides, arcade machines, a bungee jump and a wave pool, lit in shimmering neon "
            f"turquoise, coral and gold, with lotus-flower patterns everywhere and a huge ornamental "
            f"clock whose hands spin too fast. {PERCY} (holding a green key card), {ANNABETH} and "
            f"{GROVER} are being offered plates of glowing lotus-flower pastries by smiling bellhops "
            f"and look happily dazed; Percy is starting to notice something is wrong. "
            f"{WORLD_STYLE} {NO_TEXT}"
        ),
    },
    {
        "id": "scene-underworld",
        "group": "Places and situations",
        "title": "The Underworld: Cerberus and the Fields of Asphodel",
        "size": "2560 × 1440",
        "references": ["key-art", "char-percy", "char-annabeth", "char-grover", "char-monsters"],
        "use": "The final descent.",
        "prompt": (
            f"The gates of the Underworld: a vast cavern under Los Angeles, the River Styx a black "
            f"ribbon full of drifting lost things, a skeletal ferryman's boat, and the Fields of "
            f"Asphodel stretching off as endless grey wheat under a ceiling of stalactites. The "
            f"gigantic three-headed Cerberus looms over the gate; {ANNABETH} distracts him by "
            f"throwing a big red rubber ball while {PERCY} and {GROVER} sneak past. Far off, the "
            f"black palace of Hades with bronze gates and gardens of glowing jewel-fruit. Grey, "
            f"violet and black ground with gold linework and a single warm glow from the ball. "
            f"{WORLD_STYLE} {NO_TEXT}"
        ),
    },
    {
        "id": "scene-ares-beach",
        "group": "Places and situations",
        "title": "The duel with Ares on the beach",
        "size": "2560 × 1440",
        "references": ["key-art", "char-percy", "char-gods"],
        "use": "Final boss.",
        "prompt": (
            f"A Santa Monica beach at dawn. Ares, huge in his black leather jacket with fiery "
            f"sunglasses, swings a burning sword; {PERCY} stands in the surf, the sea rising behind "
            f"him in a towering curling wave of ornamental teal ribbons, about to strike Ares's "
            f"heel with Riptide. Three Furies circle overhead; police cars (drawn as decorative "
            f"shapes) on the pier. Annabeth and Grover shelter by the lifeguard tower. "
            f"{WORLD_STYLE} {NO_TEXT}"
        ),
    },
    {
        "id": "scene-olympus",
        "group": "Places and situations",
        "title": "Mount Olympus above the Empire State Building",
        "size": "2560 × 1440",
        "references": ["key-art", "char-percy", "char-gods"],
        "use": "Ending and the gods' court.",
        "prompt": (
            f"Mount Olympus floating in the clouds above the Empire State Building: a white and gold "
            f"Greek city of palaces, temples and terraces climbing a mountain, reached by a floating "
            f"stone stairway. Inside the great throne hall, Zeus and Poseidon sit on two of twelve "
            f"enormous thrones arranged in a U around a hearth; {PERCY} stands small before them "
            f"holding up the master lightning bolt, glowing gold. Clouds as curling ornamental "
            f"scrolls, gold linework on white marble and sky blue. {WORLD_STYLE} {NO_TEXT}"
        ),
    },
    # ---- Interface
    {
        "id": "ui-hero-cards",
        "group": "Interface",
        "title": "Hero cards and interface kit",
        "size": "2560 × 1440",
        "references": ["key-art", "char-percy", "char-annabeth", "char-grover"],
        "use": "Character select, health and power icons.",
        "prompt": (
            "A game interface concept sheet. Across the top, three tall character-select cards, "
            "each an ornate black-and-gold frame built from its hero's parent emblems: Percy's with "
            "tridents, waves and hippocampi; Annabeth's with owls, olive branches and a compass; "
            "Grover's with pan pipes, vines and tin cans. Inside each card the hero in a dynamic "
            "cartoon pose. Below, an interface kit on deep navy: a health bar as a wave-scroll band, "
            "a power meter shaped like a lightning bolt, round ability icons in gold vase-style "
            "roundels (water surge, invisibility cap, pipes song, shield, golden drachma, ambrosia "
            "square, nectar cup), dialogue-box frames with Greek-key borders, and buttons. Clean, "
            f"crisp, readable on a phone. {PALETTE} {NO_TEXT}"
        ),
    },
]


# ---- Round 2: the game itself, in the blocky style of Minecraft Dungeons.
# The heroes and monsters are built in code as blocky models, so these sheets
# are what the models are made from. Heroes first.
GAME = ROOT.parent / "game" / "assets"

VOXEL_STYLE = (
    "3D game art in the blocky voxel style of Minecraft Dungeons: characters built from cubes, "
    "with a large cube head whose face is simple pixel art (about 8 × 8 pixels: pixel eyes, a "
    "pixel mouth, hair drawn as pixels and as a few blocky tufts), a boxy torso, square arms and "
    "legs, crisp pixel-art textures (about 16 pixels per block) with simple shading, chunky "
    "readable silhouettes; warm cinematic lighting, soft ambient occlusion and glowing magic "
    "effects. Costume colours and details follow the Camp Half-Blood cartoon concept art. "
    + PALETTE
)

TURNAROUND = (
    "A 3D character turnaround sheet on a flat light-grey background: the same blocky character "
    "seen from the front, from the side (facing right), from behind, and from above at the "
    "high three-quarter angle of an isometric game camera, all at the same scale in a neutral "
    "standing pose; one dynamic action pose; the face shown large as flat pixel art (8 × 8 "
    "pixels) in a corner; and each weapon or prop as a separate small blocky model. No cast "
    "shadow."
)

TYSON = (
    "Tyson, a young Cyclops and Percy's half-brother: a gentle giant who looks about fifteen but "
    "is twice Percy's bulk and a head taller, one huge warm brown eye in the middle of his "
    "forehead, shaggy brown hair, a big crooked grin, a ragged flannel shirt and torn jeans, "
    "enormous hands; a wristwatch that springs open into a round bronze shield; childlike and "
    "kind"
)
CLARISSE = (
    "Clarisse La Rue, thirteen, daughter of Ares: tall and tough, a stringy brown ponytail, a "
    "fierce scowl, a camouflage jacket over the orange camp shirt, combat boots, a bronze "
    "helmet with a red plume, an electric spear crackling at the tip and a round shield with a "
    "boar's head"
)
THALIA = (
    "Thalia Grace, fifteen, daughter of Zeus: spiky black punk hair, electric-blue eyes, "
    "freckles, a black leather jacket with silver buttons, a black T-shirt, black jeans and "
    "boots, a silver bracelet that springs open into a round bronze shield with a frightening "
    "face on it, and a bronze spear trailing sparks"
)
NICO = (
    "Nico di Angelo, about eleven, son of Hades: small, pale, messy black hair, dark solemn "
    "eyes, an oversized aviator jacket over a black T-shirt, a silver skull ring, and a short "
    "sword of black Stygian iron that seems to drink the light; a cloud of shadow around his "
    "feet"
)


def vox_hero(id_: str, title: str, who: str, extra: str, refs: list[str], use: str) -> dict:
    return {
        "id": id_, "group": "Round 2 · Heroes in 3D (generate these first)", "title": title,
        "size": "2400 × 1600", "references": ["vox-key", *refs], "use": use,
        "prompt": f"{who}. {extra} {TURNAROUND} {VOXEL_STYLE} {NO_TEXT}",
    }


REQUESTS += [
    {
        "id": "char-heroes-2",
        "group": "Round 2 · Heroes in 3D (generate these first)",
        "title": "New heroes in the cartoon style: Tyson, Thalia and Nico",
        "size": "2400 × 1600",
        "references": ["key-art", "char-percy", "char-camp"],
        "use": "Fixes the three new playable heroes before their 3D sheets and hero cards.",
        "prompt": (
            f"A line-up model sheet of three heroes at the same scale, each front-on and "
            f"three-quarter, with small head studies underneath: {TYSON}; {THALIA}; {NICO}. "
            f"Flat parchment-cream background, no cast shadow. {CHARACTER_STYLE} {NO_TEXT}"
        ),
    },
    {
        "id": "vox-key",
        "group": "Round 2 · Heroes in 3D (generate these first)",
        "title": "Style key in 3D: the heroes at Camp Half-Blood",
        "size": "2560 × 1440",
        "references": ["key-art", "char-percy", "char-annabeth", "char-grover", "map-camp"],
        "use": "Fixes the 3D look. Attach it to every later round-2 request.",
        "prompt": (
            f"A gameplay-style screenshot seen from a high isometric three-quarter camera: Percy, "
            f"Annabeth and Grover as blocky voxel heroes crossing the green of Camp Half-Blood "
            f"between blocky cabins (Poseidon's sea-stone cabin with shells, Athena's grey cabin "
            f"with an owl, Ares's red cabin), the blue Big House farmhouse behind, pine trees, a "
            f"strawberry field and the lake glittering. {PERCY}; {ANNABETH}; {GROVER}. Percy swings "
            f"Riptide at a training dummy with a small splash of water, Annabeth studies a map, "
            f"Grover plays his pipes and blocky flowers sprout. A few campers in orange shirts. "
            f"{VOXEL_STYLE} No interface. {NO_TEXT}"
        ),
    },
    vox_hero("vox-percy", "Percy in 3D", PERCY,
             "Props: Riptide as a sword (bronze, leaf-shaped blade) and as a capped pen; a blocky "
             "swirl of water around one hand.", ["char-percy"], "Model for the main hero."),
    vox_hero("vox-annabeth", "Annabeth in 3D", ANNABETH,
             "Also show her battle gear: a bronze breastplate and a bronze helmet with a grey "
             "horsehair crest, and one figure half-transparent to show the cap's invisibility. "
             "Props: the bronze dagger, the cap.", ["char-annabeth"], "Model for a playable hero."),
    vox_hero("vox-grover", "Grover in 3D", GROVER,
             "Show him with his goat legs and small horns showing (as in camp and in battle), plus "
             "one figure in disguise with jeans and fake sneakers. Props: reed pipes, winged "
             "sneakers with small white wings, a tin can.", ["char-grover"],
             "Model for a playable hero."),
    vox_hero("vox-tyson", "Tyson in 3D", TYSON,
             "Noticeably bigger and bulkier than the other heroes (show Percy's outline beside him "
             "for scale). Props: the watch and the open shield, a forge hammer, a jar of peanut "
             "butter.", ["char-heroes-2"], "Model for a playable hero (the big brawler)."),
    vox_hero("vox-clarisse", "Clarisse in 3D", CLARISSE,
             "Props: the electric spear, the boar shield, the plumed helmet.", ["char-camp"],
             "Model for a playable hero."),
    vox_hero("vox-thalia", "Thalia in 3D", THALIA,
             "Props: the spear, the bracelet and the open shield; a few blocky blue sparks around "
             "her.", ["char-heroes-2"], "Model for a playable hero."),
    vox_hero("vox-nico", "Nico in 3D", NICO,
             "Props: the black sword, the skull ring; blocky shadow wisps.", ["char-heroes-2"],
             "Model for a playable hero."),
    {
        "id": "vox-npcs",
        "group": "Round 2 · Characters and monsters in 3D",
        "title": "Camp, family and the gods' messengers in 3D",
        "size": "2400 × 1600",
        "references": ["vox-key", "char-camp", "char-gods"],
        "use": "Models for the people in the hub and the story.",
        "prompt": (
            f"A line-up of blocky voxel characters at the same scale, each seen front-on and from "
            f"the high three-quarter game angle: {CHIRON}, also shown as Mr. Brunner, a teacher in "
            f"a tweed jacket in a motorised wheelchair; Mr. D (Dionysus) in a leopard-print "
            f"Hawaiian shirt with a can of diet cola; Luke, the sandy-haired counsellor with a scar "
            f"down his cheek; Sally Jackson, Percy's warm, tired mother in a sweet-shop uniform; "
            f"Argus, the camp security chief, a big blond man covered in blue eyes; Mrs. Dodds, a "
            f"sour maths teacher in a leather jacket; and Poseidon in his Hawaiian shirt with the "
            f"trident. {VOXEL_STYLE} Flat light-grey background, no cast shadow. {NO_TEXT}"
        ),
    },
    {
        "id": "vox-enemies",
        "group": "Round 2 · Characters and monsters in 3D",
        "title": "Monsters in 3D: the common and elite enemies",
        "size": "2400 × 1600",
        "references": ["vox-key", "char-monsters"],
        "use": "Models for the enemies fought in every chapter, weakest first.",
        "prompt": (
            "A bestiary sheet of blocky voxel monsters, each at its in-game scale beside a small "
            "Percy outline, in rows from weakest to strongest, each seen front-on and from the high "
            "three-quarter game angle. Minor: a hellhound pup (a black dog with glowing red eyes); "
            "a bronze mechanical spider (Hephaestus's automaton) the size of a dog; a Stymphalian "
            "bird with bronze feathers; a telekhine (a sleek seal-bodied, dog-faced sea demon). "
            "Elite: a full-size hellhound as big as a truck; a dracaena (a snake-woman with two "
            "snake tails for legs, armour and a spear); a Laistrygonian giant (a huge, tattooed, "
            "cannibal giant carrying a flaming bronze ball); a skeleton warrior in modern combat "
            "gear; an empousa (a pretty cheerleader with flaming hair, one bronze leg and one "
            "donkey leg); and a Fury (a leathery-winged hag with a flaming whip). Dramatic and fun "
            f"for ages 8 to 14, never gory. {VOXEL_STYLE} Flat light-grey background. {NO_TEXT}"
        ),
    },
    {
        "id": "vox-bosses-1",
        "group": "Round 2 · Characters and monsters in 3D",
        "title": "Bosses of The Lightning Thief in 3D",
        "size": "2400 × 1600",
        "references": ["vox-key", "char-monsters", "char-gods"],
        "use": "Models for the first book's bosses.",
        "prompt": (
            "A boss sheet of blocky voxel monsters, each much bigger than a small Percy outline "
            "beside it, seen from the high three-quarter game angle with one attack pose each: the "
            "Minotaur (a towering bull-headed giant in white briefs, glowing red eyes); Medusa "
            "(veiled in black, writhing snake hair glimpsed under the veil, her face never shown); "
            "the Chimera (a lion-headed beast with a goat body and a rattlesnake tail, breathing "
            "fire) with Echidna, a sweet old lady with a reptile glint; Procrustes (a big, smooth "
            "salesman with two stretching beds); Cerberus (a gigantic three-headed black dog); and "
            "Ares (a huge biker in a black leather jacket with fiery sunglasses and a burning "
            f"sword). {VOXEL_STYLE} Flat light-grey background. {NO_TEXT}"
        ),
    },
    {
        "id": "vox-bosses-2",
        "group": "Round 2 · Characters and monsters in 3D",
        "title": "Bosses of the later books in 3D",
        "size": "2400 × 1600",
        "references": ["vox-key", "vox-bosses-1"],
        "use": "Models for the bosses of books two to five.",
        "prompt": (
            "A boss sheet of blocky voxel monsters from the later Percy Jackson books, each much "
            "bigger than a small Percy outline beside it, from the high three-quarter game angle: "
            "Polyphemus (a huge, ugly one-eyed Cyclops shepherd in a wedding-dress-like kilt); "
            "Scylla (a six-headed sea monster rising from a cliff); the Manticore (a lion's body, "
            "a man's head and a spiked scorpion tail that fires spines); the Nemean Lion "
            "(golden, armoured with an impenetrable pelt); Talos (a giant bronze automaton warrior "
            "in a junkyard); Kampê (a woman's upper body over a dragon's lower body with "
            "snake legs, animal heads at her waist and two scimitars of poison); Antaeus (a giant "
            "wrestler who heals while touching the ground); and Kronos (a young man with golden "
            "eyes and a scythe with a blade of half bronze, half steel). Dramatic and fun for ages "
            f"8 to 14, never gory. {VOXEL_STYLE} Flat light-grey background. {NO_TEXT}"
        ),
    },
    {
        "id": "vox-camp",
        "group": "Round 2 · Places in 3D",
        "title": "Camp Half-Blood in 3D: the home base",
        "size": "2560 × 1440",
        "references": ["vox-key", "map-camp"],
        "use": "Layout and look of the hub where the minigames are.",
        "prompt": (
            "An isometric bird's-eye view of Camp Half-Blood built from blocks, like a level of "
            "Minecraft Dungeons, showing everything the home base needs: Half-Blood Hill with its "
            "pine tree and the camp border; the blue Big House with its porch (the chapter map "
            "lives here) and the Oracle's attic window; the twelve cabins in a U around the green; "
            "the open-air dining pavilion of white columns; the amphitheatre with a campfire; the "
            "archery range with targets; the climbing wall pouring blocky lava; the canoe lake; the "
            "chariot track; the arena; the forge with a chimney; the camp store; the stables of "
            "pegasi; the strawberry fields; the woods and the creek for capture the flag. Small "
            f"blocky campers everywhere. {VOXEL_STYLE} {NO_TEXT}"
        ),
    },
    {
        "id": "vox-mist-true",
        "group": "Round 2 · Places in 3D",
        "title": "The Mist and True Sight: the same museum room twice",
        "size": "2560 × 1440",
        "references": ["vox-key", "scene-museum", "vox-percy"],
        "use": "How the world changes when a hero sees through the Mist.",
        "prompt": (
            "A split-screen gameplay concept of the same museum gallery from the high isometric "
            "game camera, divided by a jagged glowing seam of golden mist. Left half, the Mist "
            "(what mortals see): an ordinary, slightly dull blocky museum room in beige and grey, "
            "glass cases, a field-trip class, and Mrs. Dodds as a sour maths teacher. Right half, "
            "True Sight: the same room transformed into the ornamental world, its blocks overlaid "
            "with gold Greek-key patterns and vase friezes on deep teal and navy, the vases in the "
            "cases come alive, a hidden doorway glows in the wall, and Mrs. Dodds is revealed as a "
            "leathery-winged Fury with a flaming whip diving at blocky Percy, who holds up Riptide. "
            f"{VOXEL_STYLE} {NO_TEXT}"
        ),
    },
    {
        "id": "vox-hud",
        "group": "Round 2 · Places in 3D",
        "title": "In-game mock-up with the interface",
        "size": "2560 × 1440",
        "references": ["vox-key", "ui-hero-cards", "vox-percy", "vox-annabeth", "vox-grover"],
        "use": "Layout of the heads-up display.",
        "prompt": (
            "A gameplay screenshot mock-up from the high isometric camera: Percy, Annabeth and "
            "Grover as blocky heroes fighting hellhounds on a highway at dusk. Interface in the "
            "ornamental black-and-gold style: bottom left, the active hero's portrait in a round "
            "gold frame with a wave-scroll health bar, a lightning-bolt power meter and four ability "
            "roundels; small portraits of the other two heroes beside it for switching; top right, "
            "a minimap in a Greek-key frame and a counter of golden drachmas; top centre, a "
            "parchment banner for the objective; on the left edge a prophecy scroll with one line "
            "glowing; a round eye-shaped True Sight meter. Readable, uncluttered. "
            f"{VOXEL_STYLE} Use blank bars and roundels in place of any writing. {NO_TEXT}"
        ),
    },
    # ---- Game art: these files are loaded by the game itself.
    {
        "id": "logo",
        "group": "Round 2 · Game art (loaded by the game)",
        "title": "Title logo: Half-Blood Quests",
        "size": "2048 × 1024",
        "dest": "game",
        "references": ["key-art", "ui-hero-cards"],
        "use": "Title screen and loading screen. The magenta is keyed out.",
        "prompt": (
            "A video-game title logo reading exactly \"HALF-BLOOD QUESTS\" on two lines (HALF-BLOOD "
            "above, QUESTS below and larger), in bold chiselled Greek-inspired capitals of "
            "celestial bronze and gold with a black outline and a subtle bevel, a small trident "
            "crossing behind the letters, a thin Greek-key band and a lightning bolt as accents. "
            "Centred, with generous space around it, on a perfectly flat solid magenta #FF00FF "
            "background with no gradient, shadow or texture, so the background can be removed. The "
            "letters must be spelled exactly and be clearly readable. No other text."
        ),
    },
    {
        "id": "title-bg",
        "group": "Round 2 · Game art (loaded by the game)",
        "title": "Title screen background",
        "size": "2560 × 1440",
        "dest": "game",
        "references": ["vox-key", "key-art", "vox-percy", "vox-annabeth", "vox-grover"],
        "use": "Behind the logo on the title screen; the top third stays calm for the logo.",
        "prompt": (
            "A cinematic 3D scene in the blocky voxel style: Half-Blood Hill at dusk seen from a low "
            "angle, the lone pine tree at the crest, blocky Percy, Annabeth, Grover and Tyson "
            "silhouetted along the ridge with Riptide glowing, Camp Half-Blood's lights below and "
            "a stormy sky with stylised lightning above. The upper third is a calm, darker sky "
            "with room for a title logo; the heroes sit in the lower half. Framed with a subtle "
            f"ornamental gold Greek-key border. {VOXEL_STYLE} {NO_TEXT}"
        ),
    },
    {
        "id": "ui-hero-cards-2",
        "group": "Round 2 · Game art (loaded by the game)",
        "title": "Hero cards for Tyson, Clarisse, Thalia and Nico",
        "size": "2560 × 1440",
        "dest": "game",
        "references": ["ui-hero-cards", "char-heroes-2", "char-camp"],
        "use": "Hero-select cards matching the first three.",
        "prompt": (
            "Four tall character-select cards side by side on deep navy, in exactly the style of "
            "the first three hero cards: each an ornate black-and-gold frame built from its hero's "
            f"parent emblems, with the hero inside in a dynamic cartoon pose. {TYSON}, framed with "
            f"tridents, anvils and hammers. {CLARISSE}, framed with spears, boars and vultures. "
            f"{THALIA}, framed with lightning bolts, eagles and oak leaves. {NICO}, framed with "
            f"skulls, cypress branches and a helm. Equal size and spacing so they can be cut apart. "
            f"{CHARACTER_STYLE} {NO_TEXT}"
        ),
    },
    {
        "id": "scene-bus",
        "group": "Round 2 · Chapter cards (the ornamental 2D style)",
        "title": "The three Kindly Ones on the bus",
        "size": "2560 × 1440",
        "references": ["key-art", "char-percy", "char-annabeth", "char-grover", "char-monsters"],
        "use": "Card for the chapter on the Greyhound bus.",
        "prompt": (
            f"A rainy New Jersey highway at night. Inside a Greyhound bus, three old ladies in "
            f"velvet coats and lace hats rise from their seats as they turn into leathery-winged "
            f"Furies with flaming whips; {PERCY} uncaps Riptide in the aisle, {ANNABETH} pulls on "
            f"her cap and fades out, and {GROVER} fumbles with a tin can as the bus swerves toward "
            f"the trees. Headlights and lightning as gold ornament. {WORLD_STYLE} {NO_TEXT}"
        ),
    },
    {
        "id": "scene-waterland",
        "group": "Round 2 · Chapter cards (the ornamental 2D style)",
        "title": "Waterland: the Tunnel of Love trap",
        "size": "2560 × 1440",
        "references": ["key-art", "char-percy", "char-annabeth", "char-grover"],
        "use": "Card for the chapter in the abandoned water park.",
        "prompt": (
            f"An abandoned water park in Denver at night, built by Hephaestus: rusted slides, a "
            f"tunnel-of-love boat ride shaped like a giant heart, and a swan boat in which "
            f"{PERCY} and {ANNABETH} sit while hundreds of bronze mechanical spiders pour from the "
            f"walls and a golden net hangs above them, cameras flashing; {GROVER} watches from the "
            f"control booth. Bronze, teal and coral with gold linework. {WORLD_STYLE} {NO_TEXT}"
        ),
    },
    {
        "id": "scene-procrustes",
        "group": "Round 2 · Chapter cards (the ornamental 2D style)",
        "title": "Crusty's Water Bed Palace",
        "size": "2560 × 1440",
        "references": ["key-art", "char-percy", "char-annabeth", "char-grover", "char-monsters"],
        "use": "Card for the chapter with Procrustes.",
        "prompt": (
            f"A tacky desert waterbed showroom in Nevada: rows of heart-shaped and swan-shaped "
            f"waterbeds, gold-flecked wallpaper. Procrustes, a huge smooth salesman in a silk "
            f"shirt with a big axe hidden behind his back, beams at the heroes, while {ANNABETH} "
            f"and {GROVER} are already strapped to beds that stretch them; {PERCY} feigns interest, "
            f"planning to trick him onto his own bed. {WORLD_STYLE} {NO_TEXT}"
        ),
    },
    *[
        {
            "id": f"book-{n}",
            "group": "Round 2 · Chapter cards (the ornamental 2D style)",
            "title": title,
            "size": "1600 × 2400",
            "references": ["key-art", "char-percy", "char-annabeth"],
            "use": "Portrait cover card for this book on the chapter map.",
            "prompt": (
                f"A portrait book-cover-style card for the game, for the Percy Jackson book "
                f"{title}: {scene} Ornate black-and-gold Greek-key frame with an empty cartouche "
                f"at the top. {WORLD_STYLE} {NO_TEXT}"
            ),
        }
        for n, title, scene in [
            ("1", "The Lightning Thief",
             "Percy rising from a curling teal wave holding Riptide, lightning cracking above the "
             "New York skyline, a golden master bolt glowing in the clouds."),
            ("2", "The Sea of Monsters",
             "Percy, Annabeth and Tyson on the deck of a small ship among enormous ornamental waves, "
             "the whirlpool Charybdis and the many-headed Scylla on either side, a golden fleece "
             "glinting on a distant island."),
            ("3", "The Titan's Curse",
             "Percy, Thalia and Annabeth on a snowy mountain with silver-clad Hunters of Artemis and "
             "their silver bows, the moon huge behind them, a Titan holding up the sky in the "
             "distance."),
            ("4", "The Battle of the Labyrinth",
             "Percy and Annabeth in a shifting stone maze drawn as a Greek-key labyrinth, a "
             "glowing Δ sign on the wall, Daedalus's bronze wings and workshop gears around them."),
            ("5", "The Last Olympian",
             "Percy, Annabeth, Thalia, Nico, Grover, Tyson and Clarisse defending Manhattan on a "
             "bridge against a Titan army, the Empire State Building with Olympus glowing above, "
             "the storm giant Typhon on the horizon."),
        ]
    ],
    # ---- The opening: story cards shown inside the cutscenes between the
    # prologue, chapter 1, chapter 2 and camp (game/js/story/cutscenes.js). The
    # game shows the cutscene without the insert until a card arrives.
    {
        "id": "scene-field-trip",
        "group": "Round 3 · The opening (cutscene cards)",
        "title": "The field trip: the school bus in Manhattan",
        "size": "2560 × 1440",
        "references": ["key-art", "char-percy", "char-grover"],
        "use": "Card shown in the cutscene where the school bus drives to the museum.",
        "prompt": (
            f"Morning on a Manhattan street of brownstones and yellow taxis. A yellow school bus "
            f"marked with a small school crest waits at the curb in front of a red-brick boarding "
            f"school with white trim. {PERCY}, not yet in his camp shirt (a plain school polo "
            f"instead) and late, runs up the sidewalk past a hot-dog cart, with {GROVER} waving "
            f"him on from the bus steps. Two big sewer rats with too-bright red eyes peek out of "
            f"a storm drain; no one else notices. A stern teacher in a black leather jacket watches "
            f"from the bus door. Light and funny, for ages 8 to 14. {WORLD_STYLE} {NO_TEXT}"
        ),
    },
    {
        "id": "scene-bus-ride",
        "group": "Round 3 · The opening (cutscene cards)",
        "title": "On the school bus to the museum",
        "size": "2560 × 1440",
        "references": ["key-art", "char-percy", "char-grover", "scene-field-trip"],
        "use": "Card shown in the cutscene while the school bus drives up Central Park West.",
        "prompt": (
            f"Inside a yellow school bus rattling up Central Park West on a bright morning, trees "
            f"of the park flashing past the windows on one side and apartment houses on the other. "
            f"{PERCY} (in a plain school polo, no camp shirt yet) slumps in a seat by the window; "
            f"beside him {GROVER} nervously chews an apple core and glances toward the front, where "
            f"a stern pre-algebra teacher in a black leather jacket sits very straight and stares "
            f"back. A freckled red-haired girl two rows ahead flicks a bit of sandwich; a kind "
            f"bearded teacher in a wheelchair is strapped in at the front. Funny and a little "
            f"ominous, for ages 8 to 14. {WORLD_STYLE} {NO_TEXT}"
        ),
    },
    {
        "id": "scene-museum-steps",
        "group": "Round 3 · The opening (cutscene cards)",
        "title": "Arriving at the museum steps",
        "size": "2560 × 1440",
        "references": ["key-art", "char-percy", "char-grover", "scene-museum"],
        "use": "Card shown in the cutscene where the class gets off the bus at the American Museum of Natural History.",
        "prompt": (
            f"The grand front of the American Museum of Natural History on Central Park West: "
            f"broad stone steps, four huge columns, a great arched entrance, tall red and blue "
            f"banners of Greek vases and heroes between the columns. A yellow school bus has "
            f"stopped at the curb and a class of twelve-year-olds in school uniform climbs the "
            f"steps; {PERCY} and {GROVER} trail at the back. At the top of the steps a stern "
            f"teacher in a black leather jacket waits, her shadow on the steps faintly shaped like "
            f"a winged Fury. Morning light, pigeons, a hot-dog cart. {WORLD_STYLE} {NO_TEXT}"
        ),
    },
    {
        "id": "scene-montauk",
        "group": "Round 3 · The opening (cutscene cards)",
        "title": "Montauk: Grover at the door in the storm",
        "size": "2560 × 1440",
        "references": ["key-art", "char-percy", "char-grover"],
        "use": "Card shown in the cutscene between chapters 1 and 2.",
        "prompt": (
            f"Night, a hurricane on the beach at Montauk. The door of a small, sagging beach "
            f"cabin bursts open: {GROVER} stands soaked in the doorway, no trousers on, furry "
            f"goat legs and hooves plain to see, out of breath. Inside, {PERCY} in pyjamas and his "
            f"mother (kind, tired, long brown hair) stare. Behind Grover, an old blue car waits in "
            f"the rain with its headlights on. Lightning as gold zigzag ornament, the sea as "
            f"curling teal ribbons. Dramatic but warm. {WORLD_STYLE} {NO_TEXT}"
        ),
    },
    {
        "id": "scene-storm-drive",
        "group": "Round 3 · The opening (cutscene cards)",
        "title": "The drive through the storm",
        "size": "2560 × 1440",
        "references": ["key-art", "char-percy", "char-grover", "scene-montauk"],
        "use": "Card shown in the cutscene's last shots before chapter 2 (the drive to Half-Blood Hill).",
        "prompt": (
            f"Night, a hurricane over a Long Island country road. An old blue Camaro races through "
            f"sheets of rain, headlights cutting the dark; inside, Percy's mother grips the wheel, "
            f"{GROVER} clutches the back seat and {PERCY} looks back through the rear window, where "
            f"a huge horned silhouette lumbers out of the storm far behind. Ahead, a hill with a "
            f"great pine tree on top, and a bolt of lightning about to strike the road. Lightning "
            f"as gold zigzag ornament, rain as fine diagonal lines. Dramatic, never gory. "
            f"{WORLD_STYLE} {NO_TEXT}"
        ),
    },
    {
        "id": "vox-manhattan",
        "group": "Round 3 · The opening (cutscene cards)",
        "title": "3D sheet: the Manhattan prologue kit and sewer rats",
        "size": "2560 × 1440",
        "references": ["vox-key", "vox-enemies"],
        "use": "Reference for the prologue's blocky Manhattan street (game/js/world/manhattan.js, vehicles.js) and the rat monster (entities/monsters.js); not loaded by the game.",
        "prompt": (
            "A model sheet in the blocky voxel 3D style of a Minecraft-Dungeons-like game, warm "
            "morning light, isometric three-quarter views on a flat parchment-cream background, "
            "every object built from chunky cubes with hand-painted pixel textures: a New York "
            "brownstone (three storeys, a stoop of steps with black iron railings, tall windows, a "
            "pressed-metal cornice, a rooftop water tower); a red-brick boarding school front with "
            "white trim, two columns and a navy flag (Yancy Academy); a yellow school bus with "
            "black rub rails and a folding door; a yellow taxi; a hot-dog cart with a striped "
            "umbrella; a green subway entrance with globe lamps; a fire hydrant, a blue mailbox, a "
            "newsstand and a storm drain. Bottom row: a sewer rat monster seen front, side and back "
            "(grey-brown fur, pink ears, nose and long tail, glowing too-red eyes, a little "
            "bigger than a cat), plus a pack of three rats scurrying out of the storm drain, comic "
            "rather than scary. Clean silhouettes, no text on the signs. " + PALETTE + " " + NO_TEXT
        ),
    },
    {
        "id": "vox-spartoi",
        "group": "Round 4 · New monsters",
        "title": "Spartoi, the sown skeleton warriors",
        "size": "2560 × 1440",
        "references": ["vox-key", "vox-enemies"],
        "use": "Reference for the spartoi model (entities/monsters.js, buildSkeleton with melee): steady sword-and-shield fodder in the desert, the Underworld and on the beach; not loaded by the game.",
        "prompt": (
            "A monster model sheet in the blocky voxel 3D style of a Minecraft-Dungeons-like game, "
            "isometric three-quarter views on a flat parchment-cream background, every part built "
            "from chunky cubes with hand-painted pixel textures. Spartoi: skeleton warriors that "
            "grew from dragon's teeth sown in the earth, the size of a grown man. Old ivory bones "
            "with dark empty eye sockets, wearing tattered desert-tan military fatigues and boots "
            "over the bones, a dented bronze Greek helmet with a short crest, a curved bronze "
            "kopis sword in one hand and a round bronze hoplite shield in the other, painted with a "
            "black dragon-tooth emblem. Show one spartoi front, side and back; then in a ready "
            "stance behind the shield, mid-slash, and staggered back; then a squad of four "
            "marching in step, and one clawing up out of cracked earth. Menacing but readable, "
            "not gory. " + PALETTE + " " + NO_TEXT
        ),
    },
    {
        "id": "vox-telekhine",
        "group": "Round 4 · New monsters",
        "title": "Telekhines, the seal-dog smiths with Greek fire",
        "size": "2560 × 1440",
        "references": ["vox-key", "vox-enemies"],
        "use": "Reference for the telekhine model (entities/monsters.js): a lobber at Waterland that throws pots of Greek fire at a marked spot; not loaded by the game.",
        "prompt": (
            "A monster model sheet in the blocky voxel 3D style of a Minecraft-Dungeons-like game, "
            "isometric three-quarter views on a flat parchment-cream background, every part built "
            "from chunky cubes with hand-painted pixel textures. Telekhines: ancient sea-demon "
            "smiths, half dog and half seal, about the size of a large dog. Sleek grey-blue hide "
            "with darker speckles and a pale belly, a dog's head with a blunt seal snout, small "
            "fangs and glowing orange eyes, flippers for front feet, a stubby seal tail, a leather "
            "smith's apron and a brass harness carrying a clay pot of glowing green-orange Greek "
            "fire on its back. Show one telekhine front, side and back; then rearing up to hurl a "
            "fire pot in a high arc, the pot landing on a glowing ring marked on the ground, and "
            "the splash of green-orange flame; then a pack of three waddling on their flippers. "
            "Sly and mischievous rather than frightening. " + PALETTE + " " + NO_TEXT
        ),
    },
    {
        "id": "scene-big-house",
        "group": "Round 3 · The opening (cutscene cards)",
        "title": "Waking on the porch of the Big House",
        "size": "2560 × 1440",
        "references": ["key-art", "char-percy", "char-annabeth"],
        "use": "Card shown in the cutscene where Percy wakes at Camp Half-Blood.",
        "prompt": (
            f"A sunny summer afternoon on the wraparound porch of a big blue four-storey "
            f"farmhouse with white trim. {PERCY}, bandaged and drowsy, sits up in a deck chair "
            f"holding a Minotaur horn; {ANNABETH} leans on the railing with her arms folded, "
            f"judging him; a bearded teacher in a tweed jacket sits in a wheelchair beside a "
            f"pinochle table, and a plump man in a leopard-print shirt sips a diet cola. Beyond the "
            f"porch, Camp Half-Blood: cabins in a U, a lake with canoes, strawberry fields and the "
            f"sea. Welcoming and golden. {WORLD_STYLE} {NO_TEXT}"
        ),
    },
]


def path_for(item: dict) -> Path:
    if item.get("dest") == "game":
        return GAME / f"{item['id']}.png"
    return CONCEPT / f"{item['id']}.png"


def status(item: dict) -> str:
    return "delivered" if path_for(item).is_file() else "requested"


def build() -> str:
    lines = [
        "# Percy Jackson: concept-art requests",
        "",
        "<!-- Generated by design/source/build_requests.py; edit the data there. -->",
        "",
        "Concept art for a game of *The Lightning Thief* and the later books, in the chosen direction:",
        "**cartoon heroes in an ornamental world**. The heroes are clean, bright cartoon",
        "characters; the world, maps and interface are flat decorative illustration in",
        "the manner of Greek vases, with black-and-gold frames. See",
        "[the style reference](../reference/README.md), families 5, 6 and 10.",
        "",
        "These images are for planning: they set the look of the cast and places",
        "before any game is built. They are not yet game assets.",
        "",
        "## How to generate",
        "",
        "1. Generate **`key-art` first**. It fixes the look. Attach it as a reference to",
        "   every later request, together with the sheets named in each **References**",
        "   line.",
        "2. Then the character sheets, then the places and situations, then the",
        "   interface.",
        "3. Save each image as `<id>.png` (for example `char-percy.png`) and drop it in",
        "   [`../intake/`](../intake/README.md). On integration it moves to",
        "   `design/concept/` and this document is rebuilt.",
        "",
        "### Round 2: the game in 3D",
        "",
        "The game is built in the blocky 3D style of Minecraft Dungeons (see",
        "[the game design](game-design.md)). The round-2 sheets are what the blocky",
        "hero and monster models are built from, so generate them in this order:",
        "",
        "1. `char-heroes-2` (the new heroes in the cartoon style) and `vox-key` (the 3D",
        "   look; attach it to every later round-2 request).",
        "2. The seven hero sheets, `vox-percy` to `vox-nico`. These come first because",
        "   the hero models are built from them.",
        "3. The monster and character sheets, then the places.",
        "4. The game art (`logo`, `title-bg`, `ui-hero-cards-2`) and the chapter cards",
        "   whenever convenient; the game draws stand-ins until they arrive.",
        "",
        "Concept sheets land in `design/concept/`; files marked as game art land in",
        "`game/assets/`. Drop either kind in the intake folder.",
        "",
        "Every prompt includes the shared style and palette, so each can be pasted as it",
        "is. Prompts describe the look rather than naming any artist, and the characters",
        "are original designs drawn from the books, not likenesses of actors.",
        "",
        "## Shared style",
        "",
        "> " + WORLD_STYLE,
        "",
        "Character sheets use:",
        "",
        "> " + CHARACTER_STYLE,
        "",
        "## Requests",
        "",
        "Open requests only. Delivered ones, with the prompts they were made from,",
        "are in [image-request-history.md](image-request-history.md).",
        "",
    ]
    lines += entries([r for r in REQUESTS if status(r) != "delivered"]) or ["Nothing is waiting: every request has been delivered."]
    return "\n".join(lines) + "\n"


def build_history() -> str:
    done = [r for r in REQUESTS if status(r) == "delivered"]
    lines = [
        "# Percy Jackson: concept-art request history",
        "",
        "<!-- Generated by design/source/build_requests.py; edit the data there. -->",
        "",
        "Requests that have been delivered, kept with the prompts they were made from",
        "for reference and for regenerating an image. The open requests are in",
        "[image-requests.md](image-requests.md); the shared style both use is described",
        "there.",
        "",
        f"{len(done)} delivered.",
        "",
    ]
    lines += entries(done)
    return "\n".join(lines) + "\n"


def entries(items) -> list[str]:
    if not items:
        return []
    lines = [
        "| Id | Image | Size | Status |",
        "| --- | --- | --- | --- |",
    ]
    for item in items:
        lines.append(f"| `{item['id']}` | {item['title']} | {item['size']} | {status(item)} |")
    group = None
    for item in items:
        if item["group"] != group:
            group = item["group"]
            lines += ["", f"### {group}"]
        refs = ", ".join(f"`{r}`" for r in item["references"]) or "none (generate first)"
        lines += [
            "",
            f"#### `{item['id']}` — {item['title']}",
            "",
            f"- **File:** `{item['id']}.png`, {item['size']} px, delivered to `{path_for(item).relative_to(ROOT.parent)}`",
            f"- **References:** {refs}",
            f"- **Use:** {item['use']}",
            f"- **Status:** {status(item)}",
            "",
            "> " + item["prompt"],
        ]
    return lines


def main() -> None:
    ids = [r["id"] for r in REQUESTS]
    assert len(ids) == len(set(ids)), "duplicate request id"
    for r in REQUESTS:
        for ref in r["references"]:
            assert ref in ids[: ids.index(r["id"])], f"{r['id']} references {ref} before it exists"
    text, hist = build(), build_history()
    HIST = DOC.with_name("image-request-history.md")
    if "--check" in sys.argv:
        if DOC.read_text() != text or not HIST.exists() or HIST.read_text() != hist:
            sys.exit("image-requests.md / image-request-history.md are out of date; run build_requests.py")
        print(f"image-requests.md is up to date ({len(REQUESTS)} requests).")
        return
    DOC.write_text(text)
    HIST.write_text(hist)
    print(f"Wrote {DOC.relative_to(ROOT.parent.parent)} and {HIST.name} ({len(REQUESTS)} requests).")


if __name__ == "__main__":
    main()
