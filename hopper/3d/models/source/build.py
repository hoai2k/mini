"""Run with Blender --background --python source/build.py -- [request ids].
All native/intermediate data stays in local/. Authored exports await central QA.
"""
import bpy,sys,json,math,importlib,traceback,time
from pathlib import Path
from mathutils import Vector
HERE=Path(__file__).resolve().parent;sys.path.insert(0,str(HERE))
from common import Context,ROOT,v
WORK=ROOT/'local/hopper-model-production';OUT=ROOT/'hopper/3d/models'
WORK.mkdir(parents=True,exist_ok=True)
requests=json.loads((HERE/'requests.json').read_text());contracts=json.loads((HERE/'standin-contracts.json').read_text())
ids=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
RURAL={'M-025','M-026','M-028','M-038','M-039','M-040'}
def bounds(objects):
 coords=[o.matrix_world@Vector(c) for o in objects if o.type=='MESH' for c in o.bound_box]
 lo=Vector(tuple(min(p[i] for p in coords) for i in range(3)));hi=Vector(tuple(max(p[i] for p in coords) for i in range(3)));return lo,hi

def render(c,dest):
 scene=bpy.context.scene;lo,hi=bounds(list(c.root.children_recursive));ctr=(lo+hi)/2;dim=(hi-lo);span=max(dim)
 bpy.ops.object.camera_add(location=ctr+Vector((1.15,-1.55,.95))*span);cam=bpy.context.object;cam.rotation_euler=(ctr-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=span*1.45;cam.data.clip_end=span*20;scene.camera=cam
 world=bpy.data.worlds.new('Studio');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.55,.62,.7,1);world.node_tree.nodes['Background'].inputs[1].default_value=.7;scene.world=world
 for loc,energy,size in [((.8,-1,1.5),4,1),((-1,-.2,.7),2,1.2)]:
  bpy.ops.object.light_add(type='AREA',location=ctr+Vector(loc)*span);l=bpy.context.object;l.data.energy=energy*span*span*3;l.data.shape='DISK';l.data.size=span*size;l.rotation_euler=(ctr-l.location).to_track_quat('-Z','Y').to_euler()
 scene.render.engine='CYCLES';scene.cycles.samples=12;scene.cycles.use_denoising=True;scene.render.resolution_x=900;scene.render.resolution_y=750;scene.render.resolution_percentage=100;scene.render.film_transparent=True;scene.view_settings.view_transform='Standard';scene.render.image_settings.file_format='PNG';scene.render.filepath=str(dest);scene.render.threads_mode='FIXED';scene.render.threads=4;bpy.ops.render.render(write_still=True)

def main(req):
 bpy.ops.wm.read_factory_settings(use_empty=True)
 module='rural' if req['request'] in RURAL else 'props' if req['category']=='prop' else 'architecture'
 c=Context(req);importlib.import_module(module).build(req,c)
 contract=contracts.get(req['standIn'],{})
 # Gameplay landings are immutable numeric interface independent of visible paint.
 c.landings=contract.get('landings',[])
 c.root['landings']=json.dumps(c.landings);c.root['authoring']='reference-authored Blender model';c.root['reference']='design/references/'+('kits/'+req.get('region','city')+'.png' if req['category']=='structure' else 'props.png')
 existing={o.name for o in c.root.children_recursive}
 for s in contract.get('sockets',[]):
  if s['name'] not in existing:c.socket(s['name'],s['position'])
 # Keep authored clips stored but inactive so bounds, LOD copies and previews use rest transforms.
 # Blender's NLA_TRACKS exporter temporarily unmutes each stored track while baking it.
 c.rest_pose();bpy.context.scene.frame_set(1);bpy.context.view_layer.update();src=list(c.root.children_recursive)
 lo,hi=bounds(src);dim=hi-lo;size=[dim.x,dim.z,dim.y]
 # Explicit LOD1 hierarchy retains authored pivot animation and all socket empties.
 lod1=bpy.data.objects.new('LOD1',None);bpy.context.collection.objects.link(lod1);lod1['lod']=1
 copies={c.root:lod1}
 for o in src:
  cp=o.copy();cp.name='LOD1.'+o.name
  if o.type=='MESH':cp.data=o.data.copy()
  bpy.context.collection.objects.link(cp);copies[o]=cp
 for o,cp in list(copies.items())[1:]:
  cp.parent=copies.get(o.parent,lod1)
  if cp.type=='MESH':
   bpy.context.view_layer.objects.active=cp;cp.select_set(True)
   mod=cp.modifiers.new('Game distance reduction','DECIMATE');mod.ratio=.35
   try:bpy.ops.object.modifier_apply(modifier=mod.name)
   except:cp.modifiers.remove(mod)
   cp.select_set(False)
 def tris(root):
  total=0
  for o in root.children_recursive:
   if o.type=='MESH':o.data.calc_loop_triangles();total+=len(o.data.loop_triangles)
  return total
 triangles=[tris(c.root),tris(lod1)]
 folder='structures' if req['category']=='structure' else 'props';key=req['standIn'].split('.',1)[1];file=req['final'].removeprefix('models/')
 native=WORK/'native';native.mkdir(exist_ok=True);raw=WORK/'raw'/file;raw.parent.mkdir(parents=True,exist_ok=True)
 bpy.ops.object.select_all(action='DESELECT');c.root.select_set(True);lod1.select_set(True)
 for o in list(c.root.children_recursive)+list(lod1.children_recursive):o.select_set(True)
 scene=bpy.context.scene;scene.render.fps=30;scene.frame_set(1)
 bpy.ops.export_scene.gltf(filepath=str(raw),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_nla_strips_merged_animation_name='Animation',export_extras=True,export_apply=True,export_materials='EXPORT',export_yup=True)
 c.rest_pose();scene.frame_set(1);bpy.context.view_layer.update()
 # LOD1 must be hidden in previews, but is selectable in the runtime viewer.
 for o in lod1.children_recursive:o.hide_render=True
 preview=OUT/'previews'/(key+'.png');preview.parent.mkdir(parents=True,exist_ok=True);render(c,preview)
 bpy.ops.wm.save_as_mainfile(filepath=str(native/(key+'.blend')),compress=True)
 record={'request':req['request'],'name':req['name'],'file':file,'preview':'previews/'+key+'.png','category':req['category'],'region':req.get('region'),'source':'source/'+module+'.py','bounds':size,'targetBounds':req.get('size'),'triangles':triangles,'clips':sorted(c.clips),'sockets':sorted(set(c.sockets)),'landings':c.landings,'status':'built-awaiting-review','sourceReference':c.root['reference']}
 report=WORK/'records';report.mkdir(exist_ok=True);(report/(req['request']+'.json')).write_text(json.dumps(record,indent=2));print('MODEL_DONE',req['request'],triangles,flush=True)
for req in requests:
 if ids and req['request'] not in ids:continue
 try:main(req)
 except Exception:
  traceback.print_exc();print('MODEL_FAILED',req['request'],flush=True)
