#!/usr/bin/env python3
"""List the vanilla block, entity, environment, item and painting textures in a Minecraft client jar.

Writes design/source/vanilla_textures.tsv (path, width, height, animation frames, alpha),
the input build_requests.py turns into the image requests, and
design/source/tinted_items.txt, the textures item definitions tint (dye,
potion colour). Only names and sizes are recorded; no Mojang artwork is copied
into the repository.

    python3 tools/list_vanilla_textures.py ~/.gradle/caches/fabric-loom/26.3/minecraft-client.jar
"""
import io
import json
import sys
import zipfile
from pathlib import Path

from PIL import Image

FOLDERS = ("block/", "entity/", "environment/", "item/", "painting/")
PREFIX = "assets/minecraft/textures/"
OUT = Path(__file__).resolve().parent.parent / "design" / "source" / "vanilla_textures.tsv"
TINTED_ITEMS = OUT.with_name("tinted_items.txt")


def alpha_kind(img: Image.Image) -> str:
    """opaque, cutout (only fully clear or fully solid pixels) or translucent."""
    # RGB and greyscale PNGs can also use a tRNS colour key. Converting to
    # RGBA resolves that key as well as palette and explicit alpha channels.
    histogram = img.convert("RGBA").getchannel("A").histogram()
    if not any(histogram[:255]):
        return "opaque"
    return "cutout" if not any(histogram[1:255]) else "translucent"


def tinted_item_textures(jar: zipfile.ZipFile) -> set[str]:
    """Item textures the game colours at run time: the model layers an item definition gives a tint."""
    models = {}
    for name in jar.namelist():
        if name.startswith("assets/minecraft/models/item/") and name.endswith(".json"):
            models["minecraft:item/" + name.rsplit("/", 1)[1][:-5]] = json.loads(jar.read(name))
    tinted = set()

    def visit(node) -> None:
        if isinstance(node, dict):
            tints = node.get("tints")
            model = models.get(node.get("model", "") if isinstance(node.get("model"), str) else "")
            if tints and model:
                layers = model.get("textures", {})
                for i, tint in enumerate(tints):
                    white = tint.get("type") == "minecraft:constant" and tint.get("value") == -1
                    texture = layers.get(f"layer{i}")
                    if texture and not white:
                        tinted.add(texture.split(":")[-1])
            for value in node.values():
                visit(value)
        elif isinstance(node, list):
            for value in node:
                visit(value)

    for name in jar.namelist():
        if name.startswith("assets/minecraft/items/") and name.endswith(".json"):
            visit(json.loads(jar.read(name)))
    return tinted


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
    with zipfile.ZipFile(jar_path) as jar:
        TINTED_ITEMS.write_text("\n".join(sorted(tinted_item_textures(jar))) + "\n")
    OUT.write_text("path\twidth\theight\tframes\talpha\n" + "\n".join(rows) + "\n")
    print(f"wrote {len(rows)} textures to {OUT}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
