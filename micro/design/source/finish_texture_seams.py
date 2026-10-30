#!/usr/bin/env python3
"""Quilt opposing strips of the four reviewed generated textures into repeats.

Conventional processing was explicitly authorized by the user. This preserves
generated material detail, using a minimum-error cut with a short feather rather
than painting new objects. NumPy and Pillow are required. Candidate originals
remain in design/generated/review/. Run once, then build_requests.py --check.
"""
from pathlib import Path
from PIL import Image
import hashlib
import json
import runpy
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
IDS = ('MP-M01', 'MP-M02', 'MP-T01', 'MP-T02')


def path_through(cost, start=None):
    """Minimum vertical cut; optional closed start/end for a periodic join."""
    rows, columns = cost.shape
    accumulated = cost[0].copy()
    if start is not None:
        accumulated[:] = np.inf
        accumulated[start] = cost[0, start]
    back = np.zeros((rows, columns), dtype=np.int8)
    for row in range(1, rows):
        choices = np.stack((np.r_[np.inf, accumulated[:-1]], accumulated,
                            np.r_[accumulated[1:], np.inf]))
        chosen = choices.argmin(axis=0)
        back[row] = chosen.astype(np.int8) - 1
        accumulated = choices[chosen, np.arange(columns)] + cost[row]
    end = start if start is not None else int(accumulated.argmin())
    total = float(accumulated[end])
    path = np.empty(rows, dtype=np.int32)
    path[-1] = end
    for row in range(rows - 1, 0, -1):
        path[row - 1] = path[row] + back[row, path[row]]
    return path, total


def overlap(a, b, closed=False):
    """Transition from b at the left to a at the right along a minimum cut."""
    cost = np.mean((a - b) ** 2, axis=2)
    # Preserve real source adjacency at both ends of the transition strip.
    margin = max(8, cost.shape[1] // 20)
    cost[:, :margin] = np.inf
    cost[:, -margin:] = np.inf
    if closed:
        score = cost[0] + cost[-1]
        candidates = [int(np.argmin(score))]
        candidates += list(np.linspace(margin + 1, cost.shape[1] - margin - 2, 7).astype(int))
        cuts = [path_through(cost, int(start)) for start in sorted(set(candidates))]
        seam, _ = min(cuts, key=lambda item: item[1])
    else:
        seam, _ = path_through(cost)
    feather = 5.0
    weight = np.clip((np.arange(cost.shape[1])[None, :] - seam[:, None]) / feather + .5, 0, 1)
    weight = weight * weight * (3 - 2 * weight)
    return b * (1 - weight[:, :, None]) + a * weight[:, :, None]


def quilt(image):
    original = np.asarray(image.convert('RGB'), dtype=np.float64)
    height, width, _ = original.shape
    ox, oy = width // 5, height // 5
    horizontal = overlap(original[:, :ox], original[:, -ox:])
    horizontal = np.concatenate((original[:, ox:-ox], horizontal), axis=1)
    # Transpose to use the same cut solver. Closing the cut prevents a corner seam.
    top = horizontal[:oy].transpose(1, 0, 2)
    bottom = horizontal[-oy:].transpose(1, 0, 2)
    vertical = overlap(top, bottom, closed=True).transpose(1, 0, 2)
    result = np.concatenate((horizontal[oy:-oy], vertical), axis=0)
    result = Image.fromarray(np.uint8(np.clip(np.rint(result), 0, 255)))
    return result.resize((width, height), Image.Resampling.LANCZOS)


def metrics(image):
    a = np.asarray(image.convert('RGB'), dtype=np.float64)
    horizontal = float(np.mean(np.abs(a[:, 0] - a[:, -1])))
    vertical = float(np.mean(np.abs(a[0] - a[-1])))
    interior_x = float(np.mean(np.abs(np.diff(a, axis=1))))
    interior_y = float(np.mean(np.abs(np.diff(a, axis=0))))
    return dict(horizontal_join=round(horizontal, 3), vertical_join=round(vertical, 3),
                interior_horizontal=round(interior_x, 3), interior_vertical=round(interior_y, 3))


def main():
    source = ROOT / 'design/source/build_requests.py'
    module = runpy.run_path(str(source))
    requests = {i['id']: i for group in module['GROUPS'] for i in group['items']}
    inputs = {r['id']: r for r in json.loads((ROOT / 'design/generated/review/manifest.json').read_text())}
    refs = module['load_refs']()
    manifest_path = ROOT / 'design/generated/manifest.json'
    records = json.loads(manifest_path.read_text())
    for ident in IDS:
        r, candidate = requests[ident], inputs[ident]
        assert r.get('status', 'requested') == 'requested'
        path = ROOT / 'prototypes' / r['file']
        assert not path.exists(), ('Do not overwrite existing art', path)
        input_path = ROOT / 'design/generated/review' / candidate['candidate']
        assert hashlib.sha256(input_path.read_bytes()).hexdigest() == candidate['sha256']
        with Image.open(input_path) as original:
            before = metrics(original)
            image = quilt(original)
        after = metrics(image)
        path.parent.mkdir(exist_ok=True, parents=True)
        image.save(path, format='WEBP', lossless=True, method=6)
        record = {k: r[k] for k in ('id', 'name', 'file', 'size', 'used')}
        record.update(prompt=candidate['prompt'], requested_prompt=r['prompt'],
                      tool='Built-in image_gen; conventional seam correction authorized by user',
                      source_artifact=candidate['candidate'], width=image.width, height=image.height,
                      input_images=['design/generated/review/' + candidate['candidate']],
                      references=[{k: refs[rid][k] for k in ('id', 'local', 'author', 'license', 'license_url', 'source')} for rid in r['refs']],
                      mood_boards=r.get('concepts', []),
                      export='Minimum-error cuts across 20% opposing-edge overlaps, a five-pixel feather, LANCZOS resizing to requested dimensions and lossless WebP encoding. Original generated candidate retained in review/.',
                      seam_metrics_before=before, seam_metrics_after=after,
                      sha256=hashlib.sha256(path.read_bytes()).hexdigest())
        records.append(record)
        text = source.read_text()
        marker = '"id": "' + ident + '",'
        assert text.count(marker) == 1
        source.write_text(text.replace(marker, marker + ' "status": "delivered",', 1))
        print(ident, 'before', before, 'after', after, flush=True)
    order = {key: index for index, key in enumerate(requests)}
    records.sort(key=lambda record: order[record['id']])
    manifest_path.write_text(json.dumps(records, ensure_ascii=False, indent=2) + '\n')
    gallery = runpy.run_path(str(ROOT / 'design/source/deliver_images.py'))['gallery']
    gallery(records)
    runpy.run_path(str(source))['main']()
    review = ROOT / 'design/generated/review/index.html'
    text = review.read_text().replace('Four texture repeats under review.', 'Earlier texture candidates.')
    text = text.replace('Candidate export, 2048 × 2048. Awaiting seamless edge correction; the prototype retains its procedural stand-in.', 'Earlier candidate, 2048 × 2048. Its finished replacement is in the delivered image gallery.')
    start = text.index('<p>The generator produced')
    end = text.index('</p>', start) + 4
    text = text[:start] + '<p>These retained candidates show the joins that prompted correction. Conventional seam processing was authorized and applied; all four finished textures are in the <a href="../index.html">delivered gallery</a>. The original generated detail is retained, with narrow overlap cuts joining the opposing sides.</p>' + text[end:]
    review.write_text(text)
    for ident, candidate in inputs.items():
        candidate['status'] = 'earlier candidate; finished texture delivered'
        candidate['finished_file'] = 'micro/prototypes/' + requests[ident]['file']
    (ROOT / 'design/generated/review/manifest.json').write_text(json.dumps(list(inputs.values()), indent=2) + '\n')


if __name__ == '__main__':
    main()
