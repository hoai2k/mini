/** Exact rest-pose bounds for glTF skins, including meshopt-compressed accessors.
 * Skin vertices are already in bind space: world = Σ(weight * jointWorld * IBM * p).
 * Applying meshWorld again would double a baked ancestor scale (M006 regression).
 * Static-only assets continue through validate.mjs's existing measurement path.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const WIDTH={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16};
const FORMAT={5120:['getInt8',1],5121:['getUint8',1],5122:['getInt16',2],5123:['getUint16',2],5125:['getUint32',4],5126:['getFloat32',4]};
const ID=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
function mul(a,b){const out=Array(16).fill(0);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)out[c*4+r]+=a[k*4+r]*b[c*4+k];return out;}
function point(m,p){const [x,y,z]=p;return [m[0]*x+m[4]*y+m[8]*z+m[12],m[1]*x+m[5]*y+m[9]*z+m[13],m[2]*x+m[6]*y+m[10]*z+m[14]];}
function local(n){
 if(n.matrix)return n.matrix;
 const [x,y,z,w]=n.rotation||[0,0,0,1],s=n.scale||[1,1,1],t=n.translation||[0,0,0];
 const m=[1-2*y*y-2*z*z,2*x*y+2*z*w,2*x*z-2*y*w,0,2*x*y-2*z*w,1-2*x*x-2*z*z,2*y*z+2*x*w,0,2*x*z+2*y*w,2*y*z-2*x*w,1-2*x*x-2*y*y,0,...t,1];
 for(let c=0;c<3;c++)for(let r=0;r<3;r++)m[c*4+r]*=s[c];return m;
}
let decoderPromise;
async function decoder(){
 if(!decoderPromise)decoderPromise=(async()=>{
  const candidates=[];
  if(process.env.MESHOPT_DECODER)candidates.push(path.resolve(process.env.MESHOPT_DECODER));
  const require=createRequire(path.resolve(HERE,'../../../game/package.json'));
  for(const name of ['meshoptimizer/decoder','three/addons/libs/meshopt_decoder.module.js']){try{candidates.push(require.resolve(name));}catch{}}
  // Same offline npm cache used by compress.mjs; never downloads dependencies.
  const cache=path.join(os.homedir(),'.npm/_npx');
  if(fs.existsSync(cache))for(const id of fs.readdirSync(cache).sort())candidates.push(path.join(cache,id,'node_modules/meshoptimizer/meshopt_decoder.mjs'));
  for(const file of candidates)if(fs.existsSync(file)){
   const mod=await import(pathToFileURL(file).href);const dec=mod.MeshoptDecoder||mod.default?.MeshoptDecoder||mod.default;
   if(dec?.decodeGltfBuffer){await dec.ready;return dec;}
  }
  throw new Error('Skinned compressed bounds need the installed meshoptimizer decoder; install game dependencies or set MESHOPT_DECODER to its local module.');
 })();return decoderPromise;
}
function normalize(x,type){if(type===5120)return Math.max(x/127,-1);if(type===5121)return x/255;if(type===5122)return Math.max(x/32767,-1);if(type===5123)return x/65535;return x;}

export async function measureSkinBounds(doc,binary,rootIndex,{ignoreSkin=false}={}){
 const decoded=new Map(),accessors=new Map();
 async function view(index){
  if(decoded.has(index))return decoded.get(index);
  const v=doc.bufferViews?.[index];if(!v)throw new Error(`missing skin bufferView ${index}`);
  const ext=v.extensions?.EXT_meshopt_compression;let bytes;
  if(ext){
   if(ext.buffer!==0)throw new Error('external meshopt skin buffer is unsupported');
   const start=ext.byteOffset||0;if(start+ext.byteLength>binary.length)throw new Error('meshopt skin buffer exceeds BIN');
   bytes=new Uint8Array(ext.count*ext.byteStride);(await decoder()).decodeGltfBuffer(bytes,ext.count,ext.byteStride,binary.subarray(start,start+ext.byteLength),ext.mode,ext.filter||'NONE');
  }else{
   if(v.buffer!==0)throw new Error('external skin buffer is unsupported');
   const start=v.byteOffset||0;if(start+v.byteLength>binary.length)throw new Error('skin buffer exceeds BIN');bytes=binary.subarray(start,start+v.byteLength);
  }
  decoded.set(index,bytes);return bytes;
 }
 async function read(index){
  if(accessors.has(index))return accessors.get(index);
  const a=doc.accessors?.[index];if(!a||a.sparse)throw new Error(`missing/sparse skin accessor ${index}`);
  const [method,size]=FORMAT[a.componentType]||[],width=WIDTH[a.type];if(!method||!width)throw new Error(`unsupported skin accessor ${index}`);
  const bytes=await view(a.bufferView),v=doc.bufferViews[a.bufferView],stride=v.byteStride||width*size,start=a.byteOffset||0;
  if(start+Math.max(0,a.count-1)*stride+width*size>bytes.length)throw new Error(`skin accessor ${index} exceeds bufferView`);
  const data=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),rows=[];
  for(let i=0;i<a.count;i++){
   const row=[];for(let j=0;j<width;j++){let value=data[method](start+i*stride+j*size,true);if(a.normalized)value=normalize(value,a.componentType);if(!Number.isFinite(value))throw new Error(`non-finite skin accessor ${index}`);row.push(value);}rows.push(row);
  }
  accessors.set(index,rows);return rows;
 }
 const parents=new Map(),worlds=new Map();for(let i=0;i<(doc.nodes||[]).length;i++)for(const child of doc.nodes[i].children||[])parents.set(child,i);
 function world(i,active=new Set()){
  if(worlds.has(i))return worlds.get(i);if(active.has(i)||!doc.nodes?.[i])throw new Error('invalid/cyclic skin node hierarchy');active.add(i);
  const m=parents.has(i)?mul(world(parents.get(i),active),local(doc.nodes[i])):local(doc.nodes[i]);active.delete(i);worlds.set(i,m);return m;
 }
 const skinMatrices=new Map();
 async function matrices(index){
  if(skinMatrices.has(index))return skinMatrices.get(index);const skin=doc.skins?.[index];if(!skin?.joints?.length)throw new Error(`invalid skin ${index}`);
  const ibm=skin.inverseBindMatrices==null?skin.joints.map(()=>ID):await read(skin.inverseBindMatrices);if(ibm.length!==skin.joints.length)throw new Error('skin inverse bind count mismatch');
  const m=skin.joints.map((j,i)=>mul(world(j),ibm[i]));skinMatrices.set(index,m);return m;
 }
 const low=[Infinity,Infinity,Infinity],high=[-Infinity,-Infinity,-Infinity];
 const include=p=>{for(let i=0;i<3;i++){if(!Number.isFinite(p[i]))throw new Error('non-finite skinned position');low[i]=Math.min(low[i],p[i]);high[i]=Math.max(high[i],p[i]);}};
 async function walk(index){
  const node=doc.nodes[index],mesh=doc.meshes?.[node.mesh];
  for(const primitive of mesh?.primitives||[]){
   const attrs=primitive.attributes||{},positions=await read(attrs.POSITION);
   if(node.skin==null||ignoreSkin){for(const p of positions)include(point(world(index),p));continue;}
   if(primitive.targets?.length)throw new Error('rest bounds for morph-target skins require explicit morph evaluation');
   const mats=await matrices(node.skin),sets=[];
   for(const key of Object.keys(attrs).filter(k=>/^JOINTS_\d+$/.test(k))){const weightKey=key.replace('JOINTS_','WEIGHTS_');if(attrs[weightKey]==null)throw new Error(`missing ${weightKey}`);const joints=await read(attrs[key]),weights=await read(attrs[weightKey]);if(joints.length!==positions.length||weights.length!==positions.length)throw new Error('skin attribute count mismatch');sets.push({joints,weights});}
   if(!sets.length)throw new Error('skinned primitive has no joint influences');
   for(let i=0;i<positions.length;i++){
    const p=[0,0,0];let sum=0;
    for(const {joints,weights}of sets)for(let k=0;k<joints[i].length;k++){
     const joint=joints[i][k],weight=weights[i][k];if(!Number.isInteger(joint)||!mats[joint]||weight<0)throw new Error('invalid skin influence');if(weight===0)continue;
     const q=point(mats[joint],positions[i]);for(let axis=0;axis<3;axis++)p[axis]+=weight*q[axis];sum+=weight;
    }
    if(Math.abs(sum-1)>.02)throw new Error(`skin weights are not normalized (${sum})`);include(p);
   }
  }
  for(const child of node.children||[])await walk(child);
 }
 await walk(rootIndex);return low.every(Number.isFinite)?high.map((x,i)=>x-low[i]):null;
}
