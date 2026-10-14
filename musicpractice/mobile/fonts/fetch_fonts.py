#!/usr/bin/env python3
"""Download the themes' Google Fonts into this folder for the iOS and Android
apps, so they work offline and never contact Google. Latin and Latin
Extended only (the app's text). Run again after changing a theme's fonts in
../../app/src/settings.js; copy-web.sh copies the result into the apps.

    python3 musicpractice/mobile/fonts/fetch_fonts.py
"""
import json, re, subprocess, sys, urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
SETTINGS = HERE.parent.parent / 'app' / 'src' / 'settings.js'
UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'
KEEP = {'latin', 'latin-ext'}

def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()

def themes():
    text = SETTINGS.read_text()
    return re.findall(r"\{ id: '([a-z]+)'.*?fonts: '([^']+)' \}", text)

def main():
    files = HERE / 'files'
    files.mkdir(exist_ok=True)
    used = set()
    families = set()
    for theme, query in themes():
        css = get(f'https://fonts.googleapis.com/css2?{query}&display=swap').decode()
        out = []
        for subset, block in re.findall(r'/\* ([\w-]+) \*/\s*(@font-face \{.*?\})', css, re.S):
            if subset not in KEEP:
                continue
            family = re.search(r"font-family: '([^']+)'", block).group(1)
            weight = re.search(r'font-weight: ([\d ]+);', block).group(1).replace(' ', '-')
            style = re.search(r'font-style: (\w+);', block).group(1)
            url = re.search(r'url\((https://[^)]+)\)', block).group(1)
            name = f"{family.replace(' ', '')}-{weight}-{style}-{subset}.woff2"
            if name not in used:
                (files / name).write_bytes(get(url))
                used.add(name)
            families.add(family)
            out.append(f'/* {subset} */\n' + block.replace(url, f'files/{name}'))
        (HERE / f'{theme}.css').write_text('\n'.join(out) + '\n')
        print(theme, len(out), 'faces')
    for f in files.iterdir():
        if f.name not in used:
            f.unlink()
    (HERE / 'families.json').write_text(json.dumps(sorted(families), indent=2) + '\n')

if __name__ == '__main__':
    main()
