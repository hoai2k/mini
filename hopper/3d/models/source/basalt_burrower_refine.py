"""M015 Basalt Burrower sculpt over the original sixteen-joint interface.
Independent candidate: local/hopper-basalt-burrower-refine. --qa renders all poses.
"""
import bpy,math,json,sys,shutil,subprocess,struct
from pathlib import Path
from mathutils import Vector,Quaternion
HERE=Path(__file__).resolve().parent;sys.path.insert(0,str(HERE))
from common import Context,ROOT,TEXTURES,v
import basalt_burrower as ct
import window_ray_refine as preview
from wasp_refine import loft,patch,normals
from phase_skate_refine import catmull,tube
OUT=ROOT/'local/hopper-basalt-burrower-refine';OUT.mkdir(parents=True,exist_ok=True)

def bind(o,arm,pre,kind='Body'):
 bpy.context.view_layer.update();rows=[]
 for vertex in o.data.vertices:
  p=o.matrix_world@vertex.co;x,y,z=p.x,p.z,-p.y
  if kind=='Body':
   u=max(0,min(2,(z+2.45)/2.45));j=min(1,int(u));t=u-j;row=[(f'Spine.{j}',1-t),(f'Spine.{j+1}',t)]
  elif kind.startswith('Leg.') and kind.count('.')==1:
   q=Vector((x,y,z));stations=[]
   for j in range(3):
    bone=arm.data.bones[pre+kind+f'.{j}'];a=bone.head_local;stations.append(Vector((a.x,a.z,-a.y)))
   a=bone.tail_local;stations.append(Vector((a.x,a.z,-a.y)));best=(1e9,0)
   for j in range(3):
    d=stations[j+1]-stations[j];t=max(0,min(1,(q-stations[j]).dot(d)/d.length_squared));distance=(q-stations[j]-d*t).length
    if distance<best[0]:best=(distance,j+t)
   u=max(0,min(2,best[1]-.40));j=min(1,int(u));t=u-j;row=[(kind+f'.{j}',1-t),(kind+f'.{j+1}',t)]
  else:row=[(kind,1)]
  rows.append(row)
 ct.add_skin(o,rows,arm,pre);return o

def mesh(c,name,verts,faces,mat,root,arm,pre,kind='Spine.1',smooth=False):
 o=c.mesh(pre+name,verts,faces,mat,root);normals(o)
 if not smooth:
  for p in o.data.polygons:p.use_smooth=False
 return bind(o,arm,pre,kind)

def raised(c,name,outline,mat,edge,root,arm,pre,kind='Spine.1',height=.075,low=False):
 # A narrow beveled border with a convex faceted crown; perimeter stays seated.
 center=sum((Vector(p) for p in outline),Vector())/len(outline);n=len(outline);verts=list(outline)
 for p in outline:verts.append(tuple(center+(Vector(p)-center)*.92+Vector((0,.025,0))))
 verts.append(tuple(center+Vector((0,height,0))));faces=[]
 for i in range(n):j=(i+1)%n;faces.extend([(i,j,n+j,n+i),(n+i,n+j,2*n)])
 if pre:
  verts=verts[:n]+[verts[-1]];faces=[(i,(i+1)%n,n) for i in range(n)]
 o=mesh(c,name,verts,faces,mat,root,arm,pre,kind)
 o.data.materials.append(bpy.data.materials[edge])
 for i,p in enumerate(o.data.polygons):p.material_index=1 if not pre and i%2==0 else 0
 return o

def limb(c,leg,root,arm,pre,m,low):
 s=-1 if leg.endswith('L') else 1;f=1 if leg.startswith('F') else -1
 controls=[(1.52*s,1.55,2.10*f),(2.00*s,1.24,2.30*f),(2.48*s,.76,2.40*f),(2.82*s,.46,2.78*f),(3.18*s,.30,3.02*f),(3.20*s,.25,3.18*f)]
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
 position=(3.20*s,.20,3.18*f);foot=c.sphere(pre+f'Leg.{leg}.Foot',position,(.96,.40,1.06),m['hide'],8 if low else 12,4 if low else 6,root);bind(foot,arm,pre,f'Leg.{leg}.2')
 for k,dx in enumerate([-.29,0,.29]):
  x=3.20*s+dx;pts=catmull([(x,.25,3.38*f),(x,.27,3.59*f),(x,.10,3.84*f)],1 if low else 2);o=tube(c,pre+f'Leg.{leg}.Claw.{k}',pts,lambda t:.16*(1-t)+.004,m['ivory'],root,4 if low else 6);bind(o,arm,pre,f'Leg.{leg}.2')


def armor(c,name,surf,zc,ac,zr,ar,root,arm,pre,m,bone='Body',crown=.13):
 outline=[(-.72,-.75),(.08,-1),(.87,-.42),(.72,.72),(-.24,1),(-1,.22)];n=len(outline);verts=[]
 for factor,offset in [(1,.025),(.92,.065)]:
  for dz,da in outline:
   p,_=surf(zc+dz*zr*factor,ac+da*ar*factor,offset);verts.append(tuple(p))
 p,_=surf(zc,ac,.065+crown);verts.append(tuple(p));faces=[]
 for i in range(n):j=(i+1)%n;faces.extend([(i,j,n+j,n+i),(n+i,n+j,2*n)])
 if pre:verts=verts[:n]+[verts[-1]];faces=[(i,(i+1)%n,n) for i in range(n)]
 o=mesh(c,name,verts,faces,m['rock'],root,arm,pre,bone);o.data.materials.append(bpy.data.materials[m['edge']])
 for i,p in enumerate(o.data.polygons):p.material_index=1 if not pre and i%2==0 else 0
 return o

def drill(c,root,arm,pre,m,low):
 controls=[(2.65,1.12,1.12,1.46),(3.02,1.14,1.14,1.45),(3.70,.93,.93,1.445),(4.35,.69,.69,1.437),(4.93,.48,.48,1.43),(5.49,.27,.27,1.423),(6.02,.075,.075,1.416),(6.26,.003,.003,1.413)]
 surf=loft(c,pre+'Drill.CarvedCone',controls,m['rock'],root,1 if low else 2,8 if low else 16);bind(bpy.data.objects[pre+'Drill.CarvedCone'],arm,pre,'DrillPivot')
 # Concentric cutting shoulders follow the actual taper and its slight axis tilt.
 for i,z in enumerate([2.91,3.40,3.95,4.49,4.98,5.43,5.85]):
  n=8 if low else 16;verts=[];faces=[]
  for dz,h in [(-.033,.025),(0,.055),(.032,.022)]:
   for k in range(n):p,_=surf(z+dz,math.tau*k/n,h);verts.append(tuple(p))
  for j in range(2):
   for k in range(n):faces.append((j*n+k,j*n+(k+1)%n,(j+1)*n+(k+1)%n,(j+1)*n+k))
  mesh(c,f'Drill.CuttingRing.{i}',verts,faces,m['edge'],root,arm,pre,'DrillPivot',True)
 # Three asymmetrical inset cutting flutes make axial spinning legible.
 for i,a in enumerate([.1,2.3,4.5]):
  verts=[];faces=[];count=4 if low else 8
  for j in range(count):
   z=3.16+j/(count-1)*2.25;angle=a+j/(count-1)*.62
   for da in [-.027,.027]:p,_=surf(z,angle+da,.008);verts.append(tuple(p))
  for j in range(count-1):faces.append((2*j,2*j+1,2*j+3,2*j+2))
  mesh(c,f'Drill.Flute.{i}',verts,faces,m['ink'],root,arm,pre,'DrillPivot')


def build(c,root,lod,m):
 low=lod==1;pre='LOD1.' if low else '';arm=ct.make_armature(pre+'Rig',root,pre)
 body=loft(c,pre+'Body.Sculpt',[(-4.15,.18,.24,1.05),(-3.5,.97,.61,1.38),(-2.45,1.89,1.01,1.61),(-.9,2.25,1.17,1.65),(.80,2.23,1.10,1.64),(2.15,1.79,.86,1.60),(2.85,1.12,.65,1.50)],m['hide'],root,1 if low else 2,10 if low else 18);bind(bpy.data.objects[pre+'Body.Sculpt'],arm,pre,'Body')
 # Broad overlapping basalt scutes, with a protected gap around the back core.
 for row,z in enumerate([-3.04,-2.0,-.93,.16,1.25,2.20]):
  for col,a in enumerate([.10,.28,.50,.72,.90]):
   if col==2 and row in [2,3]:continue
   armor(c,f'Armor.Plate.{row}.{col}',body,z,math.pi*a,.79 if row<5 else .62,.38 if col in [0,4] else .43,root,arm,pre,m,'Body',.16)
 # Thick broken dorsal slabs frame the unarmored core instead of a flat board.
 for sign in [-1,1]:
  for row,z in enumerate([-2.15,-.78,.58,1.67]):
   z+=.16*sign*(1 if row%2 else -1)
   a=math.pi*(.35 if sign>0 else .65);p,_=body(z,a,.06);height=[.65,1.02,.89,.52][row]
   profile=[(p.y-.03,z-.61),(p.y+height*.55,z-.48),(p.y+height,z+.23),(p.y+height*.67,z+.34),(p.y+height*.58,z+.60),(p.y-.04,z+.52)]
   verts=[]
   for side in [-1,1]:
    for y,zz in profile:
     taper=max(.045,.15-.07*(y-p.y)/height);verts.append((p.x+sign*(y-p.y)*.63+side*taper,y,zz))
   n=len(profile)
   for side in [-1,1]:verts.append((p.x+sign*height*.30+side*.29,p.y+height*.45,z+.015))
   faces=[(i,(i+1)%n,2*n) for i in range(n)]+[(n+i,2*n+1,n+(i+1)%n) for i in range(n)]+[(i,(i+1)%n,n+(i+1)%n,n+i) for i in range(n)]
   yaw=sign*[.32,-.22,.27,-.35][row];turned=[]
   for x,y,zz in verts:
    dx=x-p.x;dz=zz-z;turned.append((p.x+dx*math.cos(yaw)-dz*math.sin(yaw),y,z+dx*math.sin(yaw)+dz*math.cos(yaw)))
   o=mesh(c,f'Dorsal.BrokenSlab.{sign}.{row}',turned,faces,m['rock'],root,arm,pre,'Body');o.data.materials.append(bpy.data.materials[m['edge']])
   for i,face in enumerate(o.data.polygons):face.material_index=1 if i in [n*2+1,n*2+3] else 0
 # A narrow ivory mechanism occupies the protected dorsal opening, echoed by side vents.
 core=c.sphere(pre+'Core.IvoryMechanism',(0,2.66,-.13),(1.12,.57,1.70),m['ivory'],8 if low else 14,4 if low else 7,root);bind(core,arm,pre,'Spine.1')
 for i,z in enumerate([-.70,-.37,.0,.34,.64]):
  points=[]
  for k in range(5 if low else 9):
   a=math.pi*k/(4 if low else 8);points.append(Vector((.54*math.cos(a),2.64+.32*math.sin(a),z)))
  o=tube(c,pre+f'Core.CageRib.{i}',points,lambda t:.045,m['metal'],root,4 if low else 6);bind(o,arm,pre,'Spine.1')
 for sign in [-1,1]:
  a=.015 if sign>0 else math.pi-.015
  bind(patch(c,pre+f'Vent.{sign}.Recess',body,-.20,a,.97,.38,m['ink'],root,.036,.012,6 if low else 12),arm,pre,'Body')
  for i,z in enumerate([-.78,-.41,-.04,.33]):
   points=[body(z,a+da,.078)[0] for da in [-.29,-.15,0,.15,.29]];o=tube(c,pre+f'Vent.{sign}.IvoryRib.{i}',points,lambda t:.056,m['ivory'],root,4 if low else 6);bind(o,arm,pre,'Body')
 drill(c,root,arm,pre,m,low)
 for leg in ct.LEG_IDS:limb(c,leg,root,arm,pre,m,low)
 tail=loft(c,pre+'Tail.Basalt',[(-5.1,.003,.003,.76),(-4.45,.42,.29,.97),(-3.66,.91,.51,1.19),(-2.82,1.0,.59,1.30)],m['rock'],root,1 if low else 2,6 if low else 10);bind(bpy.data.objects[pre+'Tail.Basalt'],arm,pre,'Spine.0')
 for i,z in enumerate([-4.28,-3.70,-3.15]):armor(c,f'Tail.Plate.{i}',tail,z,math.pi/2,.61,.94,root,arm,pre,m,'Spine.0',.17)
 for o in root.children_recursive:
  if o.type!='MESH':continue
  if any(mat.name==m['rock'] for mat in o.data.materials):
   for polygon in o.data.polygons:
    for ix in polygon.loop_indices:
     co=o.data.vertices[o.data.loops[ix].vertex_index].co;o.data.uv_layers.active.data[ix].uv=(.57+co.x*.003,.952+co.y*.0015)
  if low and ('.Plate.' in o.name or '.Scale.' in o.name):
   center=len(o.data.vertices)-1
   for polygon in o.data.polygons:
    for k,ix in enumerate(polygon.loop_indices):o.data.uv_layers.active.data[ix].uv=((2505 if o.data.loops[ix].vertex_index==center else 2453.5)/4096,1-(400 if o.data.loops[ix].vertex_index==center else 399+k)/4096)
 if low:
  for o in root.children_recursive:
   if o.type!='MESH' or any(token in o.name for token in ['Plate.','Scale.','BrokenSlab.','CuttingRing.','Flute.','Claw.']):continue
   o.data.calc_loop_triangles()
   if len(o.data.loop_triangles)>35:
    bpy.context.view_layer.objects.active=o;mod=o.modifiers.new('LOD1 Surface Reduction','DECIMATE');mod.ratio=.60;bpy.ops.object.modifier_apply(modifier=mod.name)
 return arm,[o for o in root.children_recursive if o.type=='MESH']


def support_actions(arm,pre):
 # Ground contact is authored on leg-root joints, never on scene roots. The
 # original brace/landing spine bends displaced soles by nearly two metres.
 ct.mute_actions([arm]);scene=bpy.context.scene
 for clip in ['Tunnel','Erupt_Tell','Erupt','Land','Withdraw']:
  action=next(t.strips[0].action for t in arm.animation_data.nla_tracks if t.name==clip);arm.animation_data.action=action;end=round(action.frame_range[1])
  for frame in range(1,end+1):
   scene.frame_set(frame)
   for leg in ct.LEG_IDS:arm.pose.bones[pre+f'Leg.{leg}.0'].location=(0,0,0)
   bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get()
   for leg in ct.LEG_IDS:
    foot=bpy.data.objects[pre+f'Leg.{leg}.Foot'];e=foot.evaluated_get(dg);me=e.to_mesh();floor=min((e.matrix_world@p.co).z for p in me.vertices);e.to_mesh_clear()
    bone=arm.pose.bones[pre+f'Leg.{leg}.0'];parent=bone.parent;basis=parent.matrix.to_3x3()@parent.bone.matrix_local.to_3x3().inverted()@bone.bone.matrix_local.to_3x3();delta=max(0,-floor) if clip=='Tunnel' else -floor;bone.location=basis.inverted()@Vector((0,0,delta));bone.keyframe_insert('location',frame=frame,group=bone.name)
  for fc in ct.action_fcurves(action):
   if fc.data_path.endswith('location'):
    for key in fc.keyframe_points:key.interpolation='LINEAR'
  arm.animation_data.action=None;ct.clear_pose(arm)
 scene.frame_set(1);bpy.context.view_layer.update()


def main():
 bpy.ops.wm.read_factory_settings(use_empty=True);c=Context(ct.REQ);c.root['authoring']='reference-authored sixteen-bone Basalt Burrower';c.root['reference']='design/references/enemies/basaltBurrower-turnaround.png';c.root['landings']='[]'
 m={'hide':c.material('Basalt.DarkHide',(.071,.080,.095)),'rock':c.material('Basalt.PaintedSlate',(.54,.53,.62),TEXTURES/'trim/violet.png'),'edge':c.material('Basalt.VioletBevel',(.072,.029,.105)),'ink':c.material('Basalt.Recess',(.012,.014,.020)),'ivory':c.material('Basalt.IvoryMechanism',(.61,.52,.33),emission=.018),'metal':c.material('Basalt.CoreMetal',(.13,.14,.17))}
 a0,m0=build(c,c.root,0,m);r1=bpy.data.objects.new('LOD1',None);bpy.context.collection.objects.link(r1);r1['lod']=1;r1['request']='M-015';a1,m1=build(c,r1,1,m);roots=[c.root,r1];arms=[a0,a1]
 for name,pos,bone in [('Core',(0,2.95,-.13),'Spine.1'),('Drill',(0,1.42,5.93),'DrillPivot'),('Hitbox.Body',(0,1.65,0),'Spine.1')]:
  o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.location=v(pos);bpy.context.view_layer.update();world=o.matrix_world.copy();o.parent=a0;o.parent_type='BONE';o.parent_bone=bone;o.matrix_world=world;o['socket']=True;c.sockets.append(name)
 scaffold_pose=ct.pose_for
 for arm,pre in [(a0,''),(a1,'LOD1.')]:
  def corrected_pose(clip,phase,name):
   rotation,scale=scaffold_pose(clip,phase,name)
   if name.startswith('Spine.') and clip in ['Erupt_Tell','Erupt','Land','Withdraw']:
    j=int(name[-1]);erupt=[-.04,-.04,-.02][j]
    angle=erupt*(phase if clip=='Erupt_Tell' else 1) if clip in ['Erupt_Tell','Erupt'] else (erupt*(1-phase)+.04*math.sin(phase*math.pi) if clip=='Land' else [.015,.02,.03][j]*math.sin(phase*math.pi))
    axis=arm.data.bones[pre+name].matrix_local.to_quaternion().inverted()@Vector((1,0,0));rotation=list(Quaternion(axis,angle).to_euler())
   return rotation,scale
  ct.pose_for=corrected_pose;ct.author_actions(arm,pre);support_actions(arm,pre)
 ct.author_root_erupt(c.root);ct.author_root_erupt(r1)
 bounds=[ct.fit_root(r) for r in roots];tris=[ct.count_triangles(r) for r in roots];print('BASALT REFINED GEOMETRY',bounds,tris,flush=True);assert tris[0]<=7000 and tris[1]<=2000
 weights={'LOD0':ct.validate_weights(m0,a0),'LOD1':ct.validate_weights(m1,a1,'LOD1.')};saved=ct.capture_transforms();samples=ct.sample_animations(roots+arms,m0+m1);loops=ct.validate_loops(arms);motion=ct.validate_root_motion(roots);spin=ct.validate_drill_motion(arms);ground={r.name:ct.ground_report(r) for r in roots}
 preview.wr=ct;preview.OUT=OUT;preview.rest(roots,arms,saved);scene,cam=preview.studio()
 for lod in range(2):
  for view in ['front','three-quarter','top','side']:preview.render(scene,cam,roots,arms,saved,lod,view)
 if '--qa' in sys.argv:
  for lod in range(2):
   for clip in ct.REQ['clips']:
    for phase in ([0,.25,.5,.75,1] if clip=='Tunnel' else [0,.5,1]):preview.render(scene,cam,roots,arms,saved,lod,'three-quarter',clip,phase)
 preview.rest(roots,arms,saved);bpy.ops.object.select_all(action='DESELECT')
 for r in roots:
  for o in [r,*r.children_recursive]:o.select_set(True);o.hide_render=False
 raw=OUT/'basaltBurrower-uncompressed.glb';final=OUT/'basaltBurrower.glb';bpy.ops.export_scene.gltf(filepath=str(raw),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_extras=True,export_apply=True,export_materials='EXPORT',export_yup=True,export_skins=True,export_all_influences=True)
 subprocess.run([shutil.which('node'),str(HERE/'compress.mjs'),str(raw),str(final),'--force'],check=True);preview.rest(roots,arms,saved)
 for o in [r1,*r1.children_recursive]:o.hide_render=True
 bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'basaltBurrower.blend'),compress=True)
 data=final.read_bytes();doc=json.loads(data[20:20+struct.unpack_from('<I',data,12)[0]])
 def exported_triangles(rootname):
  def visit(i):
   n=doc['nodes'][i];total=0
   if 'mesh' in n:
    for p in doc['meshes'][n['mesh']]['primitives']:total+=doc['accessors'][p.get('indices',p['attributes']['POSITION'])]['count']//3
   return total+sum(visit(j) for j in n.get('children',[]))
  return visit(next(i for i,n in enumerate(doc['nodes']) if n.get('name')==rootname))
 authored=tris;tris=[exported_triangles('LOD0'),exported_triangles('LOD1')]
 record={'request':'M-015','name':'Basalt Burrower','file':str(final.relative_to(ROOT)),'preview':str((OUT/'LOD0-three-quarter.png').relative_to(ROOT)),'source':'hopper/3d/models/source/basalt_burrower_refine.py','category':'enemy','region':'red','bounds':bounds[0],'targetBounds':ct.REQ['size'],'triangles':tris,'clips':ct.REQ['clips'],'sockets':ct.REQ['sockets'],'landings':[],'status':'candidate-awaiting-root-review','sourceReference':'design/references/enemies/basaltBurrower-turnaround.png'}
 (OUT/'record.json').write_text(json.dumps(record,indent=2)+'\n');(OUT/'manifest.json').write_text(json.dumps({'version':1,'models':[record]},indent=2)+'\n');(OUT/'rig-qa.json').write_text(json.dumps({'bones':{r.name:[b.name for b in a.data.bones] for r,a in zip(roots,arms)},'weights':weights,'samples':samples,'loops':loops,'rootMotion':motion,'drillMotion':spin,'grounding':ground,'bounds':bounds,'triangles':tris,'authoredTriangles':authored},indent=2)+'\n');print('BASALT REFINED DONE',flush=True)
if __name__=='__main__':main()
