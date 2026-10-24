#!/usr/bin/env python3
"""Write an upscaled copy of every requested vanilla texture, for image-to-image work.

Reads the textures from your own Minecraft client jar and writes them, scaled
with hard pixel edges to the exact size each request asks for, to
local/smoothcraft/references/<texture id>.png (outside Git: the art is Mojang's).
Paint over these to keep each UV region where the game expects it.

    python3 smoothcraft/tools/make_references.py [client.jar] [--only entity/villager]
"""
import argparse
import io
import json
import zipfile
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
SMOOTHCRAFT = HERE.parent
OUT = SMOOTHCRAFT.parent / "local" / "smoothcraft" / "references"
DEFAULT_JAR = Path.home() / ".gradle/caches/fabric-loom/26.3/minecraft-client.jar"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("jar", nargs="?", default=str(DEFAULT_JAR), help="Minecraft client jar (default: Loom's cache)")
    parser.add_argument("--only", default="", help="only textures whose id starts with this")
    args = parser.parse_args()

    requests = json.loads((SMOOTHCRAFT / "design" / "image-requests.json").read_text())["requests"]
    count = 0
    with zipfile.ZipFile(args.jar) as jar:
        for req in requests:
            if not req["id"].startswith(args.only):
                continue
            data = jar.read(f"assets/minecraft/textures/{req['id']}.png")
            with Image.open(io.BytesIO(data)) as img:
                big = img.convert("RGBA").resize(tuple(req["size"]), Image.NEAREST)
            target = OUT / f"{req['id']}.png"
            target.parent.mkdir(parents=True, exist_ok=True)
            big.save(target)
            count += 1
    print(f"wrote {count} references to {OUT}")


if __name__ == "__main__":
    main()
