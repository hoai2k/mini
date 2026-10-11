#!/usr/bin/env python3
"""Web copies of the 3D concept sheets for the model workbench.

Copies the voxel concept sheets from design/concept/ to
game/assets/concept/<sheet>.jpg (1600 px wide) and writes
game/workbench/sources.json, which tells the workbench inspector which
sheet, and which part of it, each model was built from.

    python3 percyjackson/design/source/build_concept_web.py           # build
    python3 percyjackson/design/source/build_concept_web.py --check   # verify present
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'design' / 'concept'
OUT = ROOT / 'game' / 'assets' / 'concept'
MAP = ROOT / 'game' / 'workbench' / 'sources.json'
W, H = 2000, 1333   # the boxes below are measured on a 2000 × 1333 view of each sheet

SHEETS = ['vox-percy', 'vox-annabeth', 'vox-grover', 'vox-tyson', 'vox-clarisse', 'vox-thalia', 'vox-nico',
          'vox-npcs', 'vox-enemies', 'vox-bosses-1', 'vox-bosses-2']

# model key (group:id) -> (sheet, box x0, y0, x1, y1 or None for the whole sheet, caption)
SOURCES = {
    **{f'heroes:{h}': (f'vox-{h}', None, f'3D sheet: {h.title()}') for h in ['percy', 'annabeth', 'grover', 'tyson', 'clarisse', 'thalia', 'nico']},
    'npcs:chiron': ('vox-npcs', (0, 90, 600, 625), 'Chiron, centaur form'),
    'npcs:mr_d': ('vox-npcs', (1120, 150, 1585, 625), 'Mr. D'),
    'monsters:pup': ('vox-enemies', (120, 190, 420, 365), 'Hellhound pup'),
    'monsters:spider': ('vox-enemies', (515, 190, 985, 360), 'Bronze automaton spider'),
    'monsters:hellhound': ('vox-enemies', (80, 430, 690, 820), 'Hellhound'),
    'monsters:dracaena': ('vox-enemies', (690, 410, 1075, 815), 'Dracaena'),
    'monsters:skeleton': ('vox-enemies', (160, 940, 545, 1240), 'Skeleton warrior'),
    'monsters:empousa': ('vox-enemies', (630, 840, 1090, 1240), 'Empousa'),
    'monsters:fury': ('vox-enemies', (1100, 820, 1990, 1260), 'Fury'),
    'bosses:alecto': ('vox-enemies', (1100, 820, 1990, 1260), 'Fury (Alecto)'),
    'bosses:furies': ('vox-enemies', (1100, 820, 1990, 1260), 'Fury'),
    'bosses:hellhound_alpha': ('vox-enemies', (80, 430, 690, 820), 'Hellhound'),
    'bosses:spiders': ('vox-enemies', (515, 190, 985, 360), 'Bronze automaton spiders'),
    'bosses:minotaur': ('vox-bosses-1', (0, 20, 640, 645), 'The Minotaur'),
    'bosses:medusa': ('vox-bosses-1', (610, 70, 1090, 630), 'Medusa'),
    'bosses:chimera': ('vox-bosses-1', (1100, 70, 1990, 630), 'The Chimera and Echidna'),
    'bosses:procrustes': ('vox-bosses-1', (10, 660, 810, 1290), 'Procrustes'),
    'bosses:cerberus': ('vox-bosses-1', (770, 665, 1450, 1265), 'Cerberus'),
    'bosses:ares': ('vox-bosses-1', (1390, 660, 1995, 1215), 'Ares'),
    'bosses:luke': ('vox-npcs', (1590, 120, 1995, 625), 'Luke'),
    'mortals:teacher': ('vox-npcs', (1040, 740, 1450, 1255), 'Mrs. Dodds'),
}


def main():
    check = '--check' in sys.argv
    missing = [s for s in SHEETS if not (OUT / f'{s}.jpg').is_file()]
    if check:
        if missing or not MAP.is_file():
            sys.exit('concept web copies missing: ' + ', '.join(missing or ['sources.json']))
        print(f'concept web copies present ({len(SHEETS)} sheets)')
        return
    from PIL import Image
    OUT.mkdir(parents=True, exist_ok=True)
    for s in SHEETS:
        with Image.open(SRC / f'{s}.png') as im:
            im = im.convert('RGB')
            im.thumbnail((1600, 1600), Image.LANCZOS)
            im.save(OUT / f'{s}.jpg', 'JPEG', quality=82, optimize=True, progressive=True)
    out = {}
    for key, (sheet, box, caption) in SOURCES.items():
        b = [0, 0, 1, 1] if box is None else [round(box[0] / W, 4), round(box[1] / H, 4), round((box[2] - box[0]) / W, 4), round((box[3] - box[1]) / H, 4)]
        out[key] = {'sheet': f'../assets/concept/{sheet}.jpg', 'design': f'design/concept/{sheet}.png', 'box': b, 'caption': caption}
    MAP.write_text(json.dumps(out, indent=1) + '\n')
    print(f'wrote {len(SHEETS)} sheets and {len(out)} sources')


if __name__ == '__main__':
    main()
