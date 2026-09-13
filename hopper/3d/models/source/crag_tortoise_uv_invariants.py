"""Prove that the final LOD1 seam UV pass changes no geometry, skin or clips."""
from pathlib import Path
import json,struct,hashlib
ROOT=Path(__file__).resolve().parents[4];OUT=ROOT/'local/hopper-crag-tortoise-refine'
def read(path):
 data=path.read_bytes();n=struct.unpack_from('<I',data,12)[0];doc=json.loads(data[20:20+n]);binary=data[28+n:]
 def accessor(i):
  a=doc['accessors'][i];view=doc['bufferViews'][a['bufferView']];width={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']];fmt,size={5121:('B',1),5123:('H',2),5125:('I',4),5126:('f',4)}[a['componentType']];offset=view.get('byteOffset',0)+a.get('byteOffset',0);stride=view.get('byteStride',width*size)
  return [struct.unpack_from('<'+fmt*width,binary,offset+j*stride) for j in range(a['count'])]
 nodes={n['name']:n for n in doc['nodes']};meshes={}
 for name,node in nodes.items():
  if 'mesh' not in node:continue
  primitives=[]
  for primitive in doc['meshes'][node['mesh']]['primitives']:
   attributes={key:accessor(ix) for key,ix in primitive['attributes'].items() if key!='TEXCOORD_0'}
   indices=[x[0] for x in accessor(primitive['indices'])]
   keys=sorted(attributes);corners=[tuple((key,attributes[key][i]) for key in keys) for i in indices]
   # Blender may enumerate sphere triangles differently across fresh builds.
   # Canonicalize triangle order while keeping all corner attributes paired.
   primitives.append(sorted(tuple(sorted(corners[i:i+3])) for i in range(0,len(corners),3)))
  meshes[name]=primitives
 clips={}
 for clip in doc['animations']:
  channels=[]
  for channel in clip['channels']:
   sampler=clip['samplers'][channel['sampler']];channels.append((doc['nodes'][channel['target']['node']]['name'],channel['target']['path'],accessor(sampler['input']),accessor(sampler['output']),sampler.get('interpolation','LINEAR')))
  clips[clip['name']]=channels
 skins=[([doc['nodes'][i]['name'] for i in skin['joints']],accessor(skin['inverseBindMatrices'])) for skin in doc['skins']]
 hierarchy={name:{k:value for k,value in node.items() if k!='mesh'} for name,node in nodes.items()}
 return meshes,clips,skins,hierarchy
before=OUT/'pre-seam-uncompressed.glb';after=OUT/'cragTortoise-uncompressed.glb';a=read(before);b=read(after)
for i,label in enumerate(['expandedTrianglePositionNormalSkinData','animationChannelsAndSamples','skinJointsAndInverseBindMatrices','nodeHierarchyAndTransforms']):assert a[i]==b[i],label
report={'baseline':before.name,'baselineSha256':hashlib.sha256(before.read_bytes()).hexdigest(),'final':after.name,'finalSha256':hashlib.sha256(after.read_bytes()).hexdigest(),'status':'PASS','unchanged':['expanded triangle positions, normals, joint indices and weights','all animation channels and samples','skin joints and inverse bind matrices','node hierarchy and transforms'],'changed':'LOD1 armor plate UVs only; generated texture reused without pixel edits'}
(OUT/'seam-uv-invariants.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
