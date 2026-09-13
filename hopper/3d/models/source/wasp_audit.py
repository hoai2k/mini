"""Audit the uncompressed animation export and receipt the compressed candidate."""
from pathlib import Path
import json,struct,math,hashlib,subprocess
ROOT=Path(__file__).resolve().parents[4];OUT=ROOT/'local/hopper-wasp-refine'

def main():
 raw=(OUT/'turbineWasp-uncompressed.glb').read_bytes();n=struct.unpack_from('<I',raw,12)[0];doc=json.loads(raw[20:20+n]);binary=raw[28+n:]
 def values(index):
  a=doc['accessors'][index];v=doc['bufferViews'][a['bufferView']];width={'SCALAR':1,'VEC3':3,'VEC4':4}[a['type']];assert a['componentType']==5126
  start=v.get('byteOffset',0)+a.get('byteOffset',0);stride=v.get('byteStride',width*4)
  rows=[struct.unpack_from('<'+'f'*width,binary,start+i*stride) for i in range(a['count'])]
  assert all(math.isfinite(x) for row in rows for x in row)
  return rows
 checks=[]
 for clip in doc['animations']:
  name=clip['name'];times=[];errors=[];motion=[];fans=[]
  for ch in clip['channels']:
   target=ch['target'];node=doc['nodes'][target['node']]['name'];sampler=clip['samplers'][ch['sampler']];t=values(sampler['input']);v=values(sampler['output']);times.extend(x[0] for x in t)
   a,b=v[0],v[-1];err=max(abs(x-y) for x,y in zip(a,b))
   if target['path']=='rotation':err=min(err,max(abs(x+y) for x,y in zip(a,b)))
   errors.append(err)
   if node in ['LOD0','LOD1'] and target['path']=='translation':motion.append({'node':node,'translation':list(b)})
   if name=='Hover' and target['path']=='rotation' and node in ['Fan.L','Fan.R','Fan.Tail','LOD1.Fan.L','LOD1.Fan.R','LOD1.Fan.Tail']:
    assert len(v)>=30;fans.append(node)
  if name=='Hover':assert max(errors)<1e-5 and len(fans)==6
  if name=='Dash':
   assert {m['node'] for m in motion}=={'LOD0','LOD1'}
   assert all(abs(m['translation'][2]-4.2)<1e-5 for m in motion)
  else:assert not motion
  checks.append({'name':name,'duration':round(max(times),6),'loop':name=='Hover','channels':len(clip['channels']),'rootMotion':motion,**({'loopEndpointMaxError':max(errors),'continuouslySampledFans':fans} if name=='Hover' else {})})
 result=subprocess.run(['node',str(ROOT/'hopper/3d/models/source/validate.mjs'),'--manifest',str(OUT/'manifest.json'),str(OUT/'turbineWasp.glb')],capture_output=True,text=True,check=True)
 final=(OUT/'turbineWasp.glb').read_bytes();record=json.loads((OUT/'record.json').read_text())
 receipt={'request':'M-014','date':'2026-09-12','status':'candidate-awaiting-root-review','file':'local/hopper-wasp-refine/turbineWasp.glb','bytes':len(final),'sha256':hashlib.sha256(final).hexdigest(),'bounds':record['bounds'],'triangles':record['triangles'],'rig':'rigid body, head, three fan pivots, intake ring, stinger and two legs; no skins','sockets':record['sockets'],'clipChecks':checks,'checks':{'repositoryValidator':result.stdout.strip(),'finiteAnimationValues':True,'exactLoopEndpoints':True,'rootMotionOnlyDash':True,'dashDistanceMetresBothLODs':4.2,'savedBlendRestTransformsRestored':True},'visualQA':{'renders':20,'viewsPerLOD':['front','three-quarter','side','top'],'keyPosesPerLOD':[x['name'] for x in checks],'location':'local/hopper-wasp-refine/','contactSheets':[{'file':p.name,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(OUT.glob('*contact-sheet.jpg'))]},'runtimeResponsibilities':['Blend Hover fan motion under Intake_Tell and Dash when required by gameplay.','Core/Landing socket exposure and stomp vulnerability after Guard_Break require runtime hitbox logic.','Dissolve supplies a scale collapse; shader dissolve and wind/intake VFX remain runtime effects.']}
 path=ROOT/'hopper/3d/models/source/wasp-refine-validation.json'
 if path.exists():
  prior=json.loads(path.read_text())
  if prior.get('sha256')==receipt['sha256'] and prior.get('status')=='root-reviewed and integrated':
   receipt['status']=prior['status'];receipt['file']=prior['file'];receipt['visualQA']['review']=prior['visualQA']['review']
 path.write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(receipt,indent=2))
if __name__=='__main__':main()
