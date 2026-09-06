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
function reachableStatic(l,a,b){
 for(const vx of [650,400,0])for(const hold of [.07,.13,.2,.27,.34,.5,1.8])for(const mode of ['accelerate','brake','aim']){
  const r=attempt(l,a,b,hold,vx,mode);if(r)return r;
 }
 return null;
}
// A swinging shelf is tested at its four quarter phases; the worst one must pass.
function phases(p){
 if(!p.moving)return [p];
 return [0,.25,.5,.75].map(f=>({...p,[p.moving.axis]:p[p.moving.axis]+Math.sin(f*Math.PI*2)*p.moving.range}));
}
function reachable(l,a,b){
 let worst=null;
 for(const pa of phases(a))for(const pb of phases(b)){const r=reachableStatic(l,pa,pb);if(!r)return null;if(!worst||r.hold>worst.hold)worst=r;}
 return worst;
}
// Unreachable by a clean landing, but the lip lies within the ledge catch's reach.
function catchable(l,a,b){
 return !reachableStatic(l,a,b)&&!!reachableStatic(l,a,{...b,y:b.y+80});
}
for(let mission=0;mission<3;mission++){
 const l=buildLevel(mission),main=l.platforms.filter(p=>p.routeRole==='main'||p.id.endsWith('arena-floor'));
 const graph=new Map(main.map(p=>[p.id,[]]));const tight=[];const arcs=[];
 // Fixed-step ballistic edges, not just gap-vs-maximum comparisons.
 for(let i=0;i<main.length-1;i++){
  const a=main[i],b=main[i+1];
  if(b.via==='inversion'){
   // The route runs up into the gate, along the ceiling and out over b.
   const gate=l.gravityGates.find(g=>g.required&&g.x<a.x+a.w&&g.x+g.w>b.x);
   const ceiling=gate&&l.platforms.find(p=>p.id===gate.ceilingId);
   const apex=(JUMP*JUMP)/(2*G*gravityAt(l,a.x)*.75);
   if(!gate)failures.push({mission,kind:'inverted crossing lacks gate',from:a.id,to:b.id});
   else{
    if(a.y-(gate.y+gate.h)>apex)failures.push({mission,kind:'inverted gate out of jump reach',from:a.id,rise:a.y-(gate.y+gate.h),apex});
    if(!ceiling?.ceiling||Math.abs(ceiling.y+ceiling.h-gate.y)>1)failures.push({mission,kind:'inverted ceiling misregistered',id:gate.id});
    if(gate.x+gate.w<=b.x+120||gate.x+gate.w>b.x+b.w-120)failures.push({mission,kind:'inverted exit misses landing',id:gate.id,to:b.id});
    if(reachableStatic(l,a,b))failures.push({mission,kind:'inverted crossing can be jumped',from:a.id,to:b.id});
    graph.get(a.id).push(b.id);
   }
   continue;
  }
  const res=reachable(l,a,b);
  if(!res)failures.push({mission,kind:'required jump',from:a.id,to:b.id,gap:b.x-a.x-a.w,rise:a.y-b.y});
  else{graph.get(a.id).push(b.id);arcs.push(res);if(res.hold>=.34&&res.vx0===650)tight.push([a.id,b.id]);}
  // Optional skip edges give a directed graph with authentic route choice.
  if(main[i+2]&&main[i+2].x-a.x-a.w<1200){const c=main[i+2];if(reachable(l,a,c))graph.get(a.id).push(c.id);}
 }
 // Challenge index: the hardest moment of a mission must be a jump fought
 // through, not a jump alone. jump = hold/speed/gap demand of arriving at a
 // shelf; combat = weighted foes engaged at that landing or over that gap.
 const FLY=new Set(['windowRay','riftCondor','chainManta','coilWraith','turbineWasp','veilMedusa','phaseSkate','gravityCantor']);
 const RNG=new Set(['seedSpitter','spireLeech','slagCaster','chainManta','coilWraith','thornChoir','veilMedusa','gravityCantor']);
 const ARM=new Set(['cragTortoise','slagCaster','ballastCrab','turbineWasp']);
 const challenge=[];
 for(let i=0;i<main.length-1;i++){
  const a=main[i],b=main[i+1];
  const arc=reachable(l,a,b);
  const gap=b.x-a.x-a.w;
  const jump=b.via==='inversion'?2:(arc?(arc.hold>=.34?2:arc.hold>=.2?1:0)+(arc.vx0===650&&arc.hold>=.34?1:0):3)+(gap>350?1:0);
  // Foes engaged by the landing itself: over the gap, or within the first 520
  // units of the next shelf. Anything deeper in is the next fight, not this jump.
  const foes=l.enemies.filter(e=>e.x>a.x+a.w-100&&e.x<Math.min(b.x+b.w+150,b.x+520)&&Math.abs(e.y-b.y)<520);
  const combat=foes.reduce((n,e)=>n+(ARM.has(e.type)?2:RNG.has(e.type)||FLY.has(e.type)?1.5:1)*(e.wave?0.5:1)+(e.agile?0.5:0)+(e.ambush?0.4:0),0);
  challenge.push({from:a.id,to:b.id,jump,combat:+combat.toFixed(1),total:+(jump+combat).toFixed(1),foes:foes.length});
 }
 const jumpOnly=challenge.filter(c=>c.combat===0),combos=challenge.filter(c=>c.combat>0);
 const maxJumpOnly=Math.max(0,...jumpOnly.map(c=>c.total)),maxCombo=Math.max(0,...combos.map(c=>c.total));
 const hardest=[...challenge].sort((x,y)=>y.total-x.total).slice(0,6);
 if(maxCombo<=maxJumpOnly)failures.push({mission,kind:'hardest moment is a bare jump',maxJumpOnly,maxCombo});
 for(const c of challenge)if(c.jump>=3&&c.combat>=5)failures.push({mission,kind:'jump and fight too hard together',...c});
 for(const c of challenge)if(c.combat>=9)failures.push({mission,kind:'encounter too dense',...c});
 const seen=new Set([main[0].id]);const queue=[main[0].id];while(queue.length)for(const v of graph.get(queue.shift())||[])if(!seen.has(v)){seen.add(v);queue.push(v);}
 if(!seen.has(main.at(-1).id))failures.push({mission,kind:'boss unreachable'});
 for(const cp of l.checkpoints){
  const shelf=l.platforms.find(p=>p.kind!=='crumble'&&!p.moving&&p.y===cp.y&&cp.x>=p.x+80&&cp.x<=p.x+p.w-80);
  if(!shelf)failures.push({mission,kind:'checkpoint lacks stable landing',cp});
  if(l.enemies.some(e=>Math.abs(e.x-cp.x)<220&&Math.abs(e.y-cp.y)<150))failures.push({mission,kind:'enemy near checkpoint',cp});
  if(l.hazards.some(h=>cp.x>h.x-90&&cp.x<h.x+h.w+90&&cp.y>h.y-90&&cp.y<h.y+h.h+90))failures.push({mission,kind:'hazard near checkpoint',cp});
 }
 // Every signal shelf rewards one verb: the catch lip is out of clean reach but
 // inside the catch window, the cage shelf is an ordinary jump, and the high
 // perch is reached from the second high-road shelf only.
 for(const opt of l.platforms.filter(p=>p.id.endsWith('-signal'))){
  const baseId=opt.id.replace('-signal','');
  const base=l.platforms.find(p=>p.id===baseId);
  const a={...base,w:Math.max(180,opt.x-base.x+80)};
  if(opt.teach==='catch'){
   if(!catchable(l,a,opt))failures.push({mission,kind:'catch signal not catch-only',id:opt.id,rise:base.y-opt.y,clean:!!reachableStatic(l,a,opt)});
  }else if(opt.teach==='high'){
   const b=l.platforms.find(p=>p.id===baseId+'-high-b');
   if(!b||!reachable(l,{...b,w:Math.max(180,opt.x-b.x+80)},opt))failures.push({mission,kind:'high signal unreachable from high road',id:opt.id});
   if(reachableStatic(l,a,opt))failures.push({mission,kind:'high signal reachable without high road',id:opt.id});
  }else{
   if(!reachable(l,a,opt))failures.push({mission,kind:'unreachable signal shelf',id:opt.id,rise:base.y-opt.y});
   if(opt.teach==='parry'){
    const bar=l.barriers.find(b=>b.id===baseId+'-barrier');
    if(bar&&!l.collectibles.some(c=>c.barrierId===bar.id))failures.push({mission,kind:'cage guards no signal',id:opt.id});
    const warden=l.enemies.find(e=>e.id===baseId+'-warden');
    if(!bar||!warden)failures.push({mission,kind:'cage signal lacks barrier or warden',id:opt.id});
    else if(warden.x<bar.x||warden.x>bar.x+bar.w)failures.push({mission,kind:'warden outside its cage',id:opt.id});
   }
  }
 }
 // Low roads: the corridor floor is reached by a drop, its two steps climb back,
 // and the second step rejoins the next landing.
 for(const floor of l.platforms.filter(p=>p.id.endsWith('-low'))){
  const baseId=floor.id.replace('-low','');
  const idx=main.findIndex(p=>p.id===baseId),prev=main[idx-1],next=main[idx+1];
  const a=l.platforms.find(p=>p.id===baseId+'-low-step-a'),b=l.platforms.find(p=>p.id===baseId+'-low-step-b');
  if(!prev||floor.x>prev.x+prev.w-40)failures.push({mission,kind:'low road not under previous edge',id:floor.id});
  if(floor.y-prev.y<150)failures.push({mission,kind:'low road too shallow to duck under',id:floor.id});
  const corridor=main[idx];
  if(floor.y-(corridor.y+corridor.h)<200)failures.push({mission,kind:'low road corridor too low',id:floor.id,clear:floor.y-(corridor.y+corridor.h)});
  if(!reachable(l,{...floor,w:Math.max(180,a.x-floor.x+80)},a))failures.push({mission,kind:'low road cannot reach first step',id:floor.id});
  if(!reachable(l,a,b))failures.push({mission,kind:'low road step break',id:floor.id});
  if(next&&!reachable(l,b,next))failures.push({mission,kind:'low road cannot rejoin route',id:floor.id,to:next.id});
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
  const salvage=l.platforms.find(q=>q.id===p.id+'-salvage'),step=l.platforms.find(q=>q.id===p.id+'-recovery-step'),spring=l.platforms.find(q=>q.id===p.id+'-salvage-spring');
  const idx=main.indexOf(p),next=main[idx+1]?.id===p.id+'-island'?main[idx+2]:main[idx+1];
  if(!salvage||!step||!spring){failures.push({mission,kind:'crossing lacks catch floor',id:p.id});continue;}
  const island=main[idx+1]?.id===p.id+'-island'?main[idx+1]:null;
  if(island){
   const lurker=l.enemies.find(e=>e.id===p.id+'-island-e');
   if(!lurker||lurker.ambush!=='behind'||lurker.wake>60)failures.push({mission,kind:'island lacks its lurker',id:p.id});
   if(island.w>260)failures.push({mission,kind:'island too comfortable',id:p.id});
  }
  if(!reachable(l,salvage,step))failures.push({mission,kind:'catch floor cannot reach step',id:p.id});
  if(next&&!reachable(l,step,next))failures.push({mission,kind:'recovery step cannot rejoin route',id:p.id,to:next.id});
 }
 // The inversion gallery is optional and cannot capture an ordinary route jump.
 // Simulate vertical entry from its staging shelf, then a gravity-restored exit
 // at the side edge over the same broad safe floor.
 for(const gate of l.gravityGates){
  if(gate.required)continue;
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
  const foes=l.enemies.filter(e=>e.area===a.id);
  const fights=new Map();for(const e of foes){const g=e.group||e.id;fights.set(g,(fights.get(g)||0)+1);}
  const perFight=[...fights.values()].filter(n=>n>1);
  return {name:a.name,worldPixels:Math.round(a.xEnd-a.xStart),encounters:{spawns:foes.length,agile:foes.filter(e=>e.agile).length,waves:foes.filter(e=>e.wave>0).length,ambushes:foes.filter(e=>e.ambush).length,guards:foes.filter(e=>e.id.endsWith('-guard')).length,tier:Math.max(0,...foes.map(e=>e.tier||0)),biggestFight:Math.max(0,...perFight),meanFight:+(perFight.reduce((n,v)=>n+v,0)/Math.max(1,perFight.length)).toFixed(1)},gravity:a.gravity,mainShelves:p.length,maxRequiredGap:Math.max(...gaps),maxRise:Math.max(...rises),verticalSpan:Math.max(...p.map(p=>p.y))-Math.min(...p.map(p=>p.y)),enemies:l.enemies.filter(e=>e.area===a.id).length,combatShelves:combat,quietShelves:p.length-combat,checkpoints:c.length,maxCheckpointSpacing,fullSpeedTravelSeconds:Math.round((a.xEnd-a.xStart)/650),estimatedFirstClearMinutes:'4–7 (unverified; includes combat, climbs and optional detours)'};
 });
 reports.push({mission:mission+1,name:l.name,width:l.width,challenge:{maxJumpOnly,maxCombo,hardest,meanCombat:+(challenge.reduce((n,c)=>n+c.combat,0)/challenge.length).toFixed(2)},arena:{width:l.boss.arena.w,shelves:l.platforms.filter(p=>p.routeRole==='arena'&&!p.lock&&p.id!==`m${mission}-arena-floor`).length,locks:l.platforms.filter(p=>p.lock).length},reachableMainShelves:seen.size,mainShelves:main.length,simulatedDirectedEdges:[...graph.values()].reduce((n,v)=>n+v.length,0),fullHoldFastApproaches:tight.length,optionalSignals:l.collectibles.length,highRoads:l.platforms.filter(p=>p.id.endsWith('-high-a')).length,lowRoads:l.platforms.filter(p=>p.id.endsWith('-low')).length,springs:l.platforms.filter(p=>p.kind==='spring').length,movingMainShelves:main.filter(p=>p.moving).length,counterBelts:main.filter(p=>p.kind==='conveyor'&&(p.drift??90)<0).length,windLanes:l.hazards.filter(h=>h.type==='wind').length,islands:main.filter(p=>p.id.endsWith('-island')).length,cages:l.barriers.length,requiredInversions:l.gravityGates.filter(g=>g.required).length,catchFloors:l.platforms.filter(p=>p.id.endsWith('-salvage')).length,ambushes:{behind:l.enemies.filter(e=>e.ambush==='behind').length,above:l.enemies.filter(e=>e.ambush==='above').length,under:l.enemies.filter(e=>e.ambush==='under').length,mirror:l.enemies.filter(e=>e.ambush==='mirror').length},areas});
}
const report={physics:{hz:120,bodyHeight:90,landingHorizontalClearance:70,speed:SPEED,gravity:G,jumpVelocity:-JUMP,heldGravityFactor:.48,holdWindow:.32,releaseVelocityFactor:.45,airAcceleration:2400},reports,failures};
writeFileSync(new URL('./audit-results.json',import.meta.url),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
if(failures.length)process.exitCode=1;
