/** Animation-only extension; run from repo root with Node. Never rewrites production.
 * Dependencies use the existing ignored viewer fixture's Three.js installation.
 * Original GLB binary bytes and all existing glTF resources remain unchanged.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const args=process.argv.slice(2),option=(flag,fallback)=>{const i=args.indexOf(flag);if(i<0)return fallback;if(!args[i+1]||args[i+1].startsWith('--'))throw Error('Missing value for '+flag);return path.resolve(args[i+1]);};
const SOURCE=option('--source-dir',path.join(ROOT,'hopper/models'));
const {Vector3:V,Quaternion:Q,Matrix4:M}=await import(path.join(ROOT,'local/hopper-3d-tests/node_modules/three/build/three.module.js'));
const {MeshoptDecoder}=await import(path.join(ROOT,'local/hopper-3d-tests/node_modules/three/examples/jsm/libs/meshopt_decoder.module.js'));
await MeshoptDecoder.ready;
const OUT=option('--output-dir',path.join(ROOT,'local/hopper-animation-extension')); fs.mkdirSync(OUT,{recursive:true});
const TAU=Math.PI*2, clamp=x=>Math.max(0,Math.min(1,x)), smooth=x=>{x=clamp(x);return x*x*(3-2*x)}, pulse=(u,a,b,c,d)=>smooth((u-a)/(b-a))*(1-smooth((u-c)/(d-c)));
const vec=a=>new V(...a), quat=a=>new Q(...a), axis=(a,r)=>new Q().setFromAxisAngle(vec(a),r), hash=b=>crypto.createHash('sha256').update(b).digest('hex');
export const HC=[['Wing_Open',.25,false],['Glide_Loop',1.6,true],['Wing_Close',.2,false],['Dive_Loop',1.2,true],['Stomp_Land',.6,false],['Air_Kick',.6,false],['Wall_Kick',.35,false],['Ledge_Mantle',.7,false],['Hop_Back',.45,false],['Crouch_Charge_Loop',.8,false],['Super_Leap_Start',.3,false],['Lock_Strafe_L',1,true],['Lock_Strafe_R',1,true],['Hit_Air',.5,false],['Land_Heavy',.8,false]];
export const RC=[['Glide_Lean',1.6,true],['Dive_Tuck',1.2,true],['Stomp_Brace',.6,false],['Point_Forward',1.3,false],['Look_Up_Long',2.4,false],['Cheer_Short',1.1,false]];
function read(file){const b=fs.readFileSync(file),len=b.readUInt32LE(12),j=JSON.parse(b.subarray(20,20+len)),start=20+len+8;return {j,bin:Buffer.from(b.subarray(start,start+b.readUInt32LE(20+len))),sha:hash(b)}}
function arrays(a){const cache=new Map();return index=>{if(cache.has(index))return cache.get(index);const ac=a.j.accessors[index],bv=a.j.bufferViews[ac.bufferView],ex=bv.extensions?.EXT_meshopt_compression;let bytes;if(ex){bytes=new Uint8Array(ex.count*ex.byteStride);MeshoptDecoder.decodeGltfBuffer(bytes,ex.count,ex.byteStride,a.bin.subarray(ex.byteOffset||0,(ex.byteOffset||0)+ex.byteLength),ex.mode,ex.filter)}else bytes=a.bin.subarray(bv.byteOffset||0,(bv.byteOffset||0)+bv.byteLength);const n={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16}[ac.type],size={5120:1,5121:1,5122:2,5123:2,5125:4,5126:4}[ac.componentType],view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),f={5120:'getInt8',5121:'getUint8',5122:'getInt16',5123:'getUint16',5125:'getUint32',5126:'getFloat32'}[ac.componentType],stride=bv.byteStride||ex?.byteStride||size*n;const result=Array.from({length:ac.count},(_,i)=>Array.from({length:n},(_,k)=>{let v=view[f]((ac.byteOffset||0)+i*stride+k*size,true);if(ac.normalized)v=ac.componentType===5122?Math.max(-1,v/32767):ac.componentType===5123?v/65535:ac.componentType===5121?v/255:Math.max(-1,v/127);return v}));cache.set(index,result);return result}}
function rig(a){const by=Object.fromEntries(a.j.nodes.map((n,i)=>[n.name,i])),parent={};a.j.nodes.forEach((n,i)=>(n.children||[]).forEach(c=>parent[c]=i));const rest=a.j.nodes.map(n=>{if(n.matrix){const t=new V(),q=new Q(),s=new V();new M().fromArray(n.matrix).decompose(t,q,s);return {t:t.toArray(),q:q.toArray(),s:s.toArray()}}return {t:n.translation||[0,0,0],q:n.rotation||[0,0,0,1],s:n.scale||[1,1,1]}}),get=arrays(a);function sample(name,t){const p=structuredClone(rest),clip=a.j.animations.find(c=>c.name===name);if(!clip)throw Error('Missing baseline '+name);for(const ch of clip.channels){const sp=clip.samplers[ch.sampler],ts=get(sp.input).flat(),vs=get(sp.output);let k=0;while(k<ts.length-2&&t>ts[k+1])k++;const f=clamp((t-ts[k])/(ts[k+1]-ts[k]||1)),value=ch.target.path==='rotation'?quat(vs[k]).slerp(quat(vs[Math.min(k+1,vs.length-1)]),f).toArray():vs[k].map((v,i)=>v+(vs[Math.min(k+1,vs.length-1)][i]-v)*f);p[ch.target.node][{translation:'t',rotation:'q',scale:'s'}[ch.target.path]]=value}return p}function world(p,i){const n=p[i],m=new M().compose(vec(n.t),quat(n.q),vec(n.s));return parent[i]===undefined?m:world(p,parent[i]).multiply(m)}function turn(p,name,a,angle){const i=by[name];if(i===undefined)return;const pm=parent[i]===undefined?new M():world(p,parent[i]),pq=new Q().setFromRotationMatrix(new M().extractRotation(pm)),localAxis=vec(a).applyQuaternion(pq.clone().invert());p[i].q=axis(localAxis.toArray(),angle).multiply(quat(p[i].q)).normalize().toArray()}function pos(p,i){return new V().setFromMatrixPosition(world(p,i))}return {by,parent,rest,sample,world,turn,pos,get}}
const data={};for(const kind of ['hopper','rider','hopper-rider']){const a=read(path.join(SOURCE,kind+'.glb'));if(a.j.animations.length!==({hopper:20,rider:13,'hopper-rider':25})[kind])throw Error('Expected original baseline clips; do not append twice: '+kind);data[kind]={a,r:rig(a)}}
const H=data.hopper.r,R=data.rider.r,zeroH=H.sample('Idle',0),airH=H.sample('Jump_Loop',0),sitR=R.sample('Riding_Idle',0);
function mixPose(a,b,f){return a.map((n,i)=>({t:n.t.map((v,k)=>v+(b[i].t[k]-v)*f),q:quat(n.q).slerp(quat(b[i].q),f).toArray(),s:n.s.map((v,k)=>v+(b[i].s[k]-v)*f)}))}
function ikLeg(p,leg,side,target){const ui=H.by[leg+'_upper.'+side],li=H.by[leg+'_lower.'+side],fi=H.by[leg+'_foot.'+side];const root=H.pos(p,ui),k0=H.pos(p,li),f0=H.pos(p,fi),l1=root.distanceTo(k0),l2=k0.distanceTo(f0),dir=target.clone().sub(root).normalize(),dist=Math.max(Math.abs(l1-l2)+.01,Math.min(root.distanceTo(target),l1+l2-.012)),bend=k0.clone().sub(root).addScaledVector(dir,-k0.clone().sub(root).dot(dir)).normalize(),cos=(l1*l1+dist*dist-l2*l2)/(2*l1*dist),knee=root.clone().addScaledVector(dir,l1*cos).addScaledVector(bend,l1*Math.sqrt(Math.max(0,1-cos*cos))),foot=root.clone().addScaledVector(dir,dist);function aim(i,from,to){const wq=new Q().setFromRotationMatrix(new M().extractRotation(H.world(p,i))),delta=new Q().setFromUnitVectors(from.normalize(),to.normalize()),pq=new Q().setFromRotationMatrix(new M().extractRotation(H.world(p,H.parent[i])));p[i].q=pq.invert().multiply(delta).multiply(wq).normalize().toArray()}aim(ui,k0.clone().sub(root),knee.clone().sub(root));const newk=H.pos(p,li),newf=H.pos(p,fi);aim(li,newf.sub(newk),foot.sub(newk));}
function wings(p,amount,u=0){for(const [s,sign]of [['L',1],['R',-1]]){ // Wing axes are world +Y: fan back-swept panels outward, with a small camber lift.
 H.turn(p,'wing.'+s,[0,1,0],-sign*1.03*amount);H.turn(p,'wing.'+s,[0,0,1],sign*(-.50*amount+.018*Math.sin(TAU*u)*amount));}}
function hopperPose(name,u){let p=structuredClone(zeroH),compression=0,tuck=0,spread=0,pitch=0,roll=0;const e=pulse(u,0,.22,.5,1);
 if(['Glide_Loop','Dive_Loop','Air_Kick','Hit_Air','Wing_Close'].includes(name)){p=structuredClone(airH);tuck=1}
 if(name==='Wing_Open'){tuck=smooth(u);p=mixPose(zeroH,airH,tuck);spread=tuck}
 if(name==='Glide_Loop'){spread=1;pitch=-.07+.012*Math.sin(TAU*u)}
 if(name==='Wing_Close'){spread=1-smooth(u)}
 if(name==='Dive_Loop'){spread=.12;pitch=.24+.012*Math.sin(TAU*u);tuck=1.35}
 if(name==='Stomp_Land'){compression=.077*pulse(u,0,.20,.32,1);p=mixPose(airH,zeroH,smooth(u/.16));spread=.25*(1-smooth(u));pitch=.045*e}
 if(name==='Land_Heavy'){compression=.080*pulse(u,.03,.20,.4,1);p=mixPose(airH,zeroH,smooth(u/.20));pitch=.17*(1-smooth(u/.3))-.04*pulse(u,.2,.4,.55,1);spread=.30*(1-smooth(u/.5))}
 if(name==='Air_Kick'){spread=.32*e;const spin=TAU*smooth((u-.08)/.76);H.turn(p,'thorax',[0,1,0],spin)}
 if(name==='Wall_Kick'){p=mixPose(airH,zeroH,.25*e);tuck=1;pitch=-.09*e;spread=.25*e}
 if(name==='Ledge_Mantle'){compression=.045*e;pitch=-.11*e}
 if(name==='Hop_Back'){p=mixPose(zeroH,airH,pulse(u,.04,.3,.6,1));compression=.026*pulse(u,0,.1,.14,.3)+.024*pulse(u,.7,.8,.86,1);pitch=-.08*e}
 if(name==='Crouch_Charge_Loop'){compression=.068*smooth(u);pitch=.035*smooth(u);spread=.10*smooth(u)}
 if(name==='Super_Leap_Start'){compression=.07*(1-smooth(u/.65));p=mixPose(zeroH,airH,smooth((u-.3)/.7));tuck=smooth((u-.3)/.7);spread=.40*smooth(u);pitch=-.08*Math.sin(Math.PI*u)}
 if(name.startsWith('Lock_Strafe')){roll=(name.endsWith('L')?-1:1)*.020*Math.sin(TAU*u);compression=.006*(1-Math.cos(TAU*u*2))}
 if(name==='Hit_Air'){tuck=1;pitch=-.09*e;roll=.11*Math.sin(TAU*u)*(1-u);spread=.3*e}
 // Thorax displacement is a local squash only. Actor/root remains entirely physics driven.
 p[H.by.thorax].t[1]-=compression;H.turn(p,'thorax',[1,0,0],pitch);H.turn(p,'thorax',[0,0,1],roll);H.turn(p,'head',[1,0,0],name==='Dive_Loop'?.16:.025*e);wings(p,spread,u);
 for(const [side,s]of [['L',1],['R',-1]])for(const [li,leg]of ['front','middle','rear'].entries()){const fi=H.by[leg+'_foot.'+side];let target=H.pos(p,fi);
  if(compression){target=H.pos(zeroH,fi);}
  if(name==='Glide_Loop'&&leg==='rear'){target.y+=.65;target.z-=1.3;}
  if(name==='Dive_Loop'){target.y+=leg==='rear'?1.65:1.15;target.z+=leg==='rear'?.6:-.1;target.x*=.92;}
  if(name==='Air_Kick'&&leg==='rear'){const body=H.world(p,H.by.thorax);const local=vec([s*.30,-.49,-.005]).applyMatrix4(body);target.lerp(local,pulse(u,.12,.35,.5,.86));}
  if(name==='Wall_Kick'&&leg==='front'){target.z+=2.4*pulse(u,0,.18,.35,.7);target.y+=1.3*e}
  if(name==='Ledge_Mantle'&&leg==='front'){target.z+=1.4*e;target.y+=2.6*pulse(u,0,.18,.4,.85)}
  if(name.startsWith('Lock_Strafe')){const phase=TAU*(u+((li%2===0)===(side==='L')?0:.5));target.x+=(name.endsWith('L')?1:-1)*1.1*Math.cos(phase);target.y+=.75*Math.max(0,Math.sin(phase));}
  if(compression||['Glide_Loop','Dive_Loop','Air_Kick','Wall_Kick','Ledge_Mantle'].includes(name)||name.startsWith('Lock_Strafe'))ikLeg(p,leg,side,target);
 }
 for(const side of ['L','R'])for(let i=1;i<=3;i++)H.turn(p,`antenna_${i}.${side}`,[1,0,0],.025*Math.sin(TAU*u-i*.55)*(name.endsWith('Loop')||name.startsWith('Lock_Strafe')?1:Math.sin(Math.PI*u)));
 return p}
function riderPose(name,u){const p=structuredClone(sitR),e=pulse(u,0,.22,.65,1);let lean=0,look=0;
 if(name==='Glide_Lean')lean=-.11+.012*Math.sin(TAU*u);
 if(name==='Dive_Tuck'){lean=.32+.012*Math.sin(TAU*u);look=.16;}
 if(name==='Stomp_Brace'){lean=.23*pulse(u,0,.18,.32,1);look=.1*e}
 if(name==='Point_Forward')look=-.03*e;
 if(name==='Look_Up_Long')look=-.50*pulse(u,0,.22,.72,1);
 if(name==='Cheer_Short'){lean=-.09*e;look=-.1*e}
 // Pelvis, thighs, feet and mount are frozen to the verified Riding_Idle pose.
 // Root-sibling arm/shoulder chains follow the chest delta, preserving shoulder joins.
 for(const b of ['DEF-spine.001','DEF-spine.002','DEF-spine.003'])R.turn(p,b,[1,0,0],lean/3);
 R.turn(p,'DEF-spine.006',[1,0,0],look+lean*.3);
 const chest=R.by['DEF-spine.003'],chestDelta=R.world(p,chest).multiply(R.world(sitR,chest).invert());
 for(const side of ['L','R'])for(const stem of ['DEF-shoulder.','DEF-upper_arm.']){
  const i=R.by[stem+side],local=R.world(p,R.parent[i]).invert().multiply(chestDelta).multiply(R.world(p,i));
  const t=new V(),q=new Q(),s=new V();local.decompose(t,q,s);p[i]={t:t.toArray(),q:q.normalize().toArray(),s:s.toArray()};
 }
 for(const [side,s]of [['L',1],['R',-1]]){
  if(name==='Glide_Lean'){R.turn(p,'DEF-upper_arm.'+side,[1,0,0],.45);R.turn(p,'DEF-upper_arm.'+side,[0,0,1],s*.13);R.turn(p,'DEF-forearm.'+side,[1,0,0],.32)}
  if(name==='Dive_Tuck'||name==='Stomp_Brace'){const f=name==='Dive_Tuck'?1:e;R.turn(p,'DEF-upper_arm.'+side,[1,0,0],-.18*f);R.turn(p,'DEF-forearm.'+side,[1,0,0],-.30*f)}
  if(name==='Point_Forward'&&side==='R'){
   // Aim the whole arm above the dashboard; preserve the split twist-bone chain.
   for(const [bone,end,dir]of [['DEF-upper_arm.R','DEF-forearm.R',[-.12,.65,1]],['DEF-forearm.R','DEF-hand.R',[-.04,.50,1]]]){
    const i=R.by[bone],v=R.pos(p,R.by[end]).sub(R.pos(p,i)).normalize(),delta=new Q().slerp(new Q().setFromUnitVectors(v,vec(dir).normalize()),e),wq=new Q().setFromRotationMatrix(new M().extractRotation(R.world(p,i))),pq=new Q().setFromRotationMatrix(new M().extractRotation(R.world(p,R.parent[i])));
    p[i].q=pq.invert().multiply(delta).multiply(wq).normalize().toArray();
   }
  }
  if(name==='Cheer_Short'){R.turn(p,'DEF-upper_arm.'+side,[1,0,0],-2.00*e);R.turn(p,'DEF-upper_arm.'+side,[0,0,1],s*.18*e);R.turn(p,'DEF-forearm.'+side,[1,0,0],.40*e)}
 }
 return p}
function accessor(a,values,type){const flat=values.flat(),b=Buffer.alloc(flat.length*4);flat.forEach((v,i)=>b.writeFloatLE(v,i*4));const offset=a.bin.length;a.bin=Buffer.concat([a.bin,b]);const bv=a.j.bufferViews.push({buffer:0,byteOffset:offset,byteLength:b.length})-1,n={SCALAR:1,VEC3:3,VEC4:4}[type],ac={bufferView:bv,componentType:5126,count:values.length,type};if(type==='SCALAR'){ac.min=[Math.min(...flat)];ac.max=[Math.max(...flat)]}return a.j.accessors.push(ac)-1}
const validation={generatedAt:new Date().toISOString(),sampleRate:30,assets:{},clips:{hopper:HC.map(([name,duration,loop])=>({name,duration,loop,...(name==='Crouch_Charge_Loop'?{sampling:'normalized charge 0..1; clamped, intentionally not cyclic'}:{})})),rider:RC.map(([name,duration,loop])=>({name,duration,loop}))}};
for(const [kind,{a,r}]of Object.entries(data)){const original=read(path.join(SOURCE,kind+'.glb')),startCount=a.j.animations.length;
 if(kind!=='rider')for(const side of ['L','R']){const i=r.by['wing.'+side];const node={name:'Hopper.Wing.'+side,translation:[0,.329203584,0],extras:{purpose:'glide trail wing tip',deforming:false}};a.j.nodes[i].children=[...(a.j.nodes[i].children||[]),a.j.nodes.length];a.j.nodes.push(node);}
 const clips=kind==='hopper'?HC:kind==='rider'?RC:[...HC,...RC];let maxSeam=0,maxSeatDrift=0,nonfinite=0;const clipReports=[];
 for(const [name,duration,loop]of clips){const isH=HC.some(c=>c[0]===name),frames=Math.ceil(duration*30),times=Array.from({length:frames+1},(_,i)=>i===frames?duration:i/30),poses=times.map(t=>{const u=t/duration;return isH?hopperPose(name,u):riderPose(name,u)}),source=isH?H:R,animation={name,samplers:[],channels:[],extras:{loop,duration,sampleRate:30,rootMotion:false,request:isH?'M-001':'M-002'}};const ti=accessor(a,times.map(t=>[t]),'SCALAR');
 function channels(src,ps,filter){for(const [n,si]of Object.entries(src.by)){const di=r.by[n];if(di===undefined||!filter(n))continue;for(const [prop,key,type]of [['translation','t','VEC3'],['rotation','q','VEC4'],['scale','s','VEC3']]){let values=ps.map(p=>p[si][key]);if(key==='q'){values=values.map(v=>quat(v).normalize().toArray());for(let f=1;f<values.length;f++)if(values[f].reduce((v,x,k)=>v+x*values[f-1][k],0)<0)values[f]=values[f].map(x=>-x)}for(const v of values)for(const x of v)if(!Number.isFinite(x))nonfinite++;if(loop){const first=values[0],last=values.at(-1);maxSeam=Math.max(maxSeam,key==='q'?1-Math.abs(quat(first).dot(quat(last))):Math.max(...first.map((x,k)=>Math.abs(x-last[k]))));values[values.length-1]=[...first]}
 const ai=accessor(a,values,type),sp=animation.samplers.push({input:ti,output:ai,interpolation:'LINEAR'})-1;animation.channels.push({sampler:sp,target:{node:di,path:prop}})}}}
 const hfilter=n=>n==='thorax'||n==='abdomen'||n==='head'||/^(front|middle|rear|wing|antenna)_?/.test(n)&&!n.startsWith('Hopper.'),rfilter=n=>n.startsWith('DEF-');
 channels(source,poses,isH?hfilter:rfilter);
 if(kind==='hopper-rider'){
  if(isH){let rn=name.includes('Glide')||name==='Wing_Open'?'Glide_Lean':name.includes('Dive')?'Dive_Tuck':name.includes('Land')?'Stomp_Brace':null;channels(R,times.map(t=>rn?riderPose(rn,t/duration):structuredClone(sitR)),rfilter)}
  // Rider reactions intentionally contain no Hopper tracks, so mixers can layer them over locomotion.
 }
 if(!isH)for(const ps of poses)for(const n of ['DEF-thigh.L','DEF-thigh.R','DEF-spine']){maxSeatDrift=Math.max(maxSeatDrift,R.pos(ps,R.by[n]).distanceTo(R.pos(sitR,R.by[n])))}
 a.j.animations.push(animation);clipReports.push({name,duration,loop,samples:times.length,channels:animation.channels.length});
 }
 a.j.buffers[0].byteLength=a.bin.length;let jb=Buffer.from(JSON.stringify(a.j));jb=Buffer.concat([jb,Buffer.alloc((4-jb.length%4)%4,32)]);const bh=Buffer.alloc(8);bh.writeUInt32LE(a.bin.length);bh.write('BIN\0',4);const h=Buffer.alloc(20);h.write('glTF');h.writeUInt32LE(2,4);h.writeUInt32LE(20+jb.length+8+a.bin.length,8);h.writeUInt32LE(jb.length,12);h.write('JSON',16);const result=Buffer.concat([h,jb,bh,a.bin]);fs.writeFileSync(path.join(OUT,kind+'.glb'),result);
 const meshesUnchanged=JSON.stringify(original.j.meshes)===JSON.stringify(a.j.meshes),skinsUnchanged=JSON.stringify(original.j.skins)===JSON.stringify(a.j.skins),oldClipsUnchanged=JSON.stringify(original.j.animations)===JSON.stringify(a.j.animations.slice(0,startCount)),binaryUnchanged=original.bin.equals(a.bin.subarray(0,original.bin.length));
 if(!meshesUnchanged||!skinsUnchanged||!oldClipsUnchanged||!binaryUnchanged||nonfinite||maxSeam>1e-5||maxSeatDrift>1e-6)throw Error('Validation failed '+kind+JSON.stringify({nonfinite,maxSeam,maxSeatDrift}));
 validation.assets[kind]={sourceSha256:original.sha,candidateSha256:hash(result),bytes:result.length,originalBinarySha256:hash(original.bin),preservedBinarySha256:hash(a.bin.subarray(0,original.bin.length)),meshesUnchanged,skinsUnchanged,oldClipsUnchanged,binaryUnchanged,clipCount:a.j.animations.length,maxLoopSeamBeforeExactClosure:maxSeam,maxSeatDrift,nonfinite,clips:clipReports};
 console.log(kind,validation.assets[kind].clipCount,result.length);
}
fs.writeFileSync(path.join(OUT,'validation.json'),JSON.stringify(validation,null,2)+'\n');
