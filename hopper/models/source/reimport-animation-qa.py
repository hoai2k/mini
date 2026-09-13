"""Reimport candidate meshes and evaluate authored key poses without exporting."""
import bpy, json, math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[3];OUT=ROOT/'local/hopper-animation-extension';report={}
for kind,count in [('hopper',35),('rider',19),('hopper-rider',46)]:
 bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(OUT/f'{kind}-qa-decoded.glb'))
 scene=bpy.context.scene;scene.render.fps=30;rigs=[o for o in scene.objects if o.type=='ARMATURE'];meshes=[o for o in scene.objects if o.type=='MESH' and any(m.type=='ARMATURE' for m in o.modifiers)]
 clips={tr.name for o in rigs if o.animation_data for tr in o.animation_data.nla_tracks};assert len(clips)==count
 assert len(meshes)==(2 if kind=='hopper-rider' else 1)
 maxerr=0
 for m in meshes:
  for v in m.data.vertices:
   assert 1<=len(v.groups)<=4;maxerr=max(maxerr,abs(sum(g.weight for g in v.groups)-1));assert all(math.isfinite(x) for x in v.co)
 assert maxerr<1e-6
 spec=json.loads((OUT/'validation.json').read_text());newclips=spec['clips']['hopper'] if kind=='hopper' else spec['clips']['rider'] if kind=='rider' else spec['clips']['hopper']+spec['clips']['rider']
 evaluated=0;seat_drift=0
 for clip in newclips:
  for o in rigs:
   o.animation_data.action=None
   for tr in o.animation_data.nla_tracks:tr.mute=tr.name!=clip['name']
  rr=next((r for r in rigs if 'Rider' in r.name),None);anchor=None
  for u in [0,.1,.25,.5,.75,.9,1]:
   t=clip['duration']*u*30;scene.frame_set(1+int(t),subframe=t-int(t));bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get()
   for m in meshes:
    ev=m.evaluated_get(dg);dm=ev.to_mesh();assert all(math.isfinite(x) for v in dm.vertices for x in v.co);ev.to_mesh_clear();evaluated+=1
   if rr:
    p=rr.pose.bones['DEF-spine'].matrix.translation.copy()
    if anchor is None:anchor=p
    seat_drift=max(seat_drift,(p-anchor).length)
 assert seat_drift<1e-6
 report[kind]={'clips':len(clips),'rigs':len(rigs),'skinnedMeshes':len(meshes),'triangles':sum(len(p.vertices)-2 for m in meshes for p in m.data.polygons),'maxWeightSumError':maxerr,'finiteMeshPoseEvaluations':evaluated,'riderPelvisLocalDrift':seat_drift}
 print('REIMPORT PASS',kind,report[kind],flush=True)
(OUT/'blender-validation.json').write_text(json.dumps(report,indent=2)+'\n')
