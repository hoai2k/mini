"""M-011 canonical Chain Manta art candidate, isolated from production.

Blender -b --python hopper/3d/models/source/chain_manta_refine.py -- --qa
Two 18-joint skins retain the scaffold interface. Individually interlocked chain
links follow the shared six-joint spline; the two hooks have separate joints.
"""
import bpy,math,json,sys,shutil,subprocess,struct
from pathlib import Path
from mathutils import Vector
HERE=Path(__file__).resolve().parent;sys.path.insert(0,str(HERE))
from common import Context,ROOT,TEXTURES,v
import chain_manta as cm
from wasp_refine import loft,patch,normals
from phase_skate_refine import shell,catmull,tube
import window_ray_refine as qa
OUT=ROOT/'local/hopper-chain-manta-refine';OUT.mkdir(parents=True,exist_ok=True)
qa.OUT=OUT;qa.wr=cm

def bind(o,arm,pre,kind='Body'):
 rows=[]
 for vertex in o.data.vertices:
  x,y,z=vertex.co.x,vertex.co.z,-vertex.co.y
  rows.append(cm.wing_influences(-1 if x<0 else 1,x) if kind=='Wing' else (cm.tail_influence(z) if kind=='Tail' else [(kind,1)]))
 cm.add_skin(o,rows,arm,pre);return o

def mesh(c,name,verts,faces,mat,root,arm,pre,kind='Body',smooth=True):
 o=c.mesh(pre+name,verts,faces,mat,root);bind(o,arm,pre,kind)
 return normals(o) if smooth else o

def plate(c,name,outline,height,mat,root,arm,pre,kind,low,center=None):
 o=shell(c,pre+name,outline,mat,root,height,center,1 if low else 2);return bind(o,arm,pre,kind)

def wing(c,sign,root,arm,pre,m,low):
 side='L' if sign<0 else 'R'
 # Distinct broad forward hook, sharp outer sweep, and stepped aft membrane.
 anchors=[(.62,1.38),(1.62,1.76),(2.82,1.88),(4.05,1.60),(5.38,1.12),(6.65,.12),(7.10,-.84),(5.83,-.30),(4.73,-.12),(4.41,-.40),(4.04,-.18),(3.64,-.55),(3.23,-.40),(2.81,-.75),(2.22,-.60),(1.73,-1.08),(.72,-.76)]
 center=Vector((2.35,.38));n=len(anchors);verts=[];faces=[]
 rings=[(1,0),(.64,.19),(.24,.30)] if not low else [(1,0),(.40,.26)]
 def baseline(x,z):return 4.30+.055*(7.1-x)+.10*z
 for rad,h in rings:
  for p in anchors:
   q=center+(Vector(p)-center)*rad;verts.append((sign*q.x,baseline(q.x,q.y)+h,q.y))
 top=len(verts);verts.append((sign*center.x,baseline(*center)+.32,center.y));bottom=len(verts);verts.append((sign*center.x,4.20,center.y))
 for r in range(len(rings)-1):
  for i in range(n):j=(i+1)%n;faces.append((r*n+i,r*n+j,(r+1)*n+j,(r+1)*n+i))
 for i in range(n):j=(i+1)%n;faces.extend([((len(rings)-1)*n+i,(len(rings)-1)*n+j,top),(j,i,bottom)])
 mesh(c,f'Wing.{side}.Cambered',verts,faces,m['hide'],root,arm,pre,'Wing')
 # Sampling the actual triangulated foil keeps plates and violet rims seated.
 triangles=[]
 for face in faces[:-n*2]:
  for ids in [(face[0],face[1],face[2]),(face[0],face[2],face[3])]:triangles.append([Vector((abs(verts[i][0]),verts[i][1],verts[i][2])) for i in ids])
 for i in range(n):triangles.append([Vector((abs(verts[j][0]),verts[j][1],verts[j][2])) for j in ((len(rings)-1)*n+i,(len(rings)-1)*n+(i+1)%n,top)])
 def foil(x,z):
  for a,b,d in triangles:
   den=(b.z-d.z)*(a.x-d.x)+(d.x-b.x)*(a.z-d.z)
   if abs(den)<1e-9:continue
   u=((b.z-d.z)*(x-d.x)+(d.x-b.x)*(z-d.z))/den;w=((d.z-a.z)*(x-d.x)+(a.x-d.x)*(z-d.z))/den;t=1-u-w
   if min(u,w,t)>=-1e-5:return a.y*u+b.y*w+d.y*t
  return baseline(x,z)
 for row,(x,z,sx,sz) in enumerate([(1.33,.94,.56,.57),(2.24,1.04,.70,.60),(3.27,.90,.75,.53),(4.32,.63,.72,.43),(1.48,-.10,.60,.48),(2.42,-.05,.67,.48),(3.44,.01,.68,.42),(5.25,.29,.65,.26)]):
  shape=[(-.65,.35),(-.12,.72),(.67,.40),(.75,-.20),(.23,-.75),(-.72,-.43)]
  outline=[(sign*(x+dx*sx),foil(x+dx*sx,z+dz*sz)+.012,z+dz*sz) for dx,dz in shape]
  plate(c,f'Wing.{side}.LappedScale.{row}',outline,.075,m['shell'],root,arm,pre,'Wing',low)
 vv=[]
 for rad in [1,.974]:
  for p in anchors:
   q=center+(Vector(p)-center)*rad;vv.append((sign*q.x,foil(q.x,q.y)+.008,q.y))
 mesh(c,f'Wing.{side}.VioletLip',vv,[(i,(i+1)%n,n+(i+1)%n,n+i) for i in range(n)],m['edge'],root,arm,pre,'Wing')
 # Narrow branching violet fissures follow the foil rather than floating tubes.
 for line,pts in enumerate([[(1.76,1.71),(2.10,1.02),(1.85,.62),(2.43,-.56)],[(3.01,1.79),(3.19,1.05),(3.86,.82),(4.14,-.20)]]):
  vv=[]
  for x,z in pts:
   for dx in [-.025,.025]:vv.append((sign*(x+dx),foil(x+dx,z)+.09,z))
  mesh(c,f'Wing.{side}.Fissure.{line}',vv,[(i*2,i*2+1,i*2+3,i*2+2) for i in range(len(pts)-1)],m['edge'],root,arm,pre,'Wing')

def link(c,name,center,tangent,major,minor,radius,mat,root,arm,pre,bone,low,alternate=False):
 tangent=Vector(tangent).normalized();side=Vector((1,0,0));other=tangent.cross(side).normalized()
 axis=other if alternate else side;n=6 if low else 12;k=3 if low else 4;verts=[];faces=[]
 for i in range(n):
  a=math.tau*i/n;p=Vector(center)+tangent*(major*math.cos(a))+axis*(minor*math.sin(a));normal=(tangent*math.cos(a)+axis*math.sin(a)).normalized();cross=tangent.cross(axis).normalized()
  for j in range(k):b=math.tau*j/k;verts.append(tuple(p+radius*(normal*math.cos(b)+cross*math.sin(b))))
 for i in range(n):
  for j in range(k):faces.append((i*k+j,((i+1)%n)*k+j,((i+1)%n)*k+(j+1)%k,i*k+(j+1)%k))
 return mesh(c,name,verts,faces,mat,root,arm,pre,bone)

def chains(c,root,arm,pre,m,low):
 centers=[Vector(p) for p in [(0,4.05,-.82),(0,3.55,-1.55),(0,2.88,-2.30),(0,2.15,-3.08),(0,1.52,-3.82),(0,1.02,-4.50),(0,.72,-5.18)]]
 for side,sign in [('L',-1),('R',1)]:
  # Exactly ten links per strand in both LODs; coarse LOD reduces tube sides.
  for j in range(10):
   t=j/9*5.80;i=min(5,int(t));alpha=t-i;p=centers[i].lerp(centers[i+1],alpha);p.x=sign*.76
   tangent=(centers[i+1]-centers[i]).normalized()
   link(c,f'Chain.{side}.Link.{j:02}',p,tangent,.355,.17,.057,m['chain'],root,arm,pre,f'Tether.{min(5,int(t+.25))}',low,j%2==1)
  # Collar belongs to Body, first chain ring starts inside the collar aperture.
  link(c,f'Chain.{side}.BodyCollar',(sign*.76,4.05,-.80),(0,1,0),.25,.25,.09,m['shell'],root,arm,pre,'Body',low)
  # Forked terminal crescent: two swept blades plus a center spear and socket.
  x=sign*.76
  for flank in [-1,1]:
   outline=[(x+flank*.10,.78,-4.97),(x+flank*.42,.89,-5.07),(x+flank*.68,1.02,-4.86),(x+flank*.65,.71,-5.42),(x+flank*.43,.56,-5.64),(x+flank*.10,.63,-5.50)]
   plate(c,f'Hook.{side}.Crescent.{flank}',outline,.10,m['edge'],root,arm,pre,f'HookJoint.{side}',low)
   inset=[(x+(px-x)*.88,y+.028,-5.23+(z+5.23)*.83) for px,y,z in outline]
   plate(c,f'Hook.{side}.BladeArmor.{flank}',inset,.09,m['shell'],root,arm,pre,f'HookJoint.{side}',low)
  plate(c,f'Hook.{side}.Spear',[(x-.22,.75,-5.13),(x+.22,.75,-5.13),(x+.16,.74,-5.64),(x,.72,-6.03),(x-.16,.74,-5.64)],.22,m['shell'],root,arm,pre,f'HookJoint.{side}',low)
  link(c,f'Hook.{side}.Eyelet',(x,.84,-5.11),(0,0,1),.22,.16,.07,m['chain'],root,arm,pre,f'HookJoint.{side}',low)

def build(c,root,lod,m):
 low=lod==1;pre='LOD1.' if low else '';arm=cm.make_armature(pre+'Rig',root,pre);arm['rigType']='Chain Manta reference-authored weighted skeleton'
 surface=loft(c,pre+'Body.CarvedCarapace',[(-1.20,.31,.19,4.38),(-.66,.94,.38,4.42),(.10,1.13,.51,4.43),(.85,.91,.43,4.44),(1.43,.66,.29,4.37),(2.12,.012,.015,4.18)],m['hide'],root,1 if low else 2,8 if low else 16);bind(bpy.data.objects[pre+'Body.CarvedCarapace'],arm,pre)
 wing(c,-1,root,arm,pre,m,low);wing(c,1,root,arm,pre,m,low)
 for name,zr,ar,mat,off,crown,n in [('Socket',.60,1.00,m['ink'],.018,.022,10),('Bevel',.57,.95,m['edge'],.035,.024,10),('Lens',.50,.81,m['ivory'],.055,.05,14),('Pupil',.38,.067,m['ink'],.113,.015,8)]:
  bind(patch(c,pre+'Eye.'+name,surface,1.20,math.pi/2,zr,ar,mat,root,off,crown,n if low else n+8),arm,pre)
 for side,sign in [('L',-1),('R',1)]:
  for i,z in enumerate([-.75,-.22,.32]):
   bind(patch(c,pre+f'Back.{side}.Armor.{i}',surface,z,math.pi*(.25 if sign>0 else .75),.37,.47,m['shell'],root,.026,.08,6 if low else 10),arm,pre)
  points=catmull([(sign*.62,4.80,.26),(sign*.80,5.23,-.04),(sign*1.09,5.66,-.38),(sign*1.38,5.87,-.63)],1 if low else 3)
  bind(tube(c,pre+f'Back.{side}.SweptHorn',points,lambda t:.23*(1-t)**1.1+.003,m['shell'],root,4 if low else 7),arm,pre)
 # Dorsal core is an inset faceted jewel surrounded by nested armored rings.
 for name,r,t,y,mat in [('Socket',.48,.13,4.91,m['ink']),('OuterArmor',.49,.065,4.99,m['shell']),('InnerViolet',.34,.04,5.04,m['edge'])]:
  link(c,'Core.'+name,(0,y,-.15),(0,0,1),r,r,t,mat,root,arm,pre,'Body',low)
 o=c.sphere(pre+'Core.FacetedJewel',(0,5.01,-.15),(.59,.32,.59),m['core'],6 if low else 12,4 if low else 6,root);bind(o,arm,pre)
 # Short central tail stays clearly separate from the two long chains.
 plate(c,'Tail.ArmoredFin',[(-.46,4.43,-.69),(.46,4.43,-.69),(.36,4.38,-1.38),(.15,4.17,-2.22),(0,4.04,-2.72),(-.15,4.17,-2.22),(-.36,4.38,-1.38)],.20,m['shell'],root,arm,pre,'Tail',low)
 chains(c,root,arm,pre,m,low)
 for o in root.children_recursive:
  if o.type!='MESH':continue
  if any(a.name==m['shell'] for a in o.data.materials):
   for p in o.data.polygons:
    for ix in p.loop_indices:
     co=o.data.vertices[o.data.loops[ix].vertex_index].co;o.data.uv_layers.active.data[ix].uv=(.57+co.x*.003,.952+co.y*.0015)
  elif any(a.name==m['hide'] for a in o.data.materials):
   for p in o.data.polygons:
    for ix in p.loop_indices:
     co=o.data.vertices[o.data.loops[ix].vertex_index].co;o.data.uv_layers.active.data[ix].uv=(.5+co.x*.038,.5+co.y*.05)
 return arm,[o for o in root.children_recursive if o.type=='MESH']

def main():
 bpy.ops.wm.read_factory_settings(use_empty=True);c=Context(cm.REQ);c.root['authoring']='reference-authored armored Chain Manta';c.root['reference']='design/references/enemies/chainManta-turnaround.png';c.root['landings']='[]'
 m={'hide':c.material('Manta.PaintedHide',(.55,.57,.65),TEXTURES/'creatures/shadow-hide.png'),'shell':c.material('Manta.ArmorSlate',(.46,.48,.55),TEXTURES/'trim/violet.png'),'edge':c.material('Manta.Violet',(.22,.065,.37)),'ink':c.material('Manta.Ink',(.009,.012,.018)),'ivory':c.material('Manta.Ivory',(.76,.66,.40),emission=.04),'chain':c.material('Manta.Iron',(.16,.19,.20)),'core':c.material('Manta.Core',(.39,.07,.83),emission=.8)}
 a0,m0=build(c,c.root,0,m);r1=bpy.data.objects.new('LOD1',None);bpy.context.collection.objects.link(r1);r1['lod']=1;r1['request']='M-011';a1,m1=build(c,r1,1,m);roots=[c.root,r1];arms=[a0,a1]
 for name,pos,bone in [('Core',(0,5.16,-.15),'Body'),('TetherNode',(0,.80,-5.12),'Tether.5'),('Hook.L',(-.76,.80,-5.40),'HookJoint.L'),('Hook.R',(.76,.80,-5.40),'HookJoint.R'),('Hitbox.Body',(0,4.44,.28),'Body'),('Landing',(0,5.22,-.15),'Body')]:
  # Refresh matrix_world before parenting: authoritative socket positions must
  # remain at their authored surface locations, not the previous depsgraph state.
  o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.location=v(pos);bpy.context.view_layer.update();world=o.matrix_world.copy();o.parent=a0;o.parent_type='BONE';o.parent_bone=bone;o.matrix_world=world;o['socket']=True;c.sockets.append(name)
 scaffold=cm.pose_for
 def pose(clip,phase,name):
  rotation,scale=scaffold(clip,phase,name)
  if name.startswith('Wing.'):
   side=-1 if '.L.' in name else 1;rotation=[rotation[1]*side,rotation[0],0]
  # Shrink the whole hierarchy once; repeated parent/child scaling implodes chains.
  if clip=='Dissolve' and name!='Body':scale=[1,1,1]
  return rotation,scale
 cm.pose_for=pose;cm.author_actions(a0);cm.author_actions(a1,'LOD1.')
 bounds=[cm.fit_root(r) for r in roots];tris=[cm.count_triangles(r) for r in roots];print('MANTA GEOMETRY',bounds,tris,flush=True);assert tris[0]<=6000 and tris[1]<=2000
 weights={'LOD0':cm.validate_weights(m0,a0),'LOD1':cm.validate_weights(m1,a1,'LOD1.')};saved=cm.capture_transforms();samples=cm.sample_animations(roots+arms,m0+m1);loops=cm.validate_loop_closure(arms);chain=cm.validate_chain_motion(arms);motion=cm.validate_static_roots(roots);qa.rest(roots,arms,saved)
 bpy.ops.object.select_all(action='DESELECT')
 for r in roots:
  for o in [r,*r.children_recursive]:o.select_set(True)
 bpy.context.scene.render.fps=30
 raw=OUT/'chainManta-uncompressed.glb';final=OUT/'chainManta.glb';bpy.ops.export_scene.gltf(filepath=str(raw),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_extras=True,export_apply=True,export_materials='EXPORT',export_yup=True,export_skins=True,export_all_influences=True)
 subprocess.run([shutil.which('node'),str(HERE/'compress.mjs'),str(raw),str(final),'--force'],check=True);qa.rest(roots,arms,saved)
 record={'request':'M-011','name':'Chain Manta','file':str(final.relative_to(ROOT)),'preview':str((OUT/'LOD0-three-quarter.png').relative_to(ROOT)),'source':'hopper/3d/models/source/chain_manta_refine.py','category':'enemy','region':'harbor','bounds':bounds[0],'targetBounds':cm.REQ['size'],'triangles':tris,'clips':cm.REQ['clips'],'sockets':cm.REQ['sockets'],'landings':[],'status':'candidate-awaiting-root-review','sourceReference':'design/references/enemies/chainManta-turnaround.png'}
 (OUT/'record.json').write_text(json.dumps(record,indent=2)+'\n');(OUT/'manifest.json').write_text(json.dumps({'version':1,'models':[record]},indent=2)+'\n');(OUT/'rig-qa.json').write_text(json.dumps({'bones':{r.name:[b.name for b in a.data.bones] for r,a in zip(roots,arms)},'weights':weights,'samples':samples,'loops':loops,'chainMotion':chain,'rootMotion':motion,'bounds':bounds,'triangles':tris},indent=2)+'\n')
 scene,cam=qa.studio()
 for o in scene.objects:
  if o.type=='LIGHT':o.location.z+=4;o.rotation_euler=(Vector((0,1,4))-o.location).to_track_quat('-Z','Y').to_euler()
 for lod in range(2):
  for view in ['front','three-quarter','top','side']:qa.render(scene,cam,roots,arms,saved,lod,view)
 if '--qa' in sys.argv:
  scene.cycles.samples=8
  for lod in range(2):
   for clip in cm.REQ['clips']:
    for phase in ([0,.25,.5,.75,1] if clip=='Soar' else [0,.5,1]):qa.render(scene,cam,roots,arms,saved,lod,'three-quarter',clip,phase)
 qa.rest(roots,arms,saved)
 for o in [r1,*r1.children_recursive]:o.hide_render=True
 bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'chainManta.blend'),compress=True);print('MANTA REFINED DONE',flush=True)
if __name__=='__main__':main()
