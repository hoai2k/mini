"""Refresh locally stored Commons references, preserving source and license metadata.

Python 3 standard library only. Run from any directory; requires network access.
Only explicitly selected CC BY, CC BY-SA, CC0 and public-domain files are accepted.
"""
import hashlib
import html
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SELECTION = [
    ('mite', 'Phthiracarid.jpg', '01', 'Unidentified phthiracarid mite; adult arthropod morphology.'),
    ('moss', 'Sphagnum girgensohnii (a, 150137-481740) 7207.JPG', '01', 'Moss habitat structure; use leaf architecture as environmental reference.'),
    ('tardigrade-light', 'BeautifulTardigrade.png', '02', 'Light-microscope photograph; phone-camera filtering is part of the source image.'),
    ('tardigrade-sem', 'SEM image of Milnesium tardigradum in active state - journal.pone.0045682.g001-2.png', '02', 'SEM of an animal prepared from the active state; not live in-chamber footage.'),
    ('rotifer', 'Philodina sp. (Classː Bdelloidea) - Phylum Rotifera.jpg', '02', 'Bdelloid rotifer; compare corona, foot and transparent body.'),
    ('amoeba', 'Amoeba proteus.jpg', '03', 'Amoeba proteus with pseudopodia, nucleus and contractile vacuole.'),
    ('paramecium', 'Paramécium caudátum.jpg', '03', 'Paramecium caudatum; whole-cell outline and internal contrast.'),
    ('vorticella', 'Vorticella 1.jpg', '03', 'Attached Vorticella ciliates; stalks connect feeding bodies to substrate.'),
    ('spirogyra', 'The freshwater alga Spirogyra.jpg', '03', 'Freshwater filament with spiral chloroplasts; useful habitat scaffolding.'),
    ('euglena', 'Euglena gracilis.jpg', '04', 'Euglena gracilis; green pigment and elongated cell silhouette.'),
    ('diatoms', 'Diatoms through the microscope.jpg', '04', 'Marine Antarctic sea-ice diatoms: morphology reference, not evidence of freshwater co-occurrence.'),
    ('biofilm-sem', 'Electron microscopic analysis of seagrass biofilms.jpg', '04', 'Marine seagrass biofilm SEM figure: matrix and surface-reference analogue, not freshwater habitat documentation.'),
]


def get(url):
    request = urllib.request.Request(url, headers={'User-Agent': 'MicroWorldResearch/1.0 (educational reference atlas)'})
    for attempt in range(6):
        try:
            with urllib.request.urlopen(request, timeout=45) as response:
                return response.read()
        except urllib.error.HTTPError as error:
            if error.code not in (429, 502, 503, 504) or attempt == 5:
                raise
            time.sleep(10 * (attempt + 1))


def plain(value):
    return html.unescape(re.sub('<[^>]+>', '', value)).strip()


def fetch(ident, title, band, note):
    query = urllib.parse.urlencode(dict(action='query', format='json', titles='File:' + title,
                                       prop='imageinfo', iiprop='url|extmetadata', iiurlwidth=1280))
    data = json.loads(get('https://commons.wikimedia.org/w/api.php?' + query))
    page = next(iter(data['query']['pages'].values()))
    info = page['imageinfo'][0]
    meta = info['extmetadata']
    license_name = plain(meta.get('LicenseShortName', {}).get('value', ''))
    assert license_name.startswith(('CC BY ', 'CC BY-SA ', 'CC0', 'Public domain')), (title, license_name)
    download = info.get('thumburl', info['url']).split('?')[0]
    ext = Path(urllib.parse.unquote(urllib.parse.urlparse(download).path)).suffix.lower()
    path = ROOT / 'assets' / 'references' / (ident + ext)
    payload = get(download)
    path.write_bytes(payload)
    return dict(id=ident, band=band, title=title, local=str(path.relative_to(ROOT)),
                source=info['descriptionurl'], original_url=info['url'].split('?')[0], download_url=download,
                author=plain(meta.get('Artist', {}).get('value', 'See source page')),
                license=license_name, license_url=meta.get('LicenseUrl', {}).get('value', ''),
                description=plain(meta.get('ImageDescription', {}).get('value', '')),
                note=note, accessed=time.strftime('%Y-%m-%d'),
                modification='Commons-provided thumbnail when available; no crop or recoloring.',
                sha256=hashlib.sha256(payload).hexdigest(), bytes=len(payload))


def main():
    """No arguments: refresh every selected file. `--missing`: fetch only ids not yet in the
    manifest. Otherwise the arguments are ids to refresh. The manifest keeps SELECTION order."""
    manifest = ROOT / 'assets' / 'references' / 'manifest.json'
    existing = {r['id']: r for r in json.loads(manifest.read_text())} if manifest.exists() else {}
    args = sys.argv[1:]
    if not args:
        wanted = [s[0] for s in SELECTION]
    elif args == ['--missing']:
        wanted = [s[0] for s in SELECTION if s[0] not in existing]
    else:
        wanted = args
    for ident, title, band, note in SELECTION:
        if ident not in wanted:
            continue
        time.sleep(2)
        existing[ident] = fetch(ident, title, band, note)
        order = [s[0] for s in SELECTION]
        records = [existing[i] for i in order if i in existing]
        manifest.write_text(json.dumps(records, ensure_ascii=False, indent=2) + '\n')
        print(ident, existing[ident]['license'], existing[ident]['bytes'], flush=True)

if __name__ == '__main__':
    main()
