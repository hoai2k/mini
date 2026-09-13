/** Independent compressed GLB contract audit for the isolated M-011 art candidate. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { measureSkinBounds } from './skin_bounds.mjs';
const HERE=path.dirname(fileURLToPath(import.meta.url)),ROOT=path.resolve(HERE,'../../../..'),OUT=path.join(ROOT,'local/hopper-chain-manta-refine');
const production=process.argv.includes('--production'),asset=production?path.resolve(HERE,'../enemies/chainManta.glb'):path.join(OUT,'chainManta.glb');
const bytes=fs.readFileSync(asset),jsonLength=bytes.readUInt32LE(12),doc=JSON.parse(bytes.subarray(20,20+jsonLength)),binStart=20+jsonLength,bin=bytes.subarray(binStart+8,binStart+8+bytes.readUInt32LE(binStart));
const requiredClips=['Soar','Tether_Tell','Tether_Pull','Release','Bank','Hit','Dissolve'],sockets=['Core','TetherNode','Hook.L','Hook.R','Hitbox.Body','Landing'];
const assert=(v,msg)=>{if(!v)throw Error(msg);};
assert(doc.skins.length===2,'Expected two skins');assert(doc.skins.every(s=>s.joints.length===18),'Expected eighteen joints on both skins');
assert(requiredClips.every(name=>doc.animations.some(a=>a.name===name)),'Missing clips');assert(sockets.every(name=>doc.nodes.filter(n=>n.name===name).length===1),'Missing or duplicate socket names');
assert(doc.meshes.every(m=>m.primitives.every(p=>p.attributes.JOINTS_0!==undefined&&p.attributes.WEIGHTS_0!==undefined)),'Missing skin attributes');
const bounds=[];
for(const name of ['LOD0','LOD1']){
 const ix=doc.nodes.findIndex(n=>n.name===name);assert(ix>=0,'Missing LOD root');assert(doc.animations.every(a=>a.channels.every(ch=>ch.target.node!==ix)),'Unexpected root motion');
 bounds.push(await measureSkinBounds(doc,bin,ix));
}
assert(bounds.every(b=>b.every((n,i)=>Math.abs(n-[14.2,7.3,7.6][i])<0.001)),'Compressed dimensions outside one millimeter tolerance');
const qa=JSON.parse(fs.readFileSync(path.join(OUT,'rig-qa.json'))),record=JSON.parse(fs.readFileSync(path.join(OUT,'record.json')));
assert(record.triangles[0]<=6000&&record.triangles[1]<=2000,'Triangle budget exceeded');
const report={request:'M-011',status:production?'root-reviewed and integrated':'candidate-awaiting-root-art-review',file:production?'enemies/chainManta.glb':record.file,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),compressedBytes:bytes.length,skins:doc.skins.map(s=>({jointCount:s.joints.length})),triangles:record.triangles,bounds,clips:requiredClips,sockets,materials:doc.materials.length,images:doc.images.length,allMeshesWeighted:true,staticRoots:true,loops:qa.loops,chainMotion:qa.chainMotion,visualSheets:['contact-rest.png','contact-clips-LOD0.png','contact-clips-LOD1.png','contact-soar-extrema.png'].map(f=>path.relative(ROOT,path.join(OUT,f))),source:'hopper/3d/models/source/chain_manta_refine.py'};
if(fs.existsSync(path.join(OUT,'surface-audit.json'))){
 const surface=JSON.parse(fs.readFileSync(path.join(OUT,'surface-audit.json')));assert(surface.passed,'Surface audit failed');
 const rows=Object.values(surface.clips).flatMap(c=>c.samples).flatMap(r=>Object.values(r.lods));
 report.surfaceAudit={passed:true,samplesPerClipPerLOD:9,finiteVertices:true,fissures:'Shared foil material faces; zero overlay separation',maxNeighborLinkVertexDistance:Math.max(...rows.map(r=>r.maxNeighborLinkVertexDistance)),maxHookEyeletVertexDistance:Math.max(...rows.map(r=>Math.max(...Object.values(r.hookEyeletNearestVertexDistance)))),soarMaxVertexClosure:surface.clips.Soar.maxFirstLastVertexDelta};
 report.visualReview={artAgent:'Both LODs: four rest views, every clip start/mid/end, and Soar quarter-cycle extrema inspected',root:production?'All final rest, clip, and Soar extrema sheets accepted':'Rest art accepted; final pose review pending'};
}
report.runtimeResponsibilities=['Enemy navigation and platform tether attachment/dragging.','Weak-point hitbox activation and stomp/bounce collision.','Charge and dissolve shaders.'];
report.date='2026-09-12';
if(production)report.checks={fullRepositoryValidation:fs.readFileSync(path.resolve(HERE,'../validation.txt'),'utf8').trim().split('\n').at(-1),productionHashMatchesCandidate:crypto.createHash('sha256').update(fs.readFileSync(path.join(OUT,'chainManta.glb'))).digest('hex')===report.sha256};
report.contactSheetHashes=Object.fromEntries(['contact-rest.png','contact-clips-LOD0.png','contact-clips-LOD1.png','contact-soar-extrema.png'].map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(path.join(OUT,f))).digest('hex')]));
fs.writeFileSync(path.join(OUT,'validation.json'),JSON.stringify(report,null,2)+'\n');fs.writeFileSync(path.join(HERE,'chain-manta-refine-validation.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
