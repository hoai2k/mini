"""Candidate-only seam repair for existing generated Round 3 paintings.

Run only after authorization for deterministic image processing. Originals are
read-only. Feathers opposite edge discrepancies over a narrow boundary band,
keeping the interior paint, then derives registered scalar detail from albedo.
Foam is repaired in premultiplied alpha and placed inside clear vertical margins.
Inspect 3x3 repeat previews before accepting; zero edge difference alone does
not establish artistic quality.

    python3 hopper/3d/design/source/repair_surface_seams.py
"""
from pathlib import Path
import json

import numpy as np
from PIL import Image

TEXTURES = Path(__file__).resolve().parents[2] / 'textures'
REPO = Path(__file__).resolve().parents[4]
OUT = REPO / 'local/hopper-image-repairs'


def close_axis(values, axis, fraction=.10):
    """Match opposite edges with a C1 smooth feather confined to boundary bands."""
    a = np.swapaxes(values.copy(), axis, 0)
    span = max(8, round(a.shape[0] * fraction))
    delta = (a[0] - a[-1]) * .5
    t = np.linspace(0, 1, span, dtype=np.float32)
    weight = 1 - t * t * (3 - 2 * t)
    weight = weight.reshape((span,) + (1,) * delta.ndim)
    a[:span] -= weight * delta
    a[-span:] += weight[::-1] * delta
    return np.swapaxes(a, axis, 0)


def periodic(image, horizontal_only=False):
    rgba = image.mode == 'RGBA'
    # Work in explicit premultiplied space so transparent RGB cannot bleed in.
    work = image.convert('RGBa') if rgba else image.convert('RGB')
    a = np.asarray(work, dtype=np.float32)
    a = close_axis(a, 1)
    if not horizontal_only:
        a = close_axis(a, 0)
    a = np.clip(np.rint(a), 0, 255).astype(np.uint8)
    if rgba:
        a[..., :3] = np.minimum(a[..., :3], a[..., 3:4])
    result = Image.fromarray(a, 'RGBa' if rgba else 'RGB')
    return result.convert('RGBA') if rgba else result


def repeat_preview(image, name, repeats=3):
    small = image.copy()
    small.thumbnail((384, 384))
    canvas = Image.new('RGBA', (small.width * repeats, small.height * repeats), '#283747')
    for y in range(repeats):
        for x in range(repeats):
            canvas.alpha_composite(small.convert('RGBA'), (x * small.width, y * small.height))
    canvas.convert('RGB').save(OUT / f'{name}-repeat.jpg', quality=92)


def main():
    dest = OUT / 'surface'
    dest.mkdir(parents=True, exist_ok=True)
    report = {'method': 'opposite-edge feather, 10% bands; registered luminance detail',
              'sourceArtwork': 'existing built-in imagegen paintings', 'assets': []}
    for key in ('sea', 'dust', 'slag'):
        original = Image.open(TEXTURES / 'surface' / f'{key}.png').convert('RGB')
        if original.size != (2048, 2048):
            raise ValueError(f'{key}: unexpected source dimensions {original.size}')
        albedo = periodic(original)
        albedo.save(dest / f'{key}.png')
        # Scalar maps must register with the painted features, so derive instead
        # of inventing a second independently generated field of shapes.
        detail = albedo.convert('L').resize((512, 512), Image.Resampling.LANCZOS)
        detail = periodic(detail).convert('L')
        detail.save(dest / f'{key}-detail.png')
        repeat_preview(original, f'{key}-before')
        repeat_preview(albedo, f'{key}-after')
        report['assets'].append({'key': key, 'albedo': [2048, 2048], 'detail': [512, 512]})
    foam = Image.open(TEXTURES / 'surface/shoreline-foam.png').convert('RGBA')
    foam = periodic(foam, horizontal_only=True)
    # Preserve horizontal repeat and scale only vertical extent to restore the
    # 12% clear top/bottom margins, with 8 pixels extra filter safety.
    h = 256 - 2 * (int(256 * .12) + 8)
    strip = foam.convert('RGBa').resize((1024, h), Image.Resampling.LANCZOS).convert('RGBA')
    padded = Image.new('RGBA', (1024, 256))
    padded.alpha_composite(strip, (0, (256 - h) // 2))
    padded.save(dest / 'shoreline-foam.png')
    repeat_preview(padded, 'foam-after')
    (OUT / 'surface-repair.json').write_text(json.dumps(report, indent=2) + '\n')
    print(f'Candidates and repeat previews: {OUT}')


if __name__ == '__main__':
    main()
