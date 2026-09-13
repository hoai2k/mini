"""Create review sheets from the isolated Chain Manta studio renders."""
from pathlib import Path
from PIL import Image, ImageDraw
ROOT=Path(__file__).resolve().parents[4]
OUT=ROOT/'local/hopper-chain-manta-refine'
def sheet(names,cols,path):
 w,h=440,328;canvas=Image.new('RGB',(cols*w,((len(names)+cols-1)//cols)*h),'#202630');draw=ImageDraw.Draw(canvas)
 for i,name in enumerate(names):
  im=Image.open(OUT/name).convert('RGB');im.thumbnail((w,h-24));x=(i%cols)*w;y=(i//cols)*h;canvas.paste(im,(x+(w-im.width)//2,y+24));draw.text((x+8,y+7),name.removesuffix('.png'),fill='white')
 canvas.save(OUT/path)
views=['front','three-quarter','top','side']
sheet([f'LOD{lod}-{view}.png' for lod in [0,1] for view in views],4,'contact-rest.png')
for lod in [0,1]:
 names=[]
 for clip in ['Soar','Tether_Tell','Tether_Pull','Release','Bank','Hit','Dissolve']:
  names.extend(f'LOD{lod}-three-quarter-{clip}-{phase:.2f}.png' for phase in [0,.5,1])
 sheet(names,3,f'contact-clips-LOD{lod}.png')
sheet([f'LOD{lod}-three-quarter-Soar-{phase:.2f}.png' for lod in [0,1] for phase in [0,.25,.5,.75,1]],5,'contact-soar-extrema.png')
