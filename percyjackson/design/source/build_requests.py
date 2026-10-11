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


def status(item: dict) -> str:
    return "delivered" if (CONCEPT / f"{item['id']}.png").is_file() else "requested"


def build() -> str:
    lines = [
        "# Percy Jackson: concept-art requests",
        "",
        "<!-- Generated by design/source/build_requests.py; edit the data there. -->",
        "",
        "Concept art for a game of *The Lightning Thief*, in the chosen direction:",
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
        "| Id | Image | Size | Status |",
        "| --- | --- | --- | --- |",
    ]
    for item in REQUESTS:
        lines.append(f"| `{item['id']}` | {item['title']} | {item['size']} | {status(item)} |")
    group = None
    for item in REQUESTS:
        if item["group"] != group:
            group = item["group"]
            lines += ["", f"### {group}"]
        refs = ", ".join(f"`{r}`" for r in item["references"]) or "none (generate first)"
        lines += [
            "",
            f"#### `{item['id']}` — {item['title']}",
            "",
            f"- **File:** `{item['id']}.png`, {item['size']} px",
            f"- **References:** {refs}",
            f"- **Use:** {item['use']}",
            f"- **Status:** {status(item)}",
            "",
            "> " + item["prompt"],
        ]
    return "\n".join(lines) + "\n"


def main() -> None:
    ids = [r["id"] for r in REQUESTS]
    assert len(ids) == len(set(ids)), "duplicate request id"
    for r in REQUESTS:
        for ref in r["references"]:
            assert ref in ids[: ids.index(r["id"])], f"{r['id']} references {ref} before it exists"
    text = build()
    if "--check" in sys.argv:
        if DOC.read_text() != text:
            sys.exit("image-requests.md is out of date; run build_requests.py")
        print(f"image-requests.md is up to date ({len(REQUESTS)} requests).")
        return
    DOC.write_text(text)
    print(f"Wrote {DOC.relative_to(ROOT.parent.parent)} ({len(REQUESTS)} requests).")


if __name__ == "__main__":
    main()
