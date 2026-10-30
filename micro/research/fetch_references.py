"""Refresh locally stored Commons references, preserving source and license metadata.

Python 3 standard library only. Run from any directory; requires network access.
Only explicitly selected CC BY, CC BY-SA, CC0 and public-domain files are accepted.
"""
import hashlib
import html
import json
import re
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
    for attempt in range(4):
        try:
            with urllib.request.urlopen(request, timeout=45) as response:
                return response.read()
        except urllib.error.HTTPError as error:
            if error.code not in (429, 502, 503, 504) or attempt == 3:
                raise
            time.sleep(5 * (attempt + 1))


def plain(value):
    return html.unescape(re.sub('<[^>]+>', '', value)).strip()


def main():
    records = []
    for ident, title, band, note in SELECTION:
        time.sleep(2)
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
        record = dict(id=ident, band=band, title=title, local=str(path.relative_to(ROOT)),
                      source=info['descriptionurl'], original_url=info['url'].split('?')[0], download_url=download,
                      author=plain(meta.get('Artist', {}).get('value', 'See source page')),
                      license=license_name, license_url=meta.get('LicenseUrl', {}).get('value', ''),
                      description=plain(meta.get('ImageDescription', {}).get('value', '')),
                      note=note, accessed='2026-10-30', modification='Commons-provided thumbnail when available; no crop or recoloring.',
                      sha256=hashlib.sha256(payload).hexdigest(), bytes=len(payload))
        records.append(record)
        (ROOT / 'assets' / 'references' / 'manifest.json').write_text(json.dumps(records, ensure_ascii=False, indent=2) + '\n')
        print(ident, license_name, len(payload), flush=True)


if __name__ == '__main__':
    main()
