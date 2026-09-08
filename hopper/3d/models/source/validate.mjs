#!/usr/bin/env node
/** Validate final Hopper GLBs without external dependencies.
 * Usage: node source/validate.mjs [--manifest ../manifest.json] [model.glb ...]
 * With no model arguments, every manifest entry is required and validated.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MODEL_DIR = path.resolve(HERE, '..');
const COMPONENTS = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
const COMPONENT_SIZE = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
const TYPE_SIZE = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 };

function usage(code = 0) {
  console.log('Usage: node source/validate.mjs [--manifest path] [--allow-uncompressed] [model.glb ...]\nNo model arguments requires and validates every manifest entry.');
  process.exit(code);
}

const args = process.argv.slice(2);
let manifestPath = path.join(MODEL_DIR, 'manifest.json');
let allowUncompressed = false;
const inputs = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--help' || args[i] === '-h') usage();
  if (args[i] === '--manifest') { if (!args[++i]) usage(2); manifestPath = path.resolve(args[i]); }
  else if (args[i] === '--allow-uncompressed') allowUncompressed = true;
  else inputs.push(path.resolve(args[i]));
}

function fail(message) { throw new Error(message); }
function readJson(file) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { fail(`${file}: ${e.message}`); } }

function parseGlb(file) {
  const bytes = fs.readFileSync(file);
  if (bytes.length < 20 || bytes.toString('ascii', 0, 4) !== 'glTF') fail('not a GLB file');
  if (bytes.readUInt32LE(4) !== 2) fail(`unsupported GLB version ${bytes.readUInt32LE(4)}`);
  if (bytes.readUInt32LE(8) !== bytes.length) fail(`header length ${bytes.readUInt32LE(8)} does not match ${bytes.length} bytes`);
  let offset = 12, json = null, binary = null;
  while (offset < bytes.length) {
    if (offset + 8 > bytes.length) fail('truncated chunk header');
    const length = bytes.readUInt32LE(offset), type = bytes.readUInt32LE(offset + 4); offset += 8;
    if (offset + length > bytes.length) fail('chunk extends past end of file');
    if (type === 0x4e4f534a) { if (json) fail('multiple JSON chunks'); json = JSON.parse(bytes.toString('utf8', offset, offset + length).replace(/[\0 ]+$/g, '')); }
    if (type === 0x004e4942) { if (binary) fail('multiple BIN chunks'); binary = bytes.subarray(offset, offset + length); }
    offset += length;
  }
  if (!json) fail('missing JSON chunk');
  if ((json.buffers?.[0]?.byteLength || 0) > (binary?.length || 0)) fail('BIN chunk is shorter than buffers[0].byteLength');
  return { json, binary: binary || Buffer.alloc(0), bytes };
}

function finiteJson(value, at = '$', errors = []) {
  if (typeof value === 'number' && !Number.isFinite(value)) errors.push(`${at} is not finite`);
  else if (Array.isArray(value)) value.forEach((x, i) => finiteJson(x, `${at}[${i}]`, errors));
  else if (value && typeof value === 'object') for (const [key, x] of Object.entries(value)) finiteJson(x, `${at}.${key}`, errors);
  return errors;
}

function accessorValues(doc, binary, index) {
  const accessor = doc.accessors?.[index], view = doc.bufferViews?.[accessor?.bufferView];
  if (!accessor || !view || accessor.sparse || view.buffer !== 0) return null;
  const Ctor = COMPONENTS[accessor.componentType], width = TYPE_SIZE[accessor.type], size = COMPONENT_SIZE[accessor.componentType];
  if (!Ctor || !width || !size) return null;
  const stride = view.byteStride || width * size;
  const start = (view.byteOffset || 0) + (accessor.byteOffset || 0);
  if (start + Math.max(0, accessor.count - 1) * stride + width * size > binary.length) return { error: `accessor ${index} reads past BIN chunk` };
  const values = [];
  for (let row = 0; row < accessor.count; row++) {
    const byteOffset = binary.byteOffset + start + row * stride;
    if (byteOffset % size !== 0) return { error: `accessor ${index} is misaligned` };
    const typed = new Ctor(binary.buffer, byteOffset, width);
    for (const value of typed) values.push(value);
  }
  return { values };
}

function trianglesForPrimitive(primitive, doc) {
  const count = primitive.indices == null ? doc.accessors?.[primitive.attributes?.POSITION]?.count : doc.accessors?.[primitive.indices]?.count;
  if (!Number.isFinite(count)) return 0;
  switch (primitive.mode ?? 4) { case 4: return Math.floor(count / 3); case 5: case 6: return Math.max(0, count - 2); default: return 0; }
}

function childSet(doc, rootIndex) {
  const result = new Set(), stack = [rootIndex];
  while (stack.length) { const index = stack.pop(); if (result.has(index)) continue; result.add(index); stack.push(...(doc.nodes?.[index]?.children || [])); }
  return result;
}

function countTriangles(doc, nodes) {
  let count = 0;
  for (const index of nodes) { const mesh = doc.meshes?.[doc.nodes?.[index]?.mesh]; for (const primitive of mesh?.primitives || []) count += trianglesForPrimitive(primitive, doc); }
  return count;
}

function quatMatrix(q = [0, 0, 0, 1]) {
  const [x, y, z, w] = q, x2=x+x, y2=y+y, z2=z+z;
  return [1-(y*y2+z*z2), x*y2+w*z2, x*z2-w*y2, 0, x*y2-w*z2, 1-(x*x2+z*z2), y*z2+w*x2, 0, x*z2+w*y2, y*z2-w*x2, 1-(x*x2+y*y2), 0, 0,0,0,1];
}
function multiply(a,b) { const o=Array(16).fill(0); for(let c=0;c<4;c++) for(let r=0;r<4;r++) for(let k=0;k<4;k++) o[c*4+r]+=a[k*4+r]*b[c*4+k]; return o; }
function nodeMatrix(node) {
  if (node.matrix) return node.matrix;
  const m=quatMatrix(node.rotation), s=node.scale||[1,1,1], t=node.translation||[0,0,0];
  for(let c=0;c<3;c++) for(let r=0;r<3;r++) m[c*4+r]*=s[c]; m[12]=t[0];m[13]=t[1];m[14]=t[2]; return m;
}
function transform(m,p) { const [x,y,z]=p; return [m[0]*x+m[4]*y+m[8]*z+m[12],m[1]*x+m[5]*y+m[9]*z+m[13],m[2]*x+m[6]*y+m[10]*z+m[14]]; }

function measuredBounds(doc, binary, rootIndex) {
  const min=[Infinity,Infinity,Infinity], max=[-Infinity,-Infinity,-Infinity];
  function walk(index,parent) {
    const node=doc.nodes[index]||{}, world=multiply(parent,nodeMatrix(node)), mesh=doc.meshes?.[node.mesh];
    for(const primitive of mesh?.primitives||[]) {
      const accessor=doc.accessors?.[primitive.attributes?.POSITION];
      if(!accessor?.min || !accessor?.max) continue;
      const view=doc.bufferViews?.[accessor.bufferView], read=!view?.extensions?.EXT_meshopt_compression&&accessor.type==='VEC3'?accessorValues(doc,binary,primitive.attributes.POSITION):null;
      const points=read?.values ? Array.from({length:accessor.count},(_,i)=>read.values.slice(i*3,i*3+3)) :
        [...function*(){for(const x of [accessor.min[0],accessor.max[0]])for(const y of [accessor.min[1],accessor.max[1]])for(const z of [accessor.min[2],accessor.max[2]])yield [x,y,z];}()];
      for(const point of points) {
        const p=transform(world,point); for(let a=0;a<3;a++){min[a]=Math.min(min[a],p[a]);max[a]=Math.max(max[a],p[a]);}
      }
    }
    for(const child of node.children||[]) walk(child,world);
  }
  walk(rootIndex,[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
  return min.every(Number.isFinite) ? max.map((x,i)=>x-min[i]) : null;
}

function strings(value) {
  if (Array.isArray(value)) return value.map((x) => typeof x === 'string' ? x : x?.name).filter(Boolean);
  if (typeof value === 'string') return value.split(/\s*,\s*/).filter(Boolean);
  return [];
}
function landingList(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') { try { const parsed=JSON.parse(value); return Array.isArray(parsed)?parsed:[]; } catch { return []; } }
  return [];
}
function expectedBounds(entry) {
  if (!entry) return null;
  const value = Array.isArray(entry.bounds) ? entry.bounds : entry.bounds?.actual;
  return Array.isArray(value) && value.length === 3 && value.every(Number.isFinite) ? value : null;
}
function targetBounds(entry) {
  if (!entry) return null;
  const value=entry.targetBounds||entry.size||entry.bounds?.target;
  return Array.isArray(value)&&value.length===3&&value.every(Number.isFinite)?value:null;
}
function expectedTriangles(entry) {
  if (!entry) return null;
  const value = entry.triangles || entry.tris;
  if (Array.isArray(value)) return value.map(Number);
  if (value && typeof value === 'object') return [value.LOD0 ?? value.lod0, value.LOD1 ?? value.lod1].map(Number);
  if (typeof value === 'string' && value.includes('/')) return value.split('/').map((x) => Number(x.trim().replace(/k$/i,'')) * (/k$/i.test(x.trim()) ? 1000 : 1));
  return null;
}
function manifestEntries(data) { return Array.isArray(data) ? data : data.models || data.entries || []; }
function canonicalFile(value) { return String(value || '').replaceAll('\\','/').replace(/^.*?hopper\/3d\/models\//,'').replace(/^models\//,'').replace(/^\.\//,''); }

function validate(file, entry) {
  const result={file,errors:[],warnings:[],facts:{}};
  const error=(x)=>result.errors.push(x), warn=(x)=>result.warnings.push(x);
  let parsed; try { parsed=parseGlb(file); } catch(e) { error(e.message); return result; }
  const {json:doc,binary,bytes}=parsed;
  for(const x of finiteJson(doc)) error(x);
  const names=(doc.nodes||[]).map((n)=>n.name).filter(Boolean), nameSet=new Set(names);
  const duplicates=[...new Set(names.filter((n,i)=>names.indexOf(n)!==i))];
  if(duplicates.length) error(`duplicate named nodes: ${duplicates.join(', ')}`);
  for(let i=0;i<(doc.nodes||[]).length;i++) {
    const node=doc.nodes[i];
    if(node.mesh!=null && !doc.meshes?.[node.mesh]) error(`node ${i} references missing mesh ${node.mesh}`);
    for(const child of node.children||[]) if(!doc.nodes?.[child]) error(`node ${i} references missing child ${child}`);
  }
  const lodRoots=[0,1].map((level)=>({level,index:(doc.nodes||[]).findIndex((n)=>(n.name||'').toUpperCase()===`LOD${level}`)}));
  for(const root of lodRoots) if(root.index<0) error(`missing LOD${root.level} root node`);
  const sceneRoots=new Set((doc.scenes||[]).flatMap((s)=>s.nodes||[]));
  const reachable=new Set(); for(const index of sceneRoots) for(const child of childSet(doc,index)) reachable.add(child);
  for(const root of lodRoots) if(root.index>=0&&!reachable.has(root.index)) error(`LOD${root.level} root is not reachable from an exported scene`);
  const tri=lodRoots.map((root)=>root.index<0?0:countTriangles(doc,childSet(doc,root.index)));
  if(tri[0]<=0) error('LOD0 contains no triangle primitives');
  if(tri[1]<=0) error('LOD1 contains no triangle primitives');
  if(tri[0]>0 && tri[1]>=tri[0]) error(`LOD1 must be lower detail than LOD0 (${tri[1]} >= ${tri[0]} triangles)`);
  const extensions=new Set(doc.extensionsUsed||[]);
  for(const required of ['EXT_meshopt_compression','KHR_mesh_quantization']) if(!extensions.has(required)) (allowUncompressed?warn:error)(`missing required ${required}`);
  if(!doc.extensionsRequired?.includes('EXT_meshopt_compression') && extensions.has('EXT_meshopt_compression')) warn('EXT_meshopt_compression is used but not required');
  if(!(doc.meshes||[]).length) error('contains no meshes');
  if(!(doc.materials||[]).length) error('contains no materials');
  for(let meshIndex=0;meshIndex<(doc.meshes||[]).length;meshIndex++) for(let primitiveIndex=0;primitiveIndex<(doc.meshes[meshIndex].primitives||[]).length;primitiveIndex++) {
    const primitive=doc.meshes[meshIndex].primitives[primitiveIndex];
    if(primitive.attributes?.POSITION==null||!doc.accessors?.[primitive.attributes.POSITION]) error(`mesh ${meshIndex} primitive ${primitiveIndex} has no valid POSITION accessor`);
    if(primitive.indices!=null&&!doc.accessors?.[primitive.indices]) error(`mesh ${meshIndex} primitive ${primitiveIndex} has invalid indices accessor ${primitive.indices}`);
    if(primitive.material==null||!doc.materials?.[primitive.material]) error(`mesh ${meshIndex} primitive ${primitiveIndex} has no valid painted material`);
  }
  const materialNames=new Set((doc.materials||[]).map((m)=>m.name).filter(Boolean));
  if(materialNames.size<2) warn('only one named material; painted colour separation may be missing');
  if(!(doc.images||[]).length) warn('contains no embedded painted texture images; verify intentional flat-colour art direction');
  for(let i=0;i<(doc.accessors||[]).length;i++) {
    const a=doc.accessors[i];
    for(const v of [...(a.min||[]),...(a.max||[])]) if(!Number.isFinite(v)) error(`accessor ${i} has non-finite bounds`);
    if(a.componentType===5126 && a.bufferView!=null) { const read=accessorValues(doc,binary,i); if(read?.error) error(read.error); else if(read?.values?.some((v)=>!Number.isFinite(v))) error(`accessor ${i} contains NaN or Infinity`); }
  }
  const expectedClips=strings(entry?.clips), actualClips=(doc.animations||[]).map((a)=>a.name).filter(Boolean);
  for(const clip of expectedClips) if(!actualClips.includes(clip)) error(`missing clip ${clip}`);
  if((doc.animations||[]).some((a)=>!a.name)) error('contains unnamed animation clips');
  const duplicateClips=[...new Set(actualClips.filter((n,i)=>actualClips.indexOf(n)!==i))];
  if(duplicateClips.length) error(`duplicate animation clip names: ${duplicateClips.join(', ')}`);
  for(let i=0;i<(doc.animations||[]).length;i++) {
    const animation=doc.animations[i];
    for(const sampler of animation.samplers||[]) {
      if(!doc.accessors?.[sampler.input]) error(`animation ${i} references missing input accessor ${sampler.input}`);
      if(!doc.accessors?.[sampler.output]) error(`animation ${i} references missing output accessor ${sampler.output}`);
    }
    for(const channel of animation.channels||[]) if(!doc.nodes?.[channel.target?.node]) error(`animation ${i} targets missing node ${channel.target?.node}`);
  }
  for(const socket of strings(entry?.sockets)) {
    const index=(doc.nodes||[]).findIndex((n)=>n.name===socket);
    if(index<0) error(`missing socket ${socket}`); else if(doc.nodes[index].mesh!=null) error(`socket ${socket} is a mesh, expected an empty node`);
  }
  const expectedLandings=Array.isArray(entry?.landings)?entry.landings:[];
  if(expectedLandings.length) {
    const exported=(doc.nodes||[]).flatMap((n)=>landingList(n.extras?.landings));
    for(const landing of expectedLandings) {
      const name=typeof landing==='string'?landing:landing.name||landing.label;
      if(name&&!exported.some((x)=>(typeof x==='string'?x:x?.name||x?.label)===name)&&!nameSet.has(name)) error(`missing landing metadata ${name}`);
    }
  }
  const recordedBounds=expectedBounds(entry), requestedBounds=targetBounds(entry), actualBounds=lodRoots[0].index<0?null:measuredBounds(doc,binary,lodRoots[0].index);
  if(recordedBounds&&actualBounds) for(let i=0;i<3;i++) { const delta=Math.abs(actualBounds[i]-recordedBounds[i])/Math.max(recordedBounds[i],.001); if(delta>.12) error(`LOD0 ${'XYZ'[i]} bound ${actualBounds[i].toFixed(3)} m differs from manifest measurement ${recordedBounds[i]} m by ${(delta*100).toFixed(1)}%`); }
  if(recordedBounds&&requestedBounds) for(let i=0;i<3;i++) { const delta=Math.abs(recordedBounds[i]-requestedBounds[i])/Math.max(requestedBounds[i],.001); if(delta>.12) error(`manifest ${'XYZ'[i]} bound ${recordedBounds[i].toFixed(3)} m differs from target ${requestedBounds[i]} m by ${(delta*100).toFixed(1)}%`); }
  const targetTri=expectedTriangles(entry);
  if(targetTri) for(let i=0;i<2;i++) if(Number.isFinite(targetTri[i]) && targetTri[i]>0) {
    if(tri[i]>targetTri[i]*1.15) error(`LOD${i} has ${tri[i]} triangles, over target ${targetTri[i]} by ${((tri[i]/targetTri[i]-1)*100).toFixed(1)}%`);
    if(tri[i]<targetTri[i]*.1) warn(`LOD${i} has only ${tri[i]} triangles (${(tri[i]/targetTri[i]*100).toFixed(1)}% of target); inspect for placeholder-level detail`);
  }
  if(actualBounds?.some((x)=>!Number.isFinite(x)||x<=.001)) error(`LOD0 has degenerate measured bounds: ${actualBounds?.join(' × ')}`);
  result.facts={bytes:bytes.length,nodes:(doc.nodes||[]).length,meshes:(doc.meshes||[]).length,materials:(doc.materials||[]).length,triangles:{LOD0:tri[0],LOD1:tri[1]},bounds:actualBounds?.map((x)=>Number(x.toFixed(3)))||null,clips:actualClips,sockets:strings(entry?.sockets).filter((x)=>nameSet.has(x)),extensions:[...extensions]};
  return result;
}

const manifest=fs.existsSync(manifestPath)?manifestEntries(readJson(manifestPath)):[];
const entryFor=(file)=>manifest.find((entry)=>canonicalFile(entry.file||entry.final||entry.path)===canonicalFile(path.relative(MODEL_DIR,file))) || manifest.find((entry)=>path.basename(entry.file||entry.final||entry.path||'')===path.basename(file));
let files=inputs;
if(!files.length) files=manifest.map((entry)=>path.resolve(MODEL_DIR,canonicalFile(entry.file||entry.final||entry.path)));
if(!files.length) fail(`No GLBs selected or found from ${manifestPath}`);
let failed=0;
for(const file of files) {
  const entry=entryFor(file); const result=validate(file,entry);
  if(!entry) result.warnings.unshift('no matching manifest entry; contract fields were not checked');
  if(result.errors.length) failed++;
  const label=path.relative(process.cwd(),file), status=result.errors.length?'FAIL':'PASS';
  console.log(`${status} ${label}`);
  console.log(`  ${result.facts.nodes??0} nodes · ${result.facts.meshes??0} meshes · ${result.facts.materials??0} materials · ${result.facts.triangles?`${result.facts.triangles.LOD0}/${result.facts.triangles.LOD1} tris`:''}`);
  for(const message of result.errors) console.log(`  ERROR ${message}`);
  for(const message of result.warnings) console.log(`  WARN  ${message}`);
}
console.log(`\n${files.length-failed}/${files.length} GLBs passed.`);
process.exitCode=failed?1:0;
