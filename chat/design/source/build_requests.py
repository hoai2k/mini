#!/usr/bin/env python3
"""Generate the Bubble Chat image requests and the app's asset list.

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
    "icons": (
        "Effect and game icons",
        "One icon per face effect and per minigame, shown on the effect tray and the game "
        "picker. Memory Match also uses the effect icons as its card faces. Until they arrive "
        "the app shows an emoji.",
    ),
}

REQUESTS: list[dict] = []


def req(section, rid, asset, title, size, purpose, prompt, standin, alpha=True, face=False,
        status="requested"):
    ext = "png" if alpha else "webp"
    folder = {"ui": "ui", "fx": "fx", "games": "games", "icons": "icons"}[section]
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
    REQUESTS.append(dict(section=section, id=rid, asset=asset, title=title, size=size,
                         purpose=purpose, prompt=" ".join(parts), standin=standin, file=file,
                         face=face, status=status))


# --- Brand -----------------------------------------------------------------
req("ui", "CH-U01", "logo", "Title logo", "1600 x 640",
    "The title screen logo above Press Start.",
    "The words \"Bubble Chat\" as a chunky bubble-letter logo, the letters puffy and glossy like "
    "blown bubble gum in pink, aqua and sunny yellow, with a translucent soap bubble floating off "
    "the final t. Spell it exactly: Bubble Chat. Centred, wide landscape composition.",
    "The words in the page's rounded font with a CSS gradient.")
req("ui", "CH-U02", "title-bg", "Title background", "1920 x 1080",
    "Behind the title screen and the join form.",
    "A dreamy pastel sky full of floating translucent iridescent bubbles of many sizes, some "
    "holding tiny reflections of smiling faces, soft lilac to aqua gradient, lots of calm empty "
    "space in the middle third for the logo and buttons. Full-bleed background, no border.",
    "A CSS gradient with drifting canvas bubbles.", alpha=False)
req("ui", "CH-U03", "icon", "App icon and favicon", "512 x 512",
    "The browser tab icon and the card on the game library page.",
    "A single glossy pink bubble-gum bubble with a winking smiley face reflected in it, on a "
    "rounded-square aqua badge. Bold and simple so it reads at 16 px.",
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
for i, (gid, name, subject) in enumerate(EFFECT_ICONS, 1):
    req("icons", f"CH-I{i:02d}", f"fx-{gid}", f"{name} icon", "256 x 256",
        f"The {name} button on the effect tray.", f"Icon of {subject}.", "An emoji.")
for i, (gid, name, subject) in enumerate(GAME_ICONS, len(EFFECT_ICONS) + 1):
    req("icons", f"CH-I{i:02d}", f"game-{gid}", f"{name} icon", "256 x 256",
        f"The {name} card in the game picker.", f"Icon of {subject}.", "An emoji.")


def render_doc() -> str:
    lines = [
        "# Bubble Chat: image requests",
        "",
        "Artwork for Bubble Chat in `chat/`. Generated from `source/build_requests.py`; edit the "
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
