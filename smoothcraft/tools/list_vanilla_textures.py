#!/usr/bin/env python3
"""List the vanilla block, entity and environment textures in a Minecraft client jar.

Writes design/source/vanilla_textures.tsv (path, width, height, animation frames, alpha),
the input build_requests.py turns into the image requests. Only names and sizes
are recorded; no Mojang artwork is copied into the repository.

    python3 tools/list_vanilla_textures.py ~/.gradle/caches/fabric-loom/26.3/minecraft-client.jar
"""
import io
import json
import sys
import zipfile
from pathlib import Path

from PIL import Image

FOLDERS = ("block/", "entity/", "environment/")
PREFIX = "assets/minecraft/textures/"
OUT = Path(__file__).resolve().parent.parent / "design" / "source" / "vanilla_textures.tsv"


def alpha_kind(img: Image.Image) -> str:
    """opaque, cutout (only fully clear or fully solid pixels) or translucent."""
    if img.mode not in ("RGBA", "LA", "P"):
        return "opaque"
    histogram = img.convert("RGBA").getchannel("A").histogram()
    if not any(histogram[:255]):
        return "opaque"
    return "cutout" if not any(histogram[1:255]) else "translucent"


def main(jar_path: str) -> None:
    rows = []
    with zipfile.ZipFile(jar_path) as jar:
        names = set(jar.namelist())
        for name in sorted(names):
            if not name.startswith(PREFIX) or not name.endswith(".png"):
                continue
            rel = name[len(PREFIX):]
            if not rel.startswith(FOLDERS):
                continue
            with Image.open(io.BytesIO(jar.read(name))) as img:
                w, h = img.size
                alpha = alpha_kind(img)
            frames = 1
            meta = name + ".mcmeta"
            if meta in names:
                try:
                    anim = json.loads(jar.read(meta)).get("animation")
                except ValueError:
                    anim = None
                if anim is not None:
                    fw = anim.get("width", min(w, h))
                    fh = anim.get("height", fw if "width" in anim else min(w, h))
                    frames = max(1, (w // fw) * (h // fh))
            rows.append(f"{rel[:-4]}\t{w}\t{h}\t{frames}\t{alpha}")
    OUT.write_text("path\twidth\theight\tframes\talpha\n" + "\n".join(rows) + "\n")
    print(f"wrote {len(rows)} textures to {OUT}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
