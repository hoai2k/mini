// QA-only decode. Never feed these expanded files to production.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const {MeshoptDecoder}=await import(path.join(root,'local/hopper-3d-tests/node_modules/three/examples/jsm/libs/meshopt_decoder.module.js'));await MeshoptDecoder.ready;
for(const kind of ['hopper','rider','hopper-rider']){
const file=path.join(root,'local/hopper-animation-extension',kind+'.glb'),b=fs.readFileSync(file),len=b.readUInt32LE(12),j=JSON.parse(b.subarray(20,20+len));let bin=Buffer.from(b.subarray(28+len));
for(const bv of j.bufferViews){const e=bv.extensions?.EXT_meshopt_compression;if(!e)continue;const out=new Uint8Array(e.count*e.byteStride);MeshoptDecoder.decodeGltfBuffer(out,e.count,e.byteStride,bin.subarray(e.byteOffset||0,(e.byteOffset||0)+e.byteLength),e.mode,e.filter);bv.buffer=0;bv.byteOffset=bin.length;bv.byteLength=out.length;delete bv.extensions.EXT_meshopt_compression;if(!Object.keys(bv.extensions).length)delete bv.extensions;bin=Buffer.concat([bin,Buffer.from(out),Buffer.alloc((4-out.length%4)%4)]);}
j.buffers=[{byteLength:bin.length}];for(const key of ['extensionsUsed','extensionsRequired'])j[key]=j[key].filter(x=>x!=='EXT_meshopt_compression');let jb=Buffer.from(JSON.stringify(j));jb=Buffer.concat([jb,Buffer.alloc((4-jb.length%4)%4,32)]);const h=Buffer.alloc(20),bh=Buffer.alloc(8);h.write('glTF');h.writeUInt32LE(2,4);h.writeUInt32LE(28+jb.length+bin.length,8);h.writeUInt32LE(jb.length,12);h.write('JSON',16);bh.writeUInt32LE(bin.length);bh.write('BIN\0',4);fs.writeFileSync(file.replace('.glb','-qa-decoded.glb'),Buffer.concat([h,jb,bh,bin]));
}
