"""Compress all authored records; requires node and gltfpack (or GLTFPACK env).
Run after build.py. Intermediates stay in repository local/.
"""
import json, os, shutil, subprocess
from pathlib import Path
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[3]
WORK=ROOT/'local/hopper-model-production'
OUT=HERE.parent
node=os.environ.get('NODE') or shutil.which('node')
if not node: raise SystemExit('Install Node.js or set NODE to its executable')
requests=json.loads((HERE/'requests.json').read_text())
records=[]
for req in requests:
    record=json.loads((WORK/'records'/(req['request']+'.json')).read_text())
    dest=OUT/record['file'];dest.parent.mkdir(parents=True,exist_ok=True)
    subprocess.run([node,str(HERE/'compress.mjs'),str(WORK/'raw'/record['file']),str(dest),'--force'],check=True)
    records.append(record)
(OUT/'manifest.json').write_text(json.dumps({'version':1,'status':'built-awaiting-review','models':records},indent=2)+'\n')
