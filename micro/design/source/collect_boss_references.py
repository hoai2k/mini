#!/usr/bin/env python3
"""Append openly licensed Round 5 anatomy references without replacing prior records."""
from pathlib import Path
import hashlib
import json
import runpy
import urllib.parse

BASE = runpy.run_path(str(Path(__file__).with_name('collect_production_references.py')))
ROOT, DEST, MANIFEST = (BASE[k] for k in ('ROOT', 'DEST', 'MANIFEST'))
SELECTION = [
    ('boss-wolf-spider', 'Flickr - Lukjonis - Spider - Pirata piraticus.jpg', 'Pirata piraticus; direct wolf-spider anatomy reference, not a claim of juvenile size or bog occurrence.'),
    ('boss-pseudoscorpion', 'Neobisium sylvaticum 03.jpg', 'Neobisium sylvaticum; separate walking legs and pedipalpal pincers; species-level analogue for the requested Neobisium form.'),
    ('boss-chaos', 'Chaos carolinense.jpg', 'Chaos amoeba; direct whole-cell morphology reference. Not a calibrated orthographic model.'),
    ('boss-stentor', 'Stentor coeruleus.png', 'Stentor coeruleus in a contracted oral view; pigment and oral-field reference.'),
    ('boss-stentor-extended', 'StentorCoeruleus.jpg', 'Stentor coeruleus pair; whole-body extension reference to complement the contracted oral-view photo.'),
    ('boss-cascade', '181-CascadeAndCRISPR 4un3.tiff', 'Goodsell molecular illustration of Cascade with nucleic acid, based on PDB 4UN3; colour is explanatory, not naturally visible.'),
    ('boss-cas-proteins', '181-CascadeAndCRISPR CasProteins.tiff', 'CRISPR-associated protein molecular illustrations; supporting shape reference, not a four-view atomic reconstruction.'),
]


def main():
    records = json.loads(MANIFEST.read_text())
    known = {r['id']: r for r in records}
    for ident, title, note in SELECTION:
        if ident in known:
            assert (ROOT / 'research' / known[ident]['local']).exists()
            print('Already collected', ident, flush=True)
            continue
        query = urllib.parse.urlencode(dict(action='query', format='json', titles='File:' + title,
                                           prop='imageinfo', iiprop='url|extmetadata', iiurlwidth=1000))
        page = next(iter(json.loads(BASE['get']('https://commons.wikimedia.org/w/api.php?' + query))['query']['pages'].values()))
        info = page['imageinfo'][0]
        meta = info['extmetadata']
        license_name = BASE['plain'](meta.get('LicenseShortName', {}).get('value', ''))
        assert license_name.startswith(('CC BY ', 'CC BY-SA ', 'CC0', 'Public domain')), (title, license_name)
        url = info.get('thumburl', info['url']).split('?')[0]
        extension = Path(urllib.parse.unquote(urllib.parse.urlparse(url).path)).suffix.lower()
        path = DEST / (ident + extension)
        assert not path.exists(), path
        payload = BASE['get'](url)
        path.write_bytes(payload)
        records.append(dict(id=ident, local=str(path.relative_to(ROOT / 'research')), title=title, note=note,
                            source=info['descriptionurl'], download_url=url, original_url=info['url'].split('?')[0],
                            author=BASE['plain'](meta.get('Artist', {}).get('value', 'See source')),
                            license=license_name, license_url=meta.get('LicenseUrl', {}).get('value', ''),
                            accessed='2026-10-31', modification='Commons thumbnail where available; no additional crop or recolouring.',
                            sha256=hashlib.sha256(payload).hexdigest(), bytes=len(payload)))
        MANIFEST.write_text(json.dumps(records, ensure_ascii=False, indent=2) + '\n')
        print(ident, license_name, len(payload), flush=True)


if __name__ == '__main__':
    main()
