#!/usr/bin/env python3
"""Cut the delivered art into the game's web sprites.

    python3 onemonster/tools/build_sprites.py            # write game/sprites/ and game/src/sprites.js
    python3 onemonster/tools/build_sprites.py --check    # only report, write nothing

The delivered sheets in game/assets/ are the sources and are not published. This
cuts every key pose, prop and cast sprite out of its sheet, trims it, scales it to
the size the game draws it and saves it as WebP in game/sprites/<sheet>/NN.webp; it
also writes web copies of the portraits and the UI art, and the manifest
game/src/sprites.js that the game reads.

Slicing: an item is the set of the sheet's opaque islands whose centre lies inside
the item's rectangle (so a neighbour's wing that reaches into the rectangle stays
with its owner), or, for an item marked "clip", every opaque pixel inside it. The
rectangles come from tools/slices.json, written by hand after looking at the sheet
(see its README entry), or else are found automatically: the sheet's figures in
reading order, which is used only when their number matches the request's list.
A sheet that fits neither is reported and left out.

The game does not use the parts sheets: monsters animate from their key poses,
with a few single pieces from the swaps sheets (see design.md, "Sprites and
animation"). Needs numpy, scipy and Pillow.
"""

from __future__ import annotations

import importlib.util
import json
import shutil
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
GAME = ROOT / "game"
WEB = GAME / "sprites"
MANIFEST = GAME / "src" / "sprites.js"
SLICES = ROOT / "tools" / "slices.json"

spec = importlib.util.spec_from_file_location("br", ROOT / "design" / "source" / "build_requests.py")
br = importlib.util.module_from_spec(spec)
spec.loader.exec_module(br)

sys.path.insert(0, str(ROOT / "tools"))
import compose_title  # noqa: E402
import scene_front  # noqa: E402

# Longest side, in pixels, of the biggest item on each kind of sheet; the rest of
# the sheet keeps its scale relative to it. About twice what the game draws on a
# 1920 x 1080 screen, so it stays sharp on high-density displays.
SIZES = {"poses": 720, "moves": 720, "props": 360, "cast": 480, "swaps": 480, "terrain": 1400}
# Single images: (source, output, longest side).
IMAGES = [("assets/ui/logo.png", "ui/logo.webp", 1600),
          ("assets/ui/icon.png", "ui/icon.webp", 512),
          ("assets/ui/letter.png", "ui/letter.webp", 384),
          ("assets/ui/postmark.png", "ui/postmark.webp", 384)]
# Use the delivered title painting; compose a fallback only for a redo request.
if "OM-U02" not in br.REDO:
    IMAGES.append(("assets/ui/title-bg.webp", "ui/title-bg.webp", 1920))
IMAGES += [(f"assets/monsters/{m['id']}/portrait.png", f"portraits/{m['id']}.webp", 768)
           for m in br.MONSTERS]
IMAGES += [(f"assets/scenes/{m['id']}.webp", f"scenes/{m['id']}.webp", 1920) for m in br.MONSTERS]
IMAGES += [(f"assets/story/{s}.webp", f"story/{s}.webp", 1920) for s in ("prologue", "mailman", "lucyjane")]
# The minigames' how-to-play pictures.
IMAGES += [(f"assets/howto/ch{n:02d}-{k}.webp", f"howto/ch{n:02d}-{k}.webp", 1024) for n in br.HOWTO for k in (1, 2, 3)]
# The Adventure's backdrop panels (design/adventure.md).
IMAGES += [(f"assets/adventure/b{b['n']:02d}/backdrop-{k}.webp", f"adv/b{b['n']:02d}/backdrop-{k}.webp", 1920)
           for b in br.BOARDS for k in (1, 2, 3)]
# Colour fixes for single items: sheet key -> {item number: hue in degrees}.
RECOLOUR = {"props.grumley": {6: 205}}  # the goo ring came out olive; the goo is blue


def sheets() -> list[dict]:
    out = [{"key": f"{m['id']}.poses", "kind": "poses", "file": f"assets/monsters/{m['id']}/poses.png",
            "items": br.RIGS[m["id"]]["poses"]} for m in br.MONSTERS]
    # Single swap pieces the game uses (the Yalapappus rolled into a ball).
    out.append({"key": "yalapappus.swaps", "kind": "swaps", "file": "assets/monsters/yalapappus/swaps.png",
                "items": br.RIGS["yalapappus"]["swaps"]})
    out += [{"key": f"props.{mid}", "kind": "props", "file": f"assets/props/{mid}.png", "items": items}
            for mid, _view, items in br.PROPS]
    # The Adventure: each monster's new poses, each board's props, each place's ground.
    out += [{"key": f"{mid}.moves", "kind": "moves", "file": f"assets/monsters/{mid}/moves.png", "items": items}
            for mid, items in br.MOVES.items()]
    out += [{"key": f"adv.b{b['n']:02d}.props", "kind": "props", "file": f"assets/adventure/b{b['n']:02d}/props.png",
             "items": b["props"]} for b in br.BOARDS]
    out += [{"key": f"terrain.{pid}", "kind": "terrain", "file": f"assets/adventure/terrain/{pid}.png", "items": items}
            for pid, _name, _ref, items in br.TERRAIN]
    out.append({"key": "cast", "kind": "cast", "file": "assets/cast/sprites.png", "items": [
        "Sally Ann at her window, looking out", "Sally Ann at her window, turned away writing",
        "the neighbour peering over her spectacles", "the neighbour dozing",
        "the dog staring", "the dog asleep", "the mailman on his motorcycle",
        "the mailman mid-bounce", "the captain throwing the bottle from the raft",
        "the sailors paddling, paddles forward", "the sailors paddling, paddles back",
        "Lucy Jane walking, reading the letter"]})
    return out


def figures(alpha: np.ndarray) -> list[list[int]]:
    """Whole figures (a flying hat or a dust cloud joined to its owner), in reading order."""
    mask = alpha > 24
    lab, _ = ndimage.label(ndimage.binary_dilation(mask, iterations=14))
    figs = []
    for i, sl in enumerate(ndimage.find_objects(lab), start=1):
        part = (lab[sl] == i) & mask[sl]
        if part.sum() < mask.size * 0.002:
            continue
        ys, xs = np.nonzero(part)
        figs.append([sl[1].start + int(xs.min()), sl[0].start + int(ys.min()),
                     int(xs.max() - xs.min() + 1), int(ys.max() - ys.min() + 1)])
    figs.sort(key=lambda r: (r[1] + r[3] / 2) // 300 * 10000 + r[0])
    return figs


def cut(rgba: np.ndarray, islands, centres, item: dict) -> np.ndarray:
    x, y, w, h = item["rect"]
    if item.get("clip"):
        out = np.zeros_like(rgba)
        out[y:y + h, x:x + w] = rgba[y:y + h, x:x + w]
        # Drop the slivers of neighbours the rectangle caught: small pieces
        # that touch its edge.
        sub = out[y:y + h, x:x + w]
        lab2, k2 = ndimage.label(ndimage.binary_dilation(sub[..., 3] > 24, iterations=2))
        total = (sub[..., 3] > 24).sum()
        for i, sl in enumerate(ndimage.find_objects(lab2), start=1):
            touches = sl[0].start == 0 or sl[1].start == 0 or sl[0].stop == h or sl[1].stop == w
            if touches and ((lab2[sl] == i) & (sub[sl][..., 3] > 24)).sum() < total * 0.06:
                sub[lab2 == i] = 0
    else:
        keep = [i + 1 for i, (cy, cx) in enumerate(centres) if x <= cx < x + w and y <= cy < y + h]
        out = rgba * np.isin(islands, keep)[..., None]
    ys, xs = np.nonzero(out[..., 3] > 8)
    return out[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


def recolour(im: Image.Image, hue: float) -> Image.Image:
    rgba = np.array(im)
    hsv = np.array(Image.fromarray(rgba[..., :3]).convert("HSV"))
    hsv[..., 0] = np.where(hsv[..., 1] > 38, int(hue / 360 * 255), hsv[..., 0])
    rgb = np.array(Image.fromarray(hsv, "HSV").convert("RGB"))
    return Image.fromarray(np.dstack([rgb, rgba[..., 3]]))


def clean_alpha(rgba: np.ndarray) -> np.ndarray:
    """The generator leaves faint haze around figures (alpha 1-8) and figures a
    shade see-through (alpha 240-254): clear the one, make the other solid."""
    a = rgba[..., 3]
    a[a <= 8] = 0
    a[a >= 240] = 255
    return rgba


def slice_sheet(s: dict, hand: dict):
    rgba = clean_alpha(np.array(Image.open(GAME / s["file"]).convert("RGBA")))
    n = len(s["items"])
    if s["file"] in hand:
        items, how = hand[s["file"]], "by hand"
    else:
        figs = figures(rgba[..., 3])
        if len(figs) != n:
            return None, f"found {len(figs)} figures, the list has {n}: map it in tools/slices.json"
        items, how = [{"rect": r} for r in figs], "figures"
    if len(items) != n:
        return None, f"tools/slices.json has {len(items)} items, the list has {n}"
    lab, k = ndimage.label(ndimage.binary_dilation(rgba[..., 3] > 24, iterations=3))
    lab = lab * (rgba[..., 3] > 8)
    centres = ndimage.center_of_mass(np.ones_like(lab), lab, range(1, k + 1))
    return [cut(rgba, lab, centres, it) for it in items], how


def main() -> int:
    write = "--check" not in sys.argv
    hand = json.loads(SLICES.read_text()) if SLICES.exists() else {}
    manifest, problems = {"sheets": {}, "images": {}}, []
    if write and WEB.exists():
        shutil.rmtree(WEB)
    for s in sheets():
        if not (GAME / s["file"]).exists():
            continue
        cuts, how = slice_sheet(s, hand)
        if cuts is None:
            problems.append(f"{s['key']}: {how}")
            continue
        scale = SIZES[s["kind"]] / max(max(c.shape[:2]) for c in cuts)
        # scale: web pixels per delivered pixel, so sheets drawn at one scale
        # (a monster's poses and its moves) can be matched in the game.
        entry = {"names": s["items"], "scale": round(scale, 5), "items": []}
        for i, c in enumerate(cuts, start=1):
            im = Image.fromarray(c)
            im = im.resize((max(1, round(im.width * scale)), max(1, round(im.height * scale))), Image.LANCZOS)
            if i in RECOLOUR.get(s["key"], {}):
                im = recolour(im, RECOLOUR[s["key"]][i])
            rel = f"sprites/{s['key'].replace('.', '/')}/{i:02d}.webp"
            if write:
                (GAME / rel).parent.mkdir(parents=True, exist_ok=True)
                im.save(GAME / rel, "WEBP", quality=88, method=6)
            entry["items"].append({"src": rel, "w": im.width, "h": im.height})
        manifest["sheets"][s["key"]] = entry
        print(f"{s['key']:22} {how:8} {len(cuts)} sprites")
    for src, dst, side in IMAGES:
        if not (GAME / src).exists():
            continue
        im = Image.open(GAME / src)
        if im.mode == "RGBA":
            im = Image.fromarray(clean_alpha(np.array(im)))
        im.thumbnail((side, side), Image.LANCZOS)
        rel = f"sprites/{dst}"
        if write:
            (GAME / rel).parent.mkdir(parents=True, exist_ok=True)
            im.save(GAME / rel, "WEBP", quality=86, method=6)
        manifest["images"][dst.rsplit(".", 1)[0]] = {"src": rel, "w": im.width, "h": im.height}
    # Derived images: composed or cut from the sprites above.
    for mod in ((compose_title,) if "OM-U02" in br.REDO else ()) + (scene_front,):
        out, w, h = mod.build(write)
        rel = out.relative_to(GAME).as_posix()
        manifest["images"][rel[len("sprites/"):].rsplit(".", 1)[0]] = {"src": rel, "w": w, "h": h}
    if write:
        MANIFEST.write_text(
            "// Generated by onemonster/tools/build_sprites.py from the delivered art. Do not edit\n"
            "// by hand. sheets: each sheet's sprites, in the order of its request's list (names).\n"
            "// images: single images by name. Paths are relative to the game's index.html.\n"
            "export const SPRITES = " + json.dumps(manifest, indent=1) + ";\n")
    for p in problems:
        print("problem:", p)
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
