/** Regression: a skin's baked bind-space positions must not receive meshWorld twice.
 * node source/skin_bounds.test.mjs [M006-uncompressed.glb M006.glb]
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { measureSkinBounds } from './skin_bounds.mjs';
const chunks=[],views=[],accessors=[];
function add(data,type,componentType,normalized=false){const prior=chunks.reduce((n,b)=>n+b.length,0),pad=(4-prior%4)%4;if(pad)chunks.push(Buffer.alloc(pad));const offset=prior+pad;const bytes=Buffer.from(data.buffer,data.byteOffset,data.byteLength);views.push({buffer:0,byteOffset:offset,byteLength:bytes.length});chunks.push(bytes);const width={VEC3:3,VEC4:4,MAT4:16}[type];accessors.push({bufferView:views.length-1,type,componentType,count:data.length/width,...(normalized?{normalized:true}:{})});return accessors.length-1;}
const positions=add(new Float32Array([-1,-.5,0,1,.5,0]),'VEC3',5126);
const joints=add(new Uint8Array([0,1,0,0,1,0,0,0]),'VEC4',5121);
const weights=add(new Uint8Array([128,127,0,0,128,127,0,0]),'VEC4',5121,true);
const inverseBind=add(new Float32Array([2,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1,2,0,0,0,0,1,0,0,0,0,1,0,-2,0,0,1]),'MAT4',5126);
const fixture={nodes:[{name:'LOD0',scale:[.5,1,1],children:[1,2,3]},{name:'Mesh',mesh:0,skin:0,translation:[7,9,11]},{name:'Joint0'},{name:'Joint1',translation:[2,0,0]}],skins:[{joints:[2,3],inverseBindMatrices:inverseBind}],meshes:[{primitives:[{attributes:{POSITION:positions,JOINTS_0:joints,WEIGHTS_0:weights}}]}],accessors,bufferViews:views};
const bin=Buffer.concat(chunks);const near=(actual,want)=>{assert.equal(actual.length,want.length);actual.forEach((x,i)=>assert.ok(Math.abs(x-want[i])<.001,`${actual} != ${want}`));};
near(await measureSkinBounds(fixture,bin,0),[2,1,0]);near(await measureSkinBounds(fixture,bin,0,{ignoreSkin:true}),[1,1,0]);
const bad=structuredClone(fixture);bad.meshes[0].primitives[0].attributes.WEIGHTS_0=undefined;await assert.rejects(measureSkinBounds(bad,bin,0),/missing WEIGHTS/);
console.log('PASS synthetic baked ancestor-scale fixture (weighted X2.0; naive X1.0), normalized-byte weights, missing influence rejection.');
for(const file of process.argv.slice(2)){
 const bytes=fs.readFileSync(file);let offset=12,doc,binary;
 while(offset<bytes.length){const length=bytes.readUInt32LE(offset),kind=bytes.readUInt32LE(offset+4);offset+=8;if(kind===0x4e4f534a)doc=JSON.parse(bytes.toString('utf8',offset,offset+length));if(kind===0x004e4942)binary=bytes.subarray(offset,offset+length);offset+=length;}
 for(const name of ['LOD0','LOD1']){const root=doc.nodes.findIndex(n=>n.name===name);const correct=await measureSkinBounds(doc,binary,root);near(correct,[1.3,1.3,8.2]);const naive=await measureSkinBounds(doc,binary,root,{ignoreSkin:true});assert.ok(Math.abs(naive[0]-correct[0])>.15);console.log(`PASS ${file} ${name}: skin ${correct.map(x=>x.toFixed(6))}; naive ${naive.map(x=>x.toFixed(6))}`);}
}
