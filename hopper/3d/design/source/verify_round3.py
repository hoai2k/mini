"""Round-three texture checks: tiling, atlas padding, alpha.

The round-three delivery landed with `awaiting-verification` because these
checks were still due. `validate-textures.cjs` covers dimensions, terrain/trim
seams and alpha, but nothing under `surface/` and no atlas padding, which is
what round three added. Run from anywhere:

    python3 hopper/3d/design/source/verify_round3.py

Writes hopper/3d/textures/round3/verification.json and exits non-zero on a
failure. Needs Pillow.
"""
from PIL import Image
import json
import pathlib
import sys

TEXTURES = pathlib.Path(__file__).resolve().parents[2] / 'textures'
# A tiling texture's opposite edges should differ no more than the repo's own
# terrain/trim threshold in validate-textures.cjs.
SEAM_LIMIT = 2.0
TILEABLE = ['surface/sea.png', 'surface/dust.png', 'surface/slag.png',
            'surface/sea-detail.png', 'surface/dust-detail.png', 'surface/slag-detail.png']
# path, columns, rows, authored cell size, padding the prompt asked for
ATLASES = [('effects/hopper.png', 4, 4, 512, 48), ('ui/props.png', 2, 2, 256, 24)]


def seams(image):
    """Mean per-channel difference between opposite edges."""
    w, h = image.size
    px = image.load()
    x = sum(abs(px[0, y][c] - px[w - 1, y][c]) for y in range(h) for c in range(3)) / (h * 3)
    y = sum(abs(px[c0, 0][c] - px[c0, h - 1][c]) for c0 in range(w) for c in range(3)) / (w * 3)
    return round(x, 3), round(y, 3)


def cell_padding(image, columns, rows, cell, required):
    """Smallest clear margin around any cell's opaque content, in cell pixels."""
    w, h = image.size
    scale = w / (columns * cell)
    px = image.load()
    worst, empty, under = float(cell), [], []
    for row in range(rows):
        for column in range(columns):
            x0, y0 = int(column * cell * scale), int(row * cell * scale)
            x1, y1 = int((column + 1) * cell * scale), int((row + 1) * cell * scale)
            marks = [(x, y) for y in range(y0, y1, 2) for x in range(x0, x1, 2) if px[x, y][3] > 8]
            if not marks:
                empty.append([column, row])
                continue
            margin = min(min(x - x0 for x, _ in marks), min(x1 - 1 - x for x, _ in marks),
                         min(y - y0 for _, y in marks), min(y1 - 1 - y for _, y in marks)) / scale
            worst = min(worst, margin)
            if margin < required:
                under.append({'cell': [column, row], 'paddingPx': round(margin, 1)})
    return round(worst, 1), empty, under


def main():
    results, failures = {}, []
    for name in TILEABLE:
        image = Image.open(TEXTURES / name).convert('RGB')
        x, y = seams(image)
        tiles = x <= SEAM_LIMIT and y <= SEAM_LIMIT
        results[name] = {'size': list(image.size), 'seamX': x, 'seamY': y,
                         'seamLimit': SEAM_LIMIT, 'tiles': tiles}
        if not tiles:
            failures.append(f'{name}: opposite edges differ (x={x}, y={y}, limit {SEAM_LIMIT})')

    name = 'surface/shoreline-foam.png'
    image = Image.open(TEXTURES / name).convert('RGBA')
    w, h = image.size
    px = image.load()
    x = round(sum(abs(px[0, y][c] - px[w - 1, y][c]) for y in range(h) for c in range(4)) / (h * 4), 3)
    margin = int(h * 0.12)
    top = max(px[c, y][3] for y in range(margin) for c in range(w))
    bottom = max(px[c, y][3] for y in range(h - margin, h) for c in range(w))
    clear = top < 8 and bottom < 8
    results[name] = {'size': [w, h], 'seamX': x, 'seamLimit': SEAM_LIMIT,
                     'tilesHorizontally': x <= SEAM_LIMIT,
                     'topMarginAlphaMax': top, 'bottomMarginAlphaMax': bottom, 'clearMargins': clear}
    if x > SEAM_LIMIT:
        failures.append(f'{name}: does not tile horizontally (x={x}, limit {SEAM_LIMIT})')
    if not clear:
        failures.append(f'{name}: foam reaches the vertical margins (top {top}, bottom {bottom} alpha)')

    for name, columns, rows, cell, required in ATLASES:
        image = Image.open(TEXTURES / name).convert('RGBA')
        worst, empty, under = cell_padding(image, columns, rows, cell, required)
        low, high = image.getchannel('A').getextrema()
        results[name] = {'size': list(image.size), 'grid': [columns, rows],
                         'filledCells': columns * rows - len(empty), 'emptyCells': empty,
                         'minPaddingPx': worst, 'requiredPaddingPx': required,
                         'cellsUnderPadding': under, 'alpha': [low, high]}
        if under:
            failures.append(f'{name}: {len(under)} of {columns * rows - len(empty)} cells are inside '
                            f'the {required}px padding (smallest {worst}px)')
        if low != 0 or high <= 100:
            failures.append(f'{name}: alpha range {low}-{high}')

    name = 'ui/landing-guide-light.png'
    light = Image.open(TEXTURES / name).convert('RGBA')
    dark = Image.open(TEXTURES / 'ui/landing-guide.png').convert('RGBA')
    low, high = light.getchannel('A').getextrema()
    covered = [sum(1 for value in im.getchannel('A').tobytes() if value > 8) for im in (light, dark)]
    ratio = round(covered[0] / covered[1], 3) if covered[1] else 0
    same = light.size == dark.size and 0.8 < ratio < 1.25
    results[name] = {'size': list(light.size), 'alpha': [low, high],
                     'coverageRatioVsDark': ratio, 'matchesDarkGuide': same}
    if not same or low != 0 or high <= 100:
        failures.append(f'{name}: alpha {low}-{high}, coverage ratio {ratio}')

    report = {'checkedAt': '2026-09-09', 'checks': 'tiling, atlas padding, alpha',
              'failures': failures, 'results': results}
    out = TEXTURES / 'round3' / 'verification.json'
    out.write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({'files': len(results), 'failures': len(failures)}))
    for failure in failures:
        print('  FAIL', failure)
    return 1 if failures else 0


if __name__ == '__main__':
    sys.exit(main())
