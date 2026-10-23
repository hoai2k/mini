#!/usr/bin/env python3
"""Assemble matching home icons from the metronome screen's measured layers.

Uses the user-approved compositions in image-deliveries-rounds-14-15.json.
Run with --check to verify the saved page assemblies, masters and app icons.
"""
from pathlib import Path
import json
import sys

from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parents[3]
APP = ROOT / "musicpractice" / "app"
DESIGN = ROOT / "musicpractice" / "design"


def equivalent(actual, expected):
    actual = actual.convert("RGBA")
    if actual.size != expected.size:
        return False
    if ImageChops.difference(actual.getchannel("A"), expected.getchannel("A")).getbbox():
        return False
    # WebP may change the invisible RGB under fully transparent pixels.
    black = Image.new("RGBA", expected.size, (0, 0, 0, 255))
    return not ImageChops.difference(
        Image.alpha_composite(black, actual).convert("RGB"),
        Image.alpha_composite(black, expected).convert("RGB"),
    ).getbbox()


def main():
    entries = json.loads((APP / "data" / "asset-list.json").read_text())
    record = json.loads((DESIGN / "image-deliveries-rounds-14-15.json").read_text())
    check = "--check" in sys.argv
    for asset in record["assets"]:
        composition = asset.get("compositing")
        if not composition:
            continue
        theme = asset["theme"]

        def layer(asset_id):
            metadata = next(a for a in entries if a.get("theme") == theme and a["id"] == asset_id)
            pixels = Image.open(APP / metadata["file"]).convert("RGBA")
            return metadata, pixels.resize(tuple(metadata["canvas"]), Image.Resampling.LANCZOS)

        body_meta, body = layer("metronome-body")
        rod_meta, rod = layer("metronome-rod")
        weight_meta, weight = layer("metronome-weight")
        px, py = body_meta["anchors"]["pivot"]
        hx, hy = rod_meta["anchors"]["hub"]
        cx, cy = weight_meta["anchors"]["center"]
        scale = rod_meta.get("scale", 1)
        start, end = rod_meta["travel"]
        y = start + composition["weight_position"] * (end - start)
        rod.alpha_composite(weight.transform(
            rod.size, Image.Transform.AFFINE, (1, 0, cx - hx, 0, 1, cy - y),
            Image.Resampling.BICUBIC,
        ))
        moving = rod.transform(
            body.size, Image.Transform.AFFINE,
            (1 / scale, 0, hx - px / scale, 0, 1 / scale, hy - py / scale),
            Image.Resampling.BICUBIC,
        ).rotate(-composition["tilt_degrees_right"], resample=Image.Resampling.BICUBIC, center=(px, py))
        assembled = Image.alpha_composite(body, moving)
        side = max(assembled.size)
        square = Image.new("RGBA", (side, side))
        square.alpha_composite(assembled, ((side - assembled.width) // 2, (side - assembled.height) // 2))
        square.putalpha(square.getchannel("A").point(lambda value: 0 if value <= 1 else value))
        master = square.resize(tuple(composition["home_master_canvas"]), Image.Resampling.LANCZOS)
        runtime = master.resize(tuple(asset["size"]), Image.Resampling.LANCZOS)
        outputs = [(ROOT / composition["assembled_source"], assembled),
                   (ROOT / asset["source"], master), (ROOT / asset["file"], runtime)]
        for path, pixels in outputs:
            if check:
                if not path.exists() or not equivalent(Image.open(path), pixels):
                    raise SystemExit(f"Stale assembled image: {path}")
            elif path.suffix == ".webp":
                pixels.save(path, lossless=True, method=6)
            else:
                pixels.save(path)
        print(f"{'Verified' if check else 'Assembled'} {theme}: shared case, rod, weight and pivot.")


if __name__ == "__main__":
    main()
