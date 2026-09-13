"""Dense evaluated-foot audit and fixed-ground/fixed-camera support renders."""
import bpy,sys,json,math
from pathlib import Path
from mathutils import Vector
HERE=Path(__file__).resolve().parent;sys.path.insert(0,str(HERE))
import basalt_burrower as ct
import window_ray_refine as preview
OUT=HERE.parents[3]/'local/hopper-basalt-burrower-refine';roots=[bpy.data.objects['LOD0'],bpy.data.objects['LOD1']];arms=[bpy.data.objects['Rig'],bpy.data.objects['LOD1.Rig']];saved=ct.capture_transforms();preview.wr=ct;preview.OUT=OUT;scene=bpy.context.scene;cam=scene.camera
objects=[o for r in roots for o in [r,*r.children_recursive]]
def pose(clip,phase):
 preview.rest(roots,arms,saved);ct.set_clip(objects,clip);end=max(s.frame_end for o in objects if o.animation_data for t in o.animation_data.nla_tracks if t.name==clip for s in t.strips);f=1+(end-1)*phase;scene.frame_set(int(f),subframe=f%1);bpy.context.view_layer.update()
def soles(lod):
 dg=bpy.context.evaluated_depsgraph_get();result={}
 for leg in ct.LEG_IDS:
  o=bpy.data.objects[('LOD1.' if lod else '')+f'Leg.{leg}.Foot'];e=o.evaluated_get(dg);me=e.to_mesh();result[leg]=min((e.matrix_world@p.co).z for p in me.vertices);e.to_mesh_clear()
 return result
rows=[];summary=[]
for lod in range(2):
 for clip in ['Tunnel','Erupt_Tell','Land','Withdraw']:
  cliprows=[]
  for i in range(61):
   phase=i/60;pose(clip,phase);values=soles(lod);row={'lod':lod,'clip':clip,'phase':phase,'soleY':values};rows.append(row);cliprows.append(row)
  values=[v for r in cliprows for v in r['soleY'].values()];entry={'lod':lod,'clip':clip,'samples':61,'minimumSoleY':min(values),'maximumSoleY':max(values),'maximumAbsoluteSoleY':max(abs(v) for v in values)};summary.append(entry)
(OUT/'dense-contact-samples.json').write_text(json.dumps(rows,indent=2)+'\n');(OUT/'dense-contact-summary.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps(summary,indent=2),flush=True)
if '--measure-only' not in sys.argv:
 preview.rest(roots,arms,saved)
 groundmat=bpy.data.materials.new('QA.GroundOnly');groundmat.diffuse_color=(.18,.20,.235,1);groundmat.use_nodes=True;bsdf=groundmat.node_tree.nodes.get('Principled BSDF');bsdf.inputs['Base Color'].default_value=(.18,.20,.235,1);bsdf.inputs['Roughness'].default_value=1
 bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.006));ground=bpy.context.object;ground.name='QA.Ground.Y0';ground.data.materials.append(groundmat)
 line=bpy.data.materials.new('QA.Y0Line');line.diffuse_color=(.70,.55,.24,1);line.use_nodes=True;line.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.70,.55,.24,1)
 bpy.ops.mesh.primitive_cube_add(size=1,location=(4.8,0,.008));axis=bpy.context.object;axis.name='QA.Y0Line';axis.dimensions=(.024,16,.016);axis.data.materials.append(line)
 target=Vector((0,0,1.6));cam.location=(18,0,5.2);cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=13.7
 for lod in range(2):
  for clip in ['Tunnel','Erupt_Tell','Land','Withdraw']:
   for phase in ([0,.25,.75] if clip=='Tunnel' else [0,.5,1]):
    pose(clip,phase)
    cam.location=(18,0,5.2);cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=13.7
    for n,r in enumerate(roots):
     for o in [r,*r.children_recursive]:o.hide_render=n!=lod
    scene.render.filepath=str(OUT/f'LOD{lod}-ground-{clip}-{phase:.2f}.png');bpy.ops.render.render(write_still=True)
preview.rest(roots,arms,saved)
