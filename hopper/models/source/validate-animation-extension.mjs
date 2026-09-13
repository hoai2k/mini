// Independent contract check of candidates against untouched canonical assets.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import crypto from 'node:crypto';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..'),out=path.join(root,'local/hopper-animation-extension'),spec=JSON.parse(fs.readFileSync(path.join(out,'validation.json'))),summary={};
const args=process.argv.slice(2),option=(flag,fallback)=>{const i=args.indexOf(flag);if(i<0)return fallback;if(!args[i+1]||args[i+1].startsWith('--'))throw Error('Missing value for '+flag);return path.resolve(args[i+1]);};
const source=option('--source-dir',path.join(root,'hopper/models')),candidate=option('--candidate-dir',out);
const read=p=>{let b=fs.readFileSync(p),n=b.readUInt32LE(12);assert.equal(b.readUInt32LE(8),b.length);return{b,j:JSON.parse(b.subarray(20,20+n)),bin:b.subarray(28+n)}};
for(const [kind,count] of [['hopper',35],['rider',19],['hopper-rider',46]]){
 const a=read(path.join(source,kind+'.glb')),b=read(path.join(candidate,kind+'.glb'));assert.equal(b.j.animations.length,count);assert.equal(new Set(b.j.animations.map(x=>x.name)).size,count);
 for(const field of ['meshes','skins','materials','images','textures','samplers','scenes','extensionsUsed','extensionsRequired'])assert.deepEqual(b.j[field],a.j[field],field);
 for(const field of ['accessors','bufferViews','animations'])assert.deepEqual(b.j[field].slice(0,a.j[field].length),a.j[field],field);
 assert.ok(a.bin.equals(b.bin.subarray(0,a.bin.length)));
 for(let i=0;i<a.j.nodes.length;i++){const n=structuredClone(b.j.nodes[i]);if(/^wing\.[LR]$/.test(n.name)&&kind!=='rider'){n.children=n.children.filter(x=>x<a.j.nodes.length);if(!a.j.nodes[i].children)delete n.children;}assert.deepEqual(n,a.j.nodes[i],'node '+i);}
 if(kind!=='rider')for(const side of ['L','R']){const i=b.j.nodes.findIndex(n=>n.name==='Hopper.Wing.'+side),wing=b.j.nodes.find(n=>n.name==='wing.'+side);assert.ok(i>=a.j.nodes.length&&wing.children.includes(i));assert.ok(!b.j.skins.some(s=>s.joints.includes(i)));}
 const specs=kind==='hopper'?spec.clips.hopper:kind==='rider'?spec.clips.rider:[...spec.clips.hopper,...spec.clips.rider];let frames=0,trackCount=0,maxQuaternionError=0;
 function values(i){const ac=b.j.accessors[i],bv=b.j.bufferViews[ac.bufferView],n={SCALAR:1,VEC3:3,VEC4:4}[ac.type];assert.equal(ac.componentType,5126);return Array.from({length:ac.count},(_,f)=>Array.from({length:n},(_,k)=>b.bin.readFloatLE((bv.byteOffset||0)+(ac.byteOffset||0)+(f*n+k)*4)));}
 for(const s of specs){const clip=b.j.animations.find(x=>x.name===s.name),isR=spec.clips.rider.some(c=>c.name===s.name);assert.ok(clip);assert.equal(clip.extras.loop,s.loop);assert.equal(clip.extras.rootMotion,false);let duration=0;
  for(const ch of clip.channels){trackCount++;const name=b.j.nodes[ch.target.node].name;assert.ok(!/Rig|Character|Hopper\.|Rider\./.test(name),'root/socket motion '+name);if(isR)assert.ok(name.startsWith('DEF-'),'reaction targets hopper '+name);const sampler=clip.samplers[ch.sampler],t=values(sampler.input).flat(),v=values(sampler.output);assert.equal(t.length,v.length);assert.equal(t[0],0);duration=Math.max(duration,t.at(-1));for(let f=0;f<t.length;f++){if(f)assert.ok(t[f]>t[f-1]);for(const x of v[f])assert.ok(Number.isFinite(x));if(ch.target.path==='rotation')maxQuaternionError=Math.max(maxQuaternionError,Math.abs(1-Math.hypot(...v[f])));}
   if(s.loop)assert.deepEqual(v[0],v.at(-1));
   if(isR&&/^(DEF-spine|DEF-thigh\.[LR]|DEF-pelvis\.[LR])$/.test(name))for(const frame of v)assert.deepEqual(frame,v[0],'seat drift '+name);
   frames+=v.length;
  }assert.ok(Math.abs(duration-s.duration)<1e-6,s.name+' duration');
 }assert.ok(maxQuaternionError<1e-6);
 summary[kind]={clips:count,newClips:specs.length,tracks:trackCount,sampledValues:frames,maxQuaternionError,originalResourcesPreserved:true,originalBinaryPreserved:true,originalNodesPreserved:true,actorRootsUnanimated:true,riderOnlyClipsMasked:true,loopEndpointsExact:true,sha256:crypto.createHash('sha256').update(b.b).digest('hex')};
}
fs.writeFileSync(path.join(out,'independent-validation.json'),JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary,null,2));
