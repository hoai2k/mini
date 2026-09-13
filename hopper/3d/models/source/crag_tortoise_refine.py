"""M007 reference sculpt over the original seventeen-joint deformation interface.
Independent candidate: local/hopper-crag-tortoise-refine. --qa renders all poses.
"""
import bpy,math,json,sys,shutil,subprocess,struct
from pathlib import Path
from mathutils import Vector,Quaternion
HERE=Path(__file__).resolve().parent;sys.path.insert(0,str(HERE))
from common import Context,ROOT,TEXTURES,v
import crag_tortoise as ct
import window_ray_refine as preview
from wasp_refine import loft,patch,normals
from phase_skate_refine import catmull,tube
OUT=ROOT/'local/hopper-crag-tortoise-refine';OUT.mkdir(parents=True,exist_ok=True)

def bind(o,arm,pre,kind='Shell'):
 bpy.context.view_layer.update();rows=[]
 for vertex in o.data.vertices:
  p=o.matrix_world@vertex.co;x,y,z=p.x,p.z,-p.y
  if kind=='Body':
   t=max(0,min(1,(z+1.1)/2.2));row=[('Spine.0',1-t),('Spine.1',t)]
  elif kind.startswith('Leg.') and kind.count('.')==1:
   leg=kind.split('.')[1];s=-1 if leg.endswith('L') else 1;f=1 if leg.startswith('F') else -1
   stations=[Vector((1.75*s,1.42,1.62*f)),Vector((2.55*s,.70,1.95*f)),Vector((3.02*s,.28,2.28*f)),Vector((3.34*s,.18,2.92*f))];q=Vector((x,y,z));best=(1e9,0)
   for j in range(3):
    d=stations[j+1]-stations[j];t=max(0,min(1,(q-stations[j]).dot(d)/d.length_squared));dist=(q-stations[j]-d*t).length
    if dist<best[0]:best=(dist,j+t)
   u=max(0,min(2,best[1]-.45));j=min(1,int(u));t=u-j;row=[(kind+f'.{j}',1-t),(kind+f'.{j+1}',t)]
  else:row=[(kind,1)]
  rows.append(row)
 ct.add_skin(o,rows,arm,pre);return o

def mesh(c,name,verts,faces,mat,root,arm,pre,kind='Shell',smooth=False):
 o=c.mesh(pre+name,verts,faces,mat,root);normals(o)
 if not smooth:
  for p in o.data.polygons:p.use_smooth=False
 return bind(o,arm,pre,kind)

def raised(c,name,outline,mat,edge,root,arm,pre,kind='Shell',height=.075,low=False):
 # A narrow beveled border with a convex faceted crown; perimeter stays seated.
 center=sum((Vector(p) for p in outline),Vector())/len(outline);n=len(outline);verts=list(outline)
 for p in outline:verts.append(tuple(center+(Vector(p)-center)*.92+Vector((0,.025,0))))
 verts.append(tuple(center+Vector((0,height,0))));faces=[]
 if name.startswith('Shell.Plate'):
  # Project inner bevel/crown back to the curved shell, so chords cannot sink
  # through the substrate and leave broken outlines or detached streaks.
  for j,p in enumerate(verts):
   x,y,z=p;r=((x/3.08)**2+((z+.20)/3.34)**2)**.5
   verts[j]=(x,1.57+1.82*max(0,1-r*r)**.56+.065+(height if j==2*n else (.025 if j>=n else 0)),z)
 for i in range(n):j=(i+1)%n;faces.extend([(i,j,n+j,n+i),(n+i,n+j,2*n)])
 if pre:
  verts=verts[:n]+[verts[-1]];faces=[(i,(i+1)%n,n) for i in range(n)]
 o=mesh(c,name,verts,faces,mat,root,arm,pre,kind)
 o.data.materials.append(bpy.data.materials[edge])
 for i,p in enumerate(o.data.polygons):p.material_index=1 if not pre and i%2==0 else 0
 return o

def shell(c,root,arm,pre,m,low):
 def surface(r,a):
  x=3.08*r*math.cos(a);z=3.34*r*math.sin(a)-.20;y=1.57+1.82*max(0,1-r*r)**.56
  return Vector((x,y,z))
 n=16 if low else 32;verts=[];faces=[]
 for r in [.0,.36,.70,.91,1.0]:
  for i in range(n):verts.append(tuple(surface(r,math.tau*i/n)))
 for j in range(4):
  for i in range(n):faces.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
 faces.append(tuple(reversed(range(4*n,5*n))));mesh(c,'Shell.DarkSubstrate',verts,faces,m['ink'],root,arm,pre,smooth=True)
 for row,(r0,r1,count) in enumerate([(.015,.42,5),(.40,.77,9),(.745,1.015,13)]):
  for i in range(count):
   a=math.tau*(i+.5*(row%2))/count;da=math.pi/count*.965
   pairs=[(r0,a-da*.70),(r0,a+da*.70),(r1-.045,a+da),(r1+.018,a+da*.36),(r1+.045,a-da*.30),(r1-.04,a-da)]
   if low:pairs=[pairs[j] for j in [0,1,2,4,5]]
   outline=[tuple(surface(min(r,1.025),ang)+Vector((0,.055,0))) for r,ang in pairs]
   raised(c,f'Shell.Plate.{row}.{i}',outline,m['rock'],m['edge'],root,arm,pre,height=.11 if row<2 else .075)
 # Each thorn emerges from a plate center, with a slate face and restrained violet ridge.
 for i,(r,a,h) in enumerate([(0,0,.85),(.43,.2,.65),(.43,2.1,.63),(.43,4.3,.66),*[(.76,j*math.tau/8+.1,.48) for j in range(8)],*[(.98,j*math.tau/6,.27) for j in range(6)]]):
  p=surface(r,a)+Vector((0,.07,0));tip=p+Vector((math.cos(a)*r*.26,h,math.sin(a)*r*.26));radius=.25 if r<.6 else .20
  points=[tuple(p+Vector((math.cos(k*math.tau/4)*radius,0,math.sin(k*math.tau/4)*radius))) for k in range(4)]+[tuple(tip)]
  o=mesh(c,f'Shell.Thorn.{i}',points,[(0,1,4),(1,2,4),(2,3,4),(3,0,4),(3,2,1,0)],m['rock'],root,arm,pre);o.data.materials.append(bpy.data.materials[m['edge']]);o.data.polygons[1].material_index=1


def limb(c,leg,root,arm,pre,m,low):
 s=-1 if leg.endswith('L') else 1;f=1 if leg.startswith('F') else -1
 controls=[(1.52*s,1.43,1.46*f),(2.00*s,1.24,1.66*f),(2.48*s,.76,1.97*f),(2.86*s,.46,2.25*f),(3.18*s,.30,2.58*f),(3.31*s,.25,2.84*f)]
 pts=catmull(controls,1 if low else 2);sides=7 if low else 10;verts=[];faces=[]
 radii=[.72,.73,.62,.46,.40,.25]
 def sample(t,a,extra=0):
  u=t*(len(pts)-1);j=min(len(pts)-2,int(u));center=pts[j].lerp(pts[j+1],u-j);tangent=(pts[min(len(pts)-1,j+1)]-pts[max(0,j-1)]).normalized();right=tangent.cross(Vector((0,1,0))).normalized();up=right.cross(tangent).normalized();k=min(4,int(t*5));r=radii[k]*(1-(t*5-k))+radii[k+1]*(t*5-k)+extra
  q=center+(right*math.cos(a)+up*math.sin(a))*r;q.y=max(.045,q.y);return q
 for j in range(len(pts)):
  for i in range(sides):verts.append(tuple(sample(j/(len(pts)-1),math.tau*i/sides)))
 for j in range(len(pts)-1):
  for i in range(sides):faces.append((j*sides+i,j*sides+(i+1)%sides,(j+1)*sides+(i+1)%sides,(j+1)*sides+i))
 faces.extend([tuple(reversed(range(sides))),tuple((len(pts)-1)*sides+i for i in range(sides))]);mesh(c,f'Leg.{leg}.ConnectedHide',verts,faces,m['hide'],root,arm,pre,f'Leg.{leg}',True)
 # Broad overlapping scales follow the limb's curvature and deform with the same weights.
 for row,t in enumerate([.17,.43,.69,.87]):
  for col,a in enumerate([-.15,.70,1.65,2.65,3.30] if not low else [-.15,1.15,2.30,3.30]):
   outline=[tuple(sample(max(0,min(1,t+dt)),a+da,.018)) for dt,da in [(-.13,-.36),(-.12,.34),(.04,.45),(.13,.12),(.10,-.38)]]
   raised(c,f'Leg.{leg}.Scale.{row}.{col}',outline,m['rock'],m['edge'],root,arm,pre,f'Leg.{leg}',.07)
 # Wide flattened foot has real Y=0 sole; three swept ivory claws per foot.
 position=(3.25*s,.20,2.86*f);foot=c.sphere(pre+f'Leg.{leg}.Foot',position,(.96,.40,1.06),m['hide'],8 if low else 12,4 if low else 6,root);bind(foot,arm,pre,f'Leg.{leg}.2')
 for k,dx in enumerate([-.29,0,.29]):
  x=3.25*s+dx;pts=catmull([(x,.25,3.06*f),(x,.27,3.27*f),(x,.10,3.52*f)],1 if low else 2);o=tube(c,pre+f'Leg.{leg}.Claw.{k}',pts,lambda t:.16*(1-t)+.004,m['ivory'],root,4 if low else 6);bind(o,arm,pre,f'Leg.{leg}.2')


def build(c,root,lod,m):
 low=lod==1;pre='LOD1.' if low else '';arm=ct.make_armature(pre+'Rig',root,pre)
 body=loft(c,pre+'Body.Hide',[(-2.85,.28,.34,1.23),(-2.1,1.61,.69,1.22),(-.6,2.15,.80,1.28),(1,2.03,.73,1.23),(2.3,1.18,.57,1.24),(2.70,.40,.39,1.28)],m['hide'],root,1 if low else 2,10 if low else 16);bind(bpy.data.objects[pre+'Body.Hide'],arm,pre,'Body')
 shell(c,root,arm,pre,m,low)
 # Paired ivory plastron plates wrap the belly. The central dark recess stays exposed.
 for row,z in enumerate([-2.10,-1.35,-.45,.50,1.42,2.03]):
  for side,a in enumerate([-math.pi*.22,-math.pi*.78]):
   o=patch(c,pre+f'Belly.Plate.{row}.{side}',body,z,a,.52 if row not in [0,5] else .40,.64,m['ivory'],root,.035,.075,5 if low else 8);bind(o,arm,pre,'Body')
 # Underside socket rim lies in XZ; geometry has explicit absolute positions.
 for name,r,thick,y,mat in [('Recess',.68,.18,.52,m['ink']),('Ring',.53,.065,.48,m['metal']),('Violet',.30,.045,.46,m['edge'])]:
  n=10 if low else 20;verts=[];faces=[]
  for rad,h in [(r+thick,y),(r,y-.055),(r-thick,y)]:
   for i in range(n):a=math.tau*i/n;verts.append((rad*math.cos(a),h,rad*math.sin(a)-.18))
  for j in range(2):
   for i in range(n):faces.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
  mesh(c,'Core.'+name,verts,faces,mat,root,arm,pre,'Spine.0',True)
 o=c.sphere(pre+'Core.Lens',(0,.51,-.18),(.46,.15,.46),m['core'],8 if low else 16,4 if low else 8,root);bind(o,arm,pre,'Spine.0')
 head=loft(c,pre+'Head.Sculpt',[(1.75,.52,.44,1.38),(2.2,.69,.57,1.43),(2.76,.67,.54,1.40),(3.30,.51,.40,1.31),(3.80,.29,.26,1.16),(4.02,.10,.11,1.06)],m['hide'],root,1 if low else 2,10 if low else 16);bind(bpy.data.objects[pre+'Head.Sculpt'],arm,pre,'Head')
 for side,a in [('R',.22*math.pi),('L',.78*math.pi)]:
  for name,zr,ar,mat,offset in [('Socket',.42,.33,m['ink'],.025),('Eye',.32,.23,m['ivory'],.05),('Slit',.045,.20,m['ink'],.095)]:
   bind(patch(c,pre+f'Eye.{side}.{name}',head,3.18,a,zr,ar,mat,root,offset,.015,6 if low else 12),arm,pre,'Head')
  bind(patch(c,pre+f'Head.Brow.{side}',head,2.90,a+.15 if side=='R' else a-.15,.48,.33,m['rock'],root,.065,.09,5 if low else 8),arm,pre,'Head')
 for i,z in enumerate([2.14,2.62,3.12,3.55]):bind(patch(c,pre+f'Head.Crown.{i}',head,z,math.pi/2,.36,.50,m['rock'],root,.04,.08,5 if low else 8),arm,pre,'Head')
 jaw=loft(c,pre+'Jaw.Carved',[(2.30,.43,.14,.95),(2.80,.52,.19,.89),(3.36,.44,.15,.85),(3.83,.16,.11,.88)],m['rock'],root,1 if low else 2,8 if low else 12);bind(bpy.data.objects[pre+'Jaw.Carved'],arm,pre,'Jaw')
 bind(patch(c,pre+'Jaw.Inner',jaw,3.10,math.pi/2,.56,1.10,m['mouth'],root,.015,.01,6 if low else 10),arm,pre,'Jaw')
 for leg in ct.LEG_IDS:limb(c,leg,root,arm,pre,m,low)
 o=tube(c,pre+'Tail.Armored',catmull([(0,1.25,-2.3),(0,1.05,-3.08),(0,.81,-3.78),(0,.72,-4.20)],1 if low else 2),lambda t:.40*(1-t)+.006,m['rock'],root,5 if low else 8);bind(o,arm,pre,'Spine.0')
 for o in root.children_recursive:
  if o.type=='MESH' and any(mat.name==m['rock'] for mat in o.data.materials):
   for p in o.data.polygons:
    for ix in p.loop_indices:
     co=o.data.vertices[o.data.loops[ix].vertex_index].co;o.data.uv_layers.active.data[ix].uv=(.57+co.x*.003,.952+co.y*.0015)
 if low:
  # Reuse the generated trim's bright-to-dark seam transition on existing
  # plate fans. No texture synthesis or extra triangles: center remains rock.
  for o in root.children_recursive:
   if o.type=='MESH' and ('Shell.Plate.' in o.name or '.Scale.' in o.name):
    center=len(o.data.vertices)-1
    for polygon in o.data.polygons:
     for k,ix in enumerate(polygon.loop_indices):
      is_center=o.data.loops[ix].vertex_index==center
      o.data.uv_layers.active.data[ix].uv=((2505 if is_center else 2453.5)/4096,1-(400 if is_center else 399+k)/4096)
  for o in root.children_recursive:
   if o.type!='MESH' or any(token in o.name for token in ['Plate.','Scale.','Thorn.','Eye.','Claw.']):continue
   o.data.calc_loop_triangles()
   if len(o.data.loop_triangles)>35:
    bpy.context.view_layer.objects.active=o;mod=o.modifiers.new('LOD1 Surface Reduction','DECIMATE');mod.ratio=.70;bpy.ops.object.modifier_apply(modifier=mod.name)
 return arm,[o for o in root.children_recursive if o.type=='MESH']


def plant_walk_feet(arm,pre):
 # The original angular gait drives planted soles through Y=0. Bake a small
 # root-of-leg translation for each support half-stride, retaining swing lift.
 # This is skin-joint motion; neither scene root receives Walk translation.
 ct.mute_actions([arm]);action=next(t.strips[0].action for t in arm.animation_data.nla_tracks if t.name=='Walk');arm.animation_data.action=action
 scene=bpy.context.scene
 for frame in range(1,32):
  scene.frame_set(frame)
  for leg in ct.LEG_IDS:arm.pose.bones[pre+f'Leg.{leg}.0'].location=(0,0,0)
  bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get()
  for leg in ct.LEG_IDS:
   foot=bpy.data.objects[pre+f'Leg.{leg}.Foot'];e=foot.evaluated_get(dg);me=e.to_mesh();floor=min((e.matrix_world@p.co).z for p in me.vertices);e.to_mesh_clear()
   bone=arm.pose.bones[pre+f'Leg.{leg}.0'];bone.location=bone.bone.matrix_local.to_3x3().inverted()@Vector((0,0,max(0,-floor)))
   bone.keyframe_insert('location',frame=frame,group=bone.name)
 for fc in ct.action_fcurves(action):
  if fc.data_path.endswith('location'):
   for key in fc.keyframe_points:key.interpolation='LINEAR'
 arm.animation_data.action=None;ct.clear_pose(arm);scene.frame_set(1);bpy.context.view_layer.update()


def main():
 bpy.ops.wm.read_factory_settings(use_empty=True);c=Context(ct.REQ);c.root['authoring']='reference-authored seventeen-bone Crag Tortoise';c.root['reference']='design/references/enemies/cragTortoise-turnaround.png';c.root['landings']='[]'
 m={'hide':c.material('Crag.DarkHide',(.085,.092,.11)),'rock':c.material('Crag.PaintedSlate',(.54,.53,.62),TEXTURES/'trim/violet.png'),'edge':c.material('Crag.VioletBevel',(.072,.029,.105)),'ink':c.material('Crag.Recess',(.012,.014,.020)),'ivory':c.material('Crag.Ivory',(.61,.52,.33)),'metal':c.material('Crag.CoreMetal',(.19,.18,.21)),'core':c.material('Crag.CoreViolet',(.26,.055,.49),emission=.5),'mouth':c.material('Crag.Mouth',(.22,.042,.035))}
 a0,m0=build(c,c.root,0,m);r1=bpy.data.objects.new('LOD1',None);bpy.context.collection.objects.link(r1);r1['lod']=1;r1['request']='M-007';a1,m1=build(c,r1,1,m);roots=[c.root,r1];arms=[a0,a1]
 for name,pos,bone in [('Core',(0,.40,-.18),'Spine.0'),('Mouth',(0,1.02,3.90),'Head'),('Hitbox.Shell',(0,2.5,-.2),'Shell'),('Hitbox.Body',(0,1.25,0),'Spine.0')]:
  o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.location=v(pos);bpy.context.view_layer.update();world=o.matrix_world.copy();o.parent=a0;o.parent_type='BONE';o.parent_bone=bone;o.matrix_world=world;o['socket']=True;c.sockets.append(name)
 scaffold_pose=ct.pose_for
 for arm,pre in [(a0,''),(a1,'LOD1.')]:
  def corrected_pose(clip,phase,name):
   rotation,scale=scaffold_pose(clip,phase,name)
   if clip in ['Lunge_Tell','Lunge','Belly_Open_Hold','Withdraw']:
    amount=phase if clip=='Lunge_Tell' else (1-phase if clip=='Withdraw' else 1)
    angle={'Spine.0':-.95,'Spine.1':-.05,'Shell':.04,'Head':.09,'Jaw':.50}.get(name,0)
    if name.startswith('Leg.'):
     front=name.split('.')[1].startswith('F');joint=int(name[-1]);angle=([- .20,.35,-.18] if front else [.76,-.10,.03])[joint]
    if clip=='Belly_Open_Hold' and name=='Head':angle+=.022*math.sin(phase*math.tau)
    axis=arm.data.bones[pre+name].matrix_local.to_quaternion().inverted()@Vector((1,0,0));rotation=list(Quaternion(axis,angle*amount).to_euler())
   elif name=='Spine.1':rotation[0]*=-1
   return rotation,scale
  ct.pose_for=corrected_pose;ct.author_actions(arm,pre)
 plant_walk_feet(a0,'');plant_walk_feet(a1,'LOD1.');ct.author_root_lunge(c.root);ct.author_root_lunge(r1)
 bounds=[ct.fit_root(r) for r in roots];tris=[ct.count_triangles(r) for r in roots];print('CRAG REFINED GEOMETRY',bounds,tris,flush=True);assert tris[0]<=7000 and tris[1]<=2000
 weights={'LOD0':ct.validate_weights(m0,a0),'LOD1':ct.validate_weights(m1,a1,'LOD1.')};saved=ct.capture_transforms();samples=ct.sample_animations(roots+arms,m0+m1);loops=ct.validate_loops(arms);motion=ct.validate_root_motion(roots);ground={r.name:ct.ground_report(r) for r in roots}
 preview.wr=ct;preview.OUT=OUT;preview.rest(roots,arms,saved);scene,cam=preview.studio()
 for lod in range(2):
  for view in ['front','three-quarter','top','side']:preview.render(scene,cam,roots,arms,saved,lod,view)
 if '--qa' in sys.argv:
  for lod in range(2):
   for clip in ct.REQ['clips']:
    for phase in ([0,.25,.5,.75,1] if clip=='Walk' else [0,.5,1]):preview.render(scene,cam,roots,arms,saved,lod,'three-quarter',clip,phase)
 if '--material-qa' in sys.argv:
  for clip,phase in [('Walk',.25),('Belly_Open_Hold',.5)]:preview.render(scene,cam,roots,arms,saved,1,'three-quarter',clip,phase)
 preview.rest(roots,arms,saved);bpy.ops.object.select_all(action='DESELECT')
 for r in roots:
  for o in [r,*r.children_recursive]:o.select_set(True);o.hide_render=False
 raw=OUT/'cragTortoise-uncompressed.glb';final=OUT/'cragTortoise.glb';bpy.ops.export_scene.gltf(filepath=str(raw),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_extras=True,export_apply=True,export_materials='EXPORT',export_yup=True,export_skins=True,export_all_influences=True)
 subprocess.run([shutil.which('node'),str(HERE/'compress.mjs'),str(raw),str(final),'--force'],check=True);preview.rest(roots,arms,saved)
 for o in [r1,*r1.children_recursive]:o.hide_render=True
 bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'cragTortoise.blend'),compress=True)
 data=final.read_bytes();doc=json.loads(data[20:20+struct.unpack_from('<I',data,12)[0]])
 def exported_triangles(rootname):
  def visit(i):
   n=doc['nodes'][i];total=0
   if 'mesh' in n:
    for p in doc['meshes'][n['mesh']]['primitives']:total+=doc['accessors'][p.get('indices',p['attributes']['POSITION'])]['count']//3
   return total+sum(visit(j) for j in n.get('children',[]))
  return visit(next(i for i,n in enumerate(doc['nodes']) if n.get('name')==rootname))
 authored=tris;tris=[exported_triangles('LOD0'),exported_triangles('LOD1')]
 record={'request':'M-007','name':'Crag Tortoise','file':str(final.relative_to(ROOT)),'preview':str((OUT/'LOD0-three-quarter.png').relative_to(ROOT)),'source':'hopper/3d/models/source/crag_tortoise_refine.py','category':'enemy','region':'mountains','bounds':bounds[0],'targetBounds':ct.REQ['size'],'triangles':tris,'clips':ct.REQ['clips'],'sockets':ct.REQ['sockets'],'landings':[],'status':'candidate-awaiting-root-review','sourceReference':'design/references/enemies/cragTortoise-turnaround.png'}
 (OUT/'record.json').write_text(json.dumps(record,indent=2)+'\n');(OUT/'manifest.json').write_text(json.dumps({'version':1,'models':[record]},indent=2)+'\n');(OUT/'rig-qa.json').write_text(json.dumps({'bones':{r.name:[b.name for b in a.data.bones] for r,a in zip(roots,arms)},'weights':weights,'samples':samples,'loops':loops,'rootMotion':motion,'grounding':ground,'bounds':bounds,'triangles':tris,'authoredTriangles':authored},indent=2)+'\n');print('CRAG REFINED DONE',flush=True)
if __name__=='__main__':main()
