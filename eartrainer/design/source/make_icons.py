#!/usr/bin/env python3
"""Draw the stand-in app icons (until the requested icon art arrives):
    python3 eartrainer/design/source/make_icons.py"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

OUT = Path(__file__).resolve().parents[2] / "app" / "icons"


def draw(size: int) -> Image.Image:
    s = 1024
    im = Image.new("RGB", (s, s), (14, 19, 32))
    glow = Image.new("RGB", (s, s), (0, 0, 0))
    ImageDraw.Draw(glow).ellipse((212, 120, 812, 620), fill=(120, 90, 40))
    im = Image.blend(im, glow.filter(ImageFilter.GaussianBlur(120)), 0.55)
    d = ImageDraw.Draw(im)
    # keys
    top, bottom, left, w = 560, 900, 172, 136
    for i in range(5):
        x = left + i * w
        d.rounded_rectangle((x + 6, top, x + w - 6, bottom), 22, fill=(255, 253, 246))
    for i in (1, 2, 4):
        x = left + i * w - 44
        d.rounded_rectangle((x, top, x + 88, top + 210), 14, fill=(20, 22, 28))
    # a brass note glowing on the middle key
    d.ellipse((330, 250, 520, 410), fill=(230, 182, 96))
    d.rectangle((488, 110, 528, 340), fill=(230, 182, 96))
    d.polygon([(528, 110), (690, 180), (690, 250), (528, 190)], fill=(246, 216, 145))
    d.ellipse((s // 2 - 30, 770, s // 2 + 30, 830), fill=(226, 180, 94))
    return im.resize((size, size), Image.LANCZOS)


for n in (180, 192, 512):
    draw(n).save(OUT / f"icon-{n}.png", optimize=True)
    print("icon", n)
