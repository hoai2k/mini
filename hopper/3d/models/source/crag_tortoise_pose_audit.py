"""Measure evaluated sole heights and render rear-up details from saved candidate."""
import bpy,sys,json
from pathlib import Path
HERE=Path(__file__).resolve().parent;sys.path.insert(0,str(HERE))
import crag_tortoise as ct
import window_ray_refine as preview
OUT=HERE.parents[3]/'local/hopper-crag-tortoise-refine'
roots=[bpy.data.objects['LOD0'],bpy.data.objects['LOD1']];arms=[bpy.data.objects['Rig'],bpy.data.objects['LOD1.Rig']];saved=ct.capture_transforms();preview.wr=ct;preview.OUT=OUT
scene=bpy.context.scene;cam=scene.camera;results=[]
for lod in range(2):
 for clip,phase in [('Walk',.25),('Walk',.75),('Lunge_Tell',1),('Belly_Open_Hold',.5),('Withdraw',.5)]:
  if '--measure-only' in sys.argv:
   preview.rest(roots,arms,saved);objs=[o for r in roots for o in [r,*r.children_recursive]];ct.set_clip(objs,clip);end=max(s.frame_end for o in objs if o.animation_data for t in o.animation_data.nla_tracks if t.name==clip for s in t.strips);f=1+(end-1)*phase;scene.frame_set(int(f),subframe=f%1);bpy.context.view_layer.update()
  else:preview.render(scene,cam,roots,arms,saved,lod,'front' if clip=='Belly_Open_Hold' else 'side',clip,phase)
  dg=bpy.context.evaluated_depsgraph_get();mins={}
  for leg in ct.LEG_IDS:
   o=bpy.data.objects[('LOD1.' if lod else '')+f'Leg.{leg}.Foot'];e=o.evaluated_get(dg);me=e.to_mesh();mins[leg]=min((e.matrix_world@p.co).z for p in me.vertices);e.to_mesh_clear()
  results.append({'lod':lod,'clip':clip,'phase':phase,'evaluatedSoleYMin':mins})
(OUT/'pose-grounding.json').write_text(json.dumps(results,indent=2)+'\n')
preview.rest(roots,arms,saved)
