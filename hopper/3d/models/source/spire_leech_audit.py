"""Independent exported-skin and clip audit for M006 refinement candidates."""
from pathlib import Path
import json,struct,math,hashlib,subprocess
ROOT=Path(__file__).resolve().parents[4];OUT=ROOT/'local/hopper-spire-leech-refine'
def main():
 raw=(OUT/'spireLeech-uncompressed.glb').read_bytes();n=struct.unpack_from('<I',raw,12)[0];d=json.loads(raw[20:20+n]);b=raw[28+n:]
 def values(index):
  a=d['accessors'][index];v=d['bufferViews'][a['bufferView']];w={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']];fmt,size={5121:('B',1),5123:('H',2),5125:('I',4),5126:('f',4)}[a['componentType']];start=v.get('byteOffset',0)+a.get('byteOffset',0);stride=v.get('byteStride',w*size)
  rows=[struct.unpack_from('<'+fmt*w,b,start+i*stride) for i in range(a['count'])];assert all(math.isfinite(x) for row in rows for x in row);return rows
 assert len(d['skins'])==2
 skin_checks=[]
 for skin in d['skins']:
  names=[d['nodes'][i]['name'] for i in skin['joints']];assert len(names)==9;assert {x.removeprefix('LOD1.') for x in names}=={*(f'Chain.{i}' for i in range(7)),'Head','Jaw'};values(skin['inverseBindMatrices']);skin_checks.append(names)
 vertex_count=0
 for node in d['nodes']:
  if 'mesh' not in node:continue
  assert 'skin' in node
  for p in d['meshes'][node['mesh']]['primitives']:
   a=p['attributes'];assert all(x in a for x in ['JOINTS_0','WEIGHTS_0','POSITION','NORMAL','TEXCOORD_0']);j=values(a['JOINTS_0']);w=values(a['WEIGHTS_0']);values(a['POSITION']);values(a['NORMAL']);values(a['TEXCOORD_0']);assert len(j)==len(w)
   for jj,ww in zip(j,w):assert abs(sum(ww)-1)<1e-4 and all(0<=x<9 for x in jj) and all(0<=x<=1 for x in ww)
   vertex_count+=len(w)
 checks=[]
 for clip in d['animations']:
  errors=[];times=[]
  for ch in clip['channels']:
   assert d['nodes'][ch['target']['node']]['name'] not in ['LOD0','LOD1'];sampler=clip['samplers'][ch['sampler']];t=values(sampler['input']);v=values(sampler['output']);times.extend(x[0] for x in t);a,z=v[0],v[-1];e=max(abs(x-y) for x,y in zip(a,z))
   if ch['target']['path']=='rotation':e=min(e,max(abs(x+y) for x,y in zip(a,z)))
   errors.append(e)
  loop=clip['name'] in ['Cling_Idle','Crawl','Beam_Hold']
  if loop:assert max(errors)<1e-5,(clip['name'],max(errors))
  checks.append({'name':clip['name'],'duration':round(max(times),6),'channels':len(clip['channels']),'loop':loop,**({'loopEndpointMaxError':max(errors)} if loop else {})})
 assert {x['name'] for x in checks}=={'Cling_Idle','Crawl','Charge_Tell','Beam_Hold','Retract','Hit','Dissolve'}
 result=subprocess.run(['node',str(ROOT/'hopper/3d/models/source/validate.mjs'),'--manifest',str(OUT/'manifest.json'),str(OUT/'spireLeech.glb')],capture_output=True,text=True,check=True)
 final=(OUT/'spireLeech.glb').read_bytes();record=json.loads((OUT/'record.json').read_text());receipt={'request':'M-006','date':'2026-09-12','status':'candidate-awaiting-root-review','file':'local/hopper-spire-leech-refine/spireLeech.glb','bytes':len(final),'sha256':hashlib.sha256(final).hexdigest(),'bounds':record['bounds'],'triangles':record['triangles'],'skinJoints':skin_checks,'skinnedVerticesAudited':vertex_count,'clipChecks':checks,'sockets':record['sockets'],'checks':{'repositoryValidator':result.stdout.strip(),'normalizedFiniteWeights':True,'finitePositionNormalUVInverseBindAnimationValues':True,'rootMotionAbsent':True,'loopEndpointsMatch':True},'visualQA':{'viewsPerLOD':['side','three-quarter','top','mouth'],'clipSamplesPerLOD':[0,.5,1],'renders':50,'contactSheets':[{'file':p.name,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(OUT.glob('*sheet.jpg'))],'location':'local/hopper-spire-leech-refine/'},'runtimeResponsibilities':['Surface-relative wall placement and navigation.','Beam, charge emissive material and shader dissolve effects.','Core and body hitbox exposure/activation.']}
 path=ROOT/'hopper/3d/models/source/spire-leech-refine-validation.json'
 if path.exists():
  prior=json.loads(path.read_text())
  if prior.get('sha256')==receipt['sha256'] and prior.get('status')=='root-reviewed and integrated':
   receipt['status']=prior['status'];receipt['file']=prior['file'];receipt['visualQA']['review']=prior['visualQA']['review']
 path.write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(receipt,indent=2))
if __name__=='__main__':main()
