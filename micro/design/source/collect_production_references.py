#!/usr/bin/env python3
"""Collect openly licensed references for the new Micro image briefs.

Separate from the atlas's original twelve-image manifest. Each record preserves
creator, license, source, scope limitations and a checksum. Python stdlib only.
"""
from pathlib import Path
import hashlib
import html
import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[2]
DEST = ROOT / 'research/assets/references/production'
MANIFEST = DEST.parent / 'production-manifest.json'
SELECTION = [
    ('springtail', 'PoduraAquatica.jpg', 'Podura aquatica; external body and limb proportions.'),
    ('bog-pool', 'Sphagnum Bog Pool Bealach na Ba Viewpoint 1.jpg', 'Scottish Sphagnum bog pool; habitat analogue, not Simmelried documentation.'),
    ('bog-hummock', 'Sphagnum Capitulum.jpg', 'Sphagnum capitulum structure and colour; macro habitat reference.'),
    ('sundew', 'Drosera rotundifolia leaf1.jpg', 'Round-leaved sundew leaf and glandular tentacles.'),
    ('water-strider', 'Gerris lacustris 15445758.jpg', 'Gerris lacustris; resting leg proportions and body silhouette.'),
    ('stenus', 'Stenus (Stenus) sp ♂ adult.jpg', 'Stenus adult; body, eyes and elytra reference. Extended labium is specified by the brief.'),
    ('predatory-mite', 'Pergamasus diversus 02.jpg', 'Pergamasus diversus; predatory mite morphology, not a species-level bog occurrence claim.'),
    ('didinium', 'Didinium nasutum consuming a paramecium.jpg', 'Didinium feeding on Paramecium; cell outline and feeding apparatus.'),
    ('paramecium-bursaria', 'Paramecium bursaria.jpg', 'Paramecium bursaria in DIC; green symbionts and body proportions.'),
    ('peranema', 'Peranema.jpg', 'Peranema sp. from a Quebec pond; genus-level morphology reference.'),
    ('actinophrys', 'Actinophrys sol (phase contrast microscopy).jpg', 'Actinophrys sol in phase contrast; radial axopodia and vacuolated body.'),
    ('magnetotactic', 'M. gryphiswaldense.png', 'Magnetospirillum gryphiswaldense; electron-microscopy reference. Internal detail is not visible in ordinary light microscopy.'),
    ('bdellovibrio', 'Slice from electron cryotomogram of Bdellovibrio bacteriovorus cell.jpg', 'Bdellovibrio cryotomogram section; ultrastructure reference, not a live light-microscope view.'),
    ('phage-t4', 'T4 phage EM.jpg', 'T4 phage electron micrograph; head, sheath and tail-fibre reference.'),
    ('biofilm-fluorescence', 'NFDI4BIOIMAGE Calendar March 2025 - image march.png', 'Tagged Pseudomonas biofilm; fluorescence and matrix analogue, not a live/dead-stain image.'),
    ('trachelomonas', 'Bancsó 2021 Fig 8-2 Trachelomonas hispida.jpg', 'Trachelomonas hispida; lorica form and surface ornament.'),
    ('utricularia-bladder', 'Utricularia australis sl68.jpg', 'Utricularia australis bladder trap from an Austrian pond; trap anatomy analogue.'),
    ('chytrid', 'Pennate diatoms infected with chytrid-like fungal pathogens.webp', 'Marine melt-pond diatoms with putative chytrid-like infections; morphology analogue, not bog co-occurrence evidence.'),
]


def get(url):
    for attempt in range(4):
        try:
            request = urllib.request.Request(url, headers={'User-Agent': 'MicroPrototypeReference/1.0 (educational asset reference)'})
            with urllib.request.urlopen(request, timeout=45) as response:
                return response.read()
        except urllib.error.HTTPError as error:
            if error.code not in (429, 502, 503, 504) or attempt == 3:
                raise
            time.sleep(5 * (attempt + 1))


def plain(value):
    return html.unescape(re.sub('<[^>]+>', '', value)).strip()


def main():
    DEST.mkdir(exist_ok=True, parents=True)
    records = []
    for ident, title, note in SELECTION:
        query = urllib.parse.urlencode(dict(action='query', format='json', titles='File:' + title,
                                           prop='imageinfo', iiprop='url|extmetadata', iiurlwidth=1000))
        page = next(iter(json.loads(get('https://commons.wikimedia.org/w/api.php?' + query))['query']['pages'].values()))
        info = page['imageinfo'][0]
        meta = info['extmetadata']
        license_name = plain(meta.get('LicenseShortName', {}).get('value', ''))
        assert license_name.startswith(('CC BY ', 'CC BY-SA ', 'CC0', 'Public domain')), (title, license_name)
        url = info.get('thumburl', info['url']).split('?')[0]
        extension = Path(urllib.parse.unquote(urllib.parse.urlparse(url).path)).suffix.lower()
        path = DEST / (ident + extension)
        payload = get(url)
        path.write_bytes(payload)
        record = dict(id=ident, local=str(path.relative_to(ROOT / 'research')),
                      title=title, note=note, source=info['descriptionurl'],
                      download_url=url, original_url=info['url'].split('?')[0],
                      author=plain(meta.get('Artist', {}).get('value', 'See source')),
                      license=license_name, license_url=meta.get('LicenseUrl', {}).get('value', ''),
                      accessed='2026-10-30', modification='Commons thumbnail where available; no additional crop or recolouring.',
                      sha256=hashlib.sha256(payload).hexdigest(), bytes=len(payload))
        records.append(record)
        MANIFEST.write_text(json.dumps(records, ensure_ascii=False, indent=2) + '\n')
        print(ident, license_name, len(payload), flush=True)
        time.sleep(1)
    # The original atlas already contains a correctly identified Milnesium SEM.
    original = json.loads((DEST.parent / 'manifest.json').read_text())
    milnesium = dict(next(r for r in original if r['id'] == 'tardigrade-sem'))
    milnesium.update(id='milnesium', note='Milnesium tardigradum SEM; alias of the existing atlas reference, not a living light-microscope view.')
    records.append(milnesium)
    MANIFEST.write_text(json.dumps(records, ensure_ascii=False, indent=2) + '\n')


if __name__ == '__main__':
    main()
