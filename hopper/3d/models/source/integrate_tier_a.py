"""Integrate explicitly reviewed Tier A candidates; root-only delivery step.

Usage: python3 hopper/3d/models/source/integrate_tier_a.py M-084 M-085
Use M-092:fields to select a terrain within a shared request ID.
Run the full model validator immediately afterwards, before committing.
"""
import json
import shutil
import sys
from pathlib import Path

MODELS = Path(__file__).resolve().parent.parent
REPO = MODELS.parents[2]
WORK = REPO / 'local/hopper-tier-a'


def main(ids):
    if not ids or len(set(ids)) != len(ids):
        raise SystemExit('Supply distinct, explicitly reviewed request IDs.')
    manifest_file = MODELS / 'manifest.json'
    manifest = json.loads(manifest_file.read_text())
    entries = manifest['models']
    approved = []
    for selector in ids:
        request, separator, stem = selector.partition(':')
        if separator and (not stem or not stem.replace('-', '').isalnum()):
            raise ValueError(f'{selector}: invalid asset stem')
        reports = list((WORK / 'reports').glob(f'{request}-{stem if separator else "*"}.json'))
        if len(reports) != 1:
            raise ValueError(f'{request}: expected exactly one candidate report')
        report = json.loads(reports[0].read_text())
        source, candidate = REPO / report['source'], REPO / report['candidate']
        matches = [e for e in entries if e['request'] == request and (MODELS / e['file']).resolve() == source.resolve()]
        if len(matches) != 1:
            raise ValueError(f'{selector}: expected one matching production asset')
        entry = matches[0]
        if any(previous[2].resolve() == source.resolve() for previous in approved):
            raise ValueError(f'{selector}: duplicate production asset')
        if source.resolve() != (MODELS / entry['file']).resolve():
            raise ValueError(f'{request}: report path mismatch')
        if report['status'] != 'passed' or entry['processing'] != 'needs-cleanup':
            raise ValueError(f'{request}: invalid report/processing status')
        if source.stat().st_size != report['source_bytes']:
            raise ValueError(f'{request}: production source changed; re-review')
        if candidate.stat().st_size != report['candidate_bytes']:
            raise ValueError(f'{request}: candidate changed; re-review')
        if report['metrics']['triangles'] != entry['triangles']:
            raise ValueError(f'{request}: changed triangles need separate review')
        approved.append((entry, report, source, candidate))
    # Preflight every item before the first write. Originals stay recoverable
    # in git history; candidate/intermediate sources stay in ignored local/.
    for entry, report, source, candidate in approved:
        shutil.copy2(candidate, source)
        entry['processing'] = 'cleaned-tier-a'
        entry['bytes'] = report['candidate_bytes']
        entry['processingNotes'] = (
            f"Validated mechanical cleanup; {report['source_bytes']} to "
            f"{report['candidate_bytes']} bytes. Matched before/after renders "
            "reviewed. No clips removed. Tier B remains pending."
        )
        print(entry['request'], entry['bytes'])
    manifest_file.write_text(json.dumps(manifest, indent=2) + '\n')


if __name__ == '__main__':
    main(sys.argv[1:])
