import { buildLevel } from '../src/game/levels.ts';
import { writeFileSync } from 'node:fs';
const DT=1/120, SPEED=650, G=1900, JUMP=1000, BODY_HALF=70;
const reports=[];const failures=[];
const gravityAt=(l,x)=>l.areas.find(a=>x>=a.xStart&&x<a.xEnd)?.gravity||l.areas.at(-1).gravity;
// A conservative player has 70px horizontal clearance on every landing. Takeoff
// sits 100px inside a shelf, rather than exploiting coyote-time at its outer edge.
function attempt(l,a,b,hold,vx0,mode='accelerate') {
 let x=a.x+a.w-100,y=a.y,vy=-JUMP,vx=vx0,t=0,released=false;
 let apex=0;
 for(let n=0;n<700;n++){
  const prevY=y;
  if(t>=hold&&!released){if(vy<0)vy*=.45;released=true;}
  const g=G*gravityAt(l,x);
  vy+=g*((t<.32&&t<hold&&vy<0)?.48:1)*DT;
  const target=mode==='aim'?Math.max(-SPEED,Math.min(SPEED,(b.x+b.w*.5-x)*3)):(mode==='brake'&&vy>0?0:SPEED);
  vx+=Math.max(-2400*DT,Math.min(2400*DT,target-vx));
  x+=vx*DT;y+=vy*DT;t+=DT;apex=Math.max(apex,a.y-y);
  if(vy>0&&prevY<=b.y&&y>=b.y&&x>=b.x+BODY_HALF&&x<=b.x+b.w-BODY_HALF)return {hold,vx0,mode,time:t,x,apex};
  if(y>Math.max(a.y,b.y)+1200||x>b.x+b.w+200)return null;
 }
 return null;
}
function reachable(l,a,b){
 for(const vx of [650,400,0])for(const hold of [.07,.13,.2,.27,.34,.5,1.8])for(const mode of ['accelerate','brake','aim']){
  const r=attempt(l,a,b,hold,vx,mode);if(r)return r;
 }
 return null;
}
for(let mission=0;mission<3;mission++){
 const l=buildLevel(mission),main=l.platforms.filter(p=>p.routeRole==='main'||p.id.endsWith('arena-floor'));
 const graph=new Map(main.map(p=>[p.id,[]]));const tight=[];const arcs=[];
 // Fixed-step ballistic edges, not just gap-vs-maximum comparisons.
 for(let i=0;i<main.length-1;i++){
  const a=main[i],b=main[i+1],res=reachable(l,a,b);
  if(!res)failures.push({mission,kind:'required jump',from:a.id,to:b.id,gap:b.x-a.x-a.w,rise:a.y-b.y});
  else{graph.get(a.id).push(b.id);arcs.push(res);if(res.hold>=.34&&res.vx0===650)tight.push([a.id,b.id]);}
  // Optional skip edges give a directed graph with authentic route choice.
  if(main[i+2]&&main[i+2].x-a.x-a.w<1200){const c=main[i+2];if(reachable(l,a,c))graph.get(a.id).push(c.id);}
 }
 const seen=new Set([main[0].id]);const queue=[main[0].id];while(queue.length)for(const v of graph.get(queue.shift())||[])if(!seen.has(v)){seen.add(v);queue.push(v);}
 if(!seen.has(main.at(-1).id))failures.push({mission,kind:'boss unreachable'});
 for(const cp of l.checkpoints){
  const shelf=l.platforms.find(p=>p.kind!=='crumble'&&!p.moving&&p.y===cp.y&&cp.x>=p.x+80&&cp.x<=p.x+p.w-80);
  if(!shelf)failures.push({mission,kind:'checkpoint lacks stable landing',cp});
  if(l.enemies.some(e=>Math.abs(e.x-cp.x)<220&&Math.abs(e.y-cp.y)<150))failures.push({mission,kind:'enemy near checkpoint',cp});
  if(l.hazards.some(h=>cp.x>h.x-90&&cp.x<h.x+h.w+90&&cp.y>h.y-90&&cp.y<h.y+h.h+90))failures.push({mission,kind:'hazard near checkpoint',cp});
 }
 // All signal shelves must be reachable from their supporting main shelf.
 for(const opt of l.platforms.filter(p=>p.id.endsWith('-signal'))){
  const base=l.platforms.find(p=>p.id===opt.id.replace('-signal',''));
  // This upward optional route starts near shelf LEFT so the jump can arc above
  // the shelf center; main-route takeoff positions are intentionally different.
  const a={...base,w:Math.max(180,opt.x-base.x+80)};
  if(!reachable(l,a,opt))failures.push({mission,kind:'unreachable signal shelf',id:opt.id,rise:base.y-opt.y});
 }
 // High roads: the first shelf rises from the fight shelf, the second continues
 // from the first, and the second drops onto the next main landing.
 for(const a of l.platforms.filter(p=>p.id.endsWith('-high-a'))){
  const baseId=a.id.replace('-high-a','');
  const base=l.platforms.find(p=>p.id===baseId),b=l.platforms.find(p=>p.id===baseId+'-high-b');
  const idx=main.findIndex(p=>p.id===baseId),next=main[idx+1];
  const from={...base,w:Math.max(180,a.x-base.x+80)};
  if(!reachable(l,from,a))failures.push({mission,kind:'unreachable high road',id:a.id,rise:base.y-a.y});
  if(!reachable(l,a,b))failures.push({mission,kind:'high road break',id:b.id});
  if(next&&!reachable(l,b,next))failures.push({mission,kind:'high road cannot rejoin',id:b.id,to:next.id});
 }
 // Every chapter crossing has a catch floor and a step back up to the route.
 for(const p of main.filter(p=>/-c\d-p5$/.test(p.id))){
  const salvage=l.platforms.find(q=>q.id===p.id+'-salvage'),step=l.platforms.find(q=>q.id===p.id+'-recovery-step');
  const idx=main.indexOf(p),next=main[idx+1];
  if(!salvage||!step){failures.push({mission,kind:'crossing lacks catch floor',id:p.id});continue;}
  if(!reachable(l,salvage,step))failures.push({mission,kind:'catch floor cannot reach step',id:p.id});
  if(next&&!reachable(l,step,next))failures.push({mission,kind:'recovery step cannot rejoin route',id:p.id,to:next.id});
 }
 // The inversion gallery is optional and cannot capture an ordinary route jump.
 // Simulate vertical entry from its staging shelf, then a gravity-restored exit
 // at the side edge over the same broad safe floor.
 for(const gate of l.gravityGates){
  const base=l.platforms.find(p=>p.id===gate.id.replace('-inversion',''));
  const entry=l.platforms.find(p=>p.id===gate.id.replace('-inversion','-gallery-entry'));
  const ceiling=l.platforms.find(p=>p.id===gate.ceilingId);
  if(gate.y+gate.h>base.y-490)failures.push({mission,kind:'gallery can capture main-route jump'});
  if(gate.x<base.x+100||gate.x+gate.w>base.x+base.w-100)failures.push({mission,kind:'gallery exit lacks recovery floor'});
  if(!ceiling?.ceiling||Math.abs(ceiling.y+ceiling.h-gate.y)>1)failures.push({mission,kind:'gallery ceiling misregistered'});
  let py=entry.y,vy=-JUMP,t=0,landed=false;
  for(let n=0;n<1000;n++){
   const sign=py>=gate.y&&py<=gate.y+gate.h?-1:1;
   vy+=G*.85*sign*(t<.32&&sign===1?.48:1)*DT;py+=vy*DT;t+=DT;
   if(sign===-1&&py<=gate.y){landed=true;break;}
   if(py>base.y+100)break;
  }
  if(!landed)failures.push({mission,kind:'gallery entry failed fixed-step simulation'});
  // Leaving either vertical boundary restores downward acceleration with no gap.
  py=gate.y;vy=0;let recovered=false;
  for(let n=0;n<1000;n++){vy+=G*.85*DT;py+=vy*DT;if(py>=base.y){recovered=true;break;}}
  if(!recovered)failures.push({mission,kind:'gallery exit failed'});
 }
 const areas=l.areas.map(a=>{
  const p=main.filter(p=>p.area===a.id);const gaps=p.slice(1).map((b,i)=>b.x-p[i].x-p[i].w);
  const rises=p.slice(1).map((b,i)=>p[i].y-b.y);
  const combat=p.filter(p=>p.encounter==='fight'||p.encounter==='finish').length;
  const c=l.checkpoints.filter(c=>c.area===a.id);const maxCheckpointSpacing=Math.max(...c.slice(1).map((b,i)=>b.x-c[i].x));
  return {name:a.name,worldPixels:Math.round(a.xEnd-a.xStart),gravity:a.gravity,mainShelves:p.length,maxRequiredGap:Math.max(...gaps),maxRise:Math.max(...rises),verticalSpan:Math.max(...p.map(p=>p.y))-Math.min(...p.map(p=>p.y)),enemies:l.enemies.filter(e=>e.area===a.id).length,combatShelves:combat,quietShelves:p.length-combat,checkpoints:c.length,maxCheckpointSpacing,fullSpeedTravelSeconds:Math.round((a.xEnd-a.xStart)/650),estimatedFirstClearMinutes:'4–7 (unverified; includes combat, climbs and optional detours)'};
 });
 reports.push({mission:mission+1,name:l.name,width:l.width,reachableMainShelves:seen.size,mainShelves:main.length,simulatedDirectedEdges:[...graph.values()].reduce((n,v)=>n+v.length,0),fullHoldFastApproaches:tight.length,optionalSignals:l.collectibles.length,highRoads:l.platforms.filter(p=>p.id.endsWith('-high-a')).length,catchFloors:l.platforms.filter(p=>p.id.endsWith('-salvage')).length,ambushes:{behind:l.enemies.filter(e=>e.ambush==='behind').length,above:l.enemies.filter(e=>e.ambush==='above').length},areas});
}
const report={physics:{hz:120,bodyHeight:90,landingHorizontalClearance:70,speed:SPEED,gravity:G,jumpVelocity:-JUMP,heldGravityFactor:.48,holdWindow:.32,releaseVelocityFactor:.45,airAcceleration:2400},reports,failures};
writeFileSync(new URL('./audit-results.json',import.meta.url),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
if(failures.length)process.exitCode=1;
