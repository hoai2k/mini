#!/usr/bin/env python3
"""Generate the One Monster After Another image requests and the game's asset list.

Edit the data in this file, then run:

    python3 onemonster/design/source/build_requests.py          # write
    python3 onemonster/design/source/build_requests.py --check  # verify up to date

Outputs:
    onemonster/design/image-requests.md   the request document
    onemonster/game/src/asset-list.js     what the game loads

Statuses:
    requested  the game draws its own stand-in and does not try to load the file
    delivered  the file is in onemonster/game/assets/ and the game loads it in place
               of the stand-in
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DOC = ROOT / "design" / "image-requests.md"
ASSET_LIST = ROOT / "game" / "src" / "asset-list.js"

# The look every image shares: a 1970s Golden Book, dense ink under faded washes.
STYLE = (
    "Children's picture-book illustration in the style of Mercer Mayer's 1974 Golden Book One "
    "Monster After Another: dense, wiry black pen-and-ink line with heavy crosshatching, fur "
    "drawn hair by hair, foliage in clusters of tiny leaves, clouds and waves as rows of curling "
    "strokes, under thin, slightly faded early-1970s printed watercolour washes (dusty mauve, "
    "lilac and pink skies, olive, sage and teal greens, ochre and mustard, slate and blue-grey "
    "for sea and storm, brick red and red-and-white stripes as accents, pink for monster snouts, "
    "hands and feet). Busy, funny and a little grotesque, never scary. No text, no lettering, no "
    "watermark, no border, no UI."
)

# Where the reference photos of the book live once pushed (onemonster/reference/).
REF_URL = "https://raw.githubusercontent.com/hoai2k/mini/main/onemonster/reference/"
REF = (
    "Match the design of this monster in the reference photo of the book, " + REF_URL + "{0} , "
    "keeping its shapes, colours and proportions, but as a clean new full-colour drawing of the "
    "monster alone (no book, page, hands, other monsters or printed text)."
)
REF_STYLE = (
    "No picture of this monster from the book was available, so the design here is our own: "
    "draw it as a monster from the same book, matching the drawing style, palette and mood of "
    "the reference photo " + REF_URL + "{0} ."
)
REF_SCENE = (
    "For the drawing style, palette and mood, look at the reference photo of the book, "
    + REF_URL + "{0} ."
)

MONSTER = (
    "A big, shaggy, expressive picture-book monster with a lot of character: greedy, sly or "
    "put-upon rather than frightening, with pink snout, paws and feet where it has them."
)

ALPHA = (
    "Transparent background (PNG with alpha). If transparency is not possible, use a flat pure "
    "magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on "
    "integration."
)

PORTRAIT = (
    "Full-body portrait of the monster alone in a lively three-quarter pose facing right, "
    "filling about 80% of a square frame, centred, with a clean silhouette that still reads at "
    "96 px. Only a small soft shadow under it. " + ALPHA
)

# Every sprite of a character is drawn from its canonical model sheet, so the
# character stays the same from the name card to the last animation frame.
FROM_SHEET = (
    "Draw it from this character's canonical model sheet, request {0} (file {1}): attach that "
    "image and match it exactly, with the same design, proportions, colours, line weight and "
    "clothing. Where the two disagree, the model sheet wins over this description. "
)

CANONICAL = (
    "A character model sheet (turnaround) for an animated game: the one definitive design of "
    "this character, which every other picture and sprite of it will be drawn from. On the left, "
    "large and filling the full height: {0}, in a calm neutral pose, with every limb, wing "
    "and moving part held a little away from the body so each joint can be read. On the right, smaller and all at the same scale as each other: {1}. Every view shows "
    "exactly the same character, with identical proportions, colours and clothing. Even, flat "
    "lighting and clean, even washes, so the colours are easy to match later. Wide gaps between "
    "the views, no labels, no arrows, no ground line. "
)

GRID = (
    "Lay them out in a grid of {0} columns and {1} rows, in the order listed, from left to right "
    "and top to bottom, one per cell and centred in it, with plenty of clear background around "
    "each one. Nothing touches anything else or the edge of its cell. No numbers, labels, guide "
    "lines, outlines around the cells or shadows. "
)

PARTS = (
    "A sprite parts sheet for cut-out (skeletal) animation, for a game that moves and rotates "
    "each piece on its own. Draw the character in the master view of the model sheet, {0}, at "
    "the same scale, then take it apart into the separate pieces below. Each piece is drawn "
    "complete and unbroken, in the same orientation it has in the master view (do not turn it "
    "to fit the cell). Where two pieces join, draw each one a little past the joint with a "
    "rounded, fully drawn end (fur, skin, cloth or cloud), so the join stays hidden when the "
    "piece swings, and draw what lies under a piece (a body under its arm, a head under its ear) "
    "complete, with no hole or cut line. Draw the far-side pieces a shade darker than the near "
    "ones, as they are in shadow. "
)

SWAPS = (
    "Replacement sprite pieces for cut-out animation. Each one is drawn to sit exactly in the "
    "place of the piece it replaces on the parts sheet, at the same scale and in the same master "
    "view ({0}), so the game can swap it in for a frame or two. For the matching pieces, see "
    "this character's parts sheet, request {1}; attach it too where you can. "
)

POSES = (
    "Key poses for animating this character: the whole character in each pose, all at the same "
    "scale as the master view of the model sheet ({0}), with exactly the same design. They are "
    "the poses the game's animations move through, and the stills it shows in the hand-off "
    "between chapters, so make each one clear, lively and readable as a silhouette. "
)

SCENE = (
    "Background painting for a children's minigame, wide 16:9, full bleed. The scene is empty of "
    "monsters, people and animals (the game draws them on top). "
)

STORY = (
    "A full-bleed story-page painting, wide 16:9, in the book's layout: the picture fills the top "
    "three-quarters and the bottom quarter is left as a plain flat cream band for the game's "
    "text. "
)

SECTIONS = {
    "ui": ("Brand", "The title screen, the browser tab, the game library card, the letter and the postmark."),
    # One section per monster is added after MONSTERS, below.
    "cast": (
        "Supporting cast",
        "The people in the story: the girls, the mailman, the captain and crew, and the "
        "neighbours who look out in chapter 1. A model sheet first, then their small sprites.",
    ),
    "prop": (
        "Props",
        "The things that move in each chapter and are not monsters, one sheet per chapter. The "
        "game cuts each sheet into separate sprites on integration.",
    ),
    "scene": (
        "Chapter scenes",
        "One background per chapter. The game draws the monsters and everything that moves on "
        "top, so each scene leaves the play area quiet, as its prompt says.",
    ),
    "story": (
        "Story pages",
        "The prologue and the epilogue, shown as picture-book pages with the game's text in the "
        "cream band at the bottom.",
    ),
}

# Each monster: id (also the file name), name, the reference photo in
# onemonster/reference/, whether that photo shows this monster ("seen") or only
# the style (False), "shaggy": False for monsters that are not furry beasts,
# the portrait description and its chapter scene. Order is
# the order the letter meets them in the book; see onemonster/reference/README.md.
MONSTERS = [
    {
        "id": "trollusk",
        "name": "The Stamp-Collecting Trollusk",
        "ref": "cover-golden-book-1974.jpg",
        "seen": True,
        "look": "The Stamp-Collecting Trollusk, as on the book's cover: a squat, shaggy monster "
        "covered in long dark-brown fur, with a long pink pig-like snout, one white tusk, big "
        "pointed pink ears, small sly eyes and pink clawed hands and feet. He wears a squashed "
        "blue-grey cap with a coil of thin blue-green tubing looped round it, and a yellow bib lettered STAMPS across his chest (the only lettering "
        "allowed). He is tiptoeing, hunched and sneaky, a little envelope clutched to his chest "
        "with a smirk on his snout.",
        "scene": "A sunny small-town street seen side-on: a row of wooden porches with turned "
        "posts, hanging flower baskets, flowerbeds and low bushes spaced along the bottom third, "
        "a picket fence, and a blue curbside mailbox on a post at the far right. Leafy trees and a "
        "pale lilac sky above. Keep the ground strip along the bottom clear to walk on.",
        "used": "Before the Mailman Comes, the sneaking game",
    },
    {
        "id": "bombanat",
        "name": "The Letter-Eating Bombanat",
        "ref": "cover-golden-book-1974.jpg",
        "seen": True,
        "look": "The Letter-Eating Bombanat, the bat-winged flier on the book's cover: huge mauve "
        "bat wings with thin finger bones and little claws at the tips, a long pink "
        "crocodile-like snout full of small sharp teeth, a sly frowning eye, a tuft of dark fur "
        "on the chest, a red-and-white striped necktie, a pink striped cap with a yellow flower "
        "on top, and clawed pink feet. Flying with wings spread, a white envelope in his teeth.",
        "scene": "The Blue Ocean of Bubbley Goo seen side-on: a thick, glossy blue-and-teal sea "
        "of goo along the bottom quarter, full of round bubbles of every size, some swelling, "
        "some popping, under a wide pale mauve sky with long curling clouds. A far-off shore on "
        "the horizon. Keep the whole sky open, because the Bombanat flies through it.",
        "used": "Over the Bubbley Goo, the flying game",
    },
    {
        "id": "grumley",
        "name": "The Bombanat-Munching Grumley",
        "ref": "cover-golden-book-1974.jpg",
        "seen": False,
        "look": "The Bombanat-Munching Grumley, a sea monster who lives in the Blue Ocean of "
        "Bubbley Goo: a huge, lumpy, warty body in slimy sea-green and teal, with straggly "
        "weed-like hair hanging over a low brow, two bulging greedy eyes set high on top of his "
        "head (so he can lurk with only his eyes above the goo), a broad pink snout, a wide "
        "grinning frog-like mouth with two great white tusks, and long arms ending in big "
        "webbed pink paws. Show him rising chest-deep out of glossy blue goo, dripping, reaching "
        "up with one paw.",
        "scene": "Close to the surface of the Blue Ocean of Bubbley Goo: glossy blue-and-teal goo "
        "with bubbles across the bottom third, a small rocky shore at the left edge with a "
        "picnic basket and a checked cloth, and a big open lilac sky above with a few curling "
        "clouds. Keep the sky open, because Bombanats fly through it.",
        "used": "A Nice Bombanat Lunch, the grabbing game",
    },
    {
        "id": "iceferg",
        "shaggy": False,
        "name": "The Furious-Floating Ice-Ferg",
        "ref": "typhoonigator-spread.jpg",
        "seen": False,
        "look": "The Furious-Floating Ice-Ferg: a craggy iceberg in a terrible temper, its "
        "pale-blue and white ice drawn in crosshatched facets, with a furious face in the front: "
        "two glaring eyes under a jutting frowning brow of ice, a scowling mouth with icicle "
        "teeth, little puffs of cold steam from its nostrils, and the dark underwater part of it "
        "showing below a band of choppy sea.",
        "scene": "The open sea seen from high above: slate-blue and teal water drawn as rows of "
        "curling strokes, a few streaks of foam and long current lines, a harbour with a "
        "lighthouse and jetty along the top edge, and scattered rocks near the sides. Keep the "
        "middle of the sea open, because the iceberg and the ships move there.",
        "used": "Furious Floating, the ramming game",
    },
    {
        "id": "typhoonigator",
        "shaggy": False,
        "name": "The Wild-'n-Windy Typhoonigator",
        "ref": "typhoonigator-spread.jpg",
        "seen": True,
        "look": "The Wild-'n-Windy Typhoonigator, as on the book's page-20 spread: a storm cloud "
        "with a face, its body and hair billowing grey-brown and lilac cloud, clawed cloud hands "
        "at either side, two bulging round eyes with small pupils under heavy wrinkled brows, a "
        "long fleshy pink nose and huge pink lips pursed to suck. Below the lips, the top of a "
        "streaked blue-grey water spout.",
        "scene": "A wide stormy sea seen from above at a slant: slate-blue and teal water drawn "
        "as rows of curling strokes, spray and foam, a heavy lilac-and-grey sky at the top, and "
        "at the far right a strip of bumpy brown land with a signpost, the edge of Nowhere. Keep "
        "the middle open, because the Typhoonigator and the flotsam move there.",
        "used": "Suck It All Up, the inhaling game",
    },
    {
        "id": "yalapappus",
        "name": "The Paper-Munching Yalapappus",
        "ref": "cover-golden-book-1974.jpg",
        "note": "That the cover's yellow monster is the Yalapappus is the owner's reading of "
        "the book; the shaggy ochre monster peering over the mailbox in grithix-mailbox-page.jpg, "
        "where the text puts the Yalapappus, matches it.",
        "seen": True,
        "look": "The Paper-Munching Yalapappus, as the big shaggy monster at the left of the "
        "book's cover: a huge, round, lumpy body of curly ochre-yellow fur, a broad squashed face "
        "with a wide grinning mouth and two great white tusks, a broad pink snout and heavy "
        "upper lip, heavy-lidded greedy eyes, short stumpy legs with big pink clawed feet, a "
        "white napkin tied round his neck and a big fork held up in one pink paw, ready to munch. "
        "He is trundling along at a run, a scrap of paper half-munched in his mouth.",
        "scene": "The edge of Nowhere seen side-on: bumpy, scrubby brown-and-ochre ground with "
        "rocks, holes and tufts of grass along the bottom third, a crooked signpost, a few bare "
        "twisted trees, and a wide pale lilac sky with curling clouds. Keep the ground strip "
        "clear for running and the sky open above it.",
        "used": "Munch and Chase, the chasing game",
    },
    {
        "id": "grithix",
        "name": "The Bombanat-Collecting Grithix",
        "ref": "grithix-mailbox-page.jpg",
        "seen": True,
        "look": "The Bombanat-Collecting Grithix, as on his page of the book: a tall, upright, "
        "stout monster with pale pinkish hide drawn in fine lines (not furry); a big long head "
        "with a heavy snout like a rhinoceros's, a row of three blunt horns along the top of the "
        "snout and a blunt horn on the brow, two long white tusks curving up from the lower jaw, "
        "a small half-lidded eye with a sly, pleased look and a smirk, and one long floppy ear "
        "or horn curling back from the top of the head. He wears a long, ragged magenta-pink "
        "robe down to his feet, held up by a strap with a big button, and carries a big scaly "
        "blue-grey bag with small yellow spots on a strap under his near arm. Big pink clawed "
        "hands, big pink clawed feet with long white talons, and a long pink tail ending in a "
        "spiked ball like a mace. Over his shoulder, a butterfly net on a long yellow pole with "
        "a round yellow hoop and a dark mesh bag.",
        "scene": "A clearing in a thick wood: gnarled trees and dense ferns and leaves framing "
        "the left, right and top edges, a mossy floor across the bottom third, and an "
        "official-looking mailbox at the right edge, a squat riveted grey-mauve metal box with an "
        "arched top and a mail slot, as on the Grithix's page. Keep the middle of the "
        "clearing open, because Bombanats fly through it and the Grithix runs about.",
        "used": "Net Them All, the netting game",
    },
]

# One-word reminders of what each monster is, for the prompts that show them together.
WHAT = {
    "trollusk": "a shaggy brown troll with a pink pig snout, a cap and a yellow STAMPS bib",
    "bombanat": "a bat-winged monster with a long toothy snout and a striped necktie",
    "grumley": "a warty sea-green goo monster with eyes on top of his head and tusks",
    "iceferg": "a furious iceberg with a face",
    "typhoonigator": "a storm cloud with a face and big pink lips",
    "yalapappus": "a huge shaggy ochre monster with tusks, a napkin and a fork",
    "grithix": "a tall horn-snouted pink monster in a long magenta robe, with a butterfly net and a spiked tail",
}

# How each monster is built for animation. "view" is the master view the game
# shows it in, "views" the smaller views on its model sheet; "parts" are the
# pieces of its cut-out rig, "swaps" the replacement pieces swapped in for a
# frame or two, and "poses" the key poses its animations move through. "anims"
# lists those animations for the design document. Parts are listed parent
# before child; the rig (pivots and parents) is fitted on integration.
RIGS = {
    "trollusk": {
        "view": "side view facing right, standing on his two short legs",
        "views": "a front view, a back view, and a three-quarter view facing right",
        "parts": [
            "the torso with the yellow STAMPS bib, no head, arms or legs",
            "the head with the cap, the far ear, the eyes and the upper snout with its tusk, but no lower jaw and no near ear",
            "the lower jaw, mouth closed in a smirk",
            "the near ear",
            "the near upper arm",
            "the near forearm and open clawed hand",
            "the far upper arm",
            "the far forearm and open clawed hand",
            "the near thigh",
            "the near shin and foot",
            "the far thigh",
            "the far shin and foot",
            "the blue-grey cap alone, so it can bounce and fly off",
        ],
        "swaps": [
            "the lower jaw dropped wide open, gabbling",
            "the lower jaw clenched in a toothy grin",
            "the eye area only, eyes half-lidded and sly",
            "the eye area only, eyes wide and alarmed",
            "the eye area only, eyes shut (a blink)",
            "the near hand pinching, as if holding the corner of a letter (no letter drawn)",
            "the near hand clenched in a fist",
            "the near foot on tiptoe",
            "the whole head turned to face the viewer, startled, as when he is caught",
        ],
        "poses": [
            "standing idle, smug",
            "sneaking on tiptoe, near leg forward",
            "sneaking on tiptoe, far leg forward",
            "ducked down low in a crouch, curled up small to hide, only the cap and snout showing above his back",
            "reaching up high with both hands to grab",
            "gabbling away at a run, near leg forward, a letter clamped in his snout",
            "gabbling away at a run, both feet off the ground",
            "jolted in surprise as something snatches from above, cap flying off",
            "scuttling back in a fright, arms flung up",
            "sitting and wailing, head thrown back",
        ],
        "anims": "idle breathing, the tiptoe sneak cycle, ducking, the fright and scuttle back, "
        "the grab, the gabbling run cycle, being snatched from, wailing",
    },
    "bombanat": {
        "view": "side view facing right in flight, wings spread level",
        "views": "a front view in flight with both wings spread, and a side view perched with "
        "the wings folded",
        "parts": [
            "the body with the chest tuft and the knot of the striped necktie, no head, wings or legs",
            "the head with the striped cap and its flower, the eye and the upper snout with its teeth, but no lower jaw",
            "the lower jaw with its teeth, mouth closed",
            "the loose end of the striped necktie, so it can flutter",
            "the near wing, spread level",
            "the far wing, spread level, partly hidden in the master view but drawn whole here",
            "the near leg and clawed foot",
            "the far leg and clawed foot",
        ],
        "swaps": [
            "the near wing raised high at the top of the upstroke",
            "the near wing swept down at the bottom of the downstroke, the membrane cupped",
            "the near wing folded against the body",
            "the far wing raised high",
            "the far wing swept down",
            "the far wing folded",
            "the near wing spread level and splattered with dripping blue goo",
            "the lower jaw snapped wide open",
            "the eye area only, eye wide in alarm",
            "the eye area only, eye shut (a blink)",
            "the near foot with its claws clutched shut",
        ],
        "poses": [
            "gliding, wings spread level",
            "flapping, wings at the top of the stroke",
            "flapping, wings at the bottom of the stroke",
            "swooping down in a steep dive, wings swept back",
            "snapping a letter up in the jaws",
            "dipping to land, feet thrust forward, wings braking",
            "grabbed from below, wriggling and flapping wildly",
            "tangled in a butterfly net, wings crumpled",
            "perched with the wings folded, sly",
        ],
        "anims": "the flap cycle, gliding, diving and swooping, the snap, landing, goo-stuck "
        "flapping, struggling when grabbed, netted",
    },
    "grumley": {
        "view": "three-quarter view facing right, from the waist up, as he rises out of the goo "
        "(draw no goo)",
        "views": "a front view of the whole monster standing on a shore (feet and all), and a "
        "side view facing right from the waist up",
        "parts": [
            "the torso from the waist up, its bottom edge drawn complete and round (the game hides it under the goo)",
            "the head with the eyes, brows and broad snout, but no lower jaw and no weedy hair",
            "the lower jaw with the two great tusks, mouth closed in a grin",
            "the straggly weed-like hair, so it can sway and drip",
            "the near upper arm",
            "the near forearm and open webbed paw, reaching",
            "the far upper arm",
            "the far forearm and open webbed paw",
        ],
        "swaps": [
            "the lower jaw wide open, ready to munch",
            "the lower jaw chomping, cheeks bulging",
            "the eye area only, eyes heavy-lidded and greedy",
            "the eye area only, eyes squeezed shut and spluttering",
            "the eye area only, eyes crossed and dazed",
            "the near paw clenched shut, grabbing",
            "dripping blobs of blue goo to lay over the head and shoulders",
        ],
        "poses": [
            "lurking, only the eyes on top of his head above the goo line, the rest sunk below",
            "rising out of the goo, dripping",
            "lunging straight up, the near arm stretched as high as it goes",
            "holding a clenched fist up in triumph",
            "spluttering after a miss, goo on his face",
            "rubbing his belly and licking his lips, looking forward to lunch",
            "startled by a SNAP, jaw dropped",
        ],
        "anims": "lurking, rising, the lunge and grab, the miss and splutter, the lunch dance, the SNAP",
    },
    "iceferg": {
        "view": "front three-quarter view from high above, floating, the waterline along its "
        "bottom edge",
        "views": "a side view showing the big dark underwater part below the waterline, and a "
        "view from straight above",
        "parts": [
            "the iceberg alone, with its face area left as smooth ice (no brow, eyes or mouth)",
            "the jutting frowning brow of ice",
            "the near eye white, without its pupil",
            "the far eye white, without its pupil",
            "one round pupil (the game uses it for both eyes)",
            "the scowling mouth, closed",
            "a puff of cold steam, small",
            "a puff of cold steam, large",
            "three chips of ice, flying apart",
        ],
        "swaps": [
            "the brow raised and bunched up as it huffs up its fury",
            "the brow pulled furiously low",
            "the mouth roaring wide open with icicle teeth",
            "the mouth gritted, teeth bared",
            "the mouth wobbly and dazed",
            "both eyes squeezed shut",
            "a crack pattern to lay over the ice after a crash",
        ],
        "poses": [
            "drifting and sulking",
            "huffing up, swollen, steam blasting from its nostrils",
            "charging forward, leaning in, roaring",
            "the crash, eyes squeezed shut, ice chips flying",
            "bumped and dazed, deflated",
        ],
        "anims": "drifting and bobbing, huffing up, the charge, the crash, the dazed bump",
    },
    "typhoonigator": {
        "view": "front view from a little above, the water spout falling from its lips",
        "views": "a side view facing right with the spout, and a view from high above",
        "parts": [
            "the big billowing cloud mass of the body and hair, with no face features, hands or spout",
            "a loose round puff of cloud, large",
            "a loose round puff of cloud, medium",
            "a loose curling wisp of cloud",
            "the near clawed cloud hand, open",
            "the far clawed cloud hand, open",
            "both heavy wrinkled brows together",
            "both bulging eye whites, without pupils",
            "one small round pupil (the game uses it for both eyes)",
            "the long fleshy pink nose",
            "the huge pink lips pursed to suck",
            "the top of the water spout, where it meets the lips",
            "a straight length of the streaked water spout that repeats seamlessly from top to bottom",
            "the ring of spray where the spout meets the sea",
        ],
        "swaps": [
            "the lips with the cheeks puffed out, blowing",
            "the lips stretched round and stuffed full, cheeks bulging",
            "the lips open in a relieved O",
            "the brows strained and bunched",
            "the brows drooping and sleepy",
            "the near hand clenched, grabbing",
            "the far hand clenched, grabbing",
        ],
        "poses": [
            "storming along, sucking hard",
            "bloated full and round, fishing boats and bottles poking out of the cloud",
            "letting go, blowing everything out",
            "a small exhausted wisp at morning",
        ],
        "anims": "churning cloud, sucking, swelling as it fills, letting go, the morning sag",
    },
    "yalapappus": {
        "view": "side view facing right, standing on his two stumpy legs",
        "views": "a front view, a back view, and a three-quarter view facing right",
        "parts": [
            "the round shaggy body, no head, arms or legs",
            "the head with the eyes, the snout and the upper lip, but no lower jaw",
            "the lower jaw with the two great tusks, mouth closed",
            "the white napkin tied at the neck, so it can flap",
            "the near arm and paw, open",
            "the far arm and paw, gripping",
            "the big fork alone",
            "the near stumpy leg and big clawed foot",
            "the far stumpy leg and big clawed foot",
        ],
        "swaps": [
            "the lower jaw wide open",
            "the lower jaw chomping, cheeks bulging, a scrap of paper sticking out",
            "the lower jaw dropped, shouting",
            "the eye area only, eyes gleeful",
            "the eye area only, eyes furious",
            "the eye area only, eyes swirling and dizzy",
            "the eye area only, eyes shut (a blink)",
            "the near paw clenched in a fist",
        ],
        "poses": [
            "standing idle, contented, fork up",
            "trundling, near leg forward",
            "trundling, far leg forward",
            "hopping, in the air, legs tucked",
            "landing, squashed flat",
            "sitting with the napkin on, gleefully munching a paper off the fork",
            "bonked on the head, dizzy, a bump rising",
            "running and shouting, fist raised",
            "sitting and wailing",
        ],
        "anims": "the trundle cycle, the hop and landing, munching, the bonk, the shouting chase, wailing",
    },
    "grithix": {
        "view": "side view facing right, standing upright, the net over his shoulder",
        "views": "a front view, a back view, and a three-quarter view facing right",
        "parts": [
            "the torso and the long magenta robe down to the hem, with the strap and button, no head, arms, feet or tail",
            "the head with the horns, the eye and the upper snout, but no lower jaw and no floppy ear",
            "the lower jaw with the two long tusks, mouth closed in a smirk",
            "the long floppy ear or horn from the top of the head",
            "the near upper arm",
            "the near forearm and gripping hand",
            "the far upper arm",
            "the far forearm and open hand",
            "the near foot and ankle, as it shows below the robe",
            "the far foot and ankle",
            "the loose lower edge of the robe, so it can swing as he walks",
            "the long tail without its end",
            "the spiked ball at the end of the tail",
            "the scaly blue-grey bag with its strap",
            "the long yellow pole of the net",
            "the yellow hoop and the empty net bag",
        ],
        "swaps": [
            "the net bag full, sagging with a tangled Bombanat",
            "the lower jaw dropped open in an AHA",
            "the lower jaw in a calm smirk that doesn't care a snickle",
            "the eye area only, eye narrowed and taking aim",
            "the eye area only, eye closed and contented",
            "the far hand holding a letter (no letter drawn), ready to post it",
        ],
        "poses": [
            "standing idle with the net over his shoulder",
            "striding, near foot forward, tail swinging",
            "striding, far foot forward",
            "winding up a swing, the net drawn back",
            "the swing, the net sweeping through",
            "slamming the net down, FLIP-FLOP",
            "posting a letter into a mailbox",
            "tripping and stumbling",
            "strolling home not caring a snickle, a netted Bombanat under one arm",
        ],
        "anims": "the stride cycle with a swinging tail, the net swing in three beats, the slam, "
        "posting the letter, tripping, the stroll home",
    },
}


def grid(n: int) -> tuple[int, int]:
    cols = 1
    while cols * cols < n:
        cols += 1
    return cols, -(-n // cols)


def numbered(items: list[str]) -> str:
    return " ".join(f"{i}. {s[0].upper() + s[1:]}." for i, s in enumerate(items, start=1))


REQUESTS = [
    {
        "id": "OM-U01",
        "section": "ui",
        "name": "Title logo",
        "key": "logo",
        "file": "assets/ui/logo.png",
        "size": "1600 x 800, transparent",
        "used": "The title screen above Press Start, and the card on the game library page.",
        "standin": "The title set in a bold serif in yellow on a black arch.",
        "ref": "cover-golden-book-1974.jpg",
        "status": "requested",
        "prompt": "A picture-book title like the cover of a 1974 Golden Book: chunky, bouncy, "
        "slightly wobbly display letters with rounded serifs, in warm yellow with a thin dark "
        "outline, set along a gentle upward arch on a solid black arched band. One line, spelled "
        "exactly: \"One Monster After Another\". A small white envelope with a red stamp is "
        "tucked under the end of the arch, a pink monster claw pinching its corner. For the "
        "lettering, see the book's cover: " + REF_URL + "cover-golden-book-1974.jpg (do not copy "
        "it, make a new title in the same spirit). Wide landscape composition, the band filling "
        "about 90% of the width, even margins, no other text. " + ALPHA,
    },
    {
        "id": "OM-U02",
        "section": "ui",
        "name": "Title background",
        "key": "titleBg",
        "file": "assets/ui/title-bg.webp",
        "size": "1920 x 1080, opaque",
        "used": "Full-screen behind the title screen; also the cover of the game library card.",
        "standin": "A painted-in-code wood under a lilac sky.",
        "ref": "cover-golden-book-1974.jpg",
        "status": "requested",
        "prompt": STYLE + " A wide wooded landscape like the book's cover: tangled trees and "
        "dense leafy undergrowth at the sides and bottom, distant hills, and a dusty lilac and "
        "pink sky. A chain of monsters chases a single white envelope across the picture from "
        "left to right, each one grabbing for it: "
        + "; ".join(WHAT[m["id"]] for m in MONSTERS)
        + ". The monsters are small, in the lower third and at the sides. Keep the upper-middle "
        "half calm and open (plain sky) for the title, and the bottom-right corner quiet for "
        "buttons. Full-bleed 16:9. " + REF_SCENE.format("cover-golden-book-1974.jpg"),
    },
    {
        "id": "OM-U03",
        "section": "ui",
        "name": "App icon and favicon",
        "key": "icon",
        "file": "assets/ui/icon.png",
        "size": "1024 x 1024, transparent",
        "used": "Browser tab, home-screen icon (scaled to 512, 192 and 180 px).",
        "standin": "A drawn icon: a white envelope with a red stamp and a pink claw on a cream tile.",
        "ref": "cover-golden-book-1974.jpg",
        "status": "requested",
        "prompt": STYLE.replace("No text, no lettering, no watermark, no border, no UI.", "")
        + "App icon: the head of the Stamp-Collecting Trollusk from the book's cover ("
        + REF_URL + "cover-golden-book-1974.jpg ), his pink snout, tusk, pointed ear and "
        "blue-grey cap, with a white envelope with a red stamp clamped in his grin, on a "
        "rounded-square cream tile with a thin black ink border. Bold and simple, readable at "
        "48 px; the head fills about 75% of the tile. No text. Transparent corners outside the "
        "rounded square (PNG with alpha), or flat magenta #FF00FF corners if transparency is not "
        "possible.",
    },
    {
        "id": "OM-U04",
        "section": "ui",
        "name": "The letter",
        "key": "letter",
        "file": "assets/ui/letter.png",
        "size": "512 x 512, transparent",
        "used": "The letter in every chapter, on the route map and on the postmark screen; the "
        "game adds stains, nibbles and postmarks on top.",
        "standin": "A drawn white envelope with a red stamp.",
        "ref": "typhoonigator-spread.jpg",
        "status": "requested",
        "prompt": STYLE.replace("No text, no lettering, no watermark, no border, no UI.", "")
        + "A single old-fashioned white paper envelope, seen straight on and slightly tilted, "
        "with a pointed flap, a small red postage stamp with a scalloped edge in the top right "
        "corner, and a few loops of scribbly handwriting (not readable words) in the middle. Ink "
        "line with light crosshatched shading, crisp and clean. It fills about 80% of the frame. "
        + ALPHA,
    },
    {
        "id": "OM-U05",
        "section": "ui",
        "name": "Postmark",
        "key": "postmark",
        "file": "assets/ui/postmark.png",
        "size": "512 x 512, transparent",
        "used": "Stamped onto the letter for each postmark won; the game tints and rotates it.",
        "standin": "A drawn circle of dark ink with wavy lines.",
        "status": "requested",
        "prompt": "A rubber-stamp postmark in dark grey-black ink, as if stamped on paper: a "
        "double circle with a small monster footprint in the middle, and four wavy cancellation "
        "lines trailing off to the right. Slightly uneven, with the speckled gaps of a real "
        "inked stamp. No letters or numbers. Centred, filling about 80% of the frame. " + ALPHA,
    },
]

SECTIONS = {
    "ui": SECTIONS["ui"],
    **{
        m["id"]: (
            m["name"].replace("The ", ""),
            f"Chapter {i}, {m['used']}. Make the model sheet ({f'OM-C{i:02d}'}) first and settle "
            "the design on it; then attach it to each of the other four requests, which are all "
            "drawn from it. The portrait is the name card; the parts, swaps and poses are the "
            f"sprites the game animates. The animations: {RIGS[m['id']]['anims']}.",
        )
        for i, m in enumerate(MONSTERS, start=1)
    },
    **{k: v for k, v in SECTIONS.items() if k != "ui"},
}

for i, m in enumerate(MONSTERS, start=1):
    rig = RIGS[m["id"]]
    ref = REF.format(m["ref"]) if m["seen"] else REF_STYLE.format(m["ref"])
    ref = ref.replace("as a clean new full-colour drawing of the monster alone",
                      "as clean new full-colour drawings of the monster alone")
    look = STYLE + " " + (MONSTER + " " if m.get("shaggy", True) else "") + m["look"]
    # The look describes a lively pose for the portrait; the sprites use only the
    # design, with the pose given by each request.
    design = " (Use this description for the design only; the pose is given below.) "
    note = m.get("note") or (None if m["seen"] else "No picture of this monster was found: the "
                             "design is ours. Check the Internet Archive scan and adjust the "
                             "prompt before generating.")
    base = f"assets/monsters/{m['id']}/"
    sheet_id, parts_id = f"OM-C{i:02d}", f"OM-R{i:02d}"
    from_sheet = FROM_SHEET.format(sheet_id, f"onemonster/game/{base}model-sheet.png")
    common = {"section": m["id"], "status": "requested", "ref": m["ref"]}
    pc, pr = grid(len(rig["parts"]))
    sc, sr = grid(len(rig["swaps"]))
    kc, kr = grid(len(rig["poses"]))
    REQUESTS += [
        {
            **common,
            "id": sheet_id,
            "name": "Model sheet (canonical)",
            "key": f"monster.{m['id']}.sheet",
            "file": base + "model-sheet.png",
            "size": "2048 x 1024, transparent",
            "used": "Not shown in the game: the canonical design that every other image of this "
            "monster is drawn from, and the guide for fitting its sprite rig.",
            "standin": "None needed.",
            "note": note,
            "prompt": look + design + CANONICAL.format(rig["view"], rig["views"]) + ALPHA + " " + ref,
        },
        {
            **common,
            "id": f"OM-M{i:02d}",
            "name": "Portrait",
            "key": f"monster.{m['id']}.portrait",
            "file": base + "portrait.png",
            "size": "1024 x 1024, transparent",
            "used": f"The name card of chapter {i} and the chapter select.",
            "standin": "The monster's stand-in rig, drawn in code, posed on the card.",
            "prompt": look + " " + from_sheet + PORTRAIT + " " + ref,
        },
        {
            **common,
            "id": parts_id,
            "name": "Sprite parts",
            "key": f"monster.{m['id']}.parts",
            "file": base + "parts.png",
            "size": "2048 x 2048, transparent",
            "used": f"The pieces of the monster's cut-out rig, moved and rotated by the game in "
            f"{m['used']} and in the hand-offs.",
            "standin": "The same rig with each piece drawn in code from simple shapes with a "
            "wobbly ink outline.",
            "prompt": look + design + from_sheet + PARTS.format(rig["view"])
            + f"The {len(rig['parts'])} pieces: " + numbered(rig["parts"]) + " "
            + GRID.format(pc, pr) + ALPHA,
        },
        {
            **common,
            "id": f"OM-F{i:02d}",
            "name": "Sprite swaps",
            "key": f"monster.{m['id']}.swaps",
            "file": base + "swaps.png",
            "size": "2048 x 2048, transparent",
            "used": "Swapped in over the rig's pieces for a frame or two: the shapes rotation "
            "cannot make, such as mouths, blinks, expressions" + (", wing beats" if "wing" in str(rig["swaps"]) else "") + ".",
            "standin": "Drawn-in-code versions of the same pieces.",
            "prompt": look + design + from_sheet + SWAPS.format(rig["view"], parts_id)
            + f"The {len(rig['swaps'])} pieces: " + numbered(rig["swaps"]) + " "
            + GRID.format(sc, sr) + ALPHA,
        },
        {
            **common,
            "id": f"OM-K{i:02d}",
            "name": "Key poses",
            "key": f"monster.{m['id']}.poses",
            "file": base + "poses.png",
            "size": "2048 x 2048, transparent",
            "used": "The targets the rig's animations are fitted to, and the stills of the "
            "snatch and hand-off.",
            "standin": "The stand-in rig posed in code.",
            "prompt": look + design + from_sheet + POSES.format(rig["view"])
            + f"The {len(rig['poses'])} poses: " + numbered(rig["poses"]) + " "
            + GRID.format(kc, kr) + ALPHA,
        },
    ]

CAST_SHEET = "onemonster/game/assets/cast/model-sheet.png"
REQUESTS += [
    {
        "id": "OM-C08",
        "section": "cast",
        "name": "Supporting cast model sheet (canonical)",
        "key": "cast.sheet",
        "file": "assets/cast/model-sheet.png",
        "size": "2048 x 1024, transparent",
        "used": "Not shown in the game: the canonical look of the people, for their sprites and "
        "the story pages.",
        "standin": "None needed.",
        "ref": "mailbox-girl-and-trollusk.jpg",
        "status": "requested",
        "note": "Sally Ann's and the mailman's looks are ours; Lucy Jane follows the girl in the "
        "reference photo, whose identity is not confirmed.",
        "prompt": STYLE + " A character model sheet for an animated game: the one definitive "
        "design of each of these people, drawn in a row, each shown twice side by side (a "
        "front view and a side view facing right), all at the same scale, standing in a calm "
        "neutral pose. 1. Sally Ann, a girl of about eight with short curly red hair, freckles, "
        "a green dress and white socks. 2. Lucy Jane, a girl of about eight with long wavy brown "
        "hair, round glasses, a white top and a pink skirt, barefoot, as the girl in the "
        "reference photo. 3. The mailman, short and stern, in a blue uniform, peaked cap and "
        "goggles, with a mail satchel. 4. The ship's captain, bearded, in a grey cap and long "
        "grey coat, as the sailors on the book's page-20 spread ( " + REF_URL
        + "typhoonigator-spread.jpg ). Even, flat lighting and clean washes; wide gaps between "
        "the figures; no labels, no ground line. " + ALPHA + " "
        + REF_SCENE.format("mailbox-girl-and-trollusk.jpg"),
    },
    {
        "id": "OM-K08",
        "section": "cast",
        "name": "Supporting cast sprites",
        "key": "cast.sprites",
        "file": "assets/cast/sprites.png",
        "size": "2048 x 2048, transparent",
        "used": "The lookers in chapter 1, the mailman's motorcycle along the top of chapter 1 and "
        "the epilogue, and the captain and crew in the chapter 4 hand-off.",
        "standin": "Small figures drawn in code.",
        "ref": "typhoonigator-spread.jpg",
        "status": "requested",
        "prompt": STYLE + " Small game sprites of the people in the story, drawn from the "
        "supporting cast model sheet, request OM-C08 (file " + CAST_SHEET + "): attach that image "
        "and match it exactly. Each sprite is complete on its own: 1. Sally Ann in an open window "
        "frame with curtains, looking out sharply. 2. The same window, Sally Ann turned away, "
        "writing at a desk. 3. A plump neighbour lady in a rocking chair on a porch step, peering "
        "over her spectacles. 4. The same neighbour, dozing. 5. A scruffy little dog, ears up, "
        "staring. 6. The same dog, curled up asleep. 7. The mailman riding his official-looking "
        "old motorcycle with a sidecar of mail sacks, side view facing left, wheels round. 8. The "
        "same, mid-bounce, exhaust puffing. 9. The captain standing in a pink rubber raft, "
        "throwing a bottle overarm. 10. Two bearded sailors paddling the pink rubber raft with an "
        "S.O.S. flag, as on the book's page-20 spread, paddles forward. 11. The same, paddles "
        "back. 12. Lucy Jane walking along reading a letter. " + GRID.format(4, 3) + ALPHA,
    },
]

# The props of each chapter: the view they are drawn in, then the sprites on its sheet.
PROPS = [
    ("trollusk", "", [
        "a red postage stamp with a scalloped edge",
        "a green postage stamp with a scalloped edge",
        "a blue postage stamp with a scalloped edge, flipping in the wind",
        "a yellow postage stamp with a scalloped edge, curling",
        "a round leafy bush",
        "a long low flowerbed of tulips and daisies",
        "a blue curbside mailbox on a post with its little red flag down",
        "the same mailbox with the flag up and the door open",
        "an eye-shaped warning bubble with a startled eye in it",
    ]),
    ("bombanat", "", [
        "a bubble of blue goo, small",
        "a bubble, medium",
        "a bubble, large and swelling",
        "a bubble bursting, with spray",
        "a flung blob of goo",
        "an old torn ticket",
        "a paper menu",
        "a folded paper hat",
        "a crumpled newspaper page",
    ]),
    ("grumley", "", [
        "a red-and-white diamond kite with a tail, as a decoy",
        "a black umbrella flapping open, as a decoy",
        "the same umbrella blown inside-out",
        "a wicker picnic basket, empty, lid open",
        "the same basket heaped full",
        "a ring of goo splash, seen side-on",
    ]),
    ("iceferg", "seen from high above", [
        "the captain's little steamship, sailing",
        "the same ship tilted and sinking, bow up",
        "a small red fishing boat",
        "a small green fishing boat with a net",
        "a curving current arrow drawn in the water as foam",
        "a white splash ring",
    ]),
    ("typhoonigator", "seen from above", [
        "the captain's glass bottle, corked, with a red-and-white label and a rolled note inside",
        "a plain green bottle",
        "a plain brown bottle",
        "a silver fish",
        "a striped fish",
        "a red-and-white buoy",
        "a tiny fishing boat, tumbling",
        "a blob of blue goo",
    ]),
    ("yalapappus", "side-on", [
        "a round grey rock",
        "a jagged brown rock",
        "the near edge of a hole in the bumpy ground",
        "the far edge of the same hole",
        "a torn scrap of paper",
        "a crumpled paper ball",
        "a paper bag",
        "the captain's note, a rolled scrap with scribbles (no readable words)",
        "a broken bottle, glass flying",
    ]),
    ("grithix", "", [
        "the official-looking mailbox: a squat riveted grey-mauve metal box with an arched top and a mail slot, as on the Grithix's page of the book",
        "a glass collecting jar, empty, corked",
        "the same jar with a small angry mauve bat-winged monster inside",
        "a clump of ferns for the foreground",
        "a gnarled root to trip over",
    ]),
]

for i, (mid, view, items) in enumerate(PROPS, start=1):
    m = next(m for m in MONSTERS if m["id"] == mid)
    REQUESTS.append({
        "id": f"OM-X{i:02d}",
        "section": "prop",
        "name": m["name"].replace("The ", "") + " props",
        "key": f"props.{mid}",
        "file": f"assets/props/{mid}.png",
        "size": "2048 x 2048, transparent",
        "used": f"The moving things in {m['used']}.",
        "standin": "The same things drawn in code.",
        "ref": m["ref"],
        "status": "requested",
        "prompt": STYLE + " A sheet of separate small game sprites, each one complete on its own "
        "and drawn at the same scale as the others" + (f", {view}" if view else "") + ": "
        + numbered(items) + " " + GRID.format(*grid(len(items)))
        + ALPHA + " " + REF_SCENE.format(m["ref"]),
    })

for i, m in enumerate(MONSTERS, start=1):
    REQUESTS.append({
        "id": f"OM-S{i:02d}",
        "section": "scene",
        "name": m["name"].replace("The ", "") + " scene",
        "key": f"scene.{m['id']}",
        "file": f"assets/scenes/{m['id']}.webp",
        "size": "1920 x 1080, opaque",
        "used": f"Behind {m['used']}.",
        "standin": "A simple painted-in-code version of the same place.",
        "status": "requested",
        "ref": m["ref"],
        "prompt": STYLE + " " + SCENE + m["scene"] + " " + REF_SCENE.format(m["ref"]),
    })

REQUESTS += [
    {
        "id": "OM-P01",
        "section": "story",
        "name": "Prologue: Sally Ann posts her letter",
        "key": "story.prologue",
        "file": "assets/story/prologue.webp",
        "size": "1920 x 1080, opaque",
        "used": "The opening page of the journey.",
        "standin": "The street scene with a girl and the mailbox drawn in code.",
        "ref": "mailbox-girl-and-trollusk.jpg",
        "status": "requested",
        "note": "Which girl the reference photo shows is not confirmed; Sally Ann's look here is ours.",
        "prompt": STYLE + " " + STORY + "A girl of about eight with short curly red hair, "
        "freckles, a green dress and white socks stands on tiptoe at a blue curbside mailbox in "
        "front of a wooden porch with turned posts and hanging flower baskets, posting a white "
        "envelope. Behind the flowerbed, half hidden, the pink snout and pointed ears of a "
        "shaggy brown monster in a blue-grey cap peek out, watching the letter. Morning light, a "
        "pale lilac sky. " + REF_SCENE.format("mailbox-girl-and-trollusk.jpg"),
    },
    {
        "id": "OM-P02",
        "section": "story",
        "name": "Epilogue: the official mailman",
        "key": "story.mailman",
        "file": "assets/story/mailman.webp",
        "size": "1920 x 1080, opaque",
        "used": "The epilogue page where the mailman takes the letter.",
        "standin": "A mailbox and a motorcycle drawn in code.",
        "ref": "cover-golden-book-1974.jpg",
        "status": "requested",
        "prompt": STYLE + " " + STORY + "At the edge of a wood, a stern little mailman in a "
        "blue uniform, peaked cap and goggles roars up on an official-looking old motorcycle "
        "with a sidecar full of mail sacks, one arm raised and pointing. In front of an "
        "official-looking mailbox (a squat riveted grey-mauve metal box with an arched top), three monsters freeze in the act of trying to carry the "
        "mailbox off: " + WHAT["trollusk"] + "; " + WHAT["yalapappus"] + "; "
        + WHAT["bombanat"] + ". At the side, " + WHAT["grithix"] + " walks off home with a "
        "netted Bombanat under one arm, not caring a bit. "
        + REF_SCENE.format("cover-golden-book-1974.jpg"),
    },
    {
        "id": "OM-P03",
        "section": "story",
        "name": "Epilogue: Lucy Jane gets her letter",
        "key": "story.lucyjane",
        "file": "assets/story/lucyjane.webp",
        "size": "1920 x 1080, opaque",
        "used": "The last page of the journey, before the postmark tally.",
        "standin": "The porch and mailbox with a girl drawn in code.",
        "ref": "mailbox-girl-and-trollusk.jpg",
        "status": "requested",
        "prompt": STYLE + " " + STORY + "A girl of about eight with long wavy brown hair, round "
        "glasses, a white top and a pink skirt, barefoot, walks away from a plain blue mailbox on a "
        "post (no lettering) in front of a wooden porch with flower baskets, "
        "reading a crumpled, goo-stained, nibbled letter with a calm, slightly bored face. All "
        "around her, unseen, the monsters from the story peek out of the bushes, the trees and "
        "the sky: " + "; ".join(WHAT[m["id"]] for m in MONSTERS) + ". Warm afternoon light. "
        + REF_SCENE.format("mailbox-girl-and-trollusk.jpg"),
    },
]


def asset_list() -> str:
    data = {
        r["key"]: {"file": r["file"], "delivered": r["status"] == "delivered"} for r in REQUESTS
    }
    return (
        "// Generated by onemonster/design/source/build_requests.py. Do not edit by hand:\n"
        "// change the data there and rerun it. A delivered asset is loaded in place of\n"
        "// its stand-in; a requested one is not loaded at all.\n"
        "export const ASSETS = " + json.dumps(data, indent=2) + ";\n"
    )


def document() -> str:
    delivered = sum(r["status"] == "delivered" for r in REQUESTS)
    out = [
        "# One Monster After Another: image requests",
        "",
        "Artwork for the One Monster After Another game in `onemonster/`. Generated from "
        "`source/build_requests.py`; edit the data there and rerun it, which also rewrites "
        "`onemonster/game/src/asset-list.js`.",
        "",
        "## How to use this list",
        "",
        "1. Each prompt is complete on its own: paste it as it stands. The shared style text is already in every prompt.",
        "2. Save each image under the file name in its **File** line and drop it in `onemonster/intake/`. On integration "
        "it moves to that path under `onemonster/game/`, its status flips to `delivered` and the game loads it in place "
        "of its stand-in.",
        "3. Every sprite needs transparency (all the `.png` files). If the generator cannot produce "
        "alpha, use a flat pure magenta `#FF00FF` background as the prompts say; it is keyed out on integration.",
        "4. Opaque images are listed as `.webp`; PNG or JPEG is fine too, they are converted on integration.",
        "5. Nothing here blocks the game: every image has a stand-in drawn in code until it arrives.",
        "6. Each request names a reference photo of the book in `onemonster/reference/`, and its "
        "prompt links to it. Give that photo to the image generator along with the prompt where "
        "it can take an image; the prompt's link works once the photo is on `main`.",
        "7. **Canonical first.** Each monster has five requests. Make its model sheet (`OM-C`) "
        "first and settle the design there, from the book's reference photo. Then make the other "
        "four (portrait `OM-M`, parts `OM-R`, swaps `OM-F`, key poses `OM-K`) with the model "
        "sheet attached, so every image of the monster is the same monster. Do the same for the "
        "people (`OM-C08`, then `OM-K08`). If a later image drifts from the sheet, regenerate it "
        "rather than the sheet.",
        "8. **The sprites are cut-out rigs.** The parts sheet takes the monster apart (wings, jaw, "
        "ears, limbs, cap, net) and the game moves and rotates each piece on its own, so the "
        "animation is smooth at any frame rate without drawing every frame. The swaps sheet "
        "holds the shapes rotation cannot make (a wing at the top of its beat, an open jaw, a "
        "blink), swapped in for a frame or two. The key poses are the targets the animations are "
        "fitted to, and the stills of each hand-off. Pieces must be at the same scale as the "
        "model sheet's master view and laid out in the grid and order the prompt gives; the "
        "pieces are cut apart and named in that order on integration, and their pivots are "
        "fitted then.",
        "9. If a generator struggles with a whole sheet, split it: make the first half of the "
        "list and the second half as two images, saved as `parts-1.png` and `parts-2.png` (and "
        "so on), each in the same order and at the same scale.",
        "10. Two monsters (the Grumley and the Ice-Ferg) are not in any photo we "
        "have, and their designs are ours; their model sheets say so under **Note**. If you can "
        "look at the book (the Internet Archive lends a scan), adjust those prompts to match first.",
        "11. Order of work: the model sheets, then the portraits, then the parts and swaps, then "
        "the key poses, props, scenes and story pages. The game keeps its stand-ins for anything "
        "not yet delivered.",
        "",
        "## Status",
        "",
        f"{len(REQUESTS) - delivered} requested, {delivered} delivered, {len(REQUESTS)} in total.",
        "",
    ]
    for key, (title, blurb) in SECTIONS.items():
        out += [f"## {title}", "", blurb, ""]
        for r in (r for r in REQUESTS if r["section"] == key):
            out += [
                f"### {r['id']} · {r['name']}",
                "",
                f"- **File:** `onemonster/game/{r['file']}`",
                f"- **Size:** {r['size']}",
                f"- **Used for:** {r['used']}",
                f"- **Stand-in until delivered:** {r['standin']}",
                *([f"- **Reference:** [`reference/{r['ref']}`](../reference/{r['ref']})"] if r.get("ref") else []),
                *([f"- **Note:** {r['note']}"] if r.get("note") else []),
                f"- **Status:** {r['status']}",
                "",
                "```text",
                r["prompt"],
                "```",
                "",
            ]
    return "\n".join(out).rstrip() + "\n"


def main() -> int:
    outputs = {DOC: document(), ASSET_LIST: asset_list()}
    if "--check" in sys.argv:
        stale = [p for p, text in outputs.items() if not p.exists() or p.read_text() != text]
        for p in stale:
            print(f"out of date: {p.relative_to(ROOT.parent)} (rerun build_requests.py)")
        return 1 if stale else 0
    for p, text in outputs.items():
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(text)
        print(f"wrote {p.relative_to(ROOT.parent)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
