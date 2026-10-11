#!/usr/bin/env python3
"""Make the game's card images from the delivered concept art.

The chapter map, story cards and hero cards show concept art. The originals
in design/concept/ are 5-7 MB PNGs, so this writes web-sized JPEG copies to
game/assets/cards/. Cards whose art has not been delivered yet are skipped;
the game draws a stand-in for them. Run after new concept art arrives:

    python3 percyjackson/design/source/build_cards.py          # write
    python3 percyjackson/design/source/build_cards.py --check  # verify up to date
"""
from __future__ import annotations

import sys
from pathlib import Path
try:
    from PIL import Image  # only needed to build; --check runs without it
except ImportError:
    Image = None

ROOT = Path(__file__).resolve().parents[2]
CONCEPT = ROOT / "design" / "concept"
OUT = ROOT / "game" / "assets" / "cards"
# Card images the game uses: every scene, the book covers and the hero cards.
PATTERNS = ["scene-*.png", "book-*.png", "key-art.png", "map-*.png", "ui-hero-cards.png", "char-*.png"]
LONG_SIDE = 1280


def targets():
    for pattern in PATTERNS:
        for src in sorted(CONCEPT.glob(pattern)):
            yield src, OUT / (src.stem + ".jpg")


def main() -> None:
    check = "--check" in sys.argv
    if not check and Image is None:
        sys.exit("building needs Pillow: pip install pillow")
    stale = []
    OUT.mkdir(parents=True, exist_ok=True)
    for src, dst in targets():
        if check:
            # Git checkouts don't keep modification times, so only check presence.
            if not dst.is_file():
                stale.append(dst.name)
            continue
        if dst.is_file() and dst.stat().st_mtime >= src.stat().st_mtime:
            continue
        with Image.open(src) as im:
            im = im.convert("RGB")
            im.thumbnail((LONG_SIDE, LONG_SIDE), Image.LANCZOS)
            im.save(dst, "JPEG", quality=84, optimize=True, progressive=True)
        print("wrote", dst.relative_to(ROOT))
    if check and stale:
        sys.exit("cards out of date: " + ", ".join(stale))
    if check:
        print("cards up to date")


if __name__ == "__main__":
    main()
