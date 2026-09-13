"""Evaluate every clip at nine samples; audit real skinned vertices and sockets."""
import bpy,json,sys,math
from pathlib import Path
from mathutils import Vector,kdtree
from mathutils.bvhtree import BVHTree
HERE=Path(__file__).resolve().parent;sys.path.insert(0,str(HERE))
import chain_manta as cm
OUT=cm.ROOT/'local/hopper-chain-manta-refine'
bpy.ops.wm.open_mainfile(filepath=str(OUT/'chainManta.blend'))
roots=[bpy.data.objects['LOD0'],bpy.data.objects['LOD1']];arms=[bpy.data.objects['Rig'],bpy.data.objects['LOD1.Rig']];saved=cm.capture_transforms()
def rest():
 cm.mute_actions(roots+arms)
 for a in arms:cm.clear_pose(a)
 cm.restore_transforms(saved)
def coordinates(o,dg):
 e=o.evaluated_get(dg);me=e.to_mesh();points=[e.matrix_world@v.co for v in me.vertices];e.to_mesh_clear();return points
def bvh(o,dg):
 e=o.evaluated_get(dg);me=e.to_mesh();tree=BVHTree.FromPolygons([e.matrix_world@v.co for v in me.vertices],[list(p.vertices) for p in me.polygons]);e.to_mesh_clear();return tree
def gap(a,b):
 tree=kdtree.KDTree(len(b))
 for i,p in enumerate(b):tree.insert(p,i)
 tree.balance();return min(tree.find(p)[2] for p in a)
result={'clips':{},'rest':{},'contract':{'jointsPerSkin':18,'staticRoots':True,'loop':'Soar'},'limitations':['Chain contact measures closest vertex samples, not a complete collision solver.','Intentional overlapping armor and inset eyes are permitted.']}
rest()
for clip in cm.REQ['clips']:
 rest();cm.set_clip(arms,clip);end=max(s.frame_end for a in arms for t in a.animation_data.nla_tracks if t.name==clip for s in t.strips);rows=[];first={};last={}
 for phase in [0,.125,.25,.375,.5,.625,.75,.875,1]:
  f=1+(end-1)*phase;bpy.context.scene.frame_set(int(f),subframe=f%1);dg=bpy.context.evaluated_depsgraph_get();row={'phase':phase,'lods':{}}
  for lod,r in enumerate(roots):
   pre='LOD1.' if lod else '';coords={o.name:coordinates(o,dg) for o in r.children_recursive if o.type=='MESH'};allpts=[p for pts in coords.values() for p in pts];assert all(math.isfinite(v) for p in allpts for v in p)
   if phase==0:first[lod]=allpts
   if phase==1:last[lod]=allpts
   gaps=[gap(coords[pre+f'Chain.{side}.Link.{i:02}'],coords[pre+f'Chain.{side}.Link.{i+1:02}']) for side in ['L','R'] for i in range(9)]
   seating={}
   for side in ['L','R']:
    foil=bvh(bpy.data.objects[pre+f'Wing.{side}.Cambered'],dg)
    seating[side]=max(foil.find_nearest(p)[3] for n,pts in coords.items() if n.startswith(pre+f'Wing.{side}.Fissure.') for p in pts)
   anchor_gaps={side:gap(coords[pre+f'Chain.{side}.Link.09'],coords[pre+f'Hook.{side}.Eyelet']) for side in ['L','R']}
   row['lods'][str(lod)]={'fissureMaxSurfaceDistance':seating,'hookEyeletNearestVertexDistance':anchor_gaps,'vertices':len(allpts),'maxNeighborLinkVertexDistance':round(max(gaps),6),'minNeighborLinkVertexDistance':round(min(gaps),6)}
  if phase in [0,.5,1]:
   socket_targets={'Core':'Core.FacetedJewel','TetherNode':'Tether.WeakPoint','Hook.L':'Hook.L.Spear','Hook.R':'Hook.R.Spear','Landing':'Core.FacetedJewel'}
   row['socketNearestVertex']={name:round(gap([bpy.data.objects[name].matrix_world.translation],coordinates(bpy.data.objects[target],dg)),6) for name,target in socket_targets.items()}
  rows.append(row)
 result['clips'][clip]={'samples':rows,'maxFirstLastVertexDelta':{str(lod):max((a-b).length for a,b in zip(first[lod],last[lod])) for lod in [0,1]}}
 if clip=='Soar':assert all(result['clips'][clip]['maxFirstLastVertexDelta'][str(lod)]<1e-4 for lod in [0,1])
rest();result['rest']['bounds']=[cm.mesh_bounds(r)[1]-cm.mesh_bounds(r)[0] for r in roots];result['rest']['bounds']=[list(p) for p in result['rest']['bounds']]
(OUT/'surface-audit.json').write_text(json.dumps(result,indent=2)+'\n');print('MANTA SURFACE AUDIT DONE')
