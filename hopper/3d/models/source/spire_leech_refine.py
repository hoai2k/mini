"""M006 reference art pass over the validated nine-bone Spire Leech scaffold.

Writes only local/hopper-spire-leech-refine. Keeps scaffold bone names, skinning,
clips and sockets. Uses generated painted hide/trim; no replacement texture art.
"""
import bpy,bmesh,math,json,sys,shutil,subprocess
from pathlib import Path
from mathutils import Vector
HERE=Path(__file__).resolve().parent;sys.path.insert(0,str(HERE))
from common import Context,ROOT,TEXTURES,v
import spire_leech as sl
from phase_skate_refine import catmull
OUT=ROOT/'local/hopper-spire-leech-refine';OUT.mkdir(parents=True,exist_ok=True)

def smooth(o):
 bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(o.data);bm.free()
 for p in o.data.polygons:p.use_smooth=True
 return o

def skin(c,name,verts,faces,mat,root,arm,prefix,bone=None):
 o=c.mesh(prefix+name,verts,faces,mat,root)
 sl.apply_weights(o,[(i,p[2],bone) for i,p in enumerate(verts)],arm,prefix)
 return o

def tube(c,name,controls,radius,mat,root,arm,prefix,bone,steps=2,sides=6):
 points=catmull(controls,steps);verts=[];faces=[]
 for i,p in enumerate(points):
  tangent=(points[min(len(points)-1,i+1)]-points[max(0,i-1)]).normalized();ref=Vector((0,1,0))
  if abs(tangent.dot(ref))>.9:ref=Vector((1,0,0))
  u=tangent.cross(ref).normalized();w=tangent.cross(u).normalized();r=radius(i/(len(points)-1))
  for j in range(sides):a=math.tau*j/sides;verts.append(tuple(p+r*(u*math.cos(a)+w*math.sin(a))))
 for i in range(len(points)-1):
  for j in range(sides):faces.append((i*sides+j,i*sides+(j+1)%sides,(i+1)*sides+(j+1)%sides,(i+1)*sides+j))
 faces.extend([tuple(reversed(range(sides))),tuple((len(points)-1)*sides+j for j in range(sides))])
 return smooth(skin(c,name,verts,faces,mat,root,arm,prefix,bone))

def armor(c,name,z,a,span,mat,edge,root,arm,prefix,low=False):
 cols=3 if low else 5;rows=[(.27,.025),(.07,.11),(-.30,.04)] if low else [(.27,.025),(.18,.10),(-.09,.12),(-.30,.04)];verts=[];faces=[]
 for dz,raised in rows:
  for i in range(cols):
   u=i/(cols-1)*2-1;angle=a+u*span;zz=z+dz-(.15*(1-abs(u)) if dz<0 else 0)
   cx,cy=sl.centerline(zz);r=sl.radius_at(zz)*.84+raised
   verts.append((cx+r*math.cos(angle),cy+r*math.sin(angle),zz))
 for j in range(len(rows)-1):
  for i in range(cols-1):faces.append((j*cols+i,j*cols+i+1,(j+1)*cols+i+1,(j+1)*cols+i))
 o=skin(c,name,verts,faces,mat,root,arm,prefix)
 # A narrow bevel follows the rear chevron seam and is part of its shell.
 if not low:
  vv=[]
  for factor in [0,1]:
   for i in range(cols):
    p=Vector(verts[-cols+i]);p.z+=factor*.026;p.x*=1+factor*.003;p.y*=1+factor*.003;vv.append(tuple(p))
  skin(c,name+'.Lip',vv,[(i,i+1,cols+i+1,cols+i) for i in range(cols-1)],edge,root,arm,prefix)
 return o

def collar(c,name,zs,rs,mat,root,arm,prefix,bone='Head',sides=20):
 verts=[];faces=[]
 for z,r in zip(zs,rs):
  for j in range(sides):a=math.tau*j/sides;verts.append((r*math.cos(a),r*math.sin(a),z))
 for i in range(len(zs)-1):
  for j in range(sides):faces.append((i*sides+j,i*sides+(j+1)%sides,(i+1)*sides+(j+1)%sides,(i+1)*sides+j))
 return smooth(skin(c,name,verts,faces,mat,root,arm,prefix,bone))

def build(c,root,lod,mats):
 low=lod==1;pre='LOD1.' if low else '';arm=sl.make_armature(pre+'Rig',root,pre);sides=8 if low else 12
 body=sl.skinned_tube(c,pre+'Body.Underhide',[-3.62+6.65*i/(14 if low else 28) for i in range(15 if low else 29)],sides,mats['hide'],root,arm,pre,radius_scale=.81)
 # Four overlapping longitudinal plate courses, fourteen articulated segments.
 for row in range(14):
  z=-3.30+row*.465
  for k in range(4):armor(c,f'Armor.{row}.{k}',z+(.10 if k%2 else 0),math.pi*.25+k*math.pi/2,math.pi*.26,mats['shell'],mats['edge'],root,arm,pre,low)
  if not low or row%2==0:
   cx,cy=sl.centerline(z);r=sl.radius_at(z)*.84+.09
   tube(c,f'Dorsal.Thorn.{row}',[(cx,cy+r,z),(cx,cy+r+.13,z-.10),(cx,cy+r+.17,z-.27)],lambda t:.075*(1-t)+.002,mats['edge'],root,arm,pre,None,1,4)
 # The tail is an actual curled tapered hook, with skin assigned to Chain.0.
 tube(c,'Tail.TerminalHook',[(0,.01,-3.44),(0,.10,-3.79),(0,.27,-4.03),(0,.40,-4.07),(0,.38,-3.86)],lambda t:.15*(1-t)**.9+.002,mats['shell'],root,arm,pre,'Chain.0',1 if low else 3,4 if low else 7)
 # Recessed mouth cavity and thick annular helmet; open anatomy has real depth.
 collar(c,'Head.Armor',[2.85,3.12,3.38,3.60],[.43,.56,.56,.49],mats['shell'],root,arm,pre,sides=12 if low else 24)
 collar(c,'Mouth.Recess',[3.59,3.73,3.67],[.48,.35,.08],mats['ink'],root,arm,pre,sides=12 if low else 24)
 collar(c,'Mouth.Rim',[3.58,3.63,3.67],[.50,.515,.47],mats['edge'],root,arm,pre,sides=12 if low else 24)
 # Ivory recurved teeth point inward, wrapping the dark emitter well.
 teeth=10 if low else 14
 for j in range(teeth):
  a=math.tau*j/teeth;u=Vector((math.cos(a),math.sin(a),0));bone='Jaw' if math.sin(a)<-.1 else 'Head'
  points=[tuple(u*.435+Vector((0,0,3.65))),tuple(u*.37+Vector((0,0,3.88))),tuple(u*.21+Vector((0,0,3.94))),tuple(u*.17+Vector((0,0,3.87)))]
  tube(c,f'Mouth.HookedTooth.{j}',points,lambda t:.065*(1-t)**.65+.001,mats['ivory'],root,arm,pre,bone,1 if low else 2,4 if low else 6)
 # Paired long curved mouth appendages, no extra walking legs.
 for sign,label in [(-1,'L'),(1,'R')]:
  for k,y in enumerate([-.20,.25]):
   tube(c,f'Mouth.Mandible.{label}.{k}',[(sign*.45,y,3.13),(sign*.72,y-.03,3.39),(sign*.76,y-.13,3.73),(sign*.54,y-.20,4.00)],lambda t:.10*(1-t)**.7+.003,mats['edge'],root,arm,pre,'Head' if k else 'Jaw',1 if low else 2,4 if low else 6)
 # Recessed charge windows immediately behind the mouth, seated in the helmet.
 for j in range(6 if low else 10):
  a=math.tau*j/(6 if low else 10);da=.063;verts=[]
  for z in [3.40,3.51]:
   for aa in [a-da,a+da]:verts.append((.564*math.cos(aa),.564*math.sin(aa),z))
  skin(c,f'Head.ChargeWindow.{j}',verts,[(0,1,3,2)],mats['ivory'],root,arm,pre,'Head')
 emitter=c.sphere(pre+'Mouth.Emitter',(0,0,3.70),(.27,.27,.10),mats['emitter'],8 if low else 12,4 if low else 6,root)
 sl.apply_weights(emitter,[(v.index,0,'Head') for v in emitter.data.vertices],arm,pre)
 # Generated painted hide is retained beneath armor; shell paint uses a quiet
 # band of the generated violet trim instead of mapping a whole atlas per face.
 for o in root.children_recursive:
  if o.type=='MESH' and any(m.name==mats['shell'] for m in o.data.materials):
   for p in o.data.polygons:
    for li in p.loop_indices:
     co=o.data.vertices[o.data.loops[li].vertex_index].co;o.data.uv_layers.active.data[li].uv=(.35+co.x*.18,.92+(co.y*.012)%.045)
 return arm,[o for o in root.children_recursive if o.type=='MESH'],emitter

def rest(roots,arms,saved):
 sl.mute_all_actions([o for r in roots for o in [r,*r.children_recursive]])
 for arm in arms:sl.clear_pose(arm)
 sl.restore_transforms(saved)

def studio():
 scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=16;scene.cycles.use_denoising=True;scene.render.fps=30;scene.render.resolution_x=1200;scene.render.resolution_y=650;scene.render.resolution_percentage=100
 scene.world=bpy.data.worlds.new('Spire Studio');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.16,.18,.22,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.65
 for p,e,size in [((3,-7,9),1800,7),((-6,1,5),1400,7),((3,7,4),1200,6)]:
  d=bpy.data.lights.new('Studio','AREA');d.energy=e;d.size=size;o=bpy.data.objects.new('Studio',d);scene.collection.objects.link(o);o.location=p;o.rotation_euler=(-o.location).to_track_quat('-Z','Y').to_euler()
 d=bpy.data.cameras.new('QA.Camera');cam=bpy.data.objects.new('QA.Camera',d);scene.collection.objects.link(cam);scene.camera=cam;d.type='ORTHO';d.ortho_scale=10.0;scene.view_settings.view_transform='Standard';return scene,cam

def render(scene,cam,roots,arms,saved,lod,view,clip=None,phase=.5):
 rest(roots,arms,saved)
 for n,r in enumerate(roots):
  for o in [r,*r.children_recursive]:o.hide_render=n!=lod
 if clip:
  objs=[o for r in roots for o in [r,*r.children_recursive]];sl.set_active_clip(objs,clip);end=max(s.frame_end for o in objs if o.animation_data for t in o.animation_data.nla_tracks if t.name==clip for s in t.strips);frame=1+(end-1)*phase;scene.frame_set(int(frame),subframe=frame%1)
 # Side-oriented camera makes the long chain legible at game aspect ratio.
 directions={'side':(1,0,.35),'three-quarter':(1,-.48,.55),'top':(0,-.02,1),'mouth':(.12,-1,.18)}
 direction=Vector(directions[view]).normalized();rotation=(-direction).to_track_quat('-Z','Y');right=rotation@Vector((1,0,0));up=rotation@Vector((0,1,0));points=[];dg=bpy.context.evaluated_depsgraph_get()
 for obj in roots[lod].children_recursive:
  if obj.type!='MESH' or (view=='mouth' and not any(x in obj.name for x in ['Head.','Mouth.'])):continue
  evaluated=obj.evaluated_get(dg);mesh=evaluated.to_mesh();points.extend(evaluated.matrix_world@p.co for p in mesh.vertices);evaluated.to_mesh_clear()
 low=Vector(tuple(min(p[i] for p in points) for i in range(3)));high=Vector(tuple(max(p[i] for p in points) for i in range(3)));target=(low+high)/2
 # Every pose is fitted from evaluated skinned vertices, including Retract's arc.
 width=max(p.dot(right) for p in points)-min(p.dot(right) for p in points);height=max(p.dot(up) for p in points)-min(p.dot(up) for p in points)
 cam.location=target+direction*15;cam.rotation_euler=rotation.to_euler();cam.data.ortho_scale=max(width,height*scene.render.resolution_x/scene.render.resolution_y)*1.16
 scene.render.filepath=str(OUT/(f'LOD{lod}-{view}'+(f'-{clip}-{phase:.2f}' if clip else '')+'.png'));bpy.ops.render.render(write_still=True)

def main():
 bpy.ops.wm.read_factory_settings(use_empty=True);c=Context(sl.REQ);c.root['authoring']='reference-authored skinned segmented armor';c.root['reference']='design/references/enemies/spireLeech-turnaround.png';c.root['axisContract']='+Y up, +Z forward'
 mats={'hide':c.material('Leech.Hide',(.42,.40,.48),TEXTURES/'creatures/shadow-hide.png'),'shell':c.material('Leech.Slate',(.52,.52,.58),TEXTURES/'trim/violet.png'),'edge':c.material('Leech.Bevel',(.10,.06,.16)),'ivory':c.material('Leech.Ivory',(.78,.69,.47)),'ink':c.material('Leech.MouthDark',(.015,.012,.019)),'emitter':c.material('Leech.Ember',(.82,.20,.025),emission=.8)}
 a0,m0,e0=build(c,c.root,0,mats);lod1=bpy.data.objects.new('LOD1',None);bpy.context.collection.objects.link(lod1);lod1['lod']=1;lod1['request']='M-006';a1,m1,e1=build(c,lod1,1,mats);roots=[c.root,lod1];arms=[a0,a1]
 for name,pos,bone in [('Core',(0,0,-.28),'Chain.3'),('Emitter',(0,0,3.92),'Head')]:
  obj=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(obj);obj.location=v(pos);bpy.context.view_layer.update();world=obj.matrix_world.copy();obj.parent=a0;obj.parent_type='BONE';obj.parent_bone=bone;obj.matrix_world=world;obj['socket']=True;c.sockets.append(name)
 c.socket('Hitbox.Body',(0,0,-.15),c.root)
 sl.author_actions(a0);sl.author_actions(a1,'LOD1.');sl.animate_emitter(c,e0);sl.animate_emitter(c,e1)
 bounds=[sl.fit_root_to_contract(r) for r in roots];tris=[sl.count_triangles(r) for r in roots];print('SPIRE REFINED GEOMETRY',bounds,tris,flush=True);assert tris[0]<=5000 and tris[1]<=1500
 weights={'LOD0':sl.validate_skin_weights(m0,a0),'LOD1':sl.validate_skin_weights(m1,a1,'LOD1.')};saved=sl.capture_transforms();samples=sl.sample_animations([a0,a1,e0,e1],m0+m1);rest(roots,arms,saved)
 scene,cam=studio()
 for lod in range(2):
  for view in ['side','three-quarter','top','mouth']:render(scene,cam,roots,arms,saved,lod,view)
 if '--qa' in sys.argv:
  for lod in range(2):
   for clip in sl.REQ['clips']:
    for phase in [.0,.5,1.]:render(scene,cam,roots,arms,saved,lod,'three-quarter',clip,phase)
 rest(roots,arms,saved);bpy.ops.object.select_all(action='DESELECT')
 for r in roots:
  for o in [r,*r.children_recursive]:o.select_set(True);o.hide_render=False
 raw=OUT/'spireLeech-uncompressed.glb';final=OUT/'spireLeech.glb'
 bpy.ops.export_scene.gltf(filepath=str(raw),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_extras=True,export_apply=True,export_materials='EXPORT',export_yup=True,export_skins=True,export_all_influences=True)
 subprocess.run([shutil.which('node'),str(HERE/'compress.mjs'),str(raw),str(final),'--force'],check=True);rest(roots,arms,saved)
 for o in [lod1,*lod1.children_recursive]:o.hide_render=True
 bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'spireLeech.blend'),compress=True)
 record={'request':'M-006','name':'Spire Leech','file':str(final.relative_to(ROOT)),'preview':str((OUT/'LOD0-three-quarter.png').relative_to(ROOT)),'source':'hopper/3d/models/source/spire_leech_refine.py','category':'enemy','region':'city','bounds':bounds[0],'targetBounds':sl.REQ['size'],'triangles':tris,'clips':sl.REQ['clips'],'sockets':sl.REQ['sockets'],'landings':[],'status':'candidate-awaiting-root-review','sourceReference':'design/references/enemies/spireLeech-turnaround.png'}
 (OUT/'record.json').write_text(json.dumps(record,indent=2)+'\n');(OUT/'manifest.json').write_text(json.dumps({'version':1,'models':[record]},indent=2)+'\n');(OUT/'rig-qa.json').write_text(json.dumps({'bones':{r.name:[b.name for b in a.data.bones] for r,a in zip(roots,arms)},'weightMeshes':weights,'animationSamples':samples,'bounds':bounds,'triangles':tris,'rootAnimated':False},indent=2)+'\n');print('SPIRE REFINED DONE',flush=True)
if __name__=='__main__':main()
