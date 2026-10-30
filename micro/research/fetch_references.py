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
    # Zoom Chain additions (bog surface to phage). Bands 00, 05 and 06 are the new levels:
    # 00 bog surface, 05 bacteria, 06 viruses.
    ('springtail-swarm', 'Podura aquatica - 1.jpg', '00', 'A swarm of water springtails (Podura aquatica) on a pool surface among algae: colour, scale and habitat.'),
    ('stenus', 'Stenus bimaculatus.jpg', '00', 'Stenus rove beetle (S. bimaculatus), a soft phone photo: big eyes, slender body, short elytra.'),
    ('sundew', 'Drosera rotundifolia leaf1.jpg', '00', 'Round-leaved sundew leaf: red glandular tentacles with glue droplets.'),
    ('water-strider', 'Water strider Gerris lacustris.jpg', '00', 'Water strider Gerris lacustris standing on the surface film.'),
    ('springtail', 'Podura aquatica - 2.jpg', '00', 'Water springtail Podura aquatica close up: body, antennae and legs.'),
    ('springtail-ventral', 'Podura aquatica - retinacle-collophore.jpg', '00', 'Podura aquatica from below: the ventral tube (collophore), the catch (retinaculum) and the folded furcula.'),
    ('pond-spider', 'Pirata hygrophilus.jpg', '00', 'Pirata hygrophilus, a wolf spider of wet moss and pool edges (adult; stands in for the juveniles).'),
    ('bog-pool', 'Sphagnum moss in bog pool - geograph.org.uk - 808982.jpg', '00', 'Sphagnum in a bog pool: the water surface and moss edge.'),
    ('bog-hummock', 'Sphagnum hummock.JPG', '00', 'A moss hummock among rushes and grasses: the bog lawn at landscape scale.'),
    ('predatory-mite', 'Pergamasus diversus 01.jpg', '01', 'Pergamasus diversus, a free-living predatory parasitid mite of soil and litter.'),
    ('milnesium', 'Milnesium tardigradum.jpg', '02', 'Milnesium tardigradum, the carnivorous tardigrade, in light microscopy.'),
    ('nebela', 'Nebela flabellulum SEM.png', '02', 'Nebela testate amoeba shell (SEM): a lorica built from recycled plates.'),
    ('didinium', '040 Didinium nasutum.jpg', '03', 'Didinium nasutum: proboscis and two ciliary girdles (1896 drawing).'),
    ('didinium-feeding', 'Didinium nasutum consuming a paramecium.jpg', '03', 'Didinium swallowing a Paramecium whole (1909 drawing).'),
    ('dileptus', 'Dileptus anatinus - 400x (28675744772).jpg', '03', 'Dileptus: the long proboscis predator of ciliates.'),
    ('paramecium-bursaria', 'Paramecium bursaria - 400x (13263096305).jpg', '03', 'Paramecium bursaria packed with green Chlorella symbionts.'),
    ('utricularia-bladder', 'Utricularia -- bladder (1).JPG - Photo by V C Balakrishnan.jpg', '03', 'A bladderwort trap: bladder, door and trigger hairs.'),
    ('trachelomonas', 'Bancsó 2021 Fig 8-2 Trachelomonas hispida.jpg', '04', 'Trachelomonas hispida: the spiny brown lorica of the Level 4 protagonist.'),
    ('peranema', 'Peranema (Flagellat) - 400x (8492749542).jpg', '04', 'Peranema: colourless predatory euglenid with a thick leading flagellum.'),
    ('actinophrys', 'Actinophrys sol (phase contrast microscopy).jpg', '04', 'Actinophrys sol in phase contrast: spherical cell and radiating axopodia.'),
    ('chytrid', 'Pennate diatom infected with two chytrid-like fungal pathogens.png', '04', 'Chytrid-like parasites on a pennate diatom.'),
    ('magnetotactic', 'Magnetospirillum cells.jpg', '05', 'Magnetospirillum cells: helical magnetotactic bacteria.'),
    ('magnetosome-chain', 'Magnetosome chain.png', '05', 'A magnetosome chain of magnetite crystals inside a cell (TEM).'),
    ('bdellovibrio', 'Slice from electron cryotomogram of Bdellovibrio bacteriovorus cell.jpg', '05', 'Bdellovibrio bacteriovorus, cryo-electron tomogram slice.'),
    ('phage-t4', 'T4 phage EM.jpg', '06', 'Bacteriophage T4 in an electron micrograph: head, tail and fibres.'),
    ('phage-t4-model', 'T4 rendered.jpg', '06', 'A rendered model of bacteriophage T4.'),
]


def get(url):
    request = urllib.request.Request(url, headers={'User-Agent': 'MicroWorldResearch/1.0 (educational reference atlas)'})
    for attempt in range(30):
        try:
            with urllib.request.urlopen(request, timeout=45) as response:
                return response.read()
        except urllib.error.HTTPError as error:
            if error.code not in (429, 502, 503, 504) or attempt == 29:
                raise
            time.sleep(int(error.headers.get('retry-after') or 10 * (attempt + 1)) + 2)


def plain(value):
    return html.unescape(re.sub('<[^>]+>', '', value)).strip()


def metadata(titles):
    """Image info for many files in as few API calls as possible (the API takes 50 titles)."""
    found = {}
    for start in range(0, len(titles), 50):
        batch = titles[start:start + 50]
        query = urllib.parse.urlencode(dict(action='query', format='json', titles='|'.join('File:' + t for t in batch),
                                           prop='imageinfo', iiprop='url|extmetadata', iiurlwidth=1280))
        data = json.loads(get('https://commons.wikimedia.org/w/api.php?' + query))
        names = {n['to']: n['from'] for n in data['query'].get('normalized', [])}
        for page in data['query']['pages'].values():
            if 'imageinfo' in page:
                found[names.get(page['title'], page['title'])[len('File:'):]] = page['imageinfo'][0]
        time.sleep(2)
    return found


def fetch(ident, title, band, note, info):
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
    infos = metadata([title for ident, title, band, note in SELECTION if ident in wanted])
    for ident, title, band, note in SELECTION:
        if ident not in wanted:
            continue
        time.sleep(2)
        try:
            if title not in infos:
                raise LookupError('no image info for ' + title)
            existing[ident] = fetch(ident, title, band, note, infos[title])
        except Exception as error:  # a bad licence or a missing file skips that entry only
            print('skipped', ident, repr(error), flush=True)
            continue
        order = [s[0] for s in SELECTION]
        records = [existing[i] for i in order if i in existing]  # ids dropped from SELECTION drop out
        manifest.write_text(json.dumps(records, ensure_ascii=False, indent=2) + '\n')
        print(ident, existing[ident]['license'], existing[ident]['bytes'], flush=True)


if __name__ == '__main__':
    main()
