"""Finish reviewed imagegen seam repaints with a trivial eight-pixel wrap correction.

Supply native square sea/dust/slag PNGs in that order. Writes candidates only.
Native paintings remain in the imagegen archive; 2048 exports do not imply
native 2K detail. Unlike the rejected 10% feather, this touches only 8px bands.
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image
from repair_surface_seams import close_axis, repeat_preview, OUT


def close(image):
    a = np.asarray(image.convert('RGB'), dtype=np.float32)
    a = close_axis(close_axis(a, 1, 8 / image.width), 0, 8 / image.height)
    return Image.fromarray(np.clip(np.rint(a), 0, 255).astype(np.uint8))


def main(paths):
    if len(paths) != 3:
        raise SystemExit('Supply sea, dust and slag native repaint paths.')
    destination = OUT / 'repainted-surfaces'
    destination.mkdir(parents=True, exist_ok=True)
    for key, path in zip(('sea', 'dust', 'slag'), paths):
        source = Image.open(path).convert('RGB')
        if source.width != source.height:
            raise ValueError(f'{key}: expected square native painting')
        albedo = close(source.resize((2048, 2048), Image.Resampling.LANCZOS))
        albedo.save(destination / f'{key}.png')
        detail = close(albedo.convert('L').resize((512, 512), Image.Resampling.LANCZOS)).convert('L')
        detail.save(destination / f'{key}-detail.png')
        repeat_preview(albedo, f'{key}-final')
        print(key, 'native', source.size, 'export', albedo.size)


if __name__ == '__main__':
    main(sys.argv[1:])
