#!/usr/bin/env python3
"""Prepare saved film-edition artwork at its requested size and anchor.

Retain native originals and generation records; reuse the existing sprite
delivery fitting routine. No generated artwork is repainted.
"""
from pathlib import Path
import json
from datetime import datetime, timedelta, timezone
from PIL import Image
from prepare_part_c_delivery import fit_sprite

GAME = Path(__file__).resolve().parents[2]
BATCH = GAME / 'design/generated/film-production'
manifest_path = GAME / 'assets/manifest.json'
manifest = json.loads(manifest_path.read_text())
records = []
for path in sorted(BATCH.glob('*.json')):
    if path.name == 'deliveries.json':
        continue
    record = json.loads(path.read_text())
    ident = record['id']
    original = BATCH / (ident + '-original.png')
    with Image.open(original) as source:
        source.verify()
    with Image.open(original) as source:
        source = source.convert('RGBA')
        native = list(source.size)
        w, h = record['size']
        if record['transparent']:
            assert source.getchannel('A').getextrema()[0] == 0, ident + ': missing transparency'
            final, crop, placement = fit_sprite(source, w, h, record['anchor'], ident == 'rampart-strip')
            assert final.getchannel('A').getbbox(), ident + ': empty artwork'
        else:
            final = source.convert('RGB').resize((w, h), Image.Resampling.LANCZOS)
            crop = placement = None
        delivery = GAME / 'assets' / (ident + '.webp')
        final.save(delivery, 'WEBP', quality=95, method=6)
        with Image.open(delivery) as check:
            assert check.size == (w, h), ident
            if record['transparent']:
                assert check.mode == 'RGBA' and check.getchannel('A').getextrema()[0] == 0, ident
    record.update(original=str(original.relative_to(GAME)), file=str(delivery.relative_to(GAME)),
                  native_size=native, source_crop=crop, placement=placement)
    records.append(record)
    slot = manifest['slots'][ident]
    slot.update(status='delivered', file=ident + '.webp', size=[w, h], anchor=record['anchor'], edition='film')
manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
(BATCH / 'deliveries.json').write_text(json.dumps({'generated': len(records), 'images': records}, indent=2) + '\n')
print('Validated and prepared', len(records), 'film production images.')
progress = BATCH / 'progress'
progress.mkdir(exist_ok=True)
now = datetime.now(timezone.utc)
pending = sum(slot.get('edition') == 'film' and slot.get('status') != 'delivered'
              for slot in manifest['slots'].values())
(progress / 'state.json').write_text(json.dumps({
    'active': pending > 0, 'completed': len(records), 'pending': pending,
    'updated_at': now.isoformat(),
    'lease_expires_at': (now + timedelta(minutes=90)).isoformat() if pending else None,
}, indent=2) + '\n')
