"""Authored rural architecture, mountain civil engineering and crashed vessel.
Reference: fields/mountains kit sheets. Landing surfaces follow gameplay contracts.
"""
import math

def build(req,c):
 k=req['standIn'].split('.')[-1]
 if k=='farmhouse':
  from common import TEXTURES
  c.material('roofTile',(.85,.65,.55),TEXTURES/'trim/fields.png');c.bands['roofTile']=(.765,.09)
  c.box('Coursed foundation',(0,.7,0),(35,1.4,35),'stone',.2)
  for side in [-1,1]:
   for z in range(-15,16,5):c.box('Courtyard retaining stone',(side*16.8,1.4,z),(1.4,1.4,4.7),'stone',.12)
  c.box('Plaster walls',(0,4.6,-1),(18,7.8,18),'ivory',.2)
  # Gabled roof, a narrow level ridge supplies the exact y=12 landing.
  vs=[(-10,8.5,-11),(10,8.5,-11),(2.1,12,-11),(-2.1,12,-11),(-10,8.5,9),(10,8.5,9),(2.1,12,9),(-2.1,12,9)]
  c.mesh('Terracotta gable',vs,[(0,1,2,3),(4,7,6,5),(0,4,5,1),(0,3,7,4),(1,5,6,2),(3,2,6,7)],'roofTile')
  for z in range(-10,10,2):
   c.beam('Roof tile course L',(-9.95,8.57,z),(-2.1,12.06,z),.13,'gold');c.beam('Roof tile course R',(9.95,8.57,z),(2.1,12.06,z),.13,'gold')
  c.box('Chimney',(-6,8.8,-6),(2.1,6.4,2.1),'ivory',.08);c.box('Chimney crown',(-6,11.75,-6),(2.7,.45,2.7),'dark')
  for x in [-6,6]:
   for z in [-10.08,8.08]:
    c.box('Window recess',(x,5.8,z),(2.5,2.8,.2),'dark');c.box('Teal shutter',(x,5.8,z+.13),(2.1,2.4,.18),'glass');c.beam('Window mullion',(x,4.65,z+.24),(x,6.95,z+.24),.12,'wood')
  c.box('Front door',(0,3,8.18),(2.8,4.5,.32),'wood',.1)
  for i in range(4):c.box('Entry stair',(0,.3+i*.22,11-i*.6),(5,.6+i*.44,1.3),'stone')
  # Open timber veranda creates the farmhouse's recognisable sheltered side.
  for x in [-12,0,12]:
   c.box('Veranda post',(x,2.8,14),( .35,5.6,.35),'wood');c.beam('Post brace',(x,4,14),(x+1.8,5.5,14),.23,'wood')
  c.box('Porch roof',(0,5.65,12),(26,.4,6),'roofTile');c.beam('Porch fascia',(-13,5.4,15),(13,5.4,15),.35,'wood')
  c.socket('Landing.0',(0,12,0))
 elif k=='silo':
  c.cyl('Concrete drum',(0,10.5,0),5,21,'ivory',vertices=20)
  for y in [1,6,12,18,20.7]:c.torus('Compression band',(0,y,0),5,.12,'dark')
  # Closed conical cap: the summit physically meets the gameplay landing at 26 m.
  c.cyl('Cap cornice',(0,20.8,0),5.35,.4,'metal',vertices=20)
  c.cyl('Standing seam roof',(0,23.4,0),5.35,5.2,'metal',vertices=20,top_radius=.9)
  c.cyl('Summit hatch',(0,25.9,0),.95,.2,'gold',vertices=12)
  for i in range(9):
   a=i*math.tau/9;c.beam('Roof seam',(math.cos(a)*5.35,21,math.sin(a)*5.35),(math.cos(a)*.9,26,math.sin(a)*.9),.08,'gold')
  for x in [-.8,.8]:c.beam('Ladder rail',(x,.2,5.15),(x,25.8,5.15),.14,'dark')
  for y in range(1,26):c.beam('Ladder rung',(-.8,y,5.2),(.8,y,5.2),.12,'gold')
  c.box('Service door',(0,2,5.08),(2.7,4,.18),'dark',.05)
  for a in range(0,360,60):
   t=math.radians(a);c.beam('Drum seam',(math.cos(t)*5.01,1,math.sin(t)*5.01),(math.cos(t)*5.01,25,math.sin(t)*5.01),.07,'metal')
  # Offset grain vent retains the 32 m silhouette while the roof landing stays at 26 m.
  c.cyl('Grain exhaust flue',(-3.5,25.7,-3.5),.45,12.6,'metal',vertices=6)
  c.socket('Landing.0',(0,26,0))
 elif k=='seedPod':
  c.sphere('Buried hull',(0,11,0),(22,24,25),'ivory',segments=20,rings=12)
  # Raised segmented armour ribs and rivets distinguish the crashed ship from rock.
  for i in range(10):
   a=i*math.tau/10
   for j in range(5):
    p=.25+j*.44;q=p+.40
    v1=(11.1*math.sin(p)*math.cos(a),11+12.1*math.cos(p),12.6*math.sin(p)*math.sin(a))
    v2=(11.1*math.sin(q)*math.cos(a),11+12.1*math.cos(q),12.6*math.sin(q)*math.sin(a))
    c.beam('Armour panel seam',v1,v2,.20,'gold')
    if j%2==0:c.sphere('Hull rivet',v1,(.45,.45,.45),'metal',segments=6,rings=3)
  for x,z in [(-6,-5),(6,-6),(-8,2),(7,3)]:
   c.sphere('Reclaimed moss',(x,21,z),(3.4,1,3),'foliage',segments=7,rings=3)
  hatch=c.empty('HatchPivot',(0,12,12.5))
  ring=c.torus('Circular portal',(0,0,0),6,.8,'dark',axis='z',parent=hatch)
  iris=c.sphere('Iris',(0,0,.1),(10,10,1),'shadow',parent=hatch)
  c.torus('Iris power ring',(0,0,.7),3.9,.17,'core',axis='z',parent=hatch)
  for i in range(8):
   a=i*math.tau/8;c.box('Portal clamp',(math.cos(a)*6.2,12+math.sin(a)*6.2,13.2),(1,1,1),'metal')
  for x,z,h in [(-7,-5,13),(7,-5,11),(-8,4,8),(8,4,8),(0,-10,14)]:
   c.cyl('Hull spine',(x,20+h/2,z),1.5,h,'metal',vertices=5,top_radius=.05)
  for i in range(7):
   a=i*math.tau/7;c.sphere('Buried debris',(math.cos(a)*9,1,math.sin(a)*10),(5,2.5,4),'stone',segments=7,rings=4)
  c.socket('Spawn',(0,13.5,7.2));c.animate(hatch,'Open',[{'t':0,'rotation':[0,0,0]},{'t':1.2,'rotation':[-1.3,0,0]}]);c.animate(hatch,'Close',[{'t':0,'rotation':[-1.3,0,0]},{'t':1.2,'rotation':[0,0,0]}])
 elif k=='ravineBridge':
  c.box('Load-bearing deck',(0,0,0),(120,3,10),'wood')
  for x in range(-59,60,3):c.box('Individual deck plank',(x,1.39,0),(2.8,.23,9.8),'wood')
  for x in [-48,-24,0,24,48]:
   c.cyl('Slate pier',(x,-20,0),2,40,'stone',vertices=7,top_radius=1.35)
   c.box('Pier saddle',(x,-1.8,0),(4,1,10),'metal')
   for side in [-1,1]:c.beam('Timber knee brace',(x,-10,side*2),(x+9,-1.5,side*4),.65,'wood')
  for z in [-4.7,4.7]:
   for x in range(-60,61,10):c.box('Guard post',(x,2.3,z),(.25,1.6,.25),'wood')
   c.beam('Guard rail',(-60,3,z),(60,3,z),.22,'wood')
   c.beam('Steel deck edging',(-60,-1,z),(60,-1,z),.3,'metal')
  c.socket('Landing.0',(0,1.5,0))
 elif k=='transmitterMast':
  c.cyl('Slate foundation',(0,14.8,0),24,29.6,'stone',vertices=12,top_radius=14)
  c.cyl('Landing deck',(0,29.7,0),14,.6,'metal',vertices=20)
  for i,(y,r,h) in enumerate([(60,3,60),(120,2.4,60),(180,1.8,60)]):
   c.cyl('Mast segment',(0,y,0),r,h,'ivory',vertices=12,top_radius=r*.72)
   for angle in range(0,360,90):
    a=math.radians(angle);c.beam('Mast rib',(math.cos(a)*r,y-h/2,math.sin(a)*r),(math.cos(a)*r*.72,y+h/2,math.sin(a)*r*.72),.25,'dark')
  for x,z in [(-11,-11),(11,-11),(-11,11),(11,11)]:c.beam('Tower buttress',(x,30,z),(0,72,0),1,'metal')
  for i,y in enumerate([120,152.4,184.8]):
   ring=c.empty('RingPivot'+str(i),(0,y,0));c.torus('Signal ring',(0,0,0),16-i*4,.8,'red',parent=ring)
   for a in range(0,360,90):
    t=math.radians(a);c.beam('Signal ring spoke',(0,0,0),(math.cos(t)*(16-i*4),0,math.sin(t)*(16-i*4)),.28,'metal',parent=ring)
   c.animate(ring,'Signal_Scan',[{'t':0,'rotation':[0,0,0]},{'t':2,'rotation':[0,math.pi,0]},{'t':4,'rotation':[0,math.tau,0]}])
  c.sphere('Beacon lamp',(0,212,0),(8,8,8),'glow');c.socket('Beacon',(0,212,0));c.socket('Landing.0',(0,30,0))
 elif k=='windsock':
  c.cyl('Pole',(0,6,0),.22,12,'dark',vertices=8,top_radius=.14)
  for y in [0,4,8,11.5]:c.cyl('Pole collar',(0,y,.0),.35,.3,'gold',vertices=8)
  pivot=c.empty('WindPivot',(0,11.5,0));c.torus('Mouth hoop',(.8,0,0),1.4,.09,'gold',axis='x',parent=pivot)
  for j in range(6):
   verts=[]
   for end in range(2):
    x=.8+j+end;r=1.4-(j+end)*.13
    for i in range(8):
     a=i*math.tau/8;verts.append((x,math.cos(a)*r-.11*(j+end),math.sin(a)*r))
   c.mesh('Fabric stripe'+str(j),verts,[(i,(i+1)%8,(i+1)%8+8,i+8) for i in range(8)],'red' if j%2==0 else 'ivory',parent=pivot)
  c.animate(pivot,'Wind_Flutter',[{'t':0,'rotation':[0,-.15,0]},{'t':.7,'rotation':[0,.18,.08]},{'t':1.4,'rotation':[0,-.15,0]}])
 else:raise ValueError(k)
