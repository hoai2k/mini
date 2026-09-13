"""Render bounded keypose QA from decoded candidates; no production writes."""
import bpy, sys, json, math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[3]
OUT=ROOT/'local/hopper-animation-extension'
report=json.loads((OUT/'validation.json').read_text())
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
kind=args[0] if args else 'hopper-rider'
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(OUT/f'{kind}-qa-decoded.glb'))
scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.samples=8;scene.cycles.use_denoising=True
scene.render.resolution_x=480;scene.render.resolution_y=360;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False
scene.render.fps=30
scene.world=bpy.data.worlds.new('QA Studio');scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.11,.14,.19,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.6
scene.view_settings.view_transform='Standard'
rigs=[o for o in scene.objects if o.type=='ARMATURE']
meshes=[o for o in scene.objects if o.type=='MESH' and any(m.type=='ARMATURE' for m in o.modifiers)]
for o in scene.objects:
 if o.type=='MESH' and o not in meshes:o.hide_render=True
camdata=bpy.data.cameras.new('QA Camera');cam=bpy.data.objects.new('QA Camera',camdata);scene.collection.objects.link(cam);scene.camera=cam;camdata.type='ORTHO'
for name,xyz,power,size in [('Key',(20,-25,40),27000,25),('Fill',(-25,-10,25),18000,20),('Rim',(5,20,35),22000,18)]:
 d=bpy.data.lights.new(name,'AREA');d.energy=power;d.size=size;o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);o.location=xyz;o.rotation_euler=(Vector((0,0,8))-o.location).to_track_quat('-Z','Y').to_euler()

def pose(name,t):
 for o in rigs:
  o.animation_data.action=None
  for tr in o.animation_data.nla_tracks:tr.mute=tr.name!=name
 scene.frame_set(1+int(t*30),subframe=t*30-int(t*30));bpy.context.view_layer.update()

def bounds(selected):
 dg=bpy.context.evaluated_depsgraph_get();coords=[]
 for o in selected:
  ev=o.evaluated_get(dg);m=ev.to_mesh();coords.extend(ev.matrix_world@v.co for v in m.vertices);ev.to_mesh_clear()
 return Vector([min(v[i] for v in coords) for i in range(3)]),Vector([max(v[i] for v in coords) for i in range(3)])

clips=report['clips']['rider'] if kind=='rider' else report['clips']['hopper']+report['clips']['rider']
if len(args)>1:clips=[c for c in clips if c['name'] in args[1:]]
qa=OUT/'qa';qa.mkdir(exist_ok=True)
for clip in clips:
 name=clip['name'];dur=clip['duration'];isr=name in [x['name'] for x in report['clips']['rider']]
 # Three keyposes expose anticipation, action and recovery. Fixed bounds within each sequence.
 us=[.10,.45,.90] if not clip['loop'] else [0,.33,.67]
 selected=meshes
 if isr and kind=='hopper-rider':selected=[o for o in meshes if any(m.type=='ARMATURE' and 'Rider' in m.object.name for m in o.modifiers)]
 boxes=[]
 for u in us:pose(name,dur*u);boxes.append(bounds(selected))
 lo=Vector([min(b[0][i] for b in boxes) for i in range(3)]);hi=Vector([max(b[1][i] for b in boxes) for i in range(3)])
 center=(lo+hi)/2;size=hi-lo;camdata.ortho_scale=max(size)*1.48
 # glTF +Z forward becomes Blender -Y. Front three-quarter view keeps seat and both sides legible.
 direction=Vector((-1.7,-2.2,1.45) if isr else (1.4,-2.2,.95)).normalized();cam.location=center+direction*75;cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler()
 for idx,u in enumerate(us):
  pose(name,dur*u);scene.render.filepath=str(qa/f'{kind}-{name}-{idx}.png');bpy.ops.render.render(write_still=True)
 print('QA DONE',kind,name,flush=True)
