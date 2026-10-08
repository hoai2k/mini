"""Cut the foreground of chapter 1's lane (scenes/trollusk-front.webp).

The mailman rides along a road just behind the picket fence. The game draws
the scene, then him, then this layer over him: the fence pickets and posts,
the flowers in front of them, the two tree trunks and everything below the
fence line, so he passes behind the trees and only his top shows over the
fence. Coordinates are the scene's own (1920 x 1080).

    python3 onemonster/tools/scene_front.py
"""
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

GAME = Path(__file__).resolve().parent.parent / "game"
SRC = GAME / "sprites/scenes/trollusk.webp"
OUT = GAME / "sprites/scenes/trollusk-front.webp"
W, H = 1920, 1080
BELOW = 566          # the pickets' shoulders: everything from here down is in front of the road
BAND = (488, BELOW)  # where the pickets and post tops stick up above that line
TRUNKS = [
    # the left tree, its trunk and the big bough
    [(0, 150), (300, 150), (255, 230), (215, 330), (205, 450), (230, BELOW), (0, BELOW)],
    # the right tree, leaning in from the top
    [(1325, 150), (1475, 150), (1520, 260), (1500, 380), (1478, 470), (1470, BELOW), (1670, BELOW),
     (1665, 470), (1700, 350), (1690, 250), (1650, 150)],
]

POSTS = [(242, 22), (543, 20), (1318, 20)]  # gate posts: centre x, half width; ball caps on top


def build(write=True):
    im = Image.open(SRC).convert("RGBA").resize((W, H), Image.LANCZOS)
    a = np.asarray(im).astype(int)
    mask = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(mask)
    d.rectangle((0, BELOW, W, H), fill=255)
    for poly in TRUNKS:
        d.polygon(poly, fill=255)
    d.rounded_rectangle((1112, 556, 1282, BELOW + 4), radius=14, fill=255)  # the trash can and its lid
    for x, hw in POSTS:
        d.rectangle((x - hw, 522, x + hw, BELOW), fill=255)
        d.ellipse((x - 17, 492, x + 17, 528), fill=255)
    # The white pickets, posts and daisies in the band just above the line.
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    white = (r > 196) & (g > 196) & (b > 186) & (np.max(a[..., :3], -1) - np.min(a[..., :3], -1) < 48)
    # Keep only white that grows up out of the fence line (pickets and posts),
    # not specks of blossom in the hedge behind.
    keep = np.zeros_like(white)
    keep[BELOW] = True
    for y in range(BELOW - 1, BAND[0] - 1, -1):
        below = keep[y + 1]
        spread = below | np.roll(below, 1) | np.roll(below, -1) | np.roll(below, 2) | np.roll(below, -2)
        keep[y] = white[y] & spread
    keep[BELOW] = False
    pick = Image.fromarray((keep * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5))
    # Fill each picket's dark ink outline and shading too: close the gaps vertically.
    pick = pick.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MinFilter(3))
    mask = Image.fromarray(np.maximum(np.asarray(mask), np.asarray(pick)))
    mask = mask.filter(ImageFilter.GaussianBlur(0.8))
    im.putalpha(mask)
    if write:
        im.save(OUT, "WEBP", quality=88, method=6)
    return OUT, W, H


if __name__ == "__main__":
    print("wrote", build()[0])
