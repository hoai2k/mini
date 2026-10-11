#!/usr/bin/env python3
"""Make the web copies of Ai-Ching's delivered art.

The art in aiching/app/assets/ is kept at full size as delivered. The page
loads smaller copies from aiching/app/web/, which this script writes from the
asset list (aiching/app/data/asset-list.json, made by
design/source/build_requests.py):

    python3 aiching/tools/build_web.py          # (re)write stale copies
    python3 aiching/tools/build_web.py --check  # fail if any copy is missing or stale

Needs Pillow. Strokes, clouds and the divider are trimmed to their painted
part, so they can be stretched to the width of a line or a page.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "app"
ASSETS = json.loads((APP / "data" / "asset-list.json").read_text(encoding="utf-8"))

# id prefix or id -> (max width, quality, trim)
SPEC = {
    "hexagram-": (1600, 72, False),
    "trigram-": (480, 80, False),
    "topic-": (480, 80, False),
    "ui-logo": (900, 85, True),
    "ui-icon": (256, 85, False),
    "ui-home-bg": (1920, 70, False),
    "ui-paper": (512, 75, False),
    "ui-result-bg": (1920, 62, False),
    "ui-clouds": (900, 82, True),
    "ui-coin-yang": (200, 85, False),
    "ui-coin-yin": (200, 85, False),
    "ui-yang": (700, 85, True),
    "ui-yin": (700, 85, True),
    "ui-divider": (700, 85, True),
    "ui-share": (1200, 75, False),
}
SMALL = {"hexagram-": 720}  # extra "-sm" copies for the small pictures


def spec(aid):
    for k, v in SPEC.items():
        if aid == k or (k.endswith("-") and aid.startswith(k)):
            return k, v
    raise KeyError(aid)


def jobs():
    for aid, a in ASSETS.items():
        if a["status"] != "delivered":
            continue
        key, (width, quality, trim) = spec(aid)
        src = APP / a["source"]
        yield src, APP / a["path"], width, quality, trim
        if key in SMALL:
            yield src, APP / a["path"].replace(".webp", "-sm.webp"), SMALL[key], quality, trim


def convert(src, dst, width, quality, trim):
    from PIL import Image

    im = Image.open(src)
    im = im.convert("RGBA") if im.mode in ("RGBA", "LA", "P") else im.convert("RGB")
    if trim and im.mode == "RGBA":
        box = im.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()
        if box:
            im = im.crop(box)
    if im.width > width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    dst.parent.mkdir(parents=True, exist_ok=True)
    im.save(dst, "WEBP", quality=quality, method=6)


def main():
    stale = [(s, d, w, q, t) for s, d, w, q, t in jobs() if not d.exists() or d.stat().st_mtime < s.stat().st_mtime]
    if "--check" in sys.argv:
        missing = [d for _, d, *_ in jobs() if not d.exists()]
        if missing:
            print("missing web copies, run aiching/tools/build_web.py:", ", ".join(str(m.relative_to(ROOT)) for m in missing[:8]))
            sys.exit(1)
        print("web copies present")
        return
    for s, d, w, q, t in stale:
        convert(s, d, w, q, t)
        print(f"{d.relative_to(ROOT)}  {d.stat().st_size // 1024} KB")
    print(f"{len(stale)} written")


if __name__ == "__main__":
    main()
