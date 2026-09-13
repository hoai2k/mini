"""Native-detail check: does a painting carry detail at the size it ships at?

An upscaled painting survives being halved and re-expanded almost unchanged,
because the detail it would lose is not there. A natively painted file does
not. So halve the image, expand it back with the same filter and measure the
RMS difference in grey levels: an upscale lands under one, real paint lands
well above it.

Calibration in this repo: the upscaled skies score 0.58-0.84, natively painted
reference plates and sprite atlases score 7-14, and the terrain albedos - native
paint exported larger - sit near 2. The acceptance rule fails skies under 3.0,
which the dome magnifies several times over at 4K. Other files are measured but
not failed, because flatness is the style in places (horizon silhouettes, decals)
and a low score there means flat art, not an upscale.

    python3 hopper/3d/design/source/verify_native_detail.py            # the sky set
    python3 hopper/3d/design/source/verify_native_detail.py a.png b.jpg

Writes hopper/3d/textures/native-detail.json and exits non-zero on a failure.
Needs Pillow.
"""
from PIL import Image, ImageChops
from datetime import datetime, timezone
import json
import math
import pathlib
import sys

TEXTURES = pathlib.Path(__file__).resolve().parents[2] / 'textures'
SKY_LIMIT = 3.0


def detail_rms(image, factor=2):
    """RMS grey-level cost of throwing away detail above 1/factor resolution."""
    w, h = image.size
    small = image.resize((w // factor, h // factor), Image.LANCZOS).resize((w, h), Image.LANCZOS)
    values = ImageChops.difference(image, small).tobytes()
    return round(math.sqrt(sum(v * v for v in values) / len(values)), 3)


def main(argv):
    paths = [pathlib.Path(a) for a in argv] or sorted(TEXTURES.glob('sky/*-preview.jpg')) + sorted(TEXTURES.glob('sky/*-hd.jpg'))
    results, failures = {}, []
    for path in paths:
        image = Image.open(path).convert('L')
        sky = 'sky/' in path.as_posix()
        half, quarter = detail_rms(image, 2), detail_rms(image, 4)
        name = path.as_posix().split('textures/')[-1]
        results[name] = {'size': list(image.size), 'halfRms': half, 'quarterRms': quarter,
                         'limit': SKY_LIMIT if sky else None, 'native': half >= SKY_LIMIT}
        if sky and half < SKY_LIMIT:
            failures.append(f'{name}: {half} RMS at half size, under the {SKY_LIMIT} bar - '
                            f'no real detail above {image.size[0] // 2}px, so this is an upscale')
    report = {'checkedAt': datetime.now(timezone.utc).date().isoformat(),
              'check': 'RMS grey-level cost of halving and re-expanding; an upscale loses almost nothing',
              'skyLimit': SKY_LIMIT, 'skiesOnly': 'only skies are failed; elsewhere flat art scores low by style',
              'failures': failures, 'results': results}
    (TEXTURES / 'native-detail.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({'files': len(results), 'failures': len(failures)}))
    for failure in failures:
        print('FAIL', failure)
    return 1 if failures else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
