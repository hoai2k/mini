"""Render source/design.md to ../Hopper_3D_Design.html, a single self-contained
page in the design package's layout (same markdown subset as build_document.py).
Any browser prints it to PDF; the repository's PDF is made that way with
headless Chromium when LibreOffice is unavailable.
"""
from pathlib import Path
import base64
import html
import re

ROOT = Path(__file__).resolve().parents[1]
source = ROOT / 'source/design.md'
text = source.read_text()

def inline(s):
    s = html.escape(s, quote=False)
    s = re.sub(r'\*\*([^*]+)\*\*', r'<b>\1</b>', s)
    s = re.sub(r'`([^`]+)`', r'<code>\1</code>', s)
    return s

def image_data(path):
    data = base64.b64encode(path.read_bytes()).decode()
    return f'data:image/png;base64,{data}'

out = []
pages = text.split('<!-- page -->')
for pageidx, page in enumerate(pages):
    out.append('<section class="page">')
    lines = page.strip().splitlines(); i = 0
    while i < len(lines):
        line = lines[i].strip()
        if not line: i += 1; continue
        if line.startswith('|'):
            rows = []
            while i < len(lines) and lines[i].strip().startswith('|'):
                cells = [c.strip() for c in lines[i].strip().strip('|').split('|')]
                if not all(re.fullmatch('[-: ]+', c) for c in cells): rows.append(cells)
                i += 1
            out.append('<table><thead><tr>' + ''.join(f'<th>{inline(c)}</th>' for c in rows[0]) + '</tr></thead><tbody>')
            for r in rows[1:]: out.append('<tr>' + ''.join(f'<td>{inline(c)}</td>' for c in r) + '</tr>')
            out.append('</tbody></table>')
            continue
        if line.startswith('- ') or re.match(r'^\d+\. ', line):
            ordered = not line.startswith('- ')
            out.append('<ol>' if ordered else '<ul>')
            while i < len(lines) and (lines[i].strip().startswith('- ') or re.match(r'^\d+\. ', lines[i].strip())):
                out.append('<li>' + inline(re.sub(r'^(- |\d+\. )', '', lines[i].strip())) + '</li>'); i += 1
            out.append('</ol>' if ordered else '</ul>')
            continue
        m = re.match(r'!\[(.*?)\]\((.*?)\)', line)
        if m:
            path = (source.parent / m.group(2)).resolve()
            out.append(f'<figure><img src="{image_data(path)}" alt="{html.escape(m.group(1))}"><figcaption>{inline(m.group(1))}</figcaption></figure>')
        elif line.startswith('# '): out.append(f'<h1>{inline(line[2:])}</h1>')
        elif line.startswith('## '): out.append(f'<h2 class="{"subtitle" if pageidx == 0 else ""}">{inline(line[3:])}</h2>')
        elif line.startswith('### '): out.append(f'<h3>{inline(line[4:])}</h3>')
        else: out.append(f'<p>{inline(line)}</p>')
        i += 1
    out.append('</section>')

css = """
@page { size: Letter; margin: 0.64in 0.68in; }
body { font-family: Arial, Helvetica, sans-serif; font-size: 11pt; line-height: 1.4; color: #000; margin: 0; background: #fff; }
.page { page-break-after: always; max-width: 7.14in; margin: 0 auto; padding: 0.4in 0; }
.page:last-child { page-break-after: auto; }
h1 { font-size: 29pt; margin: 0 0 4pt; }
h2 { font-size: 21pt; margin: 14pt 0 9pt; }
h2.subtitle { font-size: 15pt; font-weight: normal; margin: 0 0 12pt; }
h3 { font-size: 13pt; margin: 12pt 0 6pt; }
p { margin: 0 0 7pt; }
li { margin: 0 0 3pt; font-size: 10.5pt; }
code { font-family: Consolas, Menlo, monospace; font-size: 9.5pt; }
figure { margin: 8pt 0 12pt; text-align: center; page-break-inside: avoid; }
figure img { width: 100%; max-width: 7.14in; border: 1px solid #d9d9d9; }
figcaption { font-size: 9pt; color: #505a54; margin-top: 4pt; }
table { border-collapse: collapse; width: 100%; margin: 4pt 0 10pt; font-size: 9.5pt; page-break-inside: auto; }
th, td { border: 1px solid #d9d9d9; padding: 5px 7px; vertical-align: middle; text-align: left; }
th { background: #283b50; color: #fff; }
tr:nth-child(even) td { background: #f2f4f7; }
tr { page-break-inside: avoid; }
.watermark { position: fixed; top: 0.2in; left: 0.68in; font-size: 8pt; color: #000; }
@media screen { body { background: #e9e6df; } .page { background: #fff; box-shadow: 0 2px 12px #0002; padding: 0.64in 0.68in; margin: 16px auto; } }
"""
doc = f'<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Hopper the Grasshopper · 3D edition · design and plan</title><style>{css}</style></head><body>' + ''.join(out) + '</body></html>'
(ROOT / 'Hopper_3D_Design.html').write_text(doc)
print(f'Created {ROOT / "Hopper_3D_Design.html"}; {len(pages)} sections; {len(doc) // 1024} KB')
