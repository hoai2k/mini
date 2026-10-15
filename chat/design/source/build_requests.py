#!/usr/bin/env python3
"""Generate the Games Chat image requests and the app's asset list.

Edit the data in this file, then run:

    python3 chat/design/source/build_requests.py          # write
    python3 chat/design/source/build_requests.py --check  # verify up to date

Outputs:
    chat/design/image-requests.md   the request document
    chat/design/face-template.png   the face guide that face stickers are drawn on
    chat/js/asset-list.js           what the app loads

Statuses:
    requested  the app draws its own stand-in (canvas drawing or emoji) and
               does not try to load the file
    delivered  the file is in chat/assets/ and the app loads it in place of
               the stand-in
"""

from __future__ import annotations

import io
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DOC = ROOT / "design" / "image-requests.md"
TEMPLATE = ROOT / "design" / "face-template.png"
ASSET_LIST = ROOT / "js" / "asset-list.js"

# The face template every face sticker is drawn on. The app maps these points
# onto the tracked face, so a sticker drawn against them lines up on any face.
# Coordinates are in a 1024 x 1024 image, seen as the viewer sees it.
FACE = {
    "eye (image left)": (392, 520),
    "eye (image right)": (632, 520),
    "nose tip": (512, 640),
    "mouth centre": (512, 740),
    "chin": (512, 880),
    "top of head": (512, 220),
}
FACE_TEXT = (
    "Draw it on the face template (`chat/design/face-template.png`): a 1024 x 1024 canvas for a "
    "head looking straight at the camera, eye centres at (392, 520) and (632, 520), nose tip at "
    "(512, 640), mouth centre at (512, 740), chin at (512, 880) and top of head at (512, 220). "
    "Only the sticker is drawn: no face, no head, no skin."
)

STYLE = (
    "Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft "
    "outlines in a darker shade of each fill colour, bright saturated candy colours, a single "
    "soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small "
    "sizes. No text, no watermark, no photorealism."
)

BG_STYLE = (
    "Bright glossy cartoon illustration for a playful video-chat app. Clean shapes, soft "
    "outlines, saturated candy colours, gentle cel shading, friendly and silly. No text, no "
    "watermark, no photorealism."
)

# The second icon set: aimed at teenagers. It shows what each effect or game
# actually does, in a sharper, less childish style.
ICON2_STYLE = (
    "Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, "
    "in the confident graphic style of a polished social or music app: crisp vector shapes, "
    "subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean "
    "thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no "
    "chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are "
    "stylish older-teen characters with natural proportions and varied looks. The picture must "
    "show what the effect or game actually does, so someone can tell what they will get before "
    "tapping it. No text, no watermark, no photorealism."
)
ICON2 = (
    "Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo "
    "rounded-square tile (corner radius about 22%), the same backing for every icon in the set, "
    "with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, "
    "no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not "
    "possible, flat pure magenta #FF00FF outside the tile."
)

# Themes (Settings > Theme): Teen (the second icon set), Kid (the first),
# Art and Classical. Art and Classical each get their own icon set, title
# background and logo; Teen gets its own title background and logo.
ART_STYLE = (
    "Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film "
    "posters and title sequences: bold flat shapes that look cut from coloured paper, a limited "
    "palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on "
    "warm off-white paper, visible paper grain and a slight print misregistration, confident "
    "brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are "
    "stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no "
    "photorealism. No text, no watermark."
)
ART_TILE = (
    "Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper "
    "rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing "
    "for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent "
    "outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF "
    "outside the tile."
)
CLASSIC_STYLE = (
    "Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft "
    "pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork "
    "and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they "
    "fit, opulent but light-hearted and playful. Painted, not photographic. No text, no "
    "watermark."
)
CLASSIC_TILE = (
    "Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a "
    "slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same "
    "frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. "
    "Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta "
    "#FF00FF outside the frame."
)
THEME_STYLES = {
    "teen": (ICON2_STYLE, ICON2),
    "art": (ART_STYLE, ART_TILE),
    "classic": (CLASSIC_STYLE, CLASSIC_TILE),
}

LOGO_STYLE = STYLE.replace("No text, no watermark", "No other text, no watermark")

ALPHA = (
    "Transparent background (PNG with alpha). If transparency is not possible, use a flat pure "
    "magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on "
    "integration."
)

ICON = (
    "App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling "
    "about 80% of the 256 x 256 frame, readable at 48 px. " + ALPHA
)

SECTIONS = {
    "ui": ("Brand", "The title screen and the browser tab."),
    "fx": (
        "Face effect stickers",
        "Art the face effects draw on your video. Face stickers (marked **face template**) are "
        "drawn against the shared face template so the app can pin them to a tracked face; "
        "stretching them is fine, the app scales them to each face. Effects not listed here "
        "(bubbles, warps, colour filters, fire, rainbows, rain) are drawn by the app itself.",
    ),
    "games": ("Minigame art", "Sprites and backgrounds for the minigames."),
    "worlds": (
        "360° worlds",
        "Panoramas for the 360° background effects: the room behind you is replaced by the world, "
        "and tilting your phone (or turning your head on a laptop) looks around it. Each is a "
        "full equirectangular panorama: 2:1, the horizon exactly at half height, the left and right "
        "edges joining seamlessly, straight up at the top edge and straight down at the bottom. "
        "Keep the band around the horizon interesting all the way round, since that is what "
        "people see most. No people, no text.",
    ),
    "icons": (
        "Effect and game icons",
        "One icon per face effect and per minigame, shown on the effect tray and the game "
        "picker. Memory Match also uses the effect icons as its card faces. Until they arrive "
        "the app shows an emoji.",
    ),
    "themes": (
        "Theme title screens",
        "A title background and logo for each theme you can pick in Settings > Theme: Teen (the "
        "default), Art (mid-century French New Wave cinema posters) and Classical (18th-century "
        "French Rococo). The Kid theme keeps the original title art.",
    ),
    "icons-art": (
        "Effect and game icons, Art theme",
        "The Art theme's icon for every effect and game: mid-century French New Wave cinema "
        "poster art, each showing what the effect or game does. Until one arrives the theme shows "
        "the Teen icon.",
    ),
    "icons-classic": (
        "Effect and game icons, Classical theme",
        "The Classical theme's icon for every effect and game: 18th-century French Rococo "
        "painting in a gilt frame, each showing what the effect or game does. Until one arrives "
        "the theme shows the Teen icon.",
    ),
    "icons2": (
        "Effect and game icons, second set (teen style)",
        "A new icon for every effect and game, replacing the first set as each one arrives (the "
        "app keeps the first-set icon, or the emoji, until then). Aimed at teenagers: sharper and "
        "less childish, on one shared dark tile, and each picture shows what the effect or game "
        "actually does: the face with the effect on, or the moment of play.",
    ),
}

DELIVERIES_FILE = ROOT / "design" / "generated" / "deliveries.json"
DELIVERIES = {r["id"]: r for r in json.loads(DELIVERIES_FILE.read_text())
              if r.get("accepted")} if DELIVERIES_FILE.exists() else {}

REQUESTS: list[dict] = []


# Games taken out of Games Chat. Their entries stay in the lists above so the
# request numbers of everything after them don't change; req() drops their art.
RETIRED_GAMES = {"stare", "dontsmile"}
# Single pictures no longer used (replaced by a later request).
RETIRED_ASSETS = {
    "temple-arch",   # by temple-beam (CH-G84): the archway looked tall enough to run through
    # The first Baseball (behind the plate), replaced by the tabletop board (CH-G85 to G87).
    "baseball-field", "baseball-bat", "baseball-pitcher-windup", "baseball-pitcher-throw",
}


def req(section, rid, asset, title, size, purpose, prompt, standin, alpha=True, face=False,
        status="requested", ext=None):
    if asset in RETIRED_ASSETS or any(asset in (f"game-{g}", f"game2-{g}", f"art-game-{g}", f"classic-game-{g}") for g in RETIRED_GAMES):
        return
    ext = ext or ("png" if alpha else "webp")
    folder = {"ui": "ui", "fx": "fx", "games": "games", "icons": "icons", "icons2": "icons2", "worlds": "worlds",
              "themes": "themes", "icons-art": "icons-art", "icons-classic": "icons-classic"}[section]
    file = f"assets/{folder}/{asset}.{ext}"
    style = STYLE if alpha else BG_STYLE
    if rid == "CH-U01":
        style = LOGO_STYLE
    tail = None
    if section == "icons2":
        style, tail = THEME_STYLES["teen"]
    elif section == "icons-art":
        style, tail = THEME_STYLES["art"]
    elif section == "icons-classic":
        style, tail = THEME_STYLES["classic"]
    elif section == "themes":
        style = THEME_STYLES[asset.rsplit("-", 1)[1]][0]
        if asset.startswith("logo-"):
            style = style.replace("No text, no watermark", "No other text, no watermark")
    parts = [style, prompt]
    if face:
        parts.append(FACE_TEXT)
    if section == "icons":
        parts.append(ICON)
    elif tail:
        parts.append(tail)
    elif section == "themes":
        parts.append(ALPHA if alpha else "")
    elif alpha:
        parts.append(ALPHA)
    delivery = DELIVERIES.get(rid)
    if delivery:
        file = delivery["file"]
        parts = [delivery["prompt"]]
        status = "delivered"
    REQUESTS.append(dict(section=section, id=rid, asset=asset, title=title, size=size,
                         purpose=purpose, prompt=" ".join(parts), standin=standin, file=file,
                         face=face, status=status, alpha=alpha))


# --- Brand -----------------------------------------------------------------
req("ui", "CH-U01", "logo", "Title logo", "1600 x 800",
    "The title screen logo above Press Start, and the card on the game library page.",
    "A bold, playful video-game logo reading \"Games Chat\" on two lines: \"GAMES\" large on top "
    "and \"CHAT\" slightly smaller beneath it. Chunky rounded 3D letters with a thick dark-purple "
    "outline, a bright top highlight and a soft inner gradient: GAMES in hot pink to sunny yellow, "
    "CHAT in aqua to sky blue. The O-shaped counter of the A in GAMES is replaced by a small game "
    "controller, and CHAT sits inside a rounded speech bubble whose tail points down-left. A few "
    "sparkles, a see-through soap bubble and a tiny basketball float around the edges. Spell it "
    "exactly: Games Chat. Centred, slight upward tilt, wide landscape composition with even margins.",
    "The words in the page's rounded font with a gradient in the player's colour.")
req("ui", "CH-U02", "title-bg", "Title background", "1920 x 1080",
    "Behind the title screen and the join form.",
    "A dreamy pastel sky full of floating translucent iridescent bubbles of many sizes, some "
    "holding tiny reflections of smiling faces, soft lilac to aqua gradient, lots of calm empty "
    "space in the middle third for the logo and buttons. Full-bleed background, no border.",
    "A CSS gradient with drifting canvas bubbles.", alpha=False)
req("ui", "CH-U03", "icon", "App icon and favicon", "512 x 512",
    "The browser tab icon and the card on the game library page.",
    "A chunky game controller inside a rounded speech bubble, pink and yellow on a "
    "rounded-square aqua badge, glossy, with a thick dark-purple outline. Bold and simple so it "
    "reads at 16 px.",
    "An emoji favicon.")

# --- Face effect stickers --------------------------------------------------
req("fx", "CH-F01", "puppy", "Puppy ears and nose", "1024 x 1024",
    "Puppy: floppy ears on the head and a button nose on the nose tip.",
    "Two floppy brown-and-cream puppy ears hanging from the top of the head on either side, and "
    "a shiny black puppy nose centred on the nose tip.",
    "Canvas-drawn ears and nose.", face=True)
req("fx", "CH-F02", "puppy-tongue", "Puppy tongue", "1024 x 1024",
    "Puppy: drops out when you open your mouth.",
    "A long pink cartoon puppy tongue with a centre crease, its top edge at the mouth centre "
    "(512, 740), hanging straight down to about y = 960.",
    "A canvas-drawn tongue.", face=True)
req("fx", "CH-F03", "alien-antennae", "Alien antennae", "1024 x 1024",
    "Alien: two wobbly antennae on top of the head (the app also tints the face green and "
    "enlarges the eyes).",
    "Two springy lime-green alien antennae with glowing magenta ball tips, rising from the top "
    "of the head at about x = 420 and x = 604 and curving outwards to the top corners. "
    "(Regeneration: the first file delivered was corrupt and could not be opened.)",
    "Canvas-drawn antennae.", face=True)
req("fx", "CH-F04", "heart", "Heart", "256 x 256",
    "Heart Eyes: covers each eye and floats up when you smile. Memory Match uses it too.",
    "One plump glossy red cartoon heart, centred, filling the frame.",
    "A canvas-drawn heart.")
req("fx", "CH-F05", "sunglasses", "Pixel sunglasses", "1024 x 1024",
    "Deal With It: the glasses drop onto your eyes when you smile.",
    "Black 8-bit pixel-art \"deal with it\" sunglasses with white pixel glints, the lenses "
    "centred on the two eyes and the bar across the brow line. Crisp square pixels.",
    "Canvas-drawn pixel glasses.", face=True)
req("fx", "CH-F06", "crown", "Crown", "1024 x 1024",
    "Royalty: a crown on top of the head.",
    "A jewelled golden cartoon crown with five points and red, blue and green gems, its base "
    "band sitting on the top of the head at y = 220 and the points rising to about y = 20.",
    "A canvas-drawn crown.", face=True)
req("fx", "CH-F07", "mustache", "Handlebar mustache", "1024 x 1024",
    "Fancy: a mustache between nose and mouth.",
    "A grand dark-brown curly handlebar mustache centred at (512, 692), between the nose tip "
    "and the mouth, the curls reaching out to about x = 300 and x = 724.",
    "A canvas-drawn mustache.", face=True)
req("fx", "CH-F08", "monocle", "Monocle", "1024 x 1024",
    "Fancy: a monocle that pops off when you raise your eyebrows.",
    "A gold-rimmed monocle with a glassy highlight, its ring centred on the image-right eye "
    "(632, 520) with a radius of about 80 px, and a thin gold chain hanging down to (700, 900).",
    "A canvas-drawn monocle.", face=True)
req("fx", "CH-F09", "clown", "Clown wig and nose", "1024 x 1024",
    "Clown: a rainbow afro and a red nose.",
    "A big curly rainbow clown afro covering the top and sides of the head (from y = 60 down to "
    "about y = 560 at the sides, leaving the face open), and a shiny round red clown nose "
    "centred on the nose tip.",
    "A canvas-drawn wig and nose.", face=True)
req("fx", "CH-F10", "dragon-horns", "Dragon horns", "1024 x 1024",
    "Dragon: horns on the head; open your mouth to breathe fire.",
    "Two curved ivory-and-orange dragon horns rising from the top of the head at about x = 400 "
    "and x = 624, sweeping back and outwards, with small scaly ridges.",
    "Canvas-drawn horns.", face=True)
req("fx", "CH-F11", "storm-cloud", "Storm cloud", "768 x 384",
    "Storm Cloud: a little rain cloud that follows your head.",
    "A fluffy dark-grey cartoon rain cloud with a grumpy face, slightly flat on the bottom, "
    "centred and filling the frame.",
    "A canvas-drawn cloud.")
req("fx", "CH-F12", "lightning", "Lightning bolt", "256 x 512",
    "Storm Cloud: strikes when you frown.",
    "One zig-zag cartoon lightning bolt in electric yellow with a white core, top at the top "
    "centre, tip at the bottom centre.",
    "A canvas-drawn bolt.")
req("fx", "CH-F13", "fish-1", "Fish 1", "384 x 256",
    "Under the Sea: swims across your video.",
    "A round orange-and-white clownfish swimming to the right, side view, centred.",
    "A canvas-drawn fish.")
req("fx", "CH-F14", "fish-2", "Fish 2", "384 x 256",
    "Under the Sea: swims across your video.",
    "A slim electric-blue tang fish with a yellow tail swimming to the right, side view, centred.",
    "A canvas-drawn fish.")
req("fx", "CH-F15", "fish-3", "Fish 3", "384 x 256",
    "Under the Sea: swims across your video.",
    "A puffy spotted yellow pufferfish swimming to the right, side view, centred.",
    "A canvas-drawn fish.")
req("fx", "CH-F16", "space", "Outer space backdrop", "1280 x 720",
    "Outer Space: replaces the room behind you.",
    "A cheerful cartoon outer-space scene: deep violet space, scattered stars, a ringed pink "
    "planet in the upper left, a small smiling moon on the right and a distant rocket. Keep the "
    "centre darker and calmer, since a person sits in front of it. Full-bleed, no border.",
    "A canvas-drawn starfield with a planet.", alpha=False)

# --- Minigame art ----------------------------------------------------------
req("games", "CH-G01", "basketball", "Basketball", "256 x 256",
    "Hoops: the ball, yours and your friends' ghost balls (the app tints and fades those).",
    "A classic orange basketball with black seams, seen straight on, centred, filling the frame.",
    "A canvas-drawn ball.")
req("games", "CH-G02", "hoop", "Hoop and backboard", "1024 x 1024",
    "Hoops: the target. The game's rim physics assume this layout.",
    "A basketball hoop seen straight on: a white backboard with a red square, an orange rim "
    "seen slightly from below whose front edge runs from (352, 640) to (672, 640), and a white "
    "net hanging below the rim to about y = 900. The backboard spans roughly x = 192 to 832 and "
    "y = 220 to 700.",
    "A canvas-drawn backboard, rim and net.")
req("games", "CH-G03", "court", "Gym background", "1600 x 1200",
    "Hoops: behind the hoop.",
    "An EMPTY bright cartoon school gym with no people or characters at all: polished wooden "
    "floor in the bottom quarter, padded blue walls, a row of high windows with sunlight, empty "
    "bleachers at the sides. No basketball hoop and no ball (the game draws its own). Plain and "
    "slightly blurred in the upper middle, where the hoop is drawn. Full-bleed, no border.",
    "A canvas-drawn wall and floor.", alpha=False)
req("games", "CH-G04", "flappy-sky", "Flappy sky", "1920 x 1080",
    "Flappy Face: the scrolling background.",
    "A cheerful cartoon sky with puffy clouds and a low line of green hills and a little town "
    "along the bottom. Seamless horizontally: the left and right edges must join with no seam.",
    "A canvas-drawn sky and hills.", alpha=False)
req("games", "CH-G05", "flappy-pipe", "Flappy pillar", "256 x 1024",
    "Flappy Face: the obstacles (the game flips it for the pillars hanging from the top).",
    "A tall, thick candy-striped pillar (pink and white diagonal stripes) with a slightly wider "
    "glossy cap at the top, standing upright. The shaft must fill the full 256 px width of the "
    "canvas from edge to edge (the cap may be the full width and the shaft at least 85% of it), "
    "and run from the top edge to the bottom edge. It is a chunky obstacle, not a thin pole.",
    "Canvas-drawn pillars.")
req("games", "CH-G06", "wings", "Wings", "768 x 384",
    "Flappy Face: a pair of wings either side of your face, which is the bird.",
    "A pair of fluffy white cartoon bird wings spread out to the left and right, with an empty "
    "round gap about 256 px wide in the middle where a face will go.",
    "Canvas-drawn wings.")
req("games", "CH-G07", "quickdraw", "Showdown street", "1600 x 1000",
    "Quick Draw: the background of the duel.",
    "A cartoon Wild West main street at high noon seen down the middle: saloon and general store "
    "on either side, a tumbleweed, a big bright sun, empty dusty road in the centre. Full-bleed.",
    "A canvas-drawn sunset gradient.", alpha=False)
req("games", "CH-G08", "rps-rock", "Rock hand", "512 x 512",
    "Rock Paper Scissors: the rock throw.",
    "A cartoon fist (rock) seen from the back of the hand, centred.",
    "The ✊ emoji.")
req("games", "CH-G09", "rps-paper", "Paper hand", "512 x 512",
    "Rock Paper Scissors: the paper throw.",
    "A cartoon open flat hand (paper), palm facing the viewer, centred.",
    "The ✋ emoji.")
req("games", "CH-G10", "rps-scissors", "Scissors hand", "512 x 512",
    "Rock Paper Scissors: the scissors throw.",
    "A cartoon hand making a V with two fingers (scissors), centred.",
    "The ✌️ emoji.")
req("games", "CH-G11", "airhockey-table", "Air hockey table", "1000 x 1600",
    "Air Hockey: the table, seen from above, portrait.",
    "An EMPTY glossy arcade air-hockey table seen from directly above: icy white-blue surface "
    "with tiny air holes, a red centre line and centre circle, goal slots at the top and bottom "
    "centre about 36% of the width, and a neon rim along all four edges. No paddles, no "
    "mallets and no puck anywhere on it (the game draws its own). Flat top-down view, no "
    "perspective, full-bleed.",
    "A canvas-drawn table.", alpha=False)
req("games", "CH-G12", "card-back", "Card back", "512 x 704",
    "Memory Match: the face-down cards.",
    "The back of a playing card with rounded corners: a bright aqua and pink bubble pattern with "
    "a small bubble logo in the middle, symmetrical.",
    "A CSS pattern.")

# --- Added in the second batch ------------------------------------------
req("fx", "CH-F17", "flower-crown", "Flower crown", "1024 x 1024",
    "Flower Crown: a ring of flowers on the head.",
    "A lush crown of pink peonies, white daisies, small yellow roses and green leaves, resting "
    "across the top of the head from about (300, 300) over (512, 220) to (724, 300), slightly "
    "curved like a band seen from the front.",
    "Canvas-drawn flowers.", face=True)
req("fx", "CH-F18", "kitty", "Kitty ears, nose and whiskers", "1024 x 1024",
    "Kitty: cat ears, a pink nose and whiskers.",
    "Two pointed fluffy cat ears (grey tabby with pink insides) on top of the head at about "
    "x = 360 and x = 664, a small pink triangular cat nose on the nose tip, and three thin white "
    "whiskers fanning out on each cheek from beside the nose.",
    "Canvas-drawn ears, nose and whiskers.", face=True)
req("fx", "CH-F19", "bunny", "Bunny ears and nose", "1024 x 1024",
    "Bunny: tall bunny ears and a twitchy nose.",
    "Two tall upright white bunny ears with pink insides rising from the top of the head (bases "
    "at about x = 420 and x = 604, tips reaching y = 0), one slightly bent, and a small pink "
    "bunny nose on the nose tip.",
    "Canvas-drawn ears and nose.", face=True)
req("fx", "CH-F20", "devil", "Devil horns", "1024 x 1024",
    "Devil: little red horns.",
    "Two small glossy red devil horns curving up from the top of the head at about x = 400 and "
    "x = 624, with a faint orange glow.",
    "Canvas-drawn horns.", face=True)
req("fx", "CH-F21", "halo", "Angel halo", "1024 x 1024",
    "Angel: a glowing halo floating above the head.",
    "A glowing golden halo ring seen slightly from the front, floating above the head centred at "
    "(512, 140), about 360 px wide, with a soft warm glow.",
    "A canvas-drawn halo.", face=True)
req("fx", "CH-F22", "pirate", "Pirate hat and eyepatch", "1024 x 1024",
    "Pirate: a tricorn hat and an eyepatch.",
    "A black pirate tricorn hat with gold trim and a small white skull, sitting on the top of the "
    "head (brim at y = 240), and a black eyepatch over the image-left eye (392, 520) with its "
    "strap running diagonally across the forehead.",
    "A canvas-drawn hat and patch.", face=True)
req("fx", "CH-F23", "viking", "Viking helmet", "1024 x 1024",
    "Viking: a horned helmet.",
    "A round iron Viking helmet with riveted bands and two big curved ivory horns, the rim sitting "
    "on the forehead at about y = 330, covering the top of the head.",
    "A canvas-drawn helmet.", face=True)
req("fx", "CH-F24", "wizard-hat", "Wizard hat", "1024 x 1024",
    "Wizard: a tall starry hat.",
    "A tall, slightly bent deep-blue wizard hat covered in small gold stars and moons, its wide "
    "brim sitting on the top of the head at y = 260 and the tip reaching the top edge.",
    "A canvas-drawn hat.", face=True)
req("fx", "CH-F25", "butterfly", "Butterfly", "256 x 256",
    "Butterflies: they flutter around your head and land on it.",
    "One bright blue-and-pink butterfly seen from above with wings spread, centred.",
    "A canvas-drawn butterfly.")
req("fx", "CH-F26", "hotdog", "Dancing hotdog", "512 x 768",
    "Hotdog: a dancing hotdog bops beside you.",
    "A cheerful cartoon hotdog character standing upright, with a mustard squiggle, little arms "
    "and legs mid-dance, big eyes and a wide grin, full body, centred.",
    "A canvas-drawn hotdog.")
req("fx", "CH-F27", "money", "Banknote", "256 x 128",
    "Make It Rain: notes falling all around you.",
    "One cartoon green banknote with a smiling bubble in the centre oval instead of a portrait, "
    "slightly curled, filling the frame.",
    "A canvas-drawn note.")
req("fx", "CH-F28", "sunset", "Sunset backdrop", "1920 x 1080",
    "Sunset: the room behind you becomes a glowing sunset, and you become a silhouette.",
    "A huge orange and pink sunset over a calm sea, the sun just touching the horizon in the "
    "centre, palm trees at the edges, warm glowing sky. Full-bleed.",
    "A canvas-drawn sunset gradient.", alpha=False)

WORLDS = [
    ("world-beach", "Beach", "a tropical beach: turquoise sea, white sand, palm trees, a beach hut, a striped umbrella and a few seagulls, bright midday sky"),
    ("world-space", "Space station", "inside a cosy cartoon space station with round windows looking out at Earth and the Moon, glowing control panels and floating snacks"),
    ("world-reef", "Coral reef", "underwater on a colourful coral reef: sunbeams from above, fish schools, a turtle, kelp and pink and orange corals all around"),
    ("world-forest", "Enchanted forest", "a glowing enchanted forest at dusk: giant mushrooms, fireflies, mossy trees and a winding path"),
    ("world-city", "City rooftop", "a city rooftop at night: neon skyscrapers all around, string lights, a water tower and a starry sky"),
    ("world-snow", "Snowy mountains", "a snowy mountain top: peaks in every direction, a cosy cabin, pine trees and a pink alpenglow sky"),
    ("world-candy", "Candy land", "a candy land: lollipop trees, a chocolate river, gumdrop hills and candy-cane fences under a pastel sky"),
    ("world-volcano", "Volcano island", "a volcano island: a smoking volcano with glowing lava rivers, black sand, dinosaur silhouettes and a red sky"),
]
for n, (asset, title, scene) in enumerate(WORLDS, 1):
    req("worlds", f"CH-W{n:02d}", asset, f"{title} panorama", "4096 x 2048",
        f"{title} 360: the world behind you that you look around by tilting the phone.",
        f"A 360-degree equirectangular panorama of {scene}. Cartoon style, rich colour, everything "
        "drawn as seen from a person standing in the middle.",
        "A canvas-drawn panorama with a sky, a horizon and a few shapes.", alpha=False)

req("games", "CH-G13", "golf-grass", "Mini golf turf", "512 x 512",
    "Mini Golf: the putting surface (tiled).",
    "Top-down bright green artificial putting turf with a fine mown stripe pattern, seamlessly "
    "tileable on all four edges, no objects.",
    "A canvas-drawn striped green.", alpha=False)
req("games", "CH-G14", "bowling-lane", "Bowling lane", "1080 x 1920",
    "Bowling: the lane, seen from behind the bowler looking down it.",
    "A glossy wooden bowling lane in perspective from the bowler's end, gutters on both sides, "
    "arrows on the boards, the pin deck lit at the far end near the top centre, neon bowling alley "
    "walls. Leave the pin deck empty: the game draws the pins.",
    "A canvas-drawn lane.", alpha=False)
req("games", "CH-G15", "bowling-pin", "Bowling pin", "128 x 384",
    "Bowling: each pin.",
    "One classic white bowling pin with two red stripes around the neck, upright, centred.",
    "A canvas-drawn pin.")
for n, (asset, title, desc) in enumerate([
    ("burger-bun-top", "Top bun", "a domed sesame-seed top bun"),
    ("burger-bun-bottom", "Bottom bun", "a flat bottom bun"),
    ("burger-patty", "Patty", "a juicy grilled beef patty with grill marks"),
    ("burger-cheese", "Cheese", "a slice of melting yellow cheese with drips over the edges"),
    ("burger-lettuce", "Lettuce", "a frilly green lettuce leaf"),
    ("burger-tomato", "Tomato", "two red tomato slices side by side"),
], 16):
    req("games", f"CH-G{n:02d}", asset, title, "512 x 192",
        "Burger Stack: an ingredient that falls and stacks.",
        f"Side view of {desc}, filling the width, as part of a stacked cartoon burger.",
        "A canvas-drawn ingredient.")
req("games", "CH-G22", "asteroid", "Asteroid", "256 x 256",
    "Asteroid Dodge: the rocks to dodge.",
    "One lumpy grey-brown cartoon asteroid with craters, centred.",
    "A canvas-drawn rock.")
req("games", "CH-G23", "rocket", "Rocket ship", "256 x 256",
    "Asteroid Dodge: your ship, which wears your face in its window.",
    "A chunky cartoon rocket ship pointing up, red and white with fins and a flame, and a big empty "
    "round porthole window in the middle (the app shows your face there).",
    "A canvas-drawn rocket.")
req("games", "CH-G24", "beach-ball", "Beach ball", "256 x 256",
    "Beach Bump: the ball you bump between friends.",
    "A classic six-panel beach ball in red, yellow, blue, white, green and orange, centred.",
    "A canvas-drawn beach ball.")

# --- Icons -----------------------------------------------------------------
EFFECT_ICONS = [
    ("bubble", "Bubble Blow", "puckered cartoon lips blowing a big translucent iridescent bubble"),
    ("bigeyes", "Big Eyes", "a cartoon face with huge sparkly anime eyes"),
    ("bobblehead", "Bobblehead", "a bobblehead figure with a giant head on a tiny body on a spring"),
    ("noodle", "Noodle Face", "a cartoon face stretched tall and thin like a funhouse mirror"),
    ("swirl", "Swirl", "a cartoon face twisted into a colourful spiral"),
    ("pixel", "8-Bit", "a pixel-art smiley face made of big square pixels"),
    ("comic", "Comic Book", "a comic-book face with halftone dots and a POW burst"),
    ("thermal", "Heat Vision", "a face shown as a thermal camera image, blue to red to yellow"),
    ("space", "Outer Space", "an astronaut helmet in front of a ringed planet and stars"),
    ("underwater", "Under the Sea", "a clownfish among bubbles in blue water"),
    ("puppy", "Puppy", "a cute puppy face with floppy ears and its tongue out"),
    ("alien", "Alien", "a green alien face with big black eyes and antennae"),
    ("hearteyes", "Heart Eyes", "a smiley face with red hearts for eyes"),
    ("dealwithit", "Deal With It", "black pixel sunglasses dropping onto a smug face"),
    ("crown", "Royalty", "a golden jewelled crown"),
    ("fancy", "Fancy", "a handlebar mustache and a gold monocle"),
    ("clown", "Clown", "a red clown nose and a rainbow afro"),
    ("dragon", "Dragon", "a small dragon head breathing a puff of fire"),
    ("rainbow", "Rainbow Mouth", "a smiling mouth with a rainbow pouring out of it"),
    ("storm", "Storm Cloud", "a grumpy grey rain cloud with a lightning bolt"),
]
GAME_ICONS = [
    ("hoops", "Hoops", "a basketball swishing through an orange hoop"),
    ("flappy", "Flappy Face", "a smiling round face with white bird wings flapping"),
    ("stare", "Staring Contest", "two wide-open cartoon eyes staring, with tiny sweat drops"),
    ("quickdraw", "Quick Draw", "a cowboy hat and a hand-drawn \"!\" speech burst"),
    ("rps", "Rock Paper Scissors", "a fist, an open hand and a V-sign hand in a circle"),
    ("connect4", "Connect Four", "a blue grid with red and yellow discs in a diagonal row"),
    ("airhockey", "Air Hockey", "an air hockey paddle striking a puck with speed lines"),
    ("doodle", "Doodle Guess", "a pencil drawing a squiggle with a question mark"),
    ("memory", "Memory Match", "two face-up cards with matching hearts and one face-down card"),
    ("copycat", "Copy Cat", "a cartoon cat making a silly face in a mirror"),
]
NEW_EFFECT_ICONS = [
    ("echo", "Time Trails", "a face leaving a rainbow trail of see-through copies"),
    ("delayghost", "Delay Ghost", "a person with a translucent ghost copy one step behind"),
    ("timewarp", "Time Warp", "a face stretched by a glowing blue scan line sweeping down"),
    ("timewarpside", "Side Warp", "a face smeared sideways by a vertical blue scan line"),
    ("slitscan", "Wobble Time", "a face rippling in wavy horizontal bands"),
    ("strobe", "Stop Motion", "a face in three jerky film frames"),
    ("clones", "Clones", "three identical cartoon faces in a row"),
    ("motionglow", "Motion Glow", "a waving hand leaving neon outline trails"),
    ("beach360", "Beach 360", "a palm tree and a turquoise sea in a round 360 frame"),
    ("space360", "Space 360", "Earth seen through a round space-station window"),
    ("reef360", "Reef 360", "a coral reef with a turtle in a round frame"),
    ("forest360", "Forest 360", "glowing mushrooms in a dark forest"),
    ("city360", "City 360", "neon skyscrapers at night"),
    ("snow360", "Snow 360", "snowy peaks and a cabin"),
    ("candy360", "Candy 360", "lollipop trees and gumdrop hills"),
    ("volcano360", "Volcano 360", "an erupting cartoon volcano"),
    ("blurbg", "Blur", "a sharp face in front of a soft blurry room"),
    ("colorpop", "Colour Pop", "a colourful face against a grey room"),
    ("neonaura", "Neon Aura", "a dark silhouette outlined in glowing neon pink and cyan"),
    ("disco", "Disco", "a glittering disco ball with coloured light beams"),
    ("matrix", "Code Rain", "green falling code characters behind a silhouette"),
    ("sunset", "Sunset", "a black silhouette against a huge orange sunset"),
    ("tinyface", "Tiny Face", "a big head with a tiny squished face in the middle"),
    ("chubby", "Chubby Cheeks", "a face with huge puffed-out round cheeks"),
    ("babyface", "Baby Face", "a baby face with big eyes and a tiny nose"),
    ("symmetry", "Mirror Face", "a face split down the middle and mirrored"),
    ("cyclops", "Cyclops", "a cartoon face with one huge eye in the middle"),
    ("bigmouth", "Big Mouth", "a face with an enormous grinning mouth"),
    ("fisheye", "Fisheye", "a face bulging through a round fisheye lens"),
    ("flowercrown", "Flower Crown", "a crown of pink peonies and daisies"),
    ("kitty", "Kitty", "a cute cat face with whiskers"),
    ("bunny", "Bunny", "a bunny face with tall ears"),
    ("devil", "Devil", "a cheeky face with little red devil horns"),
    ("angel", "Angel", "a smiling face with a golden halo"),
    ("pirate", "Pirate", "a pirate tricorn hat and eyepatch"),
    ("viking", "Viking", "a horned Viking helmet"),
    ("wizard", "Wizard", "a starry blue wizard hat with sparkles"),
    ("butterflies", "Butterflies", "blue and pink butterflies circling a head"),
    ("makeup", "Glam", "a lipstick and a blush brush with sparkles"),
    ("crying", "Waterworks", "a face crying two fountains of tears"),
    ("hotdog", "Hotdog", "a dancing cartoon hotdog"),
    ("noir", "Film Noir", "a black-and-white detective hat and film grain"),
    ("vhs", "VHS", "a VHS tape with rainbow glitch lines"),
    ("popart", "Pop Art", "four colourful pop-art copies of a face in a grid"),
    ("kaleidoscope", "Kaleidoscope", "a colourful kaleidoscope star pattern"),
    ("snow", "Snowfall", "big snowflakes falling"),
    ("confetti", "Confetti", "a party popper bursting confetti"),
    ("moneyrain", "Make It Rain", "green banknotes falling"),
    ("lasereyes", "Laser Eyes", "a face shooting red laser beams from its eyes"),
    ("fireworks", "Fireworks", "colourful fireworks bursting in a night sky"),
]
NEW_GAME_ICONS = [
    ("minigolf", "Mini Golf", "a golf ball next to a flag in a hole on bright green turf"),
    ("bowling", "Bowling", "a bowling ball crashing into white pins"),
    ("beachbump", "Beach Bump", "a beach ball bouncing off a smiling face"),
    ("burger", "Burger Stack", "a tall wobbly burger stack with a face peeking under it"),
    ("asteroids", "Asteroid Dodge", "a rocket weaving between asteroids"),
    ("dontsmile", "Don't Smile", "a straight face trying not to laugh, with a sweat drop"),
    ("snake", "Snake", "two cartoon snakes racing for an apple"),
    ("battleship", "Battleship", "a grey battleship and a red hit marker on a blue grid"),
    ("trivia", "Trivia", "a big question mark on a quiz-show buzzer"),
    ("wordblitz", "Word Blitz", "a 4x4 grid of letter tiles with a word path traced in gold"),
]
# Third batch: face and body reshaping.
MORE_EFFECT_ICONS = [
    ("kid", "Kid", "a cheerful child's face with big eyes and freckles"),
    ("manface", "Man", "a grown man's face with a square jaw and stubble"),
    ("womanface", "Woman", "a woman's face with long lashes, rosy cheeks and red lips"),
    ("thinner", "Thinner", "a tall skinny face squeezed between two inward arrows"),
    ("fatter", "Fatter", "a wide round face stretched between two outward arrows"),
    # Baby replaced Kid; the Kid icon (CH-I91) is kept as history.
    ("baby", "Baby", "a chubby-cheeked baby's face with big round eyes, a tiny nose and a few wisps of hair"),
]
for i, (gid, name, subject) in enumerate(EFFECT_ICONS, 1):
    req("icons", f"CH-I{i:02d}", f"fx-{gid}", f"{name} icon", "256 x 256",
        f"The {name} button on the effect tray.", f"Icon of {subject}.", "An emoji.")
for i, (gid, name, subject) in enumerate(GAME_ICONS, len(EFFECT_ICONS) + 1):
    req("icons", f"CH-I{i:02d}", f"game-{gid}", f"{name} icon", "256 x 256",
        f"The {name} card in the game picker.", f"Icon of {subject}.", "An emoji.")
for i, (gid, name, subject) in enumerate(NEW_EFFECT_ICONS, 31):
    req("icons", f"CH-I{i:02d}", f"fx-{gid}", f"{name} icon", "256 x 256",
        f"The {name} button on the effect strip.", f"Icon of {subject}.", "An emoji.")
for i, (gid, name, subject) in enumerate(NEW_GAME_ICONS, 31 + len(NEW_EFFECT_ICONS)):
    req("icons", f"CH-I{i:02d}", f"game-{gid}", f"{name} icon", "256 x 256",
        f"The {name} card in the game picker.", f"Icon of {subject}.", "An emoji.")
for i, (gid, name, subject) in enumerate(MORE_EFFECT_ICONS, 31 + len(NEW_EFFECT_ICONS) + len(NEW_GAME_ICONS)):
    req("icons", f"CH-I{i:02d}", f"fx-{gid}", f"{name} icon", "256 x 256",
        f"The {name} button on the effect strip.", f"Icon of {subject}.", "An emoji.")


# --- Second icon set: one per effect and game, showing what it does --------
V2_FX = [
    ("bubble", "Bubble Blow", "a teen in profile with pursed lips blowing a big shimmering soap bubble that drifts away towards the edge, a second small bubble popping with a burst of droplets"),
    ("puppy", "Puppy", "a teen's face wearing realistic-looking floppy brown dog ears and a black dog nose, mouth open with a long pink dog tongue hanging out"),
    ("hearteyes", "Heart Eyes", "a teen's grinning face with glowing red heart shapes in place of the eyes, three small hearts floating up from the head"),
    ("dragon", "Dragon", "a teen with small curved dragon horns and scaly cheeks, mouth wide open blasting a jet of orange fire sideways"),
    ("rainbow", "Rainbow Mouth", "a teen's face with mouth wide open and a thick bright rainbow pouring out of it and curving down out of frame"),
    ("bigeyes", "Big Eyes", "a teen's face with eyes magnified huge like a bulging lens, the rest of the face normal, a subtle warp ring around each eye"),
    ("bobblehead", "Bobblehead", "a teen drawn with a giant head on a small body, the head tilted mid-wobble with two motion arcs"),
    ("alien", "Alien", "a teen's face tinted lime green with large glossy black almond eyes and two antennae with glowing tips"),
    ("dealwithit", "Deal With It", "pixel-art black sunglasses dropping down onto a smirking teen's face, motion lines above them"),
    ("crown", "Royalty", "a confident teen wearing a heavy gold jewelled crown slightly tilted, a few gold sparkles"),
    ("fancy", "Fancy", "a teen with raised eyebrows, a curled handlebar mustache and a gold monocle on a chain falling from one eye"),
    ("clown", "Clown", "a teen with a round red clown nose and a huge rainbow curly afro wig, mouth open in a honk"),
    ("storm", "Storm Cloud", "a small dark rain cloud hovering over a teen's frowning head, rain falling on them and a lightning bolt striking"),
    ("noodle", "Noodle Face", "a teen's face stretched long and wavy like in a funhouse mirror, eyes and mouth pulled into a tall S-curve"),
    ("swirl", "Swirl", "a teen's face twisted into a spiral around the nose, as if being pulled down a whirlpool"),
    ("space", "Outer Space", "a teen's head and shoulders cut out against a deep starfield with a ringed planet and a nebula behind them"),
    ("underwater", "Under the Sea", "a teen's head and shoulders in blue-green water light, rippling caustics on the face, bubbles rising and a small tropical fish passing"),
    ("pixel", "8-Bit", "a teen's face rendered in big chunky square pixels with a limited retro console palette, half the face still smooth to show the change"),
    ("comic", "Comic Book", "a teen's face in comic-book style with halftone dots and bold ink lines, mouth open and a jagged POW burst shape beside it"),
    ("thermal", "Heat Vision", "a teen's face as a thermal camera image, hot yellow and red cheeks fading to purple and blue at the edges"),
    ("flowercrown", "Flower Crown", "a teen wearing a crown of pink peonies, white daisies and green leaves, soft petals drifting"),
    ("kitty", "Kitty", "a teen with pointed cat ears, a small pink cat nose and thin white whiskers, mouth open mid-meow"),
    ("bunny", "Bunny", "a teen with tall white rabbit ears, one ear flopped over, and a little pink bunny nose"),
    ("hotdog", "Hotdog", "a person dressed in a full hotdog costume, face showing through the bun, jumping in the air"),
    ("lasereyes", "Laser Eyes", "a teen with raised eyebrows firing two straight red laser beams from the eyes towards the viewer, glowing hot"),
    ("crying", "Waterworks", "a teen's face crying two exaggerated arcing fountains of tears from the corners of the eyes, splashing below"),
    ("devil", "Devil", "a teen with a sly smile and two small glossy red devil horns, a faint red glow and a few embers behind"),
    ("angel", "Angel", "a teen with a golden halo floating above the head and soft white feathered wings behind the shoulders"),
    ("pirate", "Pirate", "a teen in a black tricorn pirate hat with a skull emblem and a black eyepatch, mid-shout"),
    ("viking", "Viking", "a teen in a horned steel Viking helmet with a braided orange beard"),
    ("wizard", "Wizard", "a teen in a tall starry midnight-blue wizard hat, eyebrows raised, purple magic sparks bursting around the head"),
    ("butterflies", "Butterflies", "a teen's head with a ring of blue and pink butterflies circling it, two flying off"),
    ("makeup", "Glam", "a teen's face with bold winged eyeliner, glossy red lips and contoured cheeks, a sparkle on the cheekbone"),
    ("beach360", "Beach 360", "a teen cut out in front of a tropical beach with palm trees and turquoise sea, a circular 360-degree arrow around the scene"),
    ("space360", "Space 360", "a teen cut out in front of a space-station window looking down at Earth, a circular 360-degree arrow around the scene"),
    ("reef360", "Reef 360", "a teen cut out in front of a coral reef with a sea turtle, a circular 360-degree arrow around the scene"),
    ("forest360", "Forest 360", "a teen cut out in front of a misty fantasy forest with a waterfall and glowing mushrooms, a circular 360-degree arrow"),
    ("city360", "City 360", "a teen cut out on a rooftop in front of neon skyscrapers at night, a circular 360-degree arrow around the scene"),
    ("snow360", "Snow 360", "a teen cut out in front of snowy mountain peaks and a wooden cabin, a circular 360-degree arrow"),
    ("candy360", "Candy 360", "a teen cut out in front of a candy land with lollipop trees and a gingerbread house, a circular 360-degree arrow"),
    ("volcano360", "Volcano 360", "a teen cut out in front of an erupting volcano and rivers of glowing lava, a circular 360-degree arrow"),
    ("blurbg", "Blur", "a crisp, sharply drawn teen in the foreground, and behind them a bedroom so heavily out of focus that nothing in it has an edge: only big soft round bokeh discs of warm and violet light and smeared colour shapes, like a phone's portrait mode turned all the way up. The contrast between the sharp person and the completely blurred room is the whole point of the icon; draw no sharp object anywhere behind them"),
    ("colorpop", "Colour Pop", "a teen in full vivid colour in front of a room that is entirely black and white"),
    ("neonaura", "Neon Aura", "a dark silhouette of a teen outlined by a glowing neon pink and cyan aura on a black background"),
    ("disco", "Disco", "a teen lit by coloured disco beams from a mirror ball above, light spots on the face, dark room behind"),
    ("matrix", "Code Rain", "a teen with a green-tinted face in front of falling columns of green code characters on black"),
    ("sunset", "Sunset", "a black silhouette of a teen's head and shoulders against a huge orange and pink sunset over the sea"),
    ("echo", "Time Trails", "a teen mid-move leaving a trail of four fading see-through copies, each tinted a different rainbow colour"),
    ("delayghost", "Delay Ghost", "a teen with a pale translucent ghost copy of themselves a step behind, copying their pose a moment late"),
    ("timewarp", "Time Warp", "a teen's face stretched and frozen above a glowing blue horizontal scan line moving down the picture"),
    ("timewarpside", "Side Warp", "a teen's face smeared sideways into a long streak left of a glowing blue vertical scan line"),
    ("slitscan", "Wobble Time", "a teen's face sliced into horizontal bands, each band shifted in time so the face ripples like a wave"),
    ("strobe", "Stop Motion", "three frozen film frames of a teen in jerky poses side by side, like stop-motion animation on a film strip"),
    ("clones", "Clones", "three identical copies of the same teen in different poses side by side in one room"),
    ("motionglow", "Motion Glow", "a teen waving one hand, the hand leaving bright neon light-painting trails in the air"),
    ("tinyface", "Tiny Face", "a normal-sized teen head with comically tiny eyes, nose and mouth squeezed together in the middle"),
    ("chubby", "Chubby Cheeks", "a teen's face with hugely puffed-out round cheeks, lips pressed together holding air"),
    ("babyface", "Baby Face", "a teen's face turned into a baby's: huge round eyes, a button nose, chubby cheeks and a tiny mouth"),
    ("symmetry", "Mirror Face", "a teen's face split down the middle with one half mirrored onto the other, a thin glowing line down the centre"),
    ("cyclops", "Cyclops", "a teen's face with a single large eye in the middle of the forehead instead of two"),
    ("bigmouth", "Big Mouth", "a teen's face with an enormous wide grinning mouth taking up the lower half of the face"),
    ("fisheye", "Fisheye", "a teen leaning close to the lens, nose and face bulging out through a round fisheye distortion"),
    ("noir", "Film Noir", "a teen in black and white with film grain and a dramatic slatted window shadow across the face"),
    ("vhs", "VHS", "a teen's face on an old VHS tape picture with colour bleeding, tracking lines and a glitch band across the middle"),
    ("popart", "Pop Art", "four copies of the same teen's face in a 2x2 grid, each in a different loud pop-art colour scheme"),
    ("kaleidoscope", "Kaleidoscope", "a teen's face repeated into a symmetrical kaleidoscope star pattern in bright colours"),
    ("snow", "Snowfall", "a teen in a beanie with big snowflakes falling around them and a few settling on the hat"),
    ("confetti", "Confetti", "a smiling teen with bursts of multicoloured confetti and streamers exploding around their head"),
    ("moneyrain", "Make It Rain", "a teen with mouth open while green banknotes rain down and flutter around them"),
    ("fireworks", "Fireworks", "a teen with mouth open as a firework launches upward and bursts into a big colourful flower in the night sky behind"),
    ("kid", "Kid", "a split face: left half a teen, right half the same person as a young kid with a rounder face and bigger eyes"),
    ("manface", "Man", "a split face: left half a teen, right half the same person as a grown man with a squarer jaw, heavier brows and stubble"),
    ("womanface", "Woman", "a split face: left half a teen, right half the same person with winged eyeliner, fuller lips and a slimmer jaw"),
    ("thinner", "Thinner", "a teen's head and shoulders squeezed narrow from both sides, two arrows pressing inward"),
    ("fatter", "Fatter", "a teen's head and shoulders stretched wide sideways, two arrows pulling outward"),
]
V2_GAMES = [
    ("hoops", "Hoops", "a hand flicking a basketball up towards a hoop with a glass backboard, a faint ghost ball in another colour following"),
    ("flappy", "Flappy Face", "a person's face as a round bird with small white wings, flapping through a gap between two tall pillars"),
    ("airhockey", "Air Hockey", "a top-down air hockey table, a paddle striking the puck with speed lines towards the goal"),
    ("connect4", "Connect Four", "a blue Connect Four grid with red and yellow discs, the last disc dropping in to make four in a row"),
    ("quickdraw", "Quick Draw", "two cowboy silhouettes facing off on a dusty street at sunset, one already drawing"),
    ("stare", "Staring Contest", "two faces nose to nose glaring, wide-open eyes, a fly buzzing between them"),
    ("copycat", "Copy Cat", "two faces side by side pulling the same silly expression, tongue out and one eye shut"),
    ("rps", "Rock Paper Scissors", "three hands thrown at once in a circle: a fist, a flat hand and a V for scissors"),
    ("doodle", "Doodle Guess", "a hand-drawn marker sketch of a cat on a whiteboard with a speech bubble guessing with a question mark"),
    ("memory", "Memory Match", "a grid of face-down cards with two flipped face-up showing the same effect picture"),
    ("minigolf", "Mini Golf", "a golf ball rolling across bright turf towards a flag in the hole, a dashed aiming line behind it"),
    ("bowling", "Bowling", "a bowling ball curving down a lane and smashing into white pins mid-strike"),
    ("beachbump", "Beach Bump", "a beach ball bouncing off a person's forehead as they nod, motion lines and a sunny beach behind"),
    ("burger", "Burger Stack", "a tall wobbly burger tower being caught on a bun, a lettuce leaf falling in and a boot to dodge"),
    ("asteroids", "Asteroid Dodge", "a small rocket weaving between tumbling asteroids in space, a gold star to grab"),
    ("dontsmile", "Don't Smile", "a person with a dead-straight face, lips pressed tight, trying not to laugh, a bead of sweat"),
    ("snake", "Snake", "two neon snakes of different colours racing across a dark grid towards a glowing apple"),
    ("battleship", "Battleship", "a top-down grid of sea with a grey battleship and a red explosion hit marker on it"),
    ("trivia", "Trivia", "a quiz-show buzzer being slammed with four coloured answer panels behind it"),
    ("wordblitz", "Word Blitz", "a 4x4 grid of letter tiles with a glowing path swiped through them spelling a word"),
]
# Added after the set was numbered, so it goes at the end: Baby replaced Kid
# (the Kid icon, CH-K72, is kept as history).
V2_LATE = [
    ("baby", "Baby", "a split face: left half a teen, right half the same person as a baby, with a big round head, fat cheeks, large eyes, a tiny button nose and smooth skin"),
]
for i, (gid, name, subject) in enumerate(V2_LATE, len(V2_FX) + len(V2_GAMES) + 1):
    req("icons2", f"CH-K{i:02d}", f"fx2-{gid}", f"{name} icon (second set)", "256 x 256",
        f"The {name} button on the effect strips, replacing the first-set icon.", f"Icon: {subject}.",
        "The first-set icon, or the emoji.")
# Theme title screens.
THEME_UI = [
    ("teen", "Teen", "a deep indigo night city scene seen from a rooftop, neon signs and city lights "
     "softly out of focus, a few glowing phone screens and speech-bubble shapes drifting like "
     "lanterns",
     "a sleek logo: \"GAMES\" in a bold modern sans serif with a soft neon glow over \"CHAT\" set "
     "inside a rounded speech bubble outline, white and electric violet with one hot-pink accent"),
    ("art", "Art", "a Nouvelle Vague film-poster composition: two stylised faces in profile facing "
     "each other across a café table, cut-paper shapes in vermilion, black and mustard, a big "
     "abstract sun and the Eiffel Tower as a tiny black silhouette",
     "a film-title logo: \"Games Chat\" in a hand-cut condensed display face like a 1960s Nouvelle "
     "Vague title card, red and black on off-white paper, with a small cut-paper speech bubble"),
    ("classic", "Classical", "a Rococo garden party at Versailles: powdered aristocrats in silks "
     "chatting on a swing and around a fountain, cherubs, roses, ribbons and pastel clouds, "
     "framed by gilt scrollwork",
     "an ornate Rococo cartouche logo: \"Games Chat\" in elegant engraved copperplate script with "
     "gold leaf, inside a gilded scrolling frame with ribbons and a small cherub"),
]
for i, (tid, tname, bg, logo) in enumerate(THEME_UI):
    req("themes", f"CH-T{i * 2 + 1:02d}", f"title-bg-{tid}", f"{tname} theme: title background",
        "1920 x 1080", f"Behind the title screen and join form in the {tname} theme.",
        f"Full-bleed background: {bg}. Keep the middle third calm and uncluttered for the logo and "
        "the join form. No border.",
        "The Kid theme's title background.", alpha=False)
    req("themes", f"CH-T{i * 2 + 2:02d}", f"logo-{tid}", f"{tname} theme: logo", "1600 x 800",
        f"The title screen logo in the {tname} theme.",
        f"{logo[0].upper()}{logo[1:]}. Spell it exactly: Games Chat. Centred, wide landscape "
        "composition with even margins. Apart from the words Games Chat, no text.",
        "The Kid theme's logo.")

# Art and Classical icon sets: the same subjects as the second set, without
# the teen framing.
def themed_subject(subject):
    return (subject.replace("a teen's", "a person's").replace("teen's", "person's")
            .replace("a teen", "a person").replace("same teen", "same person").replace("teen", "person"))

# Subjects re-requested for one theme after its delivery failed the app check.
THEMED_REDO = {
    ("art", "tinyface"): (
        "a person's big round head with a comically small face bunched in the very middle: two bold "
        "black dot eyes with short brows, a small nose line and small red lips, all squeezed close "
        "together and filling about a third of the face so they still read clearly at 48 px; lots "
        "of empty off-white cheek and forehead around them. The face must never look blank"),
}

for prefix, section, idp in (("art", "icons-art", "CH-N"), ("classic", "icons-classic", "CH-R")):
    themed = [e for e in V2_FX + V2_LATE if e[0] != "kid"] + V2_GAMES
    for i, (gid, name, subject) in enumerate(themed, 1):
        subject = THEMED_REDO.get((prefix, gid), subject)
        kind = "game" if (gid, name, subject) in V2_GAMES else "fx"
        where = "button on the effect strips" if kind == "fx" else "card in the game picker"
        theme = "Art" if prefix == "art" else "Classical"
        req(section, f"{idp}{i:02d}", f"{prefix}-{kind}-{gid}", f"{name} icon ({theme} theme)", "256 x 256",
            f"The {name} {where} in the {theme} theme.", f"Icon: {themed_subject(subject)}.",
            "The Teen icon, then the Kid icon, then the emoji.")

for i, (gid, name, subject) in enumerate(V2_FX + V2_GAMES, 1):
    kind = "fx" if i <= len(V2_FX) else "game"
    where = "button on the effect strips" if kind == "fx" else "card in the game picker"
    req("icons2", f"CH-K{i:02d}", f"{kind}2-{gid}", f"{name} icon (second set)", "256 x 256",
        f"The {name} {where}, replacing the first-set icon.", f"Icon: {subject}.",
        "The first-set icon, or the emoji.")

# --- Go Fish: ancient-ocean creature cards ------------------------------
# Thirteen creatures, four cards of each. The card frame, name and colour band
# are drawn by the game; each picture is the creature alone on transparency.
GOFISH = [
    ("anomalocaris", "Anomalocaris", "Cambrian",
     "Anomalocaris, the big Cambrian hunter, in side view swimming: a long flat segmented body in "
     "warm red and coral, a fan of overlapping swimming flaps down each side, a tail fan of three "
     "pairs of blades, big stalked eyes on top of the head, and two curled spiky grabbing arms in "
     "front of a round mouth"),
    ("opabinia", "Opabinia", "Cambrian",
     "Opabinia in side view: a small soft segmented body in bright blues, a row of swimming flaps "
     "along each side, a fan tail, FIVE mushroom-like stalked eyes on its head, and one long "
     "flexible nozzle reaching forward with a little grabbing claw at its tip"),
    ("hallucigenia", "Hallucigenia", "Cambrian",
     "Hallucigenia walking on the sea floor in side view: a thin tube-shaped worm body in orange, "
     "seven pairs of long stilt-like tentacle legs underneath, two rows of tall pointed spines "
     "along its back, and a small round head with tiny eyes"),
    ("pikaia", "Pikaia", "Cambrian",
     "Pikaia, a small early chordate, swimming in side view: a slim leaf-shaped ribbon body in "
     "mint green with faint zigzag muscle bands, a tiny head with two little tentacles, and a "
     "soft fin along the tail; cute and wriggly"),
    ("burgessomedusa", "Burgessomedusa", "Cambrian",
     "Burgessomedusa, an ancient jellyfish: a tall translucent pink bell with a gentle glow, about "
     "ninety short fine tentacles trailing from the rim like a fringe, swimming upwards"),
    ("trilobite", "Trilobite", "Cambrian to Permian",
     "A trilobite seen from above at a slight angle: an oval armoured body split into three lobes "
     "lengthwise and many segments across, a half-moon head shield with two crescent compound "
     "eyes, short spines at the corners, in ochre and warm brown with glossy plates"),
    ("nautilus", "Nautilus", "living fossil",
     "A nautilus swimming in side view: a smooth coiled shell in cream with bold red-brown tiger "
     "stripes, a soft hood, one big round eye and a bunch of many short tentacles below"),
    ("dunkleosteus", "Dunkleosteus", "Devonian",
     "Dunkleosteus, the armoured Devonian giant fish, in side view with its jaws wide open: a "
     "heavy head and shoulder covered in slate-blue bony armour plates, sharp bony blades instead "
     "of teeth, a small round eye in the armour, and a sleek shark-like tail behind"),
    ("tiktaalik", "Tiktaalik", "Devonian",
     "Tiktaalik in side view propping itself up in shallow water: a flat crocodile-like head with "
     "eyes on top, a real neck, scaly lime-green body with darker spots, and sturdy fleshy front "
     "fins pushing up like arms"),
    ("helicoprion", "Helicoprion", "Permian",
     "Helicoprion, the buzz-saw shark, in side view: a sleek teal shark-like fish whose lower jaw "
     "holds a coiled spiral whorl of triangular teeth, like a round saw blade, clearly visible"),
    ("ichthyosaur", "Ichthyosaur", "Triassic to Cretaceous",
     "An ichthyosaur leaping in side view: a dolphin-shaped sea reptile in golden yellow with a long "
     "toothy snout, a HUGE round eye with a bony ring, a tall half-moon tail fin and a back fin"),
    ("plesiosaur", "Plesiosaur", "Jurassic",
     "A plesiosaur swimming in side view: a round body in purple, a very long curving neck with a "
     "small smiling toothy head, four big paddle flippers and a short tail"),
    ("mosasaur", "Mosasaur", "Cretaceous",
     "A mosasaur in side view: a huge dark green sea lizard with a long crocodile-like toothy head, "
     "a long body with paddle flippers, and a shark-like tail fin bending down"),
]
for i, (cid, name, period, desc) in enumerate(GOFISH, 25):
    req("games", f"CH-G{i:02d}", f"gofish-{cid}", f"Go Fish card: {name}", "512 x 512",
        f"Go Fish: the picture on the {name} card ({period}).",
        f"{desc}. A fun, friendly, colourful take for a children's card game, scientifically "
        "recognisable, one creature only, centred and filling the frame, no background scenery.",
        "A canvas drawing of the creature.")
req("games", "CH-G38", "gofish-back", "Go Fish card back", "512 x 704",
    "Go Fish: the face-down cards in the pond and in other players' hands.",
    "The back of a playing card with rounded corners: deep turquoise water with gentle wave "
    "bands, a few ammonite and trilobite silhouettes in a lighter tint, a small fishing hook "
    "emblem in the middle, symmetrical.",
    "A CSS wave pattern.")
req("games", "CH-G39", "gofish-pond", "Go Fish pond", "1600 x 1000",
    "Go Fish: the pond players cast into, seen from above, with fish shadows drawn on top by the game.",
    "A calm pond seen straight from above: clear teal-green water getting deeper towards the "
    "middle, soft caustic light ripples, a few lily pads and reeds around the edges and a little "
    "wooden jetty poking in from the bottom edge. No fish, no animals, no people.",
    "A canvas-drawn pond.", alpha=False)
# Its icon in each set (numbered after each set's last request).
GOFISH_ICON = "a fishing line pulling a playing card with a bright red Anomalocaris on it out of a pond"
req("icons", "CH-I97", "game-gofish", "Go Fish icon", "256 x 256",
    "The Go Fish card in the game picker.", f"Icon of {GOFISH_ICON}.", "An emoji.")
req("icons2", "CH-K97", "game2-gofish", "Go Fish icon (second set)", "256 x 256",
    "The Go Fish card in the game picker, replacing the first-set icon.",
    "Icon: a teen on a jetty casting a fishing line into a glowing pond, a playing card with a red "
    "Anomalocaris flying up out of the water on the hook.", "The first-set icon, or the emoji.")
req("icons-art", "CH-N96", "art-game-gofish", "Go Fish icon (Art theme)", "256 x 256",
    "The Go Fish card in the game picker in the Art theme.",
    "Icon: a person on a jetty casting a fishing line into a pond, a playing card with a red "
    "Anomalocaris flying up out of the water on the hook.", "The Teen icon, then the Kid icon, then the emoji.")
req("icons-classic", "CH-R96", "classic-game-gofish", "Go Fish icon (Classical theme)", "256 x 256",
    "The Go Fish card in the game picker in the Classical theme.",
    "Icon: a person on a jetty casting a fishing line into a pond, a playing card with a red "
    "Anomalocaris flying up out of the water on the hook.", "The Teen icon, then the Kid icon, then the emoji.")


# --- iOS app ------------------------------------------------------------------
req("ui", "CH-U04", "ios-app-icon", "iOS app icon", "1024 x 1024",
    "The Games Chat app icon on iPhone and iPad home screens and in TestFlight / the App Store.",
    "The Games Chat app icon: a chunky game controller inside a rounded speech bubble, pink and "
    "yellow, glossy with a thick dark-purple outline, centred on a full-bleed bright aqua to "
    "violet gradient background that fills the whole square edge to edge. Square with NO rounded "
    "corners and NO transparency (iOS rounds the corners itself); keep the bubble inside the "
    "middle 80% so nothing important is cut off. Bold and simple so it reads at 40 px.",
    "The 512 px web icon scaled up onto an aqua square.", alpha=False, ext="png")


# --- Burger Stack: more toppings ---------------------------------------------
for rid, (asset, title, desc) in zip(["CH-G40", "CH-G41", "CH-G42", "CH-G43", "CH-G44"], [
    ("burger-bacon", "Bacon", "two crispy wavy strips of bacon side by side"),
    ("burger-ketchup", "Ketchup", "a glossy red zigzag squiggle of ketchup lying flat, like a sauce layer"),
    ("burger-pickles", "Pickles", "four round green pickle slices in a row, slightly overlapping"),
    ("burger-onion", "Onion", "three white-and-purple onion rings in a row, slightly overlapping"),
    ("burger-egg", "Fried egg", "a fried egg with a round yellow yolk and wavy white edges"),
]):
    req("games", rid, asset, title, "512 x 192",
        "Burger Stack: a falling topping to catch, then a layer of the burger.",
        f"Side view of {desc}, the same flat burger-layer shape and width as the other toppings, so it stacks.",
        "A drawn shape.")

# --- Baseball ----------------------------------------------------------------
req("games", "CH-G45", "baseball-field", "Baseball field", "1600 x 1000",
    "Baseball: the view from just behind home plate, out over the diamond.",
    "A sunny cartoon baseball stadium seen from just behind and above home plate: the dirt "
    "diamond and pitcher's mound in the middle distance, bright green outfield with mowed stripes, "
    "a curved outfield wall with distance numbers, colourful stands full of tiny fans, and blue sky. "
    "Leave home plate and the pitcher's mound empty (the game draws the players).",
    "A canvas-drawn field.", alpha=False)
req("games", "CH-G46", "baseball-ball", "Baseball", "256 x 256",
    "Baseball: the ball.", "A white baseball with red stitching, slightly tilted.", "A drawn ball.")
req("games", "CH-G47", "baseball-bat", "Bat", "512 x 128",
    "Baseball: the bat the player swings.", "A wooden baseball bat lying horizontally, handle on the left, glossy honey-coloured wood with a dark grip tape handle.",
    "A drawn bat.")
req("games", "CH-G48", "baseball-pitcher-windup", "Pitcher winding up", "512 x 768",
    "Baseball: the pitcher on the mound before the throw.",
    "A cartoon baseball pitcher in a white and red uniform and cap, seen from the front (facing the "
    "batter), in the wind-up: one knee raised high, glove and ball held together at the chest. Full body, feet at the bottom.",
    "A drawn figure.")
req("games", "CH-G49", "baseball-pitcher-throw", "Pitcher throwing", "512 x 768",
    "Baseball: the pitcher releasing the ball.",
    "The same cartoon pitcher (white and red uniform and cap), seen from the front, in the follow-through "
    "just after throwing: throwing arm swung down across the body, leaning forward, front leg planted. Full body, feet at the bottom. No ball in the hand.",
    "A drawn figure.")

# --- Mob Whack (blocky whack-a-mole) ---------------------------------------------
BLOCKY = ("Blocky voxel game art in the style of Minecraft: everything built from cubes, chunky "
          "16-pixel textures on each face, flat lighting with simple shading per face. ")
req("games", "CH-G50", "whack-field", "Whack field", "1600 x 1200",
    "Mob Whack: the field the mobs pop up in.",
    BLOCKY + "A grassy blocky meadow seen slightly from above at dusk: grass blocks with dirt sides, a "
    "few blocky trees and flowers at the edges, and a 3 by 3 grid of nine round dark holes dug into the "
    "grass, evenly spaced across the middle of the picture. No creatures.",
    "A canvas-drawn field.", alpha=False)
for rid, (asset, title, desc) in zip(["CH-G51", "CH-G52", "CH-G53", "CH-G54", "CH-G55"], [
    ("whack-zombie", "Zombie", "a blocky zombie: green square head with dark hollow eyes, cyan shirt, arms stretched forward"),
    ("whack-creeper", "Creeper", "a blocky creeper: tall green mottled body with four short legs and the famous sad dark face"),
    ("whack-creeper-flash", "Creeper about to explode", "the same blocky creeper, swollen and flashing white, about to explode"),
    ("whack-villager", "Villager", "a blocky villager: big nose, single unibrow, brown robe with hands folded in the sleeves, looking worried"),
    ("whack-enderman", "Enderman", "a blocky enderman: very tall thin black body, long arms, glowing purple eyes"),
]):
    req("games", rid, asset, title, "512 x 512",
        f"Mob Whack: {title.lower()} popping up out of a hole.",
        BLOCKY + f"{desc}, front view, from the waist up as if rising out of a hole (the bottom edge is cut off straight). Centred.",
        "A drawn blocky figure.")
req("games", "CH-G56", "whack-explosion", "Explosion", "512 x 512",
    "Mob Whack: a creeper going off.",
    BLOCKY + "A chunky pixel explosion: a burst of white, yellow and orange cube particles and grey smoke puffs.",
    "Drawn squares.")
req("games", "CH-G57", "whack-teleport", "Teleport sparkles", "256 x 256",
    "Mob Whack: where an enderman vanishes and reappears.",
    BLOCKY + "A cloud of small purple and magenta square particles, swirling.", "Drawn squares.")
req("games", "CH-G58", "whack-hammer", "Hammer", "512 x 512",
    "Mob Whack: the hammer that follows your finger and swings.",
    BLOCKY + "A blocky iron hammer (pixel-art tool) held diagonally, handle at the bottom right, head at the top left.",
    "A drawn hammer.")

# --- Kart Dash (kart racing) ---------------------------------------------------
KART = "Bright glossy cartoon racing-game art, chunky shapes, saturated colours. "
for rid, (asset, title, view) in zip(["CH-G59", "CH-G60", "CH-G61"], [
    ("kart-back", "Kart from behind", "seen straight from behind, driving away"),
    ("kart-left", "Kart turning left", "seen from behind and slightly to the side, leaning into a left turn, front wheels turned left"),
    ("kart-right", "Kart turning right", "seen from behind and slightly to the side, leaning into a right turn, front wheels turned right"),
]):
    req("games", rid, asset, title, "512 x 512",
        "Kart Dash: every player's kart (the game tints it in their colour and puts their face in the seat).",
        KART + f"A go-kart {view}: chunky white body panels (so the game can tint them), black tyres, exhaust pipes, "
        "a big rear spoiler, and an EMPTY round seat with no driver (the game draws the player's face there). "
        "Low and wide, filling the frame.",
        "A drawn kart.")
req("games", "CH-G62", "kart-sky", "Sky and hills", "2048 x 512",
    "Kart Dash: the horizon behind the track; scrolls sideways as you turn.",
    KART + "A wide panorama of a bright blue sky with puffy clouds over rolling green hills and a few "
    "distant mountains; the bottom edge is the horizon line in flat green. Tiles seamlessly left to right.",
    "A drawn gradient.", alpha=False)
req("games", "CH-G63", "kart-grass", "Grass ground", "512 x 512",
    "Kart Dash: the ground beside the track, seen from above.",
    "A seamlessly tiling top-down texture of short bright cartoon grass with a few tiny flowers. Flat, no shadows.",
    "A green fill.", alpha=False)
req("games", "CH-G64", "kart-road", "Road surface", "512 x 512",
    "Kart Dash: the track surface, seen from above.",
    "A seamlessly tiling top-down texture of smooth grey cartoon asphalt with subtle speckles. Flat, no lines.",
    "A grey fill.", alpha=False)
for rid, (asset, title, desc, size) in zip(["CH-G65", "CH-G66", "CH-G67", "CH-G68", "CH-G69", "CH-G70", "CH-G71", "CH-G72"], [
    ("kart-itembox", "Item box", "a floating translucent rainbow cube with a big white question mark on its faces, glowing", "256 x 256"),
    ("kart-boost", "Boost rocket", "a small red and yellow rocket booster with flames, power-up icon", "256 x 256"),
    ("kart-banana", "Banana peel", "a slippery yellow banana peel lying on the ground", "256 x 256"),
    ("kart-bomb", "Bouncing bomb", "a round shiny black cartoon bomb with a lit fuse and little springy feet", "256 x 256"),
    ("kart-star", "Rainbow star", "a sparkling five-pointed star glowing in rainbow colours, power-up icon", "256 x 256"),
    ("kart-parts", "Flying kart parts", "a sprite sheet of six separate kart pieces flying apart, arranged in a 3 by 2 grid with space between: a wheel, a bolt, a bent white body panel, a spoiler, a spring and an exhaust pipe", "768 x 512"),
    ("kart-tyres", "Tyre stack", "a stack of three black tyres with red and white stripes, a trackside barrier", "256 x 256"),
    ("kart-tree", "Trackside tree", "a round cartoon tree with a short brown trunk", "256 x 384"),
]):
    req("games", rid, asset, title, size, f"Kart Dash: {title.lower()}.", KART + desc + ".", "A drawn shape.")

# Icons for the new games in every set.
NEW_GAMES_2 = [
    ("baseball", "Baseball", "a baseball flying off a swinging bat with motion lines, in front of a stadium"),
    ("whack", "Mob Whack", "a blocky hammer about to whack a blocky green zombie popping out of a hole, with a creeper peeking from another hole"),
    ("kart", "Kart Dash", "a cartoon go-kart drifting round a bend with sparks, a rainbow star and a banana peel flying"),
]
for n, (gid, name, subj) in enumerate(NEW_GAMES_2):
    req("icons", f"CH-I{98 + n}", f"game-{gid}", f"{name} icon", "256 x 256",
        f"The {name} card in the game picker.", f"Icon of {subj}.", "An emoji.")
    req("icons2", f"CH-K{98 + n}", f"game2-{gid}", f"{name} icon (second set)", "256 x 256",
        f"The {name} card in the game picker, replacing the first-set icon.",
        f"Icon: a teen playing it: {subj}.", "The first-set icon, or the emoji.")
    req("icons-art", f"CH-N{97 + n}", f"art-game-{gid}", f"{name} icon (Art theme)", "256 x 256",
        f"The {name} card in the game picker in the Art theme.", f"Icon: {subj}.",
        "The Teen icon, then the Kid icon, then the emoji.")
    req("icons-classic", f"CH-R{97 + n}", f"classic-game-{gid}", f"{name} icon (Classical theme)", "256 x 256",
        f"The {name} card in the game picker in the Classical theme.", f"Icon: {subj}.",
        "The Teen icon, then the Kid icon, then the emoji.")


# --- Block Drop (falling blocks) ----------------------------------------------
BLOCKS = "Bright glossy puzzle-game art, clean shapes, soft highlights. "
req("games", "CH-G73", "blocks-tile", "Block tile", "128 x 128",
    "Block Drop: one square cell of a falling piece (the game tints it per piece colour).",
    BLOCKS + "A single square block seen straight on, filling the frame: a WHITE glossy jelly-like cube face "
    "with a bevelled rim, a bright highlight in the top left and a soft shadow at the bottom right, so the "
    "game can tint it any colour. No outline outside the square.", "A drawn bevelled square.", alpha=False)
req("games", "CH-G74", "blocks-bg", "Block Drop backdrop", "1080 x 1920",
    "Block Drop: behind the well (an upright phone screen).",
    BLOCKS + "A calm deep-purple and indigo night sky with soft glowing bokeh dots and faint geometric "
    "outlines of falling square blocks, darker in the middle where the playing well sits. No text.",
    "A drawn gradient.", alpha=False)

# --- Temple Dash (endless temple runner) --------------------------------------
TEMPLE = ("Bright cartoon adventure-game art, chunky shapes, warm jungle colours, soft cel shading. ")
req("games", "CH-G75", "temple-runner", "Runner sprite sheet", "1536 x 512",
    "Temple Dash: every player's runner seen from behind (the game puts their face on the head and tints the shirt).",
    TEMPLE + "A sprite sheet of six frames side by side, each 256 wide by 512 tall, of the same explorer seen "
    "from BEHIND, running away from the camera: frames 1-4 a running cycle, frame 5 jumping with knees up, "
    "frame 6 sliding low on one hip. WHITE shirt (so the game can tint it), khaki shorts, brown boots, "
    "a backpack. The head is a plain round skin-coloured shape with no hair, hat or features (the game "
    "draws the player's face there). Feet at the same baseline in every frame.", "A drawn runner.")
req("games", "CH-G76", "temple-path", "Stone path", "512 x 1024",
    "Temple Dash: the ancient stone walkway you run along, seen from above.",
    "A seamlessly tiling top-down texture of a weathered temple walkway: big sandy-grey flagstones in three "
    "lanes with moss in the cracks. Tiles top to bottom. Flat, even lighting.", "A drawn fill.", alpha=False)
req("games", "CH-G77", "temple-wall", "Temple wall", "512 x 512",
    "Temple Dash: the carved stone edge and walls beside the path.",
    TEMPLE + "A seamlessly tiling texture of mossy carved temple stone blocks with vines and small carved "
    "glyphs. Tiles in both directions. Flat, even lighting.", "A drawn fill.", alpha=False)
req("games", "CH-G78", "temple-sky", "Jungle horizon", "2048 x 512",
    "Temple Dash: the horizon ahead; scrolls sideways when the path turns.",
    TEMPLE + "A wide panorama of a golden sunset sky over misty jungle treetops with distant temple "
    "pyramids and waterfalls; the bottom edge is dark green treetops. Tiles seamlessly left to right.",
    "A drawn gradient.", alpha=False)
for rid, (asset, title, desc, size) in zip(["CH-G79", "CH-G80", "CH-G81", "CH-G82", "CH-G83"], [
    ("temple-root", "Tree root", "a thick gnarled tree root arching across the stone path, low enough to jump over, seen from in front", "512 x 256"),
    ("temple-arch", "Low arch", "a low broken stone archway with hanging vines spanning the path, high enough to slide under, seen from in front", "512 x 512"),
    ("temple-fire", "Fire trap", "a row of carved stone fire vents with tall orange flames, spanning one lane, seen from in front", "256 x 256"),
    ("temple-coin", "Gold coin", "a shiny gold temple coin with a carved sun on it, seen straight on", "128 x 128"),
    ("temple-monkeys", "Chasing monkeys", "three mischievous cartoon temple monkeys with glowing eyes running towards the camera, side by side, filling the frame", "1024 x 512"),
]):
    req("games", rid, asset, title, size, f"Temple Dash: {title.lower()}.", TEMPLE + desc + ".", "A drawn shape.")

req("games", "CH-G84", "temple-beam", "Low beam (slide under)", "1024 x 512",
    "Temple Dash: the obstacle you slide under. It spans the whole walkway, all three lanes, so the "
    "only way past is to slide (it replaces the open archway, which looked tall enough to run through).",
    TEMPLE + "Seen straight from the front: one massive horizontal carved stone beam lying across the FULL "
    "width of the image, thick and heavy, with carved glyphs and moss on top and a few short vines hanging "
    "from its underside. The beam's top edge is about 20% down from the top of the image and its flat "
    "underside about 62% down. Below the beam the image is EMPTY (transparent) right across, except two "
    "short broken stone blocks at the very left and right edges (each under 8% of the width) that hold the "
    "beam up. Vines stop well above the bottom third. No archway, no rounded opening, nothing in the middle "
    "below the beam.", "A drawn beam.")

# --- Baseball, second version: a top-down tabletop baseball board -------------
TABLETOP = ("Retro tabletop toy game art seen from directly above: glossy printed tin and moulded "
            "plastic, bright primary colours, crisp clean shapes, soft even lighting. ")
req("games", "CH-G85", "bb2-board", "Tabletop baseball board", "1080 x 1920",
    "Baseball: the whole board, seen from above on an upright phone (the game draws the pockets, their labels, "
    "the fielders and the ball on top).",
    TABLETOP + "A top-down tabletop baseball game board filling the frame: a green outfield printed like turf "
    "with mowing stripes, a tan dirt infield diamond with three white bases, home plate near the bottom centre, "
    "the pitcher's mound in the middle of the diamond with a short white groove running from it down to home "
    "plate, foul lines in white, and a raised blue plastic outfield wall curving round the top with a printed "
    "crowd and flags behind it. Leave the outfield and infield grass plain: NO holes, NO pockets, NO numbers "
    "and NO text anywhere.", "A drawn board.", alpha=False)
req("games", "CH-G86", "bb2-bat", "Flipper bat", "512 x 128",
    "Baseball: the spring-loaded bat that swings round at home plate, seen from above.",
    TABLETOP + "A wooden toy baseball bat seen from directly above, lying flat, the knob and handle at the LEFT "
    "end and the thick barrel at the RIGHT, glossy varnish, filling the width.", "A drawn bat.")
req("games", "CH-G87", "bb2-fielder", "Fielder figure", "256 x 256",
    "Baseball: the little fielders standing on the board (the game tints the cap and shirt).",
    TABLETOP + "A small moulded plastic baseball fielder figurine seen from directly above: round WHITE cap "
    "(so the game can tint it), shoulders, and a brown glove held out to one side, standing on a round base.",
    "A drawn figure.")

NEW_GAMES_3 = [
    ("blocks", "Block Drop", "colourful falling square-block puzzle pieces stacking into neat rows, one row flashing as it clears"),
    ("temple", "Temple Dash", "an explorer running away down a jungle temple path past a carved stone arch, gold coins ahead and monkeys chasing behind"),
]
for n, (gid, name, subj) in enumerate(NEW_GAMES_3):
    req("icons", f"CH-I{101 + n}", f"game-{gid}", f"{name} icon", "256 x 256",
        f"The {name} card in the game picker.", f"Icon of {subj}.", "An emoji.")
    req("icons2", f"CH-K{101 + n}", f"game2-{gid}", f"{name} icon (second set)", "256 x 256",
        f"The {name} card in the game picker, replacing the first-set icon.",
        f"Icon: a teen playing it: {subj}.", "The first-set icon, or the emoji.")
    req("icons-art", f"CH-N{100 + n}", f"art-game-{gid}", f"{name} icon (Art theme)", "256 x 256",
        f"The {name} card in the game picker in the Art theme.", f"Icon: {subj}.",
        "The Teen icon, then the Kid icon, then the emoji.")
    req("icons-classic", f"CH-R{100 + n}", f"classic-game-{gid}", f"{name} icon (Classical theme)", "256 x 256",
        f"The {name} card in the game picker in the Classical theme.", f"Icon: {subj}.",
        "The Teen icon, then the Kid icon, then the emoji.")


# Mouth Eyes: the wearer's own mouth copied over both eyes, three mouths on one face.
MOUTH_EYES = ("a face where both eyes have been replaced by copies of its own mouth, so it has "
              "three identical open smiling mouths, two where the eyes should be and one in the usual place")
req("icons", "CH-I103", "fx-moutheyes", "Mouth Eyes icon", "256 x 256",
    "The Mouth Eyes button on the effect strip.", f"Icon of {MOUTH_EYES}.", "An emoji.")
req("icons2", "CH-K103", "fx2-moutheyes", "Mouth Eyes icon (second set)", "256 x 256",
    "The Mouth Eyes button on the effect strips, replacing the first-set icon.",
    f"Icon: a teen's face, {MOUTH_EYES.split('a face ', 1)[1]}.", "The first-set icon, or the emoji.")
for prefix, section, rid, theme in (("art", "icons-art", "CH-N102", "Art"),
                                    ("classic", "icons-classic", "CH-R102", "Classical")):
    req(section, rid, f"{prefix}-fx-moutheyes", f"Mouth Eyes icon ({theme} theme)", "256 x 256",
        f"The Mouth Eyes button on the effect strips in the {theme} theme.",
        f"Icon: a person's face, {MOUTH_EYES.split('a face ', 1)[1]}.",
        "The Teen icon, then the Kid icon, then the emoji.")


# Huge Features: the eyes and mouth cut out and blown up past the edges of the face.
HUGE = ("a face whose own eyes and mouth have been cut out and pasted back enormous: two giant eyes and a "
        "giant mouth so wide they stick out past both sides of the head, on a normal-sized face")
req("icons", "CH-I104", "fx-hugefeatures", "Huge Features icon", "256 x 256",
    "The Huge Features button on the effect strip.", f"Icon of {HUGE}.", "An emoji.")
req("icons2", "CH-K104", "fx2-hugefeatures", "Huge Features icon (second set)", "256 x 256",
    "The Huge Features button on the effect strips, replacing the first-set icon.",
    f"Icon: a teen's face {HUGE.split('a face ', 1)[1]}.", "The first-set icon, or the emoji.")
for prefix, section, rid, theme in (("art", "icons-art", "CH-N103", "Art"),
                                    ("classic", "icons-classic", "CH-R103", "Classical")):
    req(section, rid, f"{prefix}-fx-hugefeatures", f"Huge Features icon ({theme} theme)", "256 x 256",
        f"The Huge Features button on the effect strips in the {theme} theme.",
        f"Icon: a person's face {HUGE.split('a face ', 1)[1]}.",
        "The Teen icon, then the Kid icon, then the emoji.")


def render_doc() -> str:
    lines = [
        "# Games Chat: image requests",
        "",
        "Artwork for Games Chat in `chat/`. Generated from `source/build_requests.py`; edit the "
        "data there and rerun it, which also rewrites `chat/js/asset-list.js` and "
        "`face-template.png`.",
        "",
        "## How to use this list",
        "",
        "1. Each prompt is complete on its own: paste it as it stands. The shared style text is "
        "already in every prompt.",
        "2. For prompts marked **face template**, give the generator "
        "[`face-template.png`](face-template.png) as a reference image too. It marks the eyes, "
        "nose, mouth, chin and top of the head where the app pins the sticker. Only the sticker "
        "is wanted in the result: no face.",
        "3. Save each image under the file name in its **File** line and drop it in "
        "`chat/intake/`. On integration it moves to that path under `chat/`, its status flips to "
        "`delivered` and the app loads it in place of its stand-in.",
        "4. Stickers and sprites need transparency. If the generator cannot produce alpha, use a "
        "flat pure magenta `#FF00FF` background as the prompts say; it is keyed out on "
        "integration.",
        "5. Opaque images are listed as `.webp`; PNG or JPEG is fine too, they are converted on "
        "integration.",
        "6. Nothing here blocks the app: every image has a stand-in that the app draws itself.",
        "",
        "## Face template",
        "",
        "Face stickers share one 1024 x 1024 template, as the viewer sees the face:",
        "",
        "| Point | x, y |",
        "| --- | --- |",
    ]
    for name, (x, y) in FACE.items():
        lines.append(f"| {name} | {x}, {y} |")
    lines.append("")
    counts = {}
    for r in REQUESTS:
        counts[r["status"]] = counts.get(r["status"], 0) + 1
    lines.append("## Status")
    lines.append("")
    lines.append(", ".join(f"{n} {s}" for s, n in sorted(counts.items())) +
                 f", {len(REQUESTS)} in total.")
    lines.append("")
    for key, (title, blurb) in SECTIONS.items():
        rows = [r for r in REQUESTS if r["section"] == key]
        lines += [f"## {title}", "", blurb, ""]
        for r in rows:
            tags = [r["size"], "transparent" if r["alpha"] and r["file"].endswith(".png") else "opaque"]
            if r["face"]:
                tags.append("**face template**")
            lines += [
                f"### {r['id']} · {r['title']}",
                "",
                f"- **File:** `chat/{r['file']}`",
                f"- **Size:** {', '.join(tags)}",
                f"- **Used for:** {r['purpose']}",
                f"- **Stand-in until delivered:** {r['standin']}",
                f"- **Status:** {r['status']}",
                "",
                "```text",
                r["prompt"],
                "```",
                "",
            ]
    return "\n".join(lines).rstrip() + "\n"


def render_asset_list() -> str:
    assets = {}
    for r in REQUESTS:
        entry = {"file": r["file"], "status": r["status"]}
        placement = DELIVERIES.get(r["id"], {}).get("template_rects")
        if placement:
            entry["templateRects"] = placement
        assets[r["asset"]] = entry
    body = json.dumps(assets, indent=2, ensure_ascii=False)
    return (
        "// Generated by chat/design/source/build_requests.py. Do not edit by hand.\n"
        "// Assets with status \"delivered\" are loaded; the rest use the app's stand-ins.\n"
        f"export const ASSET_LIST = {body};\n"
    )


def render_template() -> bytes:
    from PIL import Image, ImageDraw, ImageFont

    img = Image.new("RGB", (1024, 1024), (246, 246, 250))
    d = ImageDraw.Draw(img)
    for g in range(0, 1025, 64):
        d.line([(g, 0), (g, 1024)], fill=(228, 228, 236))
        d.line([(0, g), (1024, g)], fill=(228, 228, 236))
    # Head and neck outline.
    d.ellipse([272, 220, 752, 900], outline=(150, 150, 170), width=6)
    d.rectangle([432, 880, 592, 1024], outline=(150, 150, 170), width=6)
    # Brows, eyes, nose, mouth.
    for (x, y) in (FACE["eye (image left)"], FACE["eye (image right)"]):
        d.ellipse([x - 52, y - 26, x + 52, y + 26], outline=(70, 70, 90), width=5)
        d.ellipse([x - 14, y - 14, x + 14, y + 14], fill=(70, 70, 90))
        d.arc([x - 64, y - 90, x + 64, y - 20], 200, 340, fill=(70, 70, 90), width=6)
    nx, ny = FACE["nose tip"]
    d.line([(nx, 540), (nx - 22, ny), (nx + 22, ny)], fill=(70, 70, 90), width=5)
    mx, my = FACE["mouth centre"]
    d.arc([mx - 90, my - 40, mx + 90, my + 30], 10, 170, fill=(70, 70, 90), width=6)
    # Marks.
    for (x, y) in FACE.values():
        d.line([(x - 18, y), (x + 18, y)], fill=(230, 40, 120), width=3)
        d.line([(x, y - 18), (x, y + 18)], fill=(230, 40, 120), width=3)
    font = ImageFont.load_default(size=20)
    for name, (x, y) in FACE.items():
        dy = {"chin": 10, "eye (image left)": 34, "eye (image right)": -50}.get(name, -30)
        dx = -150 if name == "eye (image left)" else 24
        d.text((x + dx, y + dy), f"{name} {x},{y}", fill=(230, 40, 120), font=font)
    buf = io.BytesIO()
    img.save(buf, "PNG", optimize=True)
    return buf.getvalue()


def main() -> int:
    check = "--check" in sys.argv[1:]
    outputs = {DOC: render_doc().encode(), ASSET_LIST: render_asset_list().encode()}
    stale = [p for p, data in outputs.items() if not p.exists() or p.read_bytes() != data]
    if check:
        if not TEMPLATE.exists():
            stale.append(TEMPLATE)
        if stale:
            print("out of date: " + ", ".join(str(p.relative_to(ROOT.parent)) for p in stale)
                  + "\nrun python3 chat/design/source/build_requests.py")
            return 1
        print(f"chat image requests up to date ({len(REQUESTS)} requests)")
        return 0
    for p, data in outputs.items():
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_bytes(data)
    TEMPLATE.write_bytes(render_template())
    print(f"wrote {len(REQUESTS)} requests")
    return 0


if __name__ == "__main__":
    sys.exit(main())
