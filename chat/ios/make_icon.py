#!/usr/bin/env python3
"""Builds the app icon (GamesChat/Assets.xcassets/AppIcon.appiconset/AppIcon.png):
the delivered iOS icon (CH-U04, chat/assets/ui/ios-app-icon.png) when it is in,
else a stand-in made from the web icon on an aqua-to-violet square. iOS wants
1024 x 1024 with no transparency. Run it again after the art is delivered."""
from pathlib import Path
from PIL import Image

here = Path(__file__).resolve().parent
assets = here.parent / "assets" / "ui"
out = here / "GamesChat" / "Assets.xcassets" / "AppIcon.appiconset" / "AppIcon.png"
delivered = assets / "ios-app-icon.png"
if delivered.exists():
    icon = Image.open(delivered).convert("RGB").resize((1024, 1024), Image.LANCZOS)
else:
    bg = Image.new("RGB", (1024, 1024))
    px = bg.load()
    for y in range(1024):
        for x in range(1024):
            t = (x + y) / 2046
            px[x, y] = (int(63 + (151 - 63) * t), int(224 + (117 - 224) * t), int(208 + (250 - 208) * t))
    web = Image.open(assets / "icon.png").convert("RGBA").resize((860, 860), Image.LANCZOS)
    bg.paste(web, (82, 82), web)
    icon = bg
icon.save(out, "PNG")
print(f"wrote {out.relative_to(here)} ({'delivered art' if delivered.exists() else 'stand-in'})")
