"""Assemble existing Spire Leech QA renders; no source-art modification."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[4];OUT=ROOT/'local/hopper-spire-leech-refine';font=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',22)
views=['side','three-quarter','top','mouth'];clips=['Cling_Idle','Crawl','Charge_Tell','Beam_Hold','Retract','Hit','Dissolve']
def sheet(path,rows,cols,entries):
 result=Image.new('RGB',(600*cols,355*rows),(31,38,49));draw=ImageDraw.Draw(result)
 for row,col,file,label in entries:
  im=Image.open(OUT/file).convert('RGB');im.thumbnail((600,325));result.paste(im,(col*600,row*355+30));draw.text((col*600+10,row*355+3),label,font=font,fill='white')
 result.save(OUT/path,quality=94)
sheet('views-contact-sheet.jpg',4,2,[(i,l,f'LOD{l}-{v}.png',f'LOD{l} · {v}') for i,v in enumerate(views) for l in range(2)])
for lod in range(2):
 sheet(f'LOD{lod}-deformation-sheet.jpg',7,3,[(i,j,f'LOD{lod}-three-quarter-{c}-{p:.2f}.png',f'LOD{lod} · {c} · {p:.0%}') for i,c in enumerate(clips) for j,p in enumerate([0,.5,1])])
