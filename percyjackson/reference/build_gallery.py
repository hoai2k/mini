#!/usr/bin/env python3
"""Build the Percy Jackson style-reference gallery from manifest.json.

Every image listed in manifest.json must exist under images/. The script checks
that each one decodes, records its size and writes index.html, a filterable
gallery grouped by style family. Run it after editing the manifest:

    python3 percyjackson/reference/build_gallery.py
"""
from pathlib import Path
import html
import json
from PIL import Image

FOLDER = Path(__file__).resolve().parent
manifest = json.loads((FOLDER / 'manifest.json').read_text())
esc = html.escape

families = manifest['families']
family_ids = [f['id'] for f in families]
cards = []
for item in manifest['images']:
    path = FOLDER / 'images' / item['file']
    with Image.open(path) as image:
        image.verify()
    with Image.open(path) as image:
        item['size'] = list(image.size)
    assert item['family'] in family_ids, (item['file'], item['family'])
    family = next(f for f in families if f['id'] == item['family'])
    who = ', '.join(item['characters']) or 'Setting / title art'
    credit = ' · '.join(x for x in [item.get('artist'), item['source_work']] if x)
    link = f' · <a href="{esc(item["page_url"] or item["image_url"])}">source</a>'
    cards.append(f'''<article data-family="{item['family']}">
<a href="images/{esc(item['file'])}"><img loading="lazy" src="images/{esc(item['file'])}" alt="{esc(item['what_it_shows'])}" width="{item['size'][0]}" height="{item['size'][1]}"></a>
<div><small>{esc(family['label'])} · {esc(str(item.get('year') or ''))}</small><h2>{esc(item['title'])}</h2>
<p class="who">{esc(who)}</p><p>{esc(item['what_it_shows'])}</p><p class="style">{esc(item['style_notes'])}</p>
<p class="credit">{esc(credit)}{link}</p></div></article>''')

buttons = ''.join(
    f'<button data-family="{f["id"]}" aria-pressed="false">{esc(f["label"])}</button>' for f in families)
count = len(manifest['images'])
(FOLDER / 'index.html').write_text('''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Percy Jackson · Style references</title><style>
*{box-sizing:border-box}body{margin:0;background:#0f1d2b;color:#e8eef3;font:16px/1.55 system-ui}header,main{max-width:1600px;margin:auto;padding:24px 16px}
h1,h2{font-family:Georgia,serif}h1{font-size:clamp(28px,4vw,46px);margin:0 0 8px}h2{font-size:20px;margin:4px 0}a{color:#f2b544}
main{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr));gap:20px;align-items:start}
article{border:1px solid #2f4a63;border-radius:8px;overflow:hidden;background:#142739}article img{display:block;width:100%;height:auto;background:#1c3349}
article>div{padding:14px 16px}small{color:#9fb6c9}.who{font-weight:600;margin:0}.style{color:#c9d8e4;font-style:italic}.credit{font-size:13px;color:#9fb6c9}
nav{display:flex;gap:8px;flex-wrap:wrap}button,input{font:inherit;font-size:14px;padding:8px 10px;background:#142739;color:#e8eef3;border:1px solid #f2b544;border-radius:4px}
button[aria-pressed=true]{background:#7a5a12}[hidden]{display:none}</style></head><body>
<header><h1>Percy Jackson · Style references</h1>
<p>How Percy, Annabeth and their world have been drawn, painted, filmed and staged, gathered to choose an art direction for the game. Read the comparison in <a href="README.md">README.md</a>. All images belong to their credited owners and are kept here as private reference only.</p>
<nav aria-label="Filter by style family"><button data-family="all" aria-pressed="true">All ''' + str(count) + '''</button>''' + buttons + '''<input id="search" type="search" aria-label="Search" placeholder="Search"></nav><p id="count" aria-live="polite"></p></header>
<main>''' + '\n'.join(cards) + '''</main><script>
let fam='all';const cards=[...document.querySelectorAll('article')],search=document.querySelector('#search');
function filter(){let n=0;for(const c of cards){c.hidden=(fam!=='all'&&c.dataset.family!==fam)||!c.textContent.toLowerCase().includes(search.value.toLowerCase());if(!c.hidden)n++}document.querySelector('#count').textContent=n+' images shown'}
for(const b of document.querySelectorAll('button[data-family]'))b.addEventListener('click',()=>{fam=b.dataset.family;for(const x of document.querySelectorAll('button[data-family]'))x.setAttribute('aria-pressed',String(x===b));filter()});
search.addEventListener('input',filter);filter();</script></body></html>
''')
print(f'Validated {count} images and wrote index.html.')
