"""Prepare mechanically repacked round-three alpha atlases.

This is intentionally a candidate generator: it never overwrites the published
files.  It preserves the fixed grid and each source cell's center, then applies
one uniform shrink per atlas so occupied cells clear the requested padding plus
``--safety`` pixels.  Resize is done in premultiplied-alpha space to avoid dark
fringes.  Example (after review/authorization):

    python3 repack_round3.py --dry-run
    python3 repack_round3.py --output-dir ../../../../local/hopper-image-repairs

Candidates are written below the selected output directory only.  Pillow is
required; the default paths point at the published production atlases.
"""
from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


# ``source/`` → ``design/`` → ``3d/``; keep paths anchored to this edition.
ROOT = Path(__file__).resolve().parents[2]
DEFAULTS = {
    "effects": (ROOT / "textures/effects/hopper.png", 4, 4, 512, 48,
                {(x, y) for y in (0, 1, 2) for x in range(4)}),
    "props": (ROOT / "textures/ui/props.png", 2, 2, 256, 24,
              {(0, 0), (1, 0), (0, 1), (1, 1)}),
}


def occupied_bbox(image: Image.Image, x0: int, y0: int, x1: int, y1: int):
    alpha = image.getchannel("A").crop((x0, y0, x1, y1))
    return alpha.point(lambda value: 255 if value > 8 else 0).getbbox()


def premultiplied_resize(cell: Image.Image, scale: float) -> Image.Image:
    """Scale a cell around its center while retaining straight-alpha output."""
    w, h = cell.size
    # Pillow's RGBa mode explicitly stores premultiplied channels. RGBA.resize
    # already premultiplies internally; manually doing both darkens the edges.
    premul = cell.convert("RGBa")
    nw, nh = max(1, round(w * scale)), max(1, round(h * scale))
    resized = premul.resize((nw, nh), Image.Resampling.LANCZOS).convert("RGBA")
    out = Image.new("RGBA", (w, h))
    out.alpha_composite(resized, ((w - nw) // 2, (h - nh) // 2))
    return out


def inspect(kind: str, path: Path, columns: int, rows: int, cell: int,
            required: int, expected: set[tuple[int, int]], safety: int):
    image = Image.open(path).convert("RGBA")
    expected_size = (columns * cell, rows * cell)
    if image.size != expected_size:
        raise ValueError(f"{kind}: {path} is {image.size}, expected {expected_size}")
    actual = set()
    boxes = {}
    for y in range(rows):
        for x in range(columns):
            box = occupied_bbox(image, x * cell, y * cell,
                                (x + 1) * cell, (y + 1) * cell)
            if box:
                actual.add((x, y))
                boxes[(x, y)] = box
    if actual != expected:
        raise ValueError(f"{kind}: occupied cells {sorted(actual)} != expected {sorted(expected)}")
    target = required + safety
    factors = []
    margins = {}
    for (x, y), (bx0, by0, bx1, by1) in boxes.items():
        # Account for off-centre art without re-centering animation frames.
        radius = max(cell / 2 - bx0, cell / 2 - by0,
                     bx1 - cell / 2, by1 - cell / 2)
        factors.append((cell / 2 - target) / radius)
        margins[(x, y)] = min(bx0, by0, cell - bx1, cell - by1)
    scale = min(1.0, min(factors))
    print(f"{kind}: {path} size={image.size} occupied={len(actual)} "
          f"min-margin={min(margins.values()):.1f}px target={target}px "
          f"uniform-scale={scale:.4f}")
    return image, scale


def repack(image: Image.Image, columns: int, rows: int, cell: int,
           scale: float) -> Image.Image:
    output = Image.new("RGBA", image.size, (0, 0, 0, 0))
    for y in range(rows):
        for x in range(columns):
            left, top = x * cell, y * cell
            source = image.crop((left, top, left + cell, top + cell))
            if source.getchannel("A").getextrema()[1] <= 8:
                continue
            output.alpha_composite(premultiplied_resize(source, scale), (left, top))
    return output


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--effects", type=Path, default=DEFAULTS["effects"][0])
    parser.add_argument("--props", type=Path, default=DEFAULTS["props"][0])
    parser.add_argument("--output-dir", type=Path,
                        default=Path("local/hopper-image-repairs"))
    parser.add_argument("--safety", type=int, default=4)
    parser.add_argument("--dry-run", action="store_true",
                        help="print planned metrics without writing candidates")
    args = parser.parse_args()
    if args.safety < 0:
        parser.error("--safety must be non-negative")
    specs = [("effects", args.effects, "effects/hopper.png"),
             ("props", args.props, "ui/props.png")]
    inspected = []
    for kind, path, relative in specs:
        _, columns, rows, cell, required, expected = DEFAULTS[kind]
        image, scale = inspect(kind, path, columns, rows, cell, required,
                               expected, args.safety)
        inspected.append((image, columns, rows, cell, scale, relative))
    if args.dry_run:
        print("dry-run: no candidate atlases written")
        return 0
    for image, columns, rows, cell, scale, relative in inspected:
        destination = args.output_dir / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        repack(image, columns, rows, cell, scale).save(destination, "PNG")
        print(f"wrote candidate {destination}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
