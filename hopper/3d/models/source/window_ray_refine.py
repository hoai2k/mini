"""M005 Window Ray art pass: distinct ivory-eyed diamond manta with one tail.

Separate candidate only. Preserves Sol's eight-bone scaffold and eight clips.
Run Blender -b --python this_file.py; append -- --qa for all deformation samples.
"""
import bpy,math,json,sys,shutil,subprocess,struct
from pathlib import Path
from mathutils import Vector
HERE=Path(__file__).resolve().parent;sys.path.insert(0,str(HERE))
from common import Context,ROOT,TEXTURES,v
import window_ray as wr
from wasp_refine import loft,patch,normals
from phase_skate_refine import catmull,tube
OUT=ROOT/'local/hopper-window-ray-refine';OUT.mkdir(parents=True,exist_ok=True)

def bind(o,arm,pre,kind='Body'):
 rows=[]
 for vertex in o.data.vertices:
  x=vertex.co.x;z=-vertex.co.y
  rows.append(wr.wing_influences(-1 if x<0 else 1,x) if kind=='Wing' else (wr.tail_influences(z) if kind=='Tail' else [(kind,1)]))
 wr.assign_weights(o,rows,arm,pre);return o

def mesh(c,name,verts,faces,mat,root,arm,pre,kind='Body',smooth=False):
 o=c.mesh(pre+name,verts,faces,mat,root);bind(o,arm,pre,kind)
 return normals(o) if smooth else o

def wing(c,sign,root,arm,pre,m,low):
 # Four pointed kite corners with a concave trailing cut; skin is one cambered
 # continuous surface per wing, with curved intermediate contour sections.
 anchors=[(.68,1.18),(1.54,1.56),(2.85,1.39),(5.50,1.08),(4.13,.12),(5.08,-1.28),(3.21,-.76),(1.56,-.72),(.68,-.80)]
 contour=[]
 for i,a in enumerate(anchors):
  b=anchors[(i+1)%len(anchors)]
  contour.append(Vector(a))
  if not low:
   # Shallow bowed span between fixed sharp tips, without stair-step terraces.
   mid=(Vector(a)+Vector(b))*.5
   if i in [0,1,5,6]:mid.y+=.10
   contour.append(mid)
 n=len(contour);center=Vector((1.90,.08));verts=[];faces=[]
 rings=[(1,0),(.68,.17),(.27,.27),(0,.30)] if not low else [(1,0),(.48,.23),(0,.30)]
 for radius,h in rings:
  for p in contour:
   q=center+(p-center)*radius;y=.035+h*(1-q.x/7);verts.append((sign*q.x,y,q.y))
 for j in range(len(rings)-1):
  for i in range(n):faces.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
 # Project decoration onto the actual triangulated foil, including its camber.
 top_triangles=[]
 for face in faces:
  for tri in [(face[0],face[1],face[2]),(face[0],face[2],face[3])]:
   top_triangles.append([Vector((abs(verts[i][0]),verts[i][1],verts[i][2])) for i in tri])
 def foil(px,pz):
  def sample(x,z):
   for a,b,d in top_triangles:
    den=(b.z-d.z)*(a.x-d.x)+(d.x-b.x)*(a.z-d.z)
    if abs(den)<1e-9:continue
    u=((b.z-d.z)*(x-d.x)+(d.x-b.x)*(z-d.z))/den;w=((d.z-a.z)*(x-d.x)+(a.x-d.x)*(z-d.z))/den;t=1-u-w
    if min(u,w,t)>=-1e-5:return Vector((x,a.y*u+b.y*w+d.y*t,z))
  hit=sample(px,pz)
  if hit is not None:return hit
  q=Vector((px,pz));best=None;distance=1e9
  for i,a in enumerate(contour):
   b=contour[(i+1)%n];edge=b-a;t=max(0,min(1,(q-a).dot(edge)/max(edge.length_squared,1e-9)));p=a+t*edge
   if (p-q).length<distance:best=p;distance=(p-q).length
  best=best*.997+center*.003;return sample(best.x,best.y) or Vector((best.x,.035,best.y))
 off=len(verts)
 for radius,h in [(1,-.035),(0,-.13)]:
  for p in contour:q=center+(p-center)*radius;verts.append((sign*q.x,h,q.y))
 for i in range(n):
  j=(i+1)%n;faces.extend([(off+i,off+n+i,off+n+j,off+j),(i,off+i,off+j,j)])
 side='L' if sign<0 else 'R';mesh(c,f'Wing.{side}.Cambered',verts,faces,m['hide'],root,arm,pre,'Wing',True)
 # Armor segments sit on the foil; their rear corners overlap into serrations.
 for row,(cx,cz,sx,sz) in enumerate([(1.22,.78,.65,.60),(1.89,.77,.78,.58),(2.73,.58,.94,.57),(3.65,.35,.97,.50),(1.54,-.22,.73,.50),(2.51,-.34,.90,.41)]):
  outline=[(-.65, .25),(-.35,.63),(.58,.30),(1,-.50),(.18,-.32),(-.62,-.68)]
  if low:outline=[outline[i] for i in [0,2,3,5]]
  vv=[]
  for factor,height in [(1,.008),(.52,.045),(0,.060)]:
   for x,z in outline:
    px=cx+x*sx*factor;pz=cz+z*sz*factor;p=foil(px,pz);vv.append((sign*p.x,p.y+height,p.z))
  count=len(outline);ff=[]
  for j in range(2):
   for i in range(count):ff.append((j*count+i,j*count+(i+1)%count,(j+1)*count+(i+1)%count,(j+1)*count+i))
  mesh(c,f'Wing.{side}.Plate.{row}',vv,ff,m['shell'],root,arm,pre,'Wing')
 # Narrow violet lips are sampled from the exact outer contour, never suspended.
 vv=[]
 for radius,h in [(1,.004),(.965,.006)]:
  for p in contour:q=center+(p-center)*radius;hit=foil(q.x,q.y);vv.append((sign*hit.x,hit.y+h,hit.z))
 mesh(c,f'Wing.{side}.Edge',vv,[(i,(i+1)%n,n+(i+1)%n,n+i) for i in range(n)],m['edge'],root,arm,pre,'Wing')
 # Two integrated vent cassettes per wing, with restrained bronze slats.
 for row,(x,z) in enumerate([(1.75,.93),(2.44,.25)]):
  vv=[(sign*(x+dx),foil(x+dx,z+dz).y+.022,z+dz) for dx,dz in [(-.28,-.12),(.24,-.16),(.27,.10),(-.24,.15)]]
  mesh(c,f'Wing.{side}.Vent.{row}',vv,[(0,1,2,3)],m['ink'],root,arm,pre,'Wing')
  for k in range(2 if low else 3):
   px=x-.16+k*.14;vv=[(sign*(px+dx),foil(px+dx,z+dz).y+.028,z+dz) for dx,dz in [(-.020,-.10),(.020,-.10),(.020,.10),(-.020,.10)]]
   mesh(c,f'Wing.{side}.VentSlat.{row}.{k}',vv,[(0,1,2,3)],m['bronze'],root,arm,pre,'Wing')

def build(c,root,lod,m):
 low=lod==1;pre='LOD1.' if low else '';arm=wr.make_armature(pre+'Rig',root,pre)
 surface=loft(c,pre+'Body.CarvedShell',[(-1.13,.19,.15,0),(-.60,.68,.26,.04),(.05,.94,.32,.06),(.73,.78,.29,.03),(1.34,.58,.24,-.02),(1.86,.27,.15,-.08),(2.20,.005,.005,-.10)],m['shell'],root,1 if low else 2,10 if low else 18)
 bind(bpy.data.objects[pre+'Body.CarvedShell'],arm,pre)
 wing(c,-1,root,arm,pre,m,low);wing(c,1,root,arm,pre,m,low)
 # Single central ivory eye seated on the actual sloping head, with an ink slit.
 for name,zc,zr,ar,mat,offset,crown,count in [('Socket',1.26,.49,.96,m['ink'],.018,.018,10 if low else 18),('Bevel',1.26,.465,.91,m['edge'],.029,.025,10 if low else 18),('Lens',1.28,.40,.78,m['ivory'],.048,.043,12 if low else 22),('Pupil',1.29,.27,.095,m['ink'],.098,.008,8 if low else 12)]:
  bind(patch(c,pre+'Eye.'+name,surface,zc,math.pi/2,zr,ar,mat,root,offset,crown,count),arm,pre,'Eye')
 # Back plate frames the stomp target; an aft crest leaves the central back clear.
 for i,z in enumerate([-.62,-.20,.22]):
  bind(patch(c,pre+f'Back.Plate.{i}',surface,z,math.pi/2,.30,.67,m['shell'],root,.045,.065,6 if low else 12),arm,pre)
 controls=[(0,.06,-.68),(0,.06,-1.45),(-.12,.08,-2.26),(.02,.10,-3.15),(.24,.12,-3.88),(.18,.12,-4.10)]
 points=catmull(controls,1 if low else 3);o=tube(c,pre+'Tail.Whip',points,lambda t:.18*(1-t)**1.6+.012,m['edge'],root,4 if low else 7);bind(o,arm,pre,'Tail')
 # The elongated dorsal blade belongs only to the body, unlike the Phase Skate.
 o=tube(c,pre+'Back.Crest',catmull([(0,.27,-.40),(0,.52,-.65),(0,.69,-.99),(0,.71,-1.17)],1 if low else 2),lambda t:.12*(1-t)+.003,m['edge'],root,4 if low else 6);bind(o,arm,pre)
 for o in root.children_recursive:
  if o.type=='MESH' and any(mat.name==m['shell'] for mat in o.data.materials):
   for p in o.data.polygons:
    for ix in p.loop_indices:
     co=o.data.vertices[o.data.loops[ix].vertex_index].co;o.data.uv_layers.active.data[ix].uv=(.57+co.x*.003,.952+co.y*.0015)
 for o in root.children_recursive:
  if o.type=='MESH' and any(mat.name==m['hide'] for mat in o.data.materials):
   for p in o.data.polygons:
    for ix in p.loop_indices:
     co=o.data.vertices[o.data.loops[ix].vertex_index].co;o.data.uv_layers.active.data[ix].uv=(.5+co.x*.038,.5+co.y*.05)
 return arm,[o for o in root.children_recursive if o.type=='MESH']

def rest(roots,arms,saved):
 wr.mute_actions([o for r in roots for o in [r,*r.children_recursive]])
 for arm in arms:wr.clear_pose(arm)
 wr.restore_transforms(saved)

def studio():
 scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=16;scene.cycles.use_denoising=True;scene.render.fps=30;scene.render.resolution_x=1100;scene.render.resolution_y=760;scene.render.resolution_percentage=100
 scene.world=bpy.data.worlds.new('Window Ray QA');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.15,.17,.21,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.7
 for p,e,size in [((2,-7,10),1800,8),((-7,1,6),1400,7),((2,8,5),1300,6)]:
  d=bpy.data.lights.new('Studio','AREA');d.energy=e;d.size=size;o=bpy.data.objects.new('Studio',d);scene.collection.objects.link(o);o.location=p;o.rotation_euler=(-o.location).to_track_quat('-Z','Y').to_euler()
 d=bpy.data.cameras.new('QA.Camera');cam=bpy.data.objects.new('QA.Camera',d);scene.collection.objects.link(cam);scene.camera=cam;d.type='ORTHO';scene.view_settings.view_transform='Standard';return scene,cam

def render(scene,cam,roots,arms,saved,lod,view,clip=None,phase=.5):
 rest(roots,arms,saved)
 for n,r in enumerate(roots):
  for o in [r,*r.children_recursive]:o.hide_render=n!=lod
 if clip:
  objs=[o for r in roots for o in [r,*r.children_recursive]];wr.set_clip(objs,clip);end=max(s.frame_end for o in objs if o.animation_data for t in o.animation_data.nla_tracks if t.name==clip for s in t.strips);f=1+(end-1)*phase;scene.frame_set(int(f),subframe=f%1)
 direction=Vector({'front':(0,-1,.48),'three-quarter':(1,-1.8,1.25),'top':(0,-.03,1),'side':(1,0,.30)}[view]).normalized();rotation=(-direction).to_track_quat('-Z','Y');right=rotation@Vector((1,0,0));up=rotation@Vector((0,1,0));dg=bpy.context.evaluated_depsgraph_get();points=[]
 for obj in roots[lod].children_recursive:
  if obj.type!='MESH':continue
  e=obj.evaluated_get(dg);me=e.to_mesh();points.extend(e.matrix_world@p.co for p in me.vertices);e.to_mesh_clear()
 low=Vector(tuple(min(p[i] for p in points) for i in range(3)));high=Vector(tuple(max(p[i] for p in points) for i in range(3)));target=(low+high)*.5
 width=max(p.dot(right) for p in points)-min(p.dot(right) for p in points);height=max(p.dot(up) for p in points)-min(p.dot(up) for p in points)
 target+=right*((max(p.dot(right) for p in points)+min(p.dot(right) for p in points))*.5-target.dot(right));target+=up*((max(p.dot(up) for p in points)+min(p.dot(up) for p in points))*.5-target.dot(up))
 cam.location=target+direction*18;cam.rotation_euler=rotation.to_euler();cam.data.ortho_scale=max(max(width,height*1100/760)*1.12,12.0 if clip=='Dissolve' else 0)
 scene.render.filepath=str(OUT/(f'LOD{lod}-{view}'+(f'-{clip}-{phase:.2f}' if clip else '')+'.png'));bpy.ops.render.render(write_still=True)

def main():
 bpy.ops.wm.read_factory_settings(use_empty=True);c=Context(wr.REQ);c.root['authoring']='reference-authored eight-bone Window Ray';c.root['reference']='design/references/enemies/windowRay-turnaround.png';c.root['landings']='[]'
 m={'hide':c.material('Ray.PaintedHide',(.42,.40,.49),TEXTURES/'creatures/shadow-hide.png'),'shell':c.material('Ray.Slate',(.48,.47,.55),TEXTURES/'trim/violet.png'),'edge':c.material('Ray.Violet',(.14,.08,.23)),'ink':c.material('Ray.Ink',(.013,.012,.019)),'ivory':c.material('Ray.Ivory',(.50,.43,.27),emission=.018),'bronze':c.material('Ray.VentBronze',(.24,.21,.15))}
 a0,m0=build(c,c.root,0,m);r1=bpy.data.objects.new('LOD1',None);bpy.context.collection.objects.link(r1);r1['lod']=1;r1['request']='M-005';a1,m1=build(c,r1,1,m);roots=[c.root,r1];arms=[a0,a1]
 for name,pos,bone in [('Core',(0,.34,.10),'Body'),('Mouth',(0,.35,1.5),'Eye'),('Landing',(0,.45,.02),'Body')]:
  obj=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(obj);obj.location=v(pos);bpy.context.view_layer.update();world=obj.matrix_world.copy();obj.parent=a0;obj.parent_type='BONE';obj.parent_bone=bone;obj.matrix_world=world;obj['socket']=True;c.sockets.append(name)
 c.socket('Hitbox.Body',(0,0,.15),c.root);bpy.data.objects['Landing']['surface']='stomp-target'
 # Bone local Y runs along each wing. The scaffold used Y and only twisted
 # the chord; local X bends local Y toward local Z/up on both mirrored wings.
 scaffold_pose=wr.arm_pose
 def fold_pose(clip,phase,bone):
  rotation,scale=scaffold_pose(clip,phase,bone)
  if bone.startswith('Wing.'):
   side=-1 if '.L.' in bone else 1;rotation=[rotation[1]*side,0,0]
  return rotation,scale
 wr.arm_pose=fold_pose
 wr.author_armature_actions(a0);wr.author_armature_actions(a1,'LOD1.');wr.author_root_dive(c.root);wr.author_root_dive(r1)
 bounds=[wr.fit_root(r) for r in roots];tris=[wr.count_triangles(r) for r in roots];print('WINDOW REFINED GEOMETRY',bounds,tris,flush=True);assert tris[0]<=4000 and tris[1]<=1200
 weights={'LOD0':wr.validate_weights(m0,a0),'LOD1':wr.validate_weights(m1,a1,'LOD1.')};saved=wr.capture_transforms();samples=wr.sample_animations(roots+arms,m0+m1);loops=wr.validate_loop_closure(arms);motion=wr.validate_root_motion(roots);rest(roots,arms,saved)
 scene,cam=studio()
 for lod in range(2):
  for view in ['front','three-quarter','top','side']:render(scene,cam,roots,arms,saved,lod,view)
 if '--qa' in sys.argv:
  for lod in range(2):
   for clip in wr.REQ['clips']:
    for phase in ([0,.25,.5,.75,1] if clip=='Hover' else [0,.5,1]):render(scene,cam,roots,arms,saved,lod,'three-quarter',clip,phase)
 rest(roots,arms,saved);bpy.ops.object.select_all(action='DESELECT')
 for r in roots:
  for o in [r,*r.children_recursive]:o.select_set(True);o.hide_render=False
 raw=OUT/'windowRay-uncompressed.glb';final=OUT/'windowRay.glb';bpy.ops.export_scene.gltf(filepath=str(raw),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_extras=True,export_apply=True,export_materials='EXPORT',export_yup=True,export_skins=True,export_all_influences=True)
 subprocess.run([shutil.which('node'),str(HERE/'compress.mjs'),str(raw),str(final),'--force'],check=True);rest(roots,arms,saved)
 for o in [r1,*r1.children_recursive]:o.hide_render=True
 bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'windowRay.blend'),compress=True)
 data=final.read_bytes();doc=json.loads(data[20:20+struct.unpack_from('<I',data,12)[0]])
 def exported_triangles(rootname):
  def visit(i):
   n=doc['nodes'][i];total=0
   if 'mesh' in n:
    for p in doc['meshes'][n['mesh']]['primitives']:total+=doc['accessors'][p.get('indices',p['attributes']['POSITION'])]['count']//3
   return total+sum(visit(j) for j in n.get('children',[]))
  return visit(next(i for i,n in enumerate(doc['nodes']) if n.get('name')==rootname))
 authored_tris=tris;tris=[exported_triangles('LOD0'),exported_triangles('LOD1')]
 record={'request':'M-005','name':'Window Ray','file':str(final.relative_to(ROOT)),'preview':str((OUT/'LOD0-three-quarter.png').relative_to(ROOT)),'source':'hopper/3d/models/source/window_ray_refine.py','category':'enemy','region':'city','bounds':bounds[0],'targetBounds':wr.REQ['size'],'triangles':tris,'clips':wr.REQ['clips'],'sockets':wr.REQ['sockets'],'landings':[],'status':'candidate-awaiting-root-review','sourceReference':'design/references/enemies/windowRay-turnaround.png'}
 (OUT/'record.json').write_text(json.dumps(record,indent=2)+'\n');(OUT/'manifest.json').write_text(json.dumps({'version':1,'models':[record]},indent=2)+'\n');(OUT/'rig-qa.json').write_text(json.dumps({'bones':{r.name:[b.name for b in a.data.bones] for r,a in zip(roots,arms)},'weights':weights,'samples':samples,'loops':loops,'rootMotion':motion,'bounds':bounds,'triangles':tris,'authoredTriangles':authored_tris},indent=2)+'\n');print('WINDOW REFINED DONE',flush=True)
if __name__=='__main__':main()
