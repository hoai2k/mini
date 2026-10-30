"""Verify offline links, fragment targets, attribution coverage and asset integrity."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
import hashlib
import json

ROOT = Path(__file__).resolve().parent


class Document(HTMLParser):
    def __init__(self, path):
        super().__init__(convert_charrefs=True)
        self.path, self.ids, self.links, self.images = path, set(), [], []
        self.h1_count = 0
        self.feed(path.read_text())

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs:
            assert attrs['id'] not in self.ids, (self.path, 'duplicate ID', attrs['id'])
            self.ids.add(attrs['id'])
        if tag == 'h1':
            self.h1_count += 1
        if tag == 'img':
            assert attrs.get('alt'), (self.path, 'missing image alt')
            self.images.append(attrs['src'])
        for attr in ('href', 'src'):
            if attr in attrs:
                self.links.append(attrs[attr])


def main():
    docs = {p.resolve(): Document(p) for p in ROOT.glob('*.html') if not p.name.startswith('._')}
    assert len(docs) == 9, len(docs)
    links = 0
    images = set()
    for path, doc in docs.items():
        assert doc.h1_count == 1, path
        for link in doc.links:
            parsed = urlsplit(link)
            if parsed.scheme or parsed.netloc:
                continue
            target = (path.parent / unquote(parsed.path)).resolve() if parsed.path else path
            assert target.exists(), (path.name, 'missing local target', link)
            assert ROOT == target or ROOT in target.parents, (path.name, 'outside atlas', link)
            if parsed.fragment and target in docs:
                assert unquote(parsed.fragment) in docs[target].ids, (path.name, 'missing fragment', link)
            links += 1
        images.update(doc.images)
    records = json.loads((ROOT / 'assets/references/manifest.json').read_text())
    assert len(records) == 12
    for record in records:
        data = (ROOT / record['local']).read_bytes()
        assert hashlib.sha256(data).hexdigest() == record['sha256'], record['id']
        assert record['author'] and record['license'] and record['source'], record['id']
        assert record['local'] in images, ('unused reference', record['id'])
        assert 'ref-' + record['id'] in docs[(ROOT / 'sources.html').resolve()].ids
    concepts = [p for p in (ROOT / 'assets/concepts').glob('*.webp') if not p.name.startswith('._')]
    assert len(concepts) == 4
    for path in concepts:
        assert str(path.relative_to(ROOT)) in images, path
    print(f'PASS: {len(docs)} pages, {links} local links, {len(images)} unique images, 12 verified reference checksums, 4 concept boards.')


if __name__ == '__main__':
    main()
