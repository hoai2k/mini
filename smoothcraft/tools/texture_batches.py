#!/usr/bin/env python3
"""Prepare reference atlases and track image-generation jobs for the HD pack.

The references and job state stay in ignored local/smoothcraft/. The image
generator must paint each atlas while preserving its layout. This tool does
not synthesize replacement artwork or mark unchecked files delivered.
"""
import argparse
import ctypes.util
import fcntl
import hashlib
import json
import math
import subprocess
import os
import shlex
import tempfile
import zipfile
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage
from check_textures import repeat_axes

ROOT = Path(__file__).resolve().parents[2]
LOCAL = ROOT / 'local/smoothcraft'
REQUESTS = ROOT / 'smoothcraft/design/image-requests.json'


def run(*args):
    subprocess.run(['magick', *map(str, args)], check=True)


def write_texture(parts, target):
    temporary = target.with_name(target.stem + '.preparing.png')
    run(*parts, '-append', '-depth', '8', '-strip', temporary)
    temporary.replace(target)


def blend_with_mask(background, foreground, mask, output):
    # A mask PNG may itself have an opaque alpha channel. Copy its luminance
    # explicitly into the foreground alpha; passing it directly to Over can
    # otherwise replace the entire image instead of just the repair strip.
    run(background, '(', foreground, mask, '-alpha', 'off', '-compose', 'CopyOpacity', '-composite', ')',
        '-compose', 'Over', '-composite', output)


def align_cutout_rgb(raw, reference, output):
    """Register a generated cutout's extent before restoring its exact UV mask.

    Small maps may occupy only part of a shared atlas cell. The generator can
    centre or enlarge that content; cropping to the requested size first loses
    the artwork. This is geometric registration, using the generated RGB only.
    """
    with Image.open(reference) as image:
        rgba = np.array(image.convert('RGBA'))
    height, width = rgba.shape[:2]
    alpha = rgba[..., 3] > 0
    bounds = Image.fromarray(alpha.astype('uint8') * 255).getbbox()
    if bounds is None or alpha.mean() > .9:
        run(raw, '-crop', f'{width}x{height}+0+0', '+repage', output)
        return
    with Image.open(raw) as image:
        rgb = np.array(image.convert('RGB'))
    foreground = rgb.max(axis=-1) > 12
    # A single sprite (eyes, for example) can share a cell boundary with a
    # neighbouring atlas row. Retain the expected major components, excluding
    # unrelated slivers of the neighbouring cell before fitting its extent.
    labels, _ = ndimage.label(alpha, structure=np.ones((3, 3)))
    areas = np.bincount(labels.ravel())[1:]
    count = int(np.count_nonzero(areas >= max(4, areas.max() * .025)))
    if count > 2:
        # A multi-part UV net must keep its original coordinates. A global
        # bounds fit can shrink the entire net if a neighbouring atlas row
        # contributes even a thin RGB sliver in otherwise empty padding.
        run(raw, '-crop', f'{width}x{height}+0+0', '+repage', output)
        return
    if count <= 2:
        labels, _ = ndimage.label(foreground, structure=np.ones((3, 3)))
        areas = np.bincount(labels.ravel())
        areas[0] = 0
        nonempty = np.flatnonzero(areas)
        chosen = nonempty[np.argsort(areas[nonempty])[-count:]]
        foreground = np.isin(labels, chosen)
    source = Image.fromarray(foreground.astype('uint8') * 255).getbbox()
    if source is None:
        raise ValueError('Generated cutout has no visible RGB content')
    left, top, right, bottom = bounds
    x, y, end_x, end_y = source
    run('-size', f'{width}x{height}', 'xc:black', '(', raw,
        '-crop', f'{end_x-x}x{end_y-y}+{x}+{y}', '+repage',
        '-resize', f'{right-left}x{bottom-top}!', ')', '-geometry', f'+{left}+{top}',
        '-compose', 'Over', '-composite', output)


def make_periodic(path, axes):
    """Remove boundary lighting bias without moving UV features, then match edges."""
    if not axes:
        return
    with Image.open(path) as image:
        width, height = image.size
    source = Path(__file__).with_name('periodize_rgb.cpp')
    binary = LOCAL / 'periodize-rgb'
    LOCAL.mkdir(parents=True, exist_ok=True)
    with (LOCAL / 'periodize-build.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        if not binary.exists() or binary.stat().st_mtime < source.stat().st_mtime:
            flags = subprocess.run(['pkg-config', '--cflags', '--libs', 'fftw3'], capture_output=True, text=True)
            library = ctypes.util.find_library('fftw3')
            link = shlex.split(flags.stdout) if flags.returncode == 0 else (['-l:' + library] if library and library.endswith('.so.3') else ['-lfftw3'])
            temporary = binary.with_name(f'periodize-build-{os.getpid()}')
            subprocess.run(['c++', '-O2', '-std=c++17', str(source), *link, '-o', str(temporary)], check=True)
            temporary.replace(binary)
    with tempfile.TemporaryDirectory(prefix='periodic-', dir=LOCAL) as directory:
        raw, fixed = Path(directory) / 'input.rgb', Path(directory) / 'output.rgb'
        run(path, '-depth', '8', 'RGB:' + str(raw))
        subprocess.run([str(binary), str(width), str(height), axes, str(raw), str(fixed)], check=True)
        run('-size', f'{width}x{height}', '-depth', '8', 'RGB:' + str(fixed), '-set', 'colorspace', 'sRGB', path)


def plan():
    requests = json.loads(REQUESTS.read_text())['requests']
    groups = {}
    for req in sorted(requests, key=lambda r: (r['tier'], r['id'])):
        width, height = req['size']
        if req['frames'] > 1:
            # Each animation gets its own atlas, one cell per source frame.
            key = ('animation', req['id'])
        elif max(width, height) <= 256:
            key = ('small', req['tier'], req['id'].split('/')[0])
        elif max(width, height) <= 512:
            key = ('medium', req['tier'], req['id'].split('/')[0])
        else:
            key = ('large', req['id'])
        groups.setdefault(key, []).append(req)
    jobs = []
    for key, group in groups.items():
        capacity = 16 if key[0] == 'small' else 4 if key[0] == 'medium' else 1
        for start in range(0, len(group), capacity):
            entries = group[start:start + capacity]
            cells = []
            for req in entries:
                for frame in range(req['frames']):
                    cells.append({'request': req, 'frame': frame})
            grid = math.ceil(math.sqrt(len(cells)))
            side = max(max(c['request']['size'][0], c['request']['size'][1] // c['request']['frames']) for c in cells)
            job_id = f'{len(jobs):04d}'
            jobs.append({'id': job_id, 'grid': grid, 'cell_size': side, 'cells': cells,
                         'reference': str(LOCAL / 'batches' / (job_id + '.png')),
                         'state': 'pending'})
    LOCAL.mkdir(parents=True, exist_ok=True)
    target = LOCAL / 'texture-jobs.json'
    if target.exists():
        old = json.loads(target.read_text())
        if [{k: j[k] for k in ('id', 'cells')} for j in old] != [{k: j[k] for k in ('id', 'cells')} for j in jobs]:
            raise SystemExit('Existing job plan differs; preserve its results before replacing it.')
        print(f'Existing plan: {len(old)} jobs')
        return
    target.write_text(json.dumps(jobs, indent=2) + '\n')
    print(f'Planned {len(jobs)} jobs covering {len(requests)} requests and {sum(len(j["cells"]) for j in jobs)} frames/cells.')


def prepare(job):
    dest = Path(job['reference'])
    if dest.exists():
        return
    work = LOCAL / 'batches' / job['id']
    work.mkdir(parents=True, exist_ok=True)
    cells = []
    side = job['cell_size']
    for index, cell in enumerate(job['cells']):
        req = cell['request']
        width, total_height = req['size']
        height = total_height // req['frames']
        source = LOCAL / 'references' / (req['id'] + '.png')
        target = work / f'{index:03d}.png'
        run(source, '-crop', f'{width}x{height}+0+{cell["frame"] * height}', '+repage',
            '-gravity', 'NorthWest', '-background', 'none', '-extent', f'{side}x{side}', target)
        cells.append(target)
    while len(cells) < job['grid'] ** 2:
        target = work / f'{len(cells):03d}.png'
        run('-size', f'{side}x{side}', 'xc:none', target)
        cells.append(target)
    rows = []
    for row in range(job['grid']):
        target = work / f'row-{row}.png'
        run(*cells[row * job['grid']:(row + 1) * job['grid']], '+append', target)
        rows.append(target)
    run(*rows, '-append', dest)


def pending(count):
    if (LOCAL / 'pause-generation').exists():
        print('[]')
        return
    jobs = json.loads((LOCAL / 'texture-jobs.json').read_text())
    picked = [j for j in jobs if j['state'] == 'pending'][:count]
    for job in picked:
        prepare(job)
        descriptions = []
        for index, cell in enumerate(job['cells']):
            q = cell['request']
            guidance = ''
            if q['id'].startswith(('entity/banner/', 'entity/shield/')):
                guidance = (' Dye pattern layers are neutral white/grey printed woven cloth in the exact source shapes, '
                            'not sculpted objects; names such as bricks describe the printed motif, not stone material. '
                            'Keep wood/metal only where the source base UV map contains them.')
            if q['id'].startswith('entity/equipment/'):
                guidance += (' EQUIPMENT ONLY: paint the source leather, woven cloth, embroidery and metal. '
                             'Do not paint animal anatomy, skin, faces, eyes or muzzles on equipment. '
                             'Any source icon is a flat printed or embroidered motif, not a real face. '
                             'Blankets are woven wool rugs, not animal bodies.')
            if q['id'].startswith('entity/player/'):
                guidance += (' This is an ADULT HUMAN player skin, with human skin pores, human eyes, '
                             'normal rounded human ears, the original hairstyle, clothing and skin tone. '
                             'NO fur, animal faces, cat ears, elf ears, horns, tails or fantasy species. '
                             'Keep the original human character recognisable and the UV net unchanged.')
            if q['id'].startswith('entity/warden/') and q['id'] != 'entity/warden/warden':
                guidance += (' EMISSION OVERLAY ONLY: paint the exact small cyan/teal source patches, '
                             'retaining their original brightness and coordinates. Empty space stays black. '
                             'Do not paint a whole warden, face, limbs, bones or body into this effect layer.')
            if q['id'].startswith('entity/iron_golem/iron_golem_crackiness_'):
                guidance += (' DAMAGE OVERLAY ONLY: dark oxidized iron inside the exact sparse source cracks. '
                             'Empty space stays black; no whole golem, stone blocks, face, flowers or vines.')
            descriptions.append(f"Cell {index + 1}, row {index // job['grid'] + 1}, column {index % job['grid'] + 1}: {q['id']}, frame {cell['frame'] + 1}/{q['frames']}. {q['prompt']} Material: {q['material']}; alpha: {q['alpha']}.{guidance}")
        job['prompt'] = (
            f"Paint this exact {job['grid']} by {job['grid']} texture atlas into photoreal finely detailed Minecraft HD ALBEDO maps. "
            "Preserve the grid, each cell boundary, the coordinates of every UV region, silhouette, eye, mouth, marking and material division in the reference. "
            "Do not draw a scene or a rendered character: retain the unfolded flat texture maps exactly. Do not rearrange regions or fill unused transparent regions. "
            "Paint eyes, noses and faces ONLY where the reference already has them. Torso, body, leg and tail islands are uninterrupted material without any added facial features. Never repeat a creature face in another island. "
            "Keep the same reference palette. Paint opaque RGB artwork with solid black empty padding; never draw a transparency checkerboard. Original alpha masks are restored separately. All opaque colour must be under FLAT diffuse shadowless lighting: no baked AO, highlights, reflections, directional lighting, vignettes or shadows, including in cracks. "
            "Add material microdetail (fibres, pores, mineral grains, bark, skin, fur) within the existing UV regions. No pixel-art edges inside surfaces. "
            "Each block material cell must repeat seamlessly on its OWN opposite edges; do not blend adjoining cells. Keep biome-tinted grass, foliage and water nearly neutral as in the reference. "
            "For animation, keep the frame count/order and coherent gradual motion between adjacent frames and from last back to first. "
            "No borders, labels or text except lettering already required by the source texture. Empty padding cells remain empty. "
            + ' '.join(descriptions)
        )
    print(json.dumps(picked))


def record(job_id, source):
    # Serialise journal updates and extraction when a reviewed repair arrives
    # while another source generation is finishing.
    with (LOCAL / 'record.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        _record(job_id, source)


def _record(job_id, source):
    jobs_path = LOCAL / 'texture-jobs.json'
    jobs = json.loads(jobs_path.read_text())
    job = next(j for j in jobs if j['id'] == job_id)
    with Image.open(source) as image:
        image.verify()
    job['source'] = str(Path(source).resolve())
    job['source_sha256'] = hashlib.sha256(Path(source).read_bytes()).hexdigest()
    job['state'] = 'generated'
    temporary = jobs_path.with_suffix('.tmp')
    temporary.write_text(json.dumps(jobs, indent=2) + '\n')
    temporary.replace(jobs_path)
    print(f'Recorded {job_id}: {len(job["cells"])} generated cells')
    jar = LOCAL / 'minecraft-client-26.3.jar'
    if jar.exists():
        # Validate every new result as it arrives, rather than discovering
        # dimensions or alpha failures after a long bulk run.
        finish(jar)
        from check_textures import check_one
        output = ROOT / 'smoothcraft/design/generated/reference-guided'
        requests = {c['request']['id']: c['request'] for c in job['cells']}
        with zipfile.ZipFile(jar) as archive:
            checks = [check_one(q, output, LOCAL / 'references', archive) for q in requests.values()]
        qa = LOCAL / 'batches' / job_id / 'checks.json'
        qa.write_text(json.dumps(checks, indent=2) + '\n')
        failures = [c for c in checks if c['state'] != 'structurally-valid']
        if failures:
            raise SystemExit(json.dumps(failures))
        print(f'Checked {len(checks)} sizes, masks and metadata files; visual/seam review remains required.')


def finish(jar_path):
    """Extract generated cells and restore exact reference alpha/metadata."""
    with (LOCAL / 'finish.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        _finish(jar_path)


def _finish(jar_path):
    from check_textures import needs_neutral_tint, scaled_metadata
    jobs = json.loads((LOCAL / 'texture-jobs.json').read_text())
    overrides_path = LOCAL / 'overrides.json'
    overrides = json.loads(overrides_path.read_text()) if overrides_path.exists() else {}
    output = ROOT / 'smoothcraft/design/generated/reference-guided'
    with zipfile.ZipFile(jar_path) as jar:
        names = set(jar.namelist())
        for job in jobs:
            if job['state'] != 'generated':
                continue
            work = LOCAL / 'batches' / job['id']
            work.mkdir(parents=True, exist_ok=True)
            cache = work / 'finished-source.sha256'
            job_overrides = {c['request']['id']: overrides[c['request']['id']] for c in job['cells'] if c['request']['id'] in overrides}
            override_hashes = {key: hashlib.sha256((ROOT / value).read_bytes()).hexdigest() for key, value in job_overrides.items()}
            alignment = ':uv-extent-v2' if any(c['request']['id'].startswith('entity/') for c in job['cells']) else ''
            if any(c['request']['id'].startswith('entity/') and repeat_axes(c['request']['id']) for c in job['cells']):
                alignment += ':shader-repeat-v1'
            cache_key = job['source_sha256'] + ':poisson-periodic-v2' + alignment + ':' + json.dumps(override_hashes, sort_keys=True)
            if cache.exists() and cache.read_text().strip() == cache_key:
                if all((output / (c['request']['id'] + '.png')).exists() for c in job['cells']):
                    continue
            with Image.open(job['source']) as image:
                atlas_width, atlas_height = image.size
            frames = {}
            for index, cell in enumerate(job['cells']):
                req = cell['request']
                width, total_height = req['size']
                height = total_height // req['frames']
                side = job['cell_size']
                grid = job['grid']
                col, row = index % grid, index // grid
                x, y = round(col * atlas_width / grid), round(row * atlas_height / grid)
                right, bottom = round((col + 1) * atlas_width / grid), round((row + 1) * atlas_height / grid)
                work = LOCAL / 'batches' / job['id']
                raw = work / f'generated-{index:03d}.png'
                mask = work / f'mask-{index:03d}.png'
                frame = work / f'finished-{index:03d}.png'
                # Fractional atlas cell boundaries (1254/4, for example) can
                # include a pixel of the neighbouring material. A guard crop
                # removes that contamination before resampling block maps.
                inset = 2 if req['id'].startswith('block/') and grid > 1 else 0
                run(job['source'], '-crop', f'{right-x-2*inset}x{bottom-y-2*inset}+{x+inset}+{y+inset}', '+repage', '-resize', f'{side}x{side}!',
                    '-alpha', 'off', raw)
                if req['id'].startswith('entity/'):
                    reference_frame = work / f'reference-{index:03d}.png'
                    aligned = work / f'aligned-{index:03d}.png'
                    run(LOCAL / 'references' / (req['id'] + '.png'), '-crop', f'{width}x{height}+0+{cell["frame"] * height}',
                        '+repage', reference_frame)
                    align_cutout_rgb(raw, reference_frame, aligned)
                    aligned.replace(raw)
                else:
                    run(raw, '-crop', f'{width}x{height}+0+0', '+repage', raw)
                if req['id'] in overrides:
                    if req['frames'] != 1:
                        raise SystemExit('An override must contain a single complete static texture.')
                    run(ROOT / overrides[req['id']], '-resize', f'{width}x{height}!', '-alpha', 'off', raw)
                if needs_neutral_tint(req, LOCAL / 'references'):
                    run(raw, '-colorspace', 'Gray', '-colorspace', 'sRGB', raw)
                make_periodic(raw, repeat_axes(req['id']))
                run(LOCAL / 'references' / (req['id'] + '.png'), '-crop', f'{width}x{height}+0+{cell["frame"] * height}',
                    '+repage', '-alpha', 'extract', mask)
                run(raw, mask, '-alpha', 'off', '-compose', 'CopyOpacity', '-composite', frame)
                frames.setdefault(req['id'], []).append(frame)
            for texture_id, parts in frames.items():
                target = output / (texture_id + '.png')
                target.parent.mkdir(parents=True, exist_ok=True)
                write_texture(parts, target)
                meta = 'assets/minecraft/textures/' + texture_id + '.png.mcmeta'
                if meta in names:
                    req = next(c['request'] for c in job['cells'] if c['request']['id'] == texture_id)
                    metadata = scaled_metadata(req, json.loads(jar.read(meta)))
                    Path(str(target) + '.mcmeta').write_text(json.dumps(metadata, indent=2) + '\n')
            cache.write_text(cache_key + '\n')
    print(f'Extracted {len(list(output.rglob("*.png")))} reference-guided candidates into {output}')


def seam_prepare(job_id):
    jobs = json.loads((LOCAL / 'texture-jobs.json').read_text())
    job = next(j for j in jobs if j['id'] == job_id)
    side = job['cell_size']
    if any(c['request']['size'][0] != side or c['request']['size'][1] // c['request']['frames'] != side for c in job['cells']):
        raise SystemExit('Seam repair requires square frames with a common size.')
    work = LOCAL / 'batches' / job_id
    shifted = []
    for index, cell in enumerate(job['cells']):
        target = work / f'shifted-{index:03d}.png'
        source = ROOT / 'smoothcraft/design/generated/reference-guided' / (cell['request']['id'] + '.png')
        run(source, '-crop', f'{side}x{side}+0+{cell["frame"] * side}', '+repage', '-alpha', 'off',
            '-roll', f'+{side//2}+{side//2}', target)
        shifted.append(target)
    while len(shifted) < job['grid'] ** 2:
        target = work / f'shifted-{len(shifted):03d}.png'
        run('-size', f'{side}x{side}', 'xc:gray', target)
        shifted.append(target)
    rows = []
    for row in range(job['grid']):
        target = work / f'shifted-row-{row}.png'
        run(*shifted[row * job['grid']:(row + 1) * job['grid']], '+append', target)
        rows.append(target)
    target = work / 'seam-reference.png'
    run(*rows, '-append', target)
    print(target)


def seam_finish(job_id, edited):
    jobs = json.loads((LOCAL / 'texture-jobs.json').read_text())
    job = next(j for j in jobs if j['id'] == job_id)
    work = LOCAL / 'batches' / job_id
    grid = job['grid']
    side = job['cell_size']
    with Image.open(edited) as image:
        atlas_width, atlas_height = image.size
    mask = work / 'seam-cross-mask.png'
    low, high = side // 2 - max(4, side // 16), side // 2 + max(4, side // 16) - 1
    run('-size', f'{side}x{side}', 'xc:black', '-fill', 'white', '-draw',
        f'rectangle {low},0 {high},{side-1} rectangle 0,{low} {side-1},{high}', '-blur', f'0x{max(1, side/85)}', mask)
    frames = {}
    for index, cell in enumerate(job['cells']):
        req = cell['request']
        col, row = index % grid, index // grid
        x, y = round(col * atlas_width / grid), round(row * atlas_height / grid)
        right, bottom = round((col + 1) * atlas_width / grid), round((row + 1) * atlas_height / grid)
        patch = work / f'seam-patch-{index:03d}.png'
        blended = work / f'seam-blended-{index:03d}.png'
        unshifted = work / f'seam-unshifted-{index:03d}.png'
        run(edited, '-crop', f'{right-x}x{bottom-y}+{x}+{y}', '+repage', '-resize', f'{side}x{side}!', '-alpha', 'off', patch)
        from check_textures import needs_neutral_tint
        if needs_neutral_tint(req, LOCAL / 'references'):
            run(patch, '-colorspace', 'Gray', '-colorspace', 'sRGB', patch)
        if req['alpha'] == 'opaque':
            blend_with_mask(work / f'shifted-{index:03d}.png', patch, mask, blended)
        else:
            # These cells also had undefined RGB under generated transparency;
            # use the opaque repaint, then restore the verified vanilla mask.
            run(patch, blended)
        run(blended, '-roll', f'+{side//2}+{side//2}', unshifted)
        make_periodic(unshifted, repeat_axes(req['id']))
        frame = work / f'seam-final-{index:03d}.png'
        run(unshifted, work / f'mask-{index:03d}.png', '-alpha', 'off', '-compose', 'CopyOpacity', '-composite', '-strip', frame)
        frames.setdefault(req['id'], []).append(frame)
    for texture_id, parts in frames.items():
        target = ROOT / 'smoothcraft/design/generated/reference-guided' / (texture_id + '.png')
        write_texture(parts, target)
    (work / 'seam-repair.json').write_text(json.dumps({'image': str(edited), 'sha256': hashlib.sha256(Path(edited).read_bytes()).hexdigest(), 'method': 'Image-generated central-cross repair in half-period offset space, feathered into unchanged original pixels; vanilla alpha restored.'}, indent=2) + '\n')
    print(f'Applied seam repair to {job_id}; inspect repeat previews and rerun check_textures.py.')


def manifest():
    jobs_path = LOCAL / 'texture-jobs.json'
    jobs = json.loads(jobs_path.read_text()) if jobs_path.exists() else []
    by_texture = {c['request']['id']: j for j in jobs if j['state'] == 'generated' for c in j['cells']}
    requests = json.loads(REQUESTS.read_text())['requests']
    output = ROOT / 'smoothcraft/design/generated/reference-guided'
    pack = ROOT / 'smoothcraft/mod/src/main/resources/resourcepacks/hd/assets/minecraft/textures'
    records = []
    overrides_path = LOCAL / 'overrides.json'
    overrides = json.loads(overrides_path.read_text()) if overrides_path.exists() else {}
    for req in requests:
        candidate = output / (req['id'] + '.png')
        accepted = pack / (req['id'] + '.png')
        path = candidate if candidate.exists() else accepted if accepted.exists() else None
        job = by_texture.get(req['id'])
        records.append({'id': req['id'], 'tier': req['tier'], 'size': req['size'], 'frames': req['frames'],
                        'alpha': req['alpha'], 'material': req['material'], 'repeat_axes': repeat_axes(req['id']),
                        'state': 'candidate' if path == candidate else 'delivered' if path == accepted else 'requested',
                        'file': path.relative_to(ROOT).as_posix() if path else None,
                        'sha256': hashlib.sha256(path.read_bytes()).hexdigest() if path else None,
                        'source_job': job['id'] if job else None,
                        'source_atlas_sha256': job['source_sha256'] if job else None,
                        'material_source_sha256': hashlib.sha256((ROOT / overrides[req['id']]).read_bytes()).hexdigest() if req['id'] in overrides else None})
    data = {'generator': 'image_gen.imagegen', 'minecraft_version': '26.3', 'total_requests': len(records),
            'present': sum(r['file'] is not None for r in records),
            'preparation': 'Reference-guided image generation; guarded atlas extraction; exact size and vanilla alpha masks; neutral biome/dye maps; periodic-plus-smooth RGB correction on repeating axes; original animation/texture metadata.',
            'review': 'Dimension, mask, tint, repeat-edge and metadata checks are automated by check_textures.py. Albedo appearance, UV feature placement, pattern continuity and animation motion also require visual review.',
            'textures': records}
    output.mkdir(parents=True, exist_ok=True)
    temporary = output / 'manifest.preparing.json'
    temporary.write_text(json.dumps(data, indent=2) + '\n')
    temporary.replace(output / 'manifest.json')
    print(f'Manifest: {data["present"]}/{len(records)} texture files present.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    sub.add_parser('plan')
    sub.add_parser('manifest')
    pick = sub.add_parser('pending')
    pick.add_argument('--count', type=int, default=4)
    rec = sub.add_parser('record')
    rec.add_argument('job_id')
    rec.add_argument('source')
    fin = sub.add_parser('finish')
    fin.add_argument('jar', type=Path)
    seam = sub.add_parser('seam-reference')
    seam.add_argument('job_id')
    repair = sub.add_parser('seam-finish')
    repair.add_argument('job_id')
    repair.add_argument('edited', type=Path)
    args = parser.parse_args()
    if args.command == 'plan':
        plan()
    elif args.command == 'manifest':
        manifest()
    elif args.command == 'pending':
        pending(args.count)
    elif args.command == 'record':
        record(args.job_id, args.source)
    elif args.command == 'finish':
        finish(args.jar)
    elif args.command == 'seam-reference':
        seam_prepare(args.job_id)
    elif args.command == 'seam-finish':
        seam_finish(args.job_id, args.edited)
