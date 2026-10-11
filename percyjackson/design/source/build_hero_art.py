#!/usr/bin/env python3
"""Cut the hero cards and face portraits out of the delivered card sheets, and
make web copies of the title background.

    design/concept/ui-hero-cards.png  → Percy, Annabeth, Grover
    game/assets/ui-hero-cards-2.png   → Tyson, Clarisse, Thalia, Nico
    game/assets/title-bg.png          → game/assets/title-bg.jpg

Writes game/assets/heroes/<id>-card.jpg (the whole framed card) and
<id>-face.jpg (a square portrait for the HUD and hero select).

    python3 percyjackson/design/source/build_hero_art.py          # write
    python3 percyjackson/design/source/build_hero_art.py --check  # verify present
"""
from __future__ import annotations

import sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1].parent
OUT = ROOT / "game" / "assets" / "heroes"
# (sheet, card box, face centre, face size) in the sheets' 2560 × 1440 pixels
HEROES = {
    "percy": ("design/concept/ui-hero-cards.png", (220, 40, 860, 980), (510, 330), 300),
    "annabeth": ("design/concept/ui-hero-cards.png", (910, 40, 1580, 980), (1280, 290), 300),
    "grover": ("design/concept/ui-hero-cards.png", (1670, 40, 2330, 980), (2010, 340), 280),
    "tyson": ("game/assets/ui-hero-cards-2.png", (30, 30, 640, 1400), (330, 380), 340),
    "clarisse": ("game/assets/ui-hero-cards-2.png", (660, 30, 1256, 1400), (930, 380), 300),
    "thalia": ("game/assets/ui-hero-cards-2.png", (1290, 30, 1890, 1400), (1580, 360), 300),
    "nico": ("game/assets/ui-hero-cards-2.png", (1920, 30, 2530, 1400), (2300, 600), 300),
}


def main() -> None:
    check = "--check" in sys.argv
    missing = []
    OUT.mkdir(parents=True, exist_ok=True)
    jobs = []
    for hid, (sheet, card, (cx, cy), size) in HEROES.items():
        jobs.append((OUT / f"{hid}-card.jpg", sheet, card, (400, 900)))
        jobs.append((OUT / f"{hid}-face.jpg", sheet, (cx - size // 2, cy - size // 2, cx + size // 2, cy + size // 2), (256, 256)))
    jobs.append((ROOT / "game/assets/title-bg.jpg", "game/assets/title-bg.png", None, (1920, 1080)))
    for dst, sheet, box, size in jobs:
        if check:
            if not dst.is_file():
                missing.append(str(dst.relative_to(ROOT)))
            continue
        src = ROOT / sheet
        if not src.is_file():
            continue
        with Image.open(src) as im:
            im = im.convert("RGB")
            if box:
                im = im.crop(box)
            im.thumbnail(size, Image.LANCZOS)
            im.save(dst, "JPEG", quality=86, optimize=True, progressive=True)
        print("wrote", dst.relative_to(ROOT))
    # the logo with its magenta background keyed out, for the game library card
    logo_out = ROOT / "game/assets/logo-web.png"
    if check:
        if not logo_out.is_file():
            missing.append(str(logo_out.relative_to(ROOT)))
    elif (ROOT / "game/assets/logo.png").is_file():
        with Image.open(ROOT / "game/assets/logo.png") as im:
            im = im.convert("RGBA")
            px = im.load()
            for y in range(im.height):
                for x in range(im.width):
                    r, g, b, a = px[x, y]
                    # distance from pure magenta; soften the edge
                    d = max(abs(r - 255), g, abs(b - 255))
                    if d < 70:
                        px[x, y] = (r, g, b, 0)
                    elif d < 120:
                        k = (d - 70) / 50
                        px[x, y] = (int(r * k + 200 * (1 - k)), g, int(b * k + 120 * (1 - k)), int(255 * k))
            im = im.crop(im.getbbox())
            im.thumbnail((900, 600), Image.LANCZOS)
            im.save(logo_out, optimize=True)
        print("wrote", logo_out.relative_to(ROOT))
    if missing:
        sys.exit("missing: " + ", ".join(missing))
    if check:
        print("hero art present")


if __name__ == "__main__":
    main()
