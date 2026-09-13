"""Assemble labelled QA contact sheets from authored Blender renders."""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
ROOT=Path(__file__).resolve().parents[3];OUT=ROOT/'local/hopper-animation-extension';qa=OUT/'qa'
r=json.loads((OUT/'validation.json').read_text())
font=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',20)
for group,clips in r['clips'].items():
 for start in range(0,len(clips),5):
  batch=clips[start:start+5];sheet=Image.new('RGB',(1440,len(batch)*395),(31,39,51));d=ImageDraw.Draw(sheet)
  for row,c in enumerate(batch):
   for col in range(3):
    p=qa/f"hopper-rider-{c['name']}-{col}.png";sheet.paste(Image.open(p).convert('RGB'),(col*480,row*395+35))
   d.text((12,row*395+7),f"{c['name']}  |  {c['duration']:.2f}s  |  {'loop 0 / 33 / 67%' if c['loop'] else '10 / 45 / 90%'}",font=font,fill='white')
  dest=OUT/f'{group}-keyposes-{start//5+1}.jpg';sheet.save(dest,quality=92);print(dest)
