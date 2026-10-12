#!/usr/bin/env python3
"""Make the app icons in musicpractice/app/icons/.

Resizes the delivered icon (app/icons/icon-1024.png) when it is there;
until then draws a stand-in: a cream metronome with a red record dot on
walnut.

    python3 musicpractice/design/source/make_icons.py
"""

from pathlib import Path

from PIL import Image, ImageDraw

ICONS = Path(__file__).resolve().parents[2] / "app" / "icons"
SIZES = (32, 180, 192, 512)


def standin(n: int = 1024) -> Image.Image:
    img = Image.new("RGB", (n, n))
    d = ImageDraw.Draw(img)
    top, bottom = (110, 72, 44), (40, 26, 17)
    for y in range(n):
        t = y / (n - 1)
        d.line([(0, y), (n, y)], fill=tuple(round(a + (b - a) * t) for a, b in zip(top, bottom)))
    s = n / 100
    d.polygon([(43 * s, 18 * s), (57 * s, 18 * s), (74 * s, 80 * s), (26 * s, 80 * s)], fill=(246, 236, 218))
    d.polygon([(47 * s, 25 * s), (53 * s, 25 * s), (64 * s, 70 * s), (36 * s, 70 * s)], fill=(214, 194, 160))
    d.rectangle([22 * s, 80 * s, 78 * s, 85 * s], fill=(246, 236, 218))
    d.line([(50 * s, 72 * s), (63 * s, 26 * s)], fill=(226, 181, 92), width=round(3.2 * s))
    d.polygon([(57.5 * s, 38 * s), (64 * s, 40 * s), (61.5 * s, 47 * s), (55.5 * s, 45.5 * s)], fill=(226, 181, 92))
    d.ellipse([46.5 * s, 68.5 * s, 53.5 * s, 75.5 * s], fill=(226, 181, 92))
    d.ellipse([64 * s, 62 * s, 82 * s, 80 * s], fill=(229, 72, 77), outline=(40, 26, 17), width=round(1.6 * s))
    return img


def main() -> None:
    master = ICONS / "icon-1024.png"
    src = Image.open(master).convert("RGB") if master.exists() else standin()
    for size in SIZES:
        src.resize((size, size), Image.LANCZOS).save(ICONS / f"icon-{size}.png", optimize=True)
    # The browser favicon uses the conventional metronome with its original alpha.
    # Keep named Art Deco variants so switching back only needs an HTML href change.
    metronome = Image.open(ICONS.parent / "assets/ui/home-metronome.webp").convert("RGBA")
    for size in (32, 192):
        metronome.resize((size, size), Image.LANCZOS).save(ICONS / f"favicon-metronome-{size}.png", optimize=True)
        src.resize((size, size), Image.LANCZOS).save(ICONS / f"favicon-art-deco-{size}.png", optimize=True)
    print(f"wrote icons {SIZES} from {'icon-1024.png' if master.exists() else 'the stand-in'}")


if __name__ == "__main__":
    main()
