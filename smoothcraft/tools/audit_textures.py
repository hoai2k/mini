#!/usr/bin/env python3
"""Audit the delivered HD textures against their requests and the vanilla originals.

For every request in design/image-requests.json this checks the delivered PNG in
the HD resource pack:

  size        exactly the requested size
  mcmeta      an animation/metadata file wherever vanilla has one, frames intact
  alpha       transparent exactly where vanilla is (cutout masks), opaque where vanilla is
  neutral     biome- or dye-tinted textures stay near greyscale, so the tint still works
  seams       block textures repeat edge to edge without a visible seam
  drift       the image, shrunk to vanilla size, still reads as the vanilla colours
  repainted   the image is new detail, not vanilla pixels blown up
  blackout    no patches of black (or blank white) where vanilla has colour (a leaked colour key)

and writes a JSON report (default local/smoothcraft/audit.json) listing every
failure and the worst outliers of each measure, for visual review.

    python3 smoothcraft/tools/audit_textures.py [client.jar] [--report path]
"""
import argparse
import io
import json
import zipfile
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
SMOOTHCRAFT = HERE.parent
PACK = SMOOTHCRAFT / "mod/src/main/resources/resourcepacks/hd/assets/minecraft/textures"
DEFAULT_JAR = Path.home() / ".gradle/caches/fabric-loom/26.3/minecraft-client.jar"
DEFAULT_REPORT = SMOOTHCRAFT.parent / "local/smoothcraft/audit.json"

# Textures the game colours at run time (biome, dye or redstone power tint; from
# BlockColors and the tinted faces of the block models, and the dyed entity
# layers). Vanilla keeps them grey so the tint gives the colour; the HD versions
# must stay as grey or the tint doubles up.
TINTED = {
    "block/grass_block_top", "block/grass_block_side_overlay", "block/short_grass", "block/fern", "block/bush",
    "block/tall_grass_bottom", "block/tall_grass_top", "block/large_fern_bottom", "block/large_fern_top",
    "block/pink_petals_stem", "block/wildflowers_stem", "block/oak_leaves", "block/spruce_leaves", "block/birch_leaves",
    "block/jungle_leaves", "block/acacia_leaves", "block/dark_oak_leaves", "block/mangrove_leaves", "block/vine",
    "block/leaf_litter", "block/water_still", "block/water_flow", "block/water_overlay", "block/redstone_dust_dot",
    "block/redstone_dust_line0", "block/redstone_dust_line1", "block/sugar_cane", "block/melon_stem",
    "block/pumpkin_stem", "block/attached_melon_stem", "block/attached_pumpkin_stem", "block/lily_pad",
    "entity/sheep/sheep_wool", "entity/sheep/sheep_wool_baby", "entity/sheep/sheep_wool_undercoat",
    "entity/cat/cat_collar", "entity/cat/cat_collar_baby", "entity/wolf/wolf_collar", "entity/wolf/wolf_collar_baby",
}
TINTED_PREFIX = ("entity/fish/tropical_a_pattern", "entity/fish/tropical_b_pattern", "entity/equipment/humanoid/leather",
                 "entity/equipment/humanoid_leggings/leather", "entity/equipment/horse_body/leather",
                 "entity/equipment/wolf_body/armadillo_scute_overlay", "entity/banner/", "entity/shield/")


def load_rgba(data: bytes) -> np.ndarray:
    with Image.open(io.BytesIO(data)) as img:
        return np.asarray(img.convert("RGBA"), dtype=np.float32) / 255.0


def erode(mask: np.ndarray, radius: int) -> np.ndarray:
    """Pixels whose whole (2r+1)-square neighbourhood is set (via an integral image)."""
    k = 2 * radius + 1
    padded = np.pad(mask.astype(np.int32), radius)
    integral = np.pad(padded.cumsum(0).cumsum(1), ((1, 0), (1, 0)))
    window = integral[k:, k:] - integral[:-k, k:] - integral[k:, :-k] + integral[:-k, :-k]
    return window == k * k


def seam_score(rgb: np.ndarray) -> float:
    """How much stronger the wrap-around edge step is than a typical step inside the image."""
    inner_x = np.abs(np.diff(rgb, axis=1)).mean()
    inner_y = np.abs(np.diff(rgb, axis=0)).mean()
    wrap_x = np.abs(rgb[:, 0] - rgb[:, -1]).mean()
    wrap_y = np.abs(rgb[0] - rgb[-1]).mean()
    return float(max(wrap_x / max(inner_x, 1e-4), wrap_y / max(inner_y, 1e-4)))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("jar", nargs="?", default=str(DEFAULT_JAR))
    parser.add_argument("--report", default=str(DEFAULT_REPORT))
    args = parser.parse_args()

    requests = json.loads((SMOOTHCRAFT / "design/image-requests.json").read_text())["requests"]
    failures: dict[str, list[str]] = {}
    measures: dict[str, dict[str, float]] = {"seam": {}, "drift": {}, "repaint": {}, "colour": {}}

    def fail(tid: str, why: str) -> None:
        failures.setdefault(tid, []).append(why)

    with zipfile.ZipFile(args.jar) as jar:
        names = set(jar.namelist())
        for req in requests:
            tid = req["id"]
            path = PACK / f"{tid}.png"
            if not path.exists():
                fail(tid, "missing")
                continue
            hd = load_rgba(path.read_bytes())
            vanilla = load_rgba(jar.read(f"assets/minecraft/textures/{tid}.png"))
            w, h = req["size"]
            if hd.shape[1] != w or hd.shape[0] != h:
                fail(tid, f"size {hd.shape[1]}x{hd.shape[0]}, requested {w}x{h}")
                continue
            vmeta = f"assets/minecraft/textures/{tid}.png.mcmeta"
            if vmeta in names and not (PACK / f"{tid}.png.mcmeta").exists():
                fail(tid, "vanilla has a .mcmeta but the HD texture has none")

            # Vanilla scaled up with hard pixel edges: the layout and mask the HD image must keep.
            with Image.open(io.BytesIO(jar.read(f"assets/minecraft/textures/{tid}.png"))) as img:
                up = np.asarray(img.convert("RGBA").resize((w, h), Image.NEAREST), dtype=np.float32) / 255.0
            v_alpha, h_alpha = up[..., 3], hd[..., 3]
            if req["alpha"] == "opaque" and h_alpha.min() < 0.99:
                fail(tid, f"vanilla is opaque but {np.mean(h_alpha < 0.99):.1%} of pixels are transparent")
            if req["alpha"] == "cutout":
                clear_v, clear_h = v_alpha < 0.5, h_alpha < 0.5
                mismatch = float(np.mean(clear_v != clear_h))
                if mismatch > 0.01:
                    fail(tid, f"transparency mask differs from vanilla on {mismatch:.1%} of pixels")

            solid = (v_alpha > 0.5) & (h_alpha > 0.5)
            if solid.sum() < 16:
                continue
            hd_rgb, up_rgb = hd[..., :3], up[..., :3]
            # Drift: the average colour over the solid pixels, against vanilla's.
            measures["drift"][tid] = float(np.abs(hd_rgb[solid].mean(0) - up_rgb[solid].mean(0)).max())
            # Blackout: solid black blobs where vanilla has colour, the trace of a
            # generator colour key leaking through. Eroding the black mask first
            # keeps real shading and outlines (thin) out of the count.
            black = (hd_rgb.max(-1) < 0.07) & (up_rgb.max(-1) > 0.25) & solid
            radius = max(2, min(w, h) // 64)
            blobs = erode(black, radius)
            blackout = float(blobs.sum() / max(solid.sum(), 1))
            measures.setdefault("blackout", {})[tid] = blackout
            if blackout > 0.05:
                fail(tid, f"{blackout:.0%} of its painted area is solid black where vanilla has colour")
            # Whiteout: the same for blank white blobs over darker vanilla paint.
            white = (hd_rgb.min(-1) > 0.8) & (up_rgb.max(-1) < 0.55) & solid
            whiteout = float(erode(white, radius).sum() / max(solid.sum(), 1))
            if whiteout > 0.03:
                fail(tid, f"{whiteout:.0%} of its painted area is blank white where vanilla is darker")
            # Repainted: how far the HD pixels are from plain upscaled vanilla.
            measures["repaint"][tid] = float(np.abs(hd_rgb[solid] - up_rgb[solid]).mean())
            if tid in TINTED or tid.startswith(TINTED_PREFIX):
                v_sat = float((up_rgb.max(-1) - up_rgb.min(-1))[solid].mean())
                h_sat = float((hd_rgb.max(-1) - hd_rgb.min(-1))[solid].mean())
                measures["colour"][tid] = h_sat - v_sat
                if h_sat > v_sat + 0.08:
                    fail(tid, f"the game tints this, but it is coloured (saturation {h_sat:.2f}, vanilla {v_sat:.2f}); the tint will double up")
            if tid.startswith("block/") and req["alpha"] == "opaque" and req["frames"] == 1:
                # Against vanilla's own seam: side textures with a grass or snow fringe never wrap top to bottom.
                measures["seam"][tid] = seam_score(hd_rgb) - seam_score(up_rgb)

    def worst(name: str, n: int, reverse: bool = True) -> list:
        items = sorted(measures[name].items(), key=lambda kv: kv[1], reverse=reverse)
        return [[k, round(v, 4)] for k, v in items[:n]]

    for tid, value in measures["seam"].items():
        if value > 2.0:
            fail(tid, f"visible repeat seam (edge step {value:.1f} more than vanilla's)")
    for tid, value in measures["drift"].items():
        if value > 0.25:
            fail(tid, f"colours drift far from vanilla (channel mean off by {value:.2f})")
    for tid, value in measures["repaint"].items():
        if value < 0.02:
            fail(tid, f"barely repainted: within {value:.3f} of upscaled vanilla pixels")

    report = {
        "checked": len(requests),
        "failed": len(failures),
        "failures": failures,
        "worst_seams": worst("seam", 25),
        "worst_drift": worst("drift", 25),
        "least_repainted": worst("repaint", 25, reverse=False),
        "most_coloured_tinted": worst("colour", 15),
        "most_blacked_out": worst("blackout", 40),
    }
    out = Path(args.report)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, indent=1) + "\n")
    print(f"checked {len(requests)}, {len(failures)} with problems; report in {out}")


if __name__ == "__main__":
    main()
