#!/usr/bin/env python3
"""Check texture dimensions, vanilla alpha masks, animation metadata and seams.

Numeric checks cannot establish albedo quality or faithful UV features. Those
still require a visual review. --complete also fails for every missing request.
"""
import argparse
import hashlib
import json
import zipfile
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
CATALOG = ROOT / 'smoothcraft/design/image-requests.json'
DEFAULT_PACK = ROOT / 'smoothcraft/mod/src/main/resources/resourcepacks/hd/assets/minecraft/textures'
DEFAULT_REFERENCES = ROOT / 'local/smoothcraft/references'


def repeat_axes(texture_id):
    if texture_id in ('entity/end_portal/end_portal', 'entity/end_portal/end_gateway_beam'):
        # These are scrolling shader materials, rather than model UV nets.
        return 'xy'
    if not texture_id.startswith('block/'):
        return ''
    if texture_id in ('block/grass_block_side', 'block/grass_block_snow', 'block/grass_block_side_overlay',
                      'block/mycelium_side', 'block/podzol_side'):
        return 'x'
    return 'xy'


def needs_neutral_tint(req, references):
    texture_id = req['id']
    entity_tint = (texture_id.startswith('entity/sheep/sheep_wool') or
                   texture_id.startswith('entity/fish/tropical_') or
                   texture_id.startswith(('entity/banner/', 'entity/shield/')) or
                   (texture_id.startswith('entity/') and 'collar' in texture_id) or
                   (texture_id.startswith('entity/equipment/') and 'leather' in texture_id) or
                   (texture_id.startswith('entity/equipment/wolf_body/') and texture_id.endswith('_overlay')))
    if not (entity_tint or
            (texture_id.startswith('block/') and any(word in texture_id for word in ('leaves', 'grass', 'fern', 'vine', 'water', 'lily_pad', 'stem')))):
        return False
    with Image.open(references / (texture_id + '.png')) as image:
        rgba = np.array(image.convert('RGBA'))
    visible = rgba[..., 3] > 0
    chroma = np.ptp(rgba[..., :3].astype(float), axis=-1)
    return bool(np.any(visible) and np.mean(chroma[visible]) <= 5)


def scaled_metadata(req, metadata):
    """Scale explicit pixel dimensions, retaining timing, order and other metadata."""
    result = json.loads(json.dumps(metadata))
    animation = result.get('animation')
    if animation is not None:
        for key, dimension in (('width', 0), ('height', 1)):
            if key in animation:
                numerator = animation[key] * req['size'][dimension]
                denominator = req['vanilla_size'][dimension]
                if numerator % denominator:
                    raise ValueError(f'{req["id"]}: non-integral animation {key}')
                animation[key] = numerator // denominator
    return result


def seam_metrics(rgba):
    """Report wrap jumps relative to normal adjacent-pixel variation per axis."""
    rgb = rgba[..., :3].astype(float)
    alpha = rgba[..., 3]
    result = {}
    for axis, name in ((1, 'x'), (0, 'y')):
        first = np.take(rgb, 0, axis=axis)
        last = np.take(rgb, -1, axis=axis)
        visible = (np.take(alpha, 0, axis=axis) > 0) & (np.take(alpha, -1, axis=axis) > 0)
        wrap = np.abs(first - last).mean(axis=-1)
        adjacent = np.abs(np.diff(rgb, axis=axis)).mean(axis=-1)
        adjacent_visible = (np.take(alpha, range(alpha.shape[axis] - 1), axis=axis) > 0) & (np.take(alpha, range(1, alpha.shape[axis]), axis=axis) > 0)
        typical = float(np.mean(adjacent[adjacent_visible])) if np.any(adjacent_visible) else 0.0
        jump = float(np.mean(wrap[visible])) if np.any(visible) else 0.0
        maximum = float(np.max(np.abs(first - last)[visible])) if np.any(visible) else 0.0
        result[name] = {'wrap_mean': round(jump, 3), 'wrap_max': round(maximum, 3), 'adjacent_mean': round(typical, 3), 'ratio': round(jump / max(typical, 1.0), 3),
                        'alpha_mismatch_pixels': int(np.count_nonzero(np.take(alpha, 0, axis=axis) != np.take(alpha, -1, axis=axis)))}
    return result


def visible_frame_count(pixels, frames):
    """Ignore RGB noise hidden beneath transparency when checking motion."""
    height = pixels.shape[0] // frames
    visible = pixels.astype(np.uint16)
    visible[..., :3] = visible[..., :3] * visible[..., 3:] // 255
    return len({hashlib.sha256(visible[i * height:(i + 1) * height].tobytes()).digest()
                for i in range(frames)})


def check_one(req, pack, references, jar=None):
    target = pack / (req['id'] + '.png')
    if not target.exists():
        return {'id': req['id'], 'state': 'missing', 'errors': []}
    errors = []
    with Image.open(target) as image:
        image.load()
        if image.format != 'PNG':
            errors.append('not PNG')
        if list(image.size) != req['size']:
            return {'id': req['id'], 'state': 'invalid', 'errors': ['wrong dimensions']}
        pixels = np.array(image.convert('RGBA'))
    with Image.open(references / (req['id'] + '.png')) as image:
        reference = np.array(image.convert('RGBA'))
    if not np.array_equal(pixels[..., 3], reference[..., 3]):
        errors.append('alpha differs from vanilla mask')
    if req['alpha'] == 'opaque' and np.any(pixels[..., 3] != 255):
        errors.append('opaque texture contains transparency')
    if req['alpha'] == 'cutout' and np.any((pixels[..., 3] > 0) & (pixels[..., 3] < 255)):
        errors.append('cutout has partial alpha')
    if needs_neutral_tint(req, references):
        visible = pixels[..., 3] > 0
        if np.any(visible) and np.mean(np.ptp(pixels[..., :3].astype(float), axis=-1)[visible]) > 5:
            errors.append('biome/dye tint map has baked colour')
    frames = req['frames']
    if pixels.shape[0] % frames:
        errors.append('frame height is not integral')
    frame_height = pixels.shape[0] // frames
    animation = None
    if frames > 1:
        animation = {'visible_frames': visible_frame_count(pixels, frames),
                     'reference_visible_frames': visible_frame_count(reference, frames)}
        if animation['visible_frames'] == 1 and animation['reference_visible_frames'] > 1:
            errors.append('animation has lost visible frame variation')
    seams = [seam_metrics(pixels[i * frame_height:(i + 1) * frame_height]) for i in range(frames)] if repeat_axes(req['id']) else []
    for axis in repeat_axes(req['id']):
        if any(frame[axis]['wrap_max'] > 1 for frame in seams):
            errors.append(f'opposing RGB edges do not match on {axis} axis')
    if jar:
        meta_path = 'assets/minecraft/textures/' + req['id'] + '.png.mcmeta'
        output_meta = Path(str(target) + '.mcmeta')
        if meta_path in jar.namelist():
            if not output_meta.exists():
                errors.append('missing vanilla metadata')
            elif json.loads(output_meta.read_text()) != scaled_metadata(req, json.loads(jar.read(meta_path))):
                errors.append('animation/texture metadata or scaled frame dimensions differ')
    return {'id': req['id'], 'state': 'invalid' if errors else 'structurally-valid', 'errors': errors, 'seams': seams, 'animation': animation,
            'visual_review_required': ['albedo lighting', 'UV feature alignment', 'repeat appearance', 'animation continuity']}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--pack', type=Path, default=DEFAULT_PACK)
    parser.add_argument('--references', type=Path, default=DEFAULT_REFERENCES)
    parser.add_argument('--jar', type=Path)
    parser.add_argument('--report', type=Path)
    parser.add_argument('--complete', action='store_true')
    args = parser.parse_args()
    requests = json.loads(CATALOG.read_text())['requests']
    jar = zipfile.ZipFile(args.jar) if args.jar else None
    try:
        checks = [check_one(r, args.pack, args.references, jar) for r in requests]
    finally:
        if jar:
            jar.close()
    totals = {state: sum(c['state'] == state for c in checks) for state in ('missing', 'invalid', 'structurally-valid')}
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps({'totals': totals, 'textures': checks}, indent=2) + '\n')
    print(json.dumps(totals))
    if totals['invalid'] or (args.complete and totals['missing']):
        raise SystemExit(1)


if __name__ == '__main__':
    main()
