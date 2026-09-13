"""Label the Turbine Wasp's existing QA renders; no source artwork edits."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
ROOT=Path(__file__).resolve().parents[4];OUT=ROOT/'local/hopper-wasp-refine'
font=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',23)
for category,items in [('views',['front','three-quarter','side','top']),('clips',['Hover','Intake_Tell','Dash','Guard_Break','Hit','Dissolve'])]:
 sheet=Image.new('RGB',(1100,len(items)*440),(31,38,49));draw=ImageDraw.Draw(sheet)
 for row,name in enumerate(items):
  for lod in range(2):
   file=OUT/(f'LOD{lod}-{name}.png' if category=='views' else f'LOD{lod}-three-quarter-{name}.png')
   im=Image.open(file).convert('RGB');im.thumbnail((550,410));sheet.paste(im,(lod*550,row*440+30))
   draw.text((lod*550+10,row*440+3),f'LOD{lod} · {name}',font=font,fill='white')
 sheet.save(OUT/f'{category}-contact-sheet.jpg',quality=94)
