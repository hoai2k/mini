"""Independent exported-skin and clip audit for M015 refinement candidates."""
from pathlib import Path
import json,struct,math,hashlib,subprocess
ROOT=Path(__file__).resolve().parents[4];OUT=ROOT/'local/hopper-basalt-burrower-refine'
def main():
 raw=(OUT/'basaltBurrower-uncompressed.glb').read_bytes();n=struct.unpack_from('<I',raw,12)[0];d=json.loads(raw[20:20+n]);b=raw[28+n:]
 def values(index):
  a=d['accessors'][index];v=d['bufferViews'][a['bufferView']];w={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']];fmt,size={5121:('B',1),5123:('H',2),5125:('I',4),5126:('f',4)}[a['componentType']];start=v.get('byteOffset',0)+a.get('byteOffset',0);stride=v.get('byteStride',w*size)
  rows=[struct.unpack_from('<'+fmt*w,b,start+i*stride) for i in range(a['count'])];assert all(math.isfinite(x) for row in rows for x in row);return rows
 assert len(d['skins'])==2
 skin_checks=[]
 for skin in d['skins']:
  names=[d['nodes'][i]['name'] for i in skin['joints']];assert len(names)==16;assert {x.removeprefix('LOD1.') for x in names}=={'Spine.0','Spine.1','Spine.2','DrillPivot',*(f'Leg.{leg}.{joint}' for leg in ['FL','FR','RL','RR'] for joint in range(3))};values(skin['inverseBindMatrices']);skin_checks.append(names)
 vertex_count=0
 for node in d['nodes']:
  if 'mesh' not in node:continue
  assert 'skin' in node
  for p in d['meshes'][node['mesh']]['primitives']:
   a=p['attributes'];assert all(x in a for x in ['JOINTS_0','WEIGHTS_0','POSITION','NORMAL','TEXCOORD_0']);j=values(a['JOINTS_0']);w=values(a['WEIGHTS_0']);values(a['POSITION']);values(a['NORMAL']);values(a['TEXCOORD_0']);assert len(j)==len(w)
   for jj,ww in zip(j,w):assert abs(sum(ww)-1)<1e-4 and all(0<=x<16 for x in jj) and all(0<=x<=1 for x in ww)
   vertex_count+=len(w)
 parents={j:i for i,n in enumerate(d['nodes']) for j in n.get('children',[])}
 for name,bone in [('Core','Spine.1'),('Drill','DrillPivot'),('Hitbox.Body','Spine.1')]:
  socket=next(i for i,n in enumerate(d['nodes']) if n.get('name')==name);assert d['nodes'][parents[socket]]['name']==bone
 checks=[];exported_spin=[]
 for clip in d['animations']:
  errors=[];times=[];motion=[]
  for ch in clip['channels']:
   node=d['nodes'][ch['target']['node']]['name'];sampler=clip['samplers'][ch['sampler']];t=values(sampler['input']);v=values(sampler['output']);times.extend(x[0] for x in t);a,z=v[0],v[-1];e=max(abs(x-y) for x,y in zip(a,z))
   if ch['target']['path']=='rotation':e=min(e,max(abs(x+y) for x,y in zip(a,z)))
   errors.append(e)
   if clip['name'] in ['Buried_Idle','Tunnel'] and node in ['DrillPivot','LOD1.DrillPivot'] and ch['target']['path']=='rotation':
    travel=0
    for q0,q1 in zip(v,v[1:]):
     dot=sum(a*b for a,b in zip(q0,q1))/(sum(a*a for a in q0)*sum(b*b for b in q1))**.5;travel+=2*math.acos(min(1,abs(dot)))
    expected=math.tau*(2 if clip['name']=='Tunnel' else 1);assert abs(travel-expected)<1e-4,(clip['name'],node,travel);exported_spin.append({'clip':clip['name'],'joint':node,'quaternionTravelRadians':travel})
   if node in ['LOD0','LOD1']:
    assert clip['name']=='Erupt' and ch['target']['path']=='translation';delta=[b-a for a,b in zip(v[0],v[-1])];assert max(abs(a-b) for a,b in zip(delta,[0,4.8,0]))<1e-5;motion.append({'node':node,'translation':delta})
  loop=clip['name'] in ['Buried_Idle','Tunnel']
  if clip['name']=='Erupt':assert {m['node'] for m in motion}=={'LOD0','LOD1'}
  if loop:assert max(errors)<1e-5,(clip['name'],max(errors))
  checks.append({'name':clip['name'],'duration':round(max(times),6),'channels':len(clip['channels']),'loop':loop,'rootMotion':motion,**({'loopEndpointMaxError':max(errors)} if loop else {})})
 assert {x['name'] for x in checks}=={'Buried_Idle','Tunnel','Erupt_Tell','Erupt','Land','Withdraw','Hit','Dissolve'}
 result=subprocess.run(['node',str(ROOT/'hopper/3d/models/source/validate.mjs'),'--manifest',str(OUT/'manifest.json'),str(OUT/'basaltBurrower.glb')],capture_output=True,text=True,check=True)
 final=(OUT/'basaltBurrower.glb').read_bytes();record=json.loads((OUT/'record.json').read_text());receipt={'request':'M-015','date':'2026-09-13','status':'candidate-awaiting-root-review','file':'local/hopper-basalt-burrower-refine/basaltBurrower.glb','bytes':len(final),'sha256':hashlib.sha256(final).hexdigest(),'bounds':record['bounds'],'triangles':record['triangles'],'skinJoints':skin_checks,'skinnedVerticesAudited':vertex_count,'clipChecks':checks,'sockets':record['sockets'],'checks':{'repositoryValidator':result.stdout.strip(),'normalizedFiniteWeights':True,'finitePositionNormalUVInverseBindAnimationValues':True,'rootMotionOnlyErupt':True,'loopEndpointsMatch':True,'allSocketsFollowCorrectBone':True},'visualQA':{'viewsPerLOD':['front','three-quarter','top','side'],'clipSamplesPerLOD':[0,.5,1],'renders':60,'tunnelExtraSamples':[.25,.75],'contactSheets':[{'file':p.name,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(OUT.glob('*sheet.jpg'))],'location':'local/hopper-basalt-burrower-refine/'},'runtimeResponsibilities':['Enemy underground placement and Erupt upward root-motion application.','Crack-trail, eruption debris and shader dissolve effects.','Exposed-back vulnerability window and Core/body hitbox activation.']}
 receipt['exportedDrillRotation']=exported_spin
 receipt['drillMotion']=json.loads((OUT/'rig-qa.json').read_text())['drillMotion']
 if (OUT/'dense-contact-summary.json').exists():
  contact=json.loads((OUT/'dense-contact-summary.json').read_text())
  for row in contact:
   assert row['minimumSoleY']>-.01,row
   if row['clip']!='Tunnel':assert row['maximumAbsoluteSoleY']<.03,row
  receipt['denseGroundContact']=contact;receipt['checks']['denseGroundSupportPassed']=True
  receipt['visualQA']['fixedGroundContactRenders']=24
 path=ROOT/'hopper/3d/models/source/basalt-burrower-refine-validation.json'
 if path.exists():
  prior=json.loads(path.read_text())
  if prior.get('sha256')==receipt['sha256'] and prior.get('status')=='root-reviewed and integrated':
   receipt['status']=prior['status'];receipt['file']=prior['file'];receipt['visualQA']['review']=prior['visualQA']['review']
 path.write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(receipt,indent=2))
if __name__=='__main__':main()
