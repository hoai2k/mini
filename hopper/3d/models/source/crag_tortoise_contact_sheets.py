"""Assemble existing Crag Tortoise QA renders; no source-art modification."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[4];OUT=ROOT/'local/hopper-crag-tortoise-refine';font=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',22)
views=['front','three-quarter','top','side'];clips=['Idle','Walk','Lunge_Tell','Lunge','Belly_Open_Hold','Withdraw','Hit','Dissolve']
def sheet(path,rows,cols,entries):
 result=Image.new('RGB',(550*cols,410*rows),(31,38,49));draw=ImageDraw.Draw(result)
 for row,col,file,label in entries:
  im=Image.open(OUT/file).convert('RGB');im.thumbnail((550,380));result.paste(im,(col*550,row*410+30));draw.text((col*550+10,row*410+3),label,font=font,fill='white')
 result.save(OUT/path,quality=94)
sheet('views-contact-sheet.jpg',4,2,[(i,l,f'LOD{l}-{v}.png',f'LOD{l} · {v}') for i,v in enumerate(views) for l in range(2)])
for lod in range(2):
 sheet(f'LOD{lod}-deformation-sheet.jpg',8,3,[(i,j,f'LOD{lod}-three-quarter-{c}-{p:.2f}.png',f'LOD{lod} · {c} · {p:.0%}') for i,c in enumerate(clips) for j,p in enumerate([0,.25,1] if c=='Walk' else [0,.5,1])])

sheet('walk-extremes-sheet.jpg',2,2,[(lod,i,f'LOD{lod}-three-quarter-Walk-{p:.2f}.png',f'LOD{lod} · Walk · {p:.0%}') for lod in range(2) for i,p in enumerate([.25,.75])])

extra=[('side','Walk',.25),('side','Walk',.75),('side','Lunge_Tell',1),('front','Belly_Open_Hold',.5),('side','Withdraw',.5)]
if all((OUT/f'LOD{lod}-{view}-{clip}-{phase:.2f}.png').exists() for lod in range(2) for view,clip,phase in extra):
 sheet('support-and-belly-sheet.jpg',5,2,[(i,lod,f'LOD{lod}-{view}-{clip}-{phase:.2f}.png',f'LOD{lod} · {clip} · {phase:.0%}') for i,(view,clip,phase) in enumerate(extra) for lod in range(2)])

# Final UV-only color review; full deformation was accepted before this seam pass.
sheet('lod1-seam-review-sheet.jpg',3,2,[(i//2,i%2,f'LOD1-{view}'+(f'-{clip}-{phase:.2f}' if clip else '')+'.png',f'LOD1 · {view}'+(f' · {clip}' if clip else '')) for i,(view,clip,phase) in enumerate([(v,None,0) for v in views]+[('three-quarter','Walk',.25),('three-quarter','Belly_Open_Hold',.5)])])
