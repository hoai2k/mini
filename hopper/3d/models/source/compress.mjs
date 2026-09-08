#!/usr/bin/env node
/** Offline gltfpack wrapper for final Hopper GLBs.
 * Preserves named nodes, extras, materials, and animation clips, then verifies them.
 * Usage: node source/compress.mjs input.glb [output.glb] [--gltfpack path] [--force]
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function usage(code=0) {
  console.log('Usage: node source/compress.mjs input.glb [output.glb] [--gltfpack path] [--force]\nOutput defaults to <input>.compressed.glb. This command never downloads tools.');
  process.exit(code);
}
const positional=[]; let explicitTool='', force=false;
const args=process.argv.slice(2);
for(let i=0;i<args.length;i++) {
  if(args[i]==='--help'||args[i]==='-h') usage();
  if(args[i]==='--gltfpack') { explicitTool=args[++i]||usage(2); }
  else if(args[i]==='--force') force=true;
  else positional.push(args[i]);
}
if(positional.length<1||positional.length>2) usage(2);
const input=path.resolve(positional[0]);
const output=path.resolve(positional[1]||input.replace(/\.glb$/i,'')+'.compressed.glb');
if(!fs.existsSync(input)) throw new Error(`Input does not exist: ${input}`);
if(path.extname(input).toLowerCase()!=='.glb'||path.extname(output).toLowerCase()!=='.glb') throw new Error('Input and output must use the .glb extension.');
if(input===output) throw new Error('Refusing in-place compression. Use a separate output path, validate it, then replace the source explicitly.');
if(fs.existsSync(output)&&!force) throw new Error(`Output already exists: ${output} (pass --force to replace it)`);

function executable(file) { try { fs.accessSync(file,fs.constants.X_OK); return file; } catch { return ''; } }
function fromPath(name) {
  for(const dir of (process.env.PATH||'').split(path.delimiter)) { const found=executable(path.join(dir,name)); if(found) return found; }
  return '';
}
function cachedNpx() {
  const root=path.join(os.homedir(),'.npm','_npx');
  let ids=[]; try { ids=fs.readdirSync(root); } catch { return ''; }
  return ids.map((id)=>path.join(root,id,'node_modules','.bin','gltfpack')).map(executable).find(Boolean)||'';
}
const configuredTool=explicitTool||process.env.GLTFPACK||'';
const tool=(configuredTool?executable(path.resolve(configuredTool)):'')||fromPath('gltfpack')||cachedNpx();
if(!tool) throw new Error('gltfpack was not found. Install/cache gltfpack first or pass --gltfpack /absolute/path. The portable Generations pipeline also expects the npm gltfpack package; this runner will not download it.');

function glbJson(file) {
  const bytes=fs.readFileSync(file);
  if(bytes.length<20||bytes.toString('ascii',0,4)!=='glTF'||bytes.readUInt32LE(4)!==2) throw new Error(`${file} is not a glTF 2 GLB`);
  let offset=12;
  while(offset+8<=bytes.length) {
    const length=bytes.readUInt32LE(offset), type=bytes.readUInt32LE(offset+4); offset+=8;
    if(offset+length>bytes.length) throw new Error(`${file} has a truncated GLB chunk`);
    if(type===0x4e4f534a) return JSON.parse(bytes.toString('utf8',offset,offset+length).replace(/[\0 ]+$/g,''));
    offset+=length;
  }
  throw new Error(`${file} has no JSON chunk`);
}
function names(doc,key) { return (doc[key]||[]).map((x)=>x.name).filter(Boolean); }
function stable(value) {
  if(Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if(value&&typeof value==='object') return `{${Object.keys(value).sort().map((key)=>`${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
function extras(doc) {
  const found=[];
  const visit=(value)=>{ if(!value||typeof value!=='object') return; if(Object.hasOwn(value,'extras')) found.push(stable(value.extras)); for(const [key,child] of Object.entries(value)) if(key!=='extras') visit(child); };
  visit(doc); return found.sort();
}
function missing(before,after) { const available=new Map(); for(const x of after) available.set(x,(available.get(x)||0)+1); return before.filter((x)=>{const n=available.get(x)||0;if(!n)return true;available.set(x,n-1);return false;}); }

const before=glbJson(input);
for(const root of ['LOD0','LOD1']) if(!(before.nodes||[]).some((n)=>new RegExp(`^${root}(?:$|[_.-])`,'i').test(n.name||''))) throw new Error(`Input is missing the ${root} root; compression was not run.`);
const temp=`${output}.tmp-${process.pid}.glb`;
try {
  const result=spawnSync(tool,['-i',input,'-o',temp,'-cc','-kn','-ke','-km'],{stdio:'inherit'});
  if(result.error) throw result.error;
  if(result.status!==0) throw new Error(`gltfpack exited with status ${result.status}`);
  const after=glbJson(temp);
  const lostNodes=missing(names(before,'nodes'),names(after,'nodes'));
  const lostClips=missing(names(before,'animations'),names(after,'animations'));
  const lostMaterials=missing(names(before,'materials'),names(after,'materials'));
  const lostExtras=missing(extras(before),extras(after));
  if(lostNodes.length) throw new Error(`Compression removed named nodes: ${lostNodes.join(', ')}`);
  if(lostClips.length) throw new Error(`Compression removed animation clips: ${lostClips.join(', ')}`);
  if(lostMaterials.length) throw new Error(`Compression removed named materials: ${lostMaterials.join(', ')}`);
  if(lostExtras.length) throw new Error(`Compression removed ${lostExtras.length} extras payload(s)`);
  if(!(after.extensionsUsed||[]).includes('EXT_meshopt_compression')) throw new Error('Compressed output does not declare EXT_meshopt_compression');
  fs.renameSync(temp,output);
  const ratio=fs.statSync(output).size/fs.statSync(input).size;
  console.log(`Wrote ${output}`);
  console.log(`${fs.statSync(input).size.toLocaleString()} → ${fs.statSync(output).size.toLocaleString()} bytes (${(ratio*100).toFixed(1)}%)`);
  console.log(`Preserved ${names(before,'nodes').length} named nodes, ${names(before,'animations').length} clips, ${names(before,'materials').length} named materials, and ${extras(before).length} extras payloads.`);
} finally {
  if(fs.existsSync(temp)) fs.unlinkSync(temp);
}
