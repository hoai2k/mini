"""Assemble existing Window Ray QA renders; no source-art modification."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[4];OUT=ROOT/'local/hopper-window-ray-refine';font=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',22)
views=['front','three-quarter','top','side'];clips=['Hover','Bank_L','Bank_R','Dive_Tell','Dive','Recover','Hit','Dissolve']
def sheet(path,rows,cols,entries):
 result=Image.new('RGB',(550*cols,410*rows),(31,38,49));draw=ImageDraw.Draw(result)
 for row,col,file,label in entries:
  im=Image.open(OUT/file).convert('RGB');im.thumbnail((550,380));result.paste(im,(col*550,row*410+30));draw.text((col*550+10,row*410+3),label,font=font,fill='white')
 result.save(OUT/path,quality=94)
sheet('views-contact-sheet.jpg',4,2,[(i,l,f'LOD{l}-{v}.png',f'LOD{l} · {v}') for i,v in enumerate(views) for l in range(2)])
for lod in range(2):
 sheet(f'LOD{lod}-deformation-sheet.jpg',8,3,[(i,j,f'LOD{lod}-three-quarter-{c}-{p:.2f}.png',f'LOD{lod} · {c} · {p:.0%}') for i,c in enumerate(clips) for j,p in enumerate([0,.25,1] if c=='Hover' else [0,.5,1])])

sheet('hover-extremes-sheet.jpg',2,2,[(lod,i,f'LOD{lod}-three-quarter-Hover-{p:.2f}.png',f'LOD{lod} · Hover · {p:.0%}') for lod in range(2) for i,p in enumerate([.25,.75])])
