#!/usr/bin/env python3
"""Export generated Micro images, record provenance, rebuild requests and gallery.

Usage: python3 micro/design/source/deliver_images.py /path/to/results.json ID...
Input records contain id, source_path, prompt and inputs. Source paths are local
generation artifacts; only portable reference paths enter the saved manifest.
Pillow performs export sizing/encoding; image content comes from image_gen.
"""
from pathlib import Path
from PIL import Image, ImageOps
import hashlib
import html
import json
import re
import runpy
import sys

ROOT = Path(__file__).resolve().parents[2]
PROVENANCE = ROOT / 'design/generated/manifest.json'
REQUEST_SOURCE = ROOT / 'design/source/build_requests.py'


def esc(value):
    return html.escape(str(value), quote=True)


def gallery(records):
    module = runpy.run_path(str(REQUEST_SOURCE))
    total = sum(len(group['items']) for group in module['GROUPS'])
    cards = []
    for record in records:
        image = '../../prototypes/' + record['file']
        references = ', '.join(f'<a href="../../research/{esc(r["local"])}">{esc(r["id"])}</a>' for r in record['references'])
        credits = '; '.join(f'{esc(r["author"])} ({esc(r["license"])})' for r in record['references'])
        repeat = f'<details><summary>Inspect a 2 × 2 repeat</summary><div class="repeat" style="background-image:url({image})"></div></details>' if 'tileable' in record['size'] else ''
        cards.append(f'<article id="{record["id"]}"><a href="{image}"><img src="{image}" alt="{esc(record["name"])}" loading="lazy"></a><div class="copy"><small>{record["id"]} · {record["width"]} × {record["height"]}</small><h2>{esc(record["name"])}</h2><p>{esc(record["used"])}</p><p class="meta">References: {references}.<br>{credits}</p><p class="meta">{esc(record["export"])}</p>{repeat}<details><summary>Generation prompt</summary><p class="prompt">{esc(record["prompt"])}</p></details></div></article>')
    output = '''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Micro · generated prototype art</title><style>
*{box-sizing:border-box}body{margin:0;background:#f2efe5;color:#203d36;font:17px/1.6 Georgia,serif}main{max-width:1280px;margin:auto;padding:40px 25px}h1{font-size:clamp(2.6rem,6vw,5rem);line-height:1.05;font-weight:400;margin:20px 0}h2{font-size:1.7rem;line-height:1.15;font-weight:400}a{color:inherit;text-underline-offset:3px}nav,small,.meta,summary{font-family:system-ui,sans-serif}.intro{max-width:76ch;margin-bottom:35px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px}article{background:#fcfaf3;border:1px solid #c8cdbc;min-width:0}article>a{display:block;background:repeating-conic-gradient(#eee 0 25%,#ddd 0 50%) 0/24px 24px}img{width:100%;height:340px;object-fit:contain;display:block}.copy{padding:24px}.meta{font-size:.74rem;overflow-wrap:anywhere}small{color:#9d492e;font-size:.76rem}details{border-top:1px solid #c8cdbc;padding:12px 0}summary{cursor:pointer;font-size:.78rem}.prompt{font-size:.84rem;white-space:pre-wrap}.repeat{width:100%;aspect-ratio:1;background-size:50% 50%;margin-top:15px}footer{margin-top:35px;font-size:.8rem}a:focus-visible,summary:focus-visible{outline:3px solid #9d492e;outline-offset:4px}@media(max-width:650px){.grid{grid-template-columns:1fr}main{padding:25px 16px}img{height:280px}.copy{padding:20px}}
</style></head><body><main><nav><a href="../../research/index.html">Research atlas</a> · <a href="../image-requests.md">Image requests</a> · <a href="manifest.json">Prompts, credits &amp; checksums</a></nav><h1>Micro prototype art.</h1><div class="intro"><p>COUNT of 18 requested assets delivered. Generated with the built-in image_gen tool from the supplied microscopy references and visual briefs. The images are visual interpretations, not real micrographs or calibrated scientific measurements.</p><p>Textures, background plates and launcher cards are saved under <code>micro/prototypes/assets/</code>; the creatures themselves remain code-built. Click an image for its full-size file. Repeating-texture previews are available below their cards. Reference photographs retain their individual licenses; attribution follows the research manifest.</p></div><div class="grid">CARDS</div><footer>Exported at the requested dimensions. See the manifest for the original brief, actual tool prompt, source artifact name, input references and export details. No API credentials are required.</footer></main></body></html>'''
    if (PROVENANCE.parent / 'review/index.html').exists():
        label = 'Pending texture review' if len(records) < 18 else 'Earlier texture review'
        output = output.replace('</nav>', f' · <a href="review/index.html">{label}</a></nav>')
    output = output.replace('of 18 requested assets', f'of {total} requested assets')
    (PROVENANCE.parent / 'index.html').write_text(output.replace('COUNT', str(len(records))).replace('CARDS', ''.join(cards)) + '\n')


def main():
    data = {r['id']: r for r in json.loads(Path(sys.argv[1]).read_text())}
    ids = sys.argv[2:]
    assert ids and len(ids) == len(set(ids))
    module = runpy.run_path(str(REQUEST_SOURCE))
    requests = {i['id']: i for group in module['GROUPS'] for i in group['items']}
    references = module['load_refs']()
    records = json.loads(PROVENANCE.read_text()) if PROVENANCE.exists() else []
    known = {r['id'] for r in records}
    for ident in ids:
        assert ident not in known, ('Already delivered; create a reviewed revision instead', ident)
        request, source = requests[ident], data[ident]
        width, height = map(int, re.match(r'(\d+) x (\d+)', request['size']).groups())
        path = ROOT / 'prototypes' / request['file']
        assert not path.exists(), ('Do not overwrite existing art', path)
        with Image.open(source['source_path']) as original:
            image = ImageOps.exif_transpose(original).convert('RGBA' if 'transparent' in request['size'] else 'RGB')
            original_size = image.size
            # Only normalize the export dimensions and encoding, not the composition.
            if image.size != (width, height):
                image = image.resize((width, height), Image.Resampling.LANCZOS)
            if 'transparent' in request['size']:
                assert image.getchannel('A').getextrema()[0] == 0, 'Real alpha required'
                assert image.getchannel('A').getextrema()[1] == 255, 'Missing opaque particle content'
            seam_data = {}
            if source.get('finish_seams') and 'tileable' in request['size']:
                finishing = runpy.run_path(str(ROOT / 'design/source/finish_texture_seams.py'))
                seam_data['seam_metrics_before'] = finishing['metrics'](image)
                image = finishing['quilt'](image)
                seam_data['seam_metrics_after'] = finishing['metrics'](image)
            path.parent.mkdir(parents=True, exist_ok=True)
            image.save(path, **({'quality': 92, 'method': 6} if path.suffix == '.webp' else {}))
        record = {k: request[k] for k in ('id', 'name', 'file', 'size', 'used', 'prompt')}
        record.update(prompt=source['prompt'], requested_prompt=request['prompt'],
                      tool='Built-in image_gen', source_artifact=Path(source['source_path']).name,
                      input_images=[str(Path(p).relative_to(ROOT)) if Path(p).is_relative_to(ROOT) else 'generated/' + Path(p).name for p in source['inputs']],
                      reference_usage='References below come from the requested brief. input_images records the actual images supplied to the final generation or edit; an empty list means text-only generation.',
                      original_dimensions=list(original_size), width=width, height=height,
                      sha256=hashlib.sha256(path.read_bytes()).hexdigest(),
                      export=('LANCZOS sizing; opposing-edge strips quilted with the approved conventional seam-correction workflow; WebP quality 92.' if seam_data else 'LANCZOS resizing to requested dimensions; WebP quality 92 for opaque assets, PNG with original alpha for transparent assets. No composition edits.'),
                      references=[{k: references[rid][k] for k in ('id', 'local', 'author', 'license', 'license_url', 'source')} for rid in request['refs']],
                      mood_boards=request.get('concepts', []))
        record.update(seam_data)
        records.append(record)
        text = REQUEST_SOURCE.read_text()
        marker = '"id": "' + ident + '",'
        assert text.count(marker) == 1
        explicit = marker + ' "status": "requested",'
        if explicit in text:
            text = text.replace(explicit, marker + ' "status": "delivered",', 1)
        else:
            text = text.replace(marker, marker + ' "status": "delivered",', 1)
        REQUEST_SOURCE.write_text(text)
        print('Delivered', ident, path.relative_to(ROOT), image.size)
    PROVENANCE.parent.mkdir(parents=True, exist_ok=True)
    order = {key: index for index, key in enumerate(requests)}
    records.sort(key=lambda r: order[r['id']])
    PROVENANCE.write_text(json.dumps(records, ensure_ascii=False, indent=2) + '\n')
    gallery(records)
    runpy.run_path(str(REQUEST_SOURCE))['main']()


if __name__ == '__main__':
    main()
