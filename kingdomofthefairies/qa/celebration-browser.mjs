import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { serve, playwright } from '../../chat/test/lib.mjs';
const out = process.argv[2] || '/tmp/fairies-celebration-review';
await mkdir(out, { recursive: true });
const server = await serve(new URL('../', import.meta.url).pathname);
const { chromium } = await playwright();
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox','--autoplay-policy=no-user-gesture-required'] });
const evidence = [];
try {
 const page = await browser.newPage({viewport:{width:1280,height:720}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  window.audioStarts=[];
  const start=AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start=function(...args){window.audioStarts.push(this.buffer?.duration);if(this.buffer?.duration>6.9&&this.buffer?.duration<7.1){window.victoryRate=this.playbackRate.value;this.addEventListener('ended',()=>window.victoryEnded=true);}return start.apply(this,args);};
 });
 await page.goto(server.url+'/?qa&act=7&scene=3');
 await page.waitForFunction(()=>window.__kingdomOfTheFairies?.assets?.sfx);
 await page.locator('#start').evaluate(b=>b.click());
 await page.waitForFunction(()=>{const q=window.__kingdomOfTheFairies;return q.audio.sfxLoaded()>=Object.values(q.assets.sfx).filter(s=>s.status==='delivered'&&s.file).length;});
 await page.evaluate(async()=>{
  const q=window.__kingdomOfTheFairies;await q.assets.all;
  const mod=await import('/src/acts/act5film.js');window.celebration=mod;
  const st=mod.actBurning.create({from:{scene:3}});st.duel=null;
  st.barrel={x:mod.BARREL.edge,rot:0,fallT:mod.FILM_T.barrelFall-0.001};
  Object.assign(q.S,{act:mod.actBurning,state:st,mode:'play',card:null,curtain:1,curtainTarget:1,paused:false});
 });
 await page.waitForFunction(()=>window.__kingdomOfTheFairies.S.state.phase==='victory');
 await page.waitForFunction(()=>window.audioStarts.some(d=>d>6.9&&d<7.1));
 await page.waitForTimeout(300);
 assert.equal(await page.evaluate(()=>window.__kingdomOfTheFairies.audio.musicLevel()),0);
 assert.equal(await page.evaluate(()=>window.__kingdomOfTheFairies.S.state.phase),'victory');
 await page.locator('#stage').screenshot({path:out+'/victory-hold.png'});
 await page.waitForFunction(()=>window.victoryEnded);
 assert.equal(await page.evaluate(()=>window.victoryRate),1);
 assert.equal(await page.evaluate(()=>window.__kingdomOfTheFairies.S.state.phase),'victory','the real flourish finishes before leaving the cliff');
 await page.evaluate(()=>{const q=window.__kingdomOfTheFairies;q.S.state.phaseT=window.celebration.FILM_T.victory+0.6;});
 await page.waitForTimeout(60);
 await page.locator('#stage').screenshot({path:out+'/victory-fade.png'});
 await page.evaluate(()=>{window.__kingdomOfTheFairies.S.state.phaseT=window.celebration.FILM_T.victory+window.celebration.FILM_T.victoryFade;});
 await page.waitForFunction(()=>window.__kingdomOfTheFairies.S.state.phase==='wedding');
 await page.waitForFunction(()=>window.__kingdomOfTheFairies.audio.nowPlaying()?.id==='period-wedding');
 await page.waitForTimeout(1100);
 assert.equal(await page.evaluate(()=>window.audioStarts.filter(d=>d>6.9&&d<7.1).length),1);
 for(const look of ['original','tinted']){
  await page.evaluate(({look})=>{
   const q=window.__kingdomOfTheFairies;
   const st=window.celebration.actBurning.create({carry:{sleepers:4},from:{scene:4}});
   st.phaseT=2;q.S.state=st;
   q.settings.cast=look;
   // The renderer review below explicitly selects each look as well.
  },{look});
  await page.keyboard.down('Space');await page.waitForTimeout(180);
  const jump=await page.evaluate(()=>{const st=window.__kingdomOfTheFairies.S.state;return {w:{y:st.w.y,on:st.w.on},az:{y:st.az.y,on:st.az.on},wave:st.cheers[0]};});
  assert.equal(jump.w.on,false);assert.equal(jump.az.on,false);assert.ok(Math.abs(jump.w.y-jump.az.y)<0.01);
  await page.locator('#stage').screenshot({path:out+`/wedding-jump-${look}.png`});
  await page.keyboard.up('Space');
  evidence.push({look,...jump});
  await page.waitForTimeout(900);
 }
 await page.evaluate(()=>{const st=window.__kingdomOfTheFairies.S.state;st.w.x=900;});
 await page.waitForFunction(()=>window.__kingdomOfTheFairies.S.state.phase==='apotheosis');
 await page.keyboard.down('ArrowRight');await page.waitForTimeout(1500);await page.keyboard.up('ArrowRight');
 await page.keyboard.down('ArrowLeft');await page.waitForTimeout(1800);await page.keyboard.up('ArrowLeft');
 assert.equal(await page.evaluate(()=>window.__kingdomOfTheFairies.S.state.riseT),null);
 await page.evaluate(()=>{const st=window.__kingdomOfTheFairies.S.state;st.w.x=640;st.w.vx=0;});
 await page.waitForTimeout(350);
 assert.equal(await page.evaluate(()=>window.__kingdomOfTheFairies.S.state.riseT),null);
 await page.locator('#stage').screenshot({path:out+'/jump-into-light-prompt.png'});
 await page.keyboard.press('Space');
 await page.waitForFunction(()=>window.__kingdomOfTheFairies.S.state.riseT!=null);
 await page.waitForFunction(()=>window.__kingdomOfTheFairies.S.state.phase==='finale');
 const phone = await browser.newPage({viewport:{width:844,height:390},isMobile:true,hasTouch:true});
 phone.on('pageerror',e=>errors.push(e.message));
 await phone.goto(server.url+'/?qa&act=7&scene=4');
 await phone.waitForFunction(()=>window.__kingdomOfTheFairies?.assets?.sfx);
 await phone.locator('#start').evaluate(b=>b.click());
 await phone.evaluate(async()=>{
  const q=window.__kingdomOfTheFairies;await q.assets.all;
  const {actBurning}=await import('/src/acts/act5film.js');
  Object.assign(q.S,{act:actBurning,state:actBurning.create({carry:{sleepers:4},from:{scene:4}}),mode:'play',card:null,curtain:1,curtainTarget:1,paused:false});
  q.S.state.phaseT=2;
 });
 await phone.locator('[data-t="a"]').waitFor({state:'visible'});
 await phone.locator('[data-t="a"]').tap();
 await phone.waitForFunction(()=>!window.__kingdomOfTheFairies.S.state.w.on);
 assert.equal(await phone.evaluate(()=>window.__kingdomOfTheFairies.S.state.az.on),false);
 await phone.locator('#stage').screenshot({path:out+'/phone-wedding-jump.png'});
 await phone.close();
 assert.deepEqual(errors,[]);
 await writeFile(out+'/review.json',JSON.stringify(evidence,null,2)+'\n');
 console.log('Victory hold, single real stinger, fade, wedding score, coupled jumping, guest waves and deliberate final jump pass');
} finally {await browser.close();await server.close();}
