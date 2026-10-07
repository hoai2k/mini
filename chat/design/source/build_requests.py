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
}

DELIVERIES_FILE = ROOT / "design" / "generated" / "deliveries.json"
DELIVERIES = {r["id"]: r for r in json.loads(DELIVERIES_FILE.read_text())
              if r.get("accepted")} if DELIVERIES_FILE.exists() else {}

REQUESTS: list[dict] = []


def req(section, rid, asset, title, size, purpose, prompt, standin, alpha=True, face=False,
        status="requested"):
    ext = "png" if alpha else "webp"
    folder = {"ui": "ui", "fx": "fx", "games": "games", "icons": "icons", "worlds": "worlds"}[section]
    file = f"assets/{folder}/{asset}.{ext}"
    style = STYLE if alpha else BG_STYLE
    if rid == "CH-U01":
        style = LOGO_STYLE
    parts = [style, prompt]
    if face:
        parts.append(FACE_TEXT)
    if section == "icons":
        parts.append(ICON)
    elif alpha:
        parts.append(ALPHA)
    delivery = DELIVERIES.get(rid)
    if delivery:
        file = delivery["file"]
        parts = [delivery["prompt"]]
        status = "delivered"
    REQUESTS.append(dict(section=section, id=rid, asset=asset, title=title, size=size,
                         purpose=purpose, prompt=" ".join(parts), standin=standin, file=file,
                         face=face, status=status))


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
    "of the head at about x = 420 and x = 604 and curving outwards to the top corners.",
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
    "A bright cartoon school gym: polished wooden floor in the bottom quarter, padded blue walls, "
    "a row of high windows with sunlight, bleachers at the sides. Plain and slightly blurred in "
    "the upper middle, where the hoop is drawn. Full-bleed, no border.",
    "A canvas-drawn wall and floor.", alpha=False)
req("games", "CH-G04", "flappy-sky", "Flappy sky", "1920 x 1080",
    "Flappy Face: the scrolling background.",
    "A cheerful cartoon sky with puffy clouds and a low line of green hills and a little town "
    "along the bottom. Seamless horizontally: the left and right edges must join with no seam.",
    "A canvas-drawn sky and hills.", alpha=False)
req("games", "CH-G05", "flappy-pipe", "Flappy pillar", "256 x 1024",
    "Flappy Face: the obstacles (the game flips it for the pillars hanging from the top).",
    "A tall candy-striped pillar with a wider cap at the top, standing upright, filling the "
    "frame, the shaft able to repeat vertically.",
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
    "A glossy arcade air-hockey table seen from directly above: icy white-blue surface with tiny "
    "air holes, a red centre line and centre circle, goal slots at the top and bottom centre "
    "about 36% of the width, and a neon rim along all four edges. Flat top-down view, no "
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
            tags = [r["size"], "transparent" if r["file"].endswith(".png") else "opaque"]
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
    assets = {r["asset"]: {"file": r["file"], "status": r["status"]} for r in REQUESTS}
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
