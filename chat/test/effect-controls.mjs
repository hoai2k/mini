// Bottom backings and category toggle regressions on the published app.
// chat/publish.sh local/pages/chat && node chat/test/effect-controls.mjs
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { serve, launch } from './lib.mjs';
const root = fileURLToPath(new URL('../../', import.meta.url));
await mkdir(`${root}local/chat-shots`, {recursive:true});
const server = await serve(root), browser = await launch();
const errors = [];
try {
  const fake = (await readFile(`${root}chat/test/fake-rooms.js`, 'utf8')).replace('export function', 'function');
  const page = await browser.newPage({viewport:{width:390,height:844},hasTouch:true});
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/mini-rooms.js', r => r.fulfill({contentType:'text/javascript',body:`${fake}\nwindow.MiniRooms=createFakeRooms({latency:10}); MiniRooms.defaultServer=()=>location.origin;`}));
  await page.goto(`${server.url}/local/pages/chat/`);
  await page.fill('#name-input','Ana'); await page.click('#start-btn');
  await page.waitForFunction(()=>window.__chat.games?.games.size===21 && document.querySelectorAll('#effect-list .fx-item').length>50);
  const fx = () => page.evaluate(()=>window.__chat.studio.effect?.id ?? null);
  for (const [kind,id] of [['effects','swirl'],['accessories','crown'],['backgrounds','space']]) {
    await page.evaluate(([k,id])=>{window.__chat.toggleTray(k,true);window.__chat.selectEffect(id);},[kind,id]);
    await page.waitForTimeout(700);
    await page.click(`#btn-${kind}`); await page.waitForTimeout(700);
    assert.equal(await fx(),null,`${kind}: off removes rendering`);
    assert.equal(await page.evaluate(()=>window.__chat.net.presence.fx),null,`${kind}: off removes presence`);
    await page.click(`#btn-${kind}`); await page.waitForTimeout(850);
    assert.equal(await fx(),id,`${kind}: on restores selection after scroll settles`);
    assert.equal(await page.evaluate(()=>window.__chat.net.presence.fx),id);
    // Fast repeated toggles must not let an old scroll callback remove it.
    await page.click(`#btn-${kind}`); await page.click(`#btn-${kind}`);
    await page.waitForTimeout(850); assert.equal(await fx(),id);
  }
  for(const [k,id] of [['effects','swirl'],['accessories','crown'],['backgrounds','space']]) {
    await page.evaluate(k=>window.__chat.toggleTray(k,true),k);
    await page.waitForTimeout(850);assert.equal(await fx(),id,'independent category memory');
  }
  // Explicit None is a choice, and should not resurrect the previous effect.
  await page.evaluate(()=>{window.__chat.selectEffect(null);window.__chat.toggleTray(null);window.__chat.toggleTray('backgrounds',true);});
  await page.waitForTimeout(850);assert.equal(await fx(),null);
  await page.evaluate(()=>{window.__chat.toggleTray('accessories',true);window.__chat.selectEffect('crown');window.__chat.games.open('burger');window.__chat.toggleTray('accessories',true);});
  await page.waitForTimeout(850);assert.equal(await fx(),null,'remembered effects never activate during games');
  await page.evaluate(()=>window.__chat.games.close());
  assert.equal(await fx(),null,'game close does not restore automatically');
  await page.evaluate(()=>{window.__chat.toggleTray(null);window.__chat.toggleTray('accessories',true);});
  await page.waitForTimeout(850);assert.equal(await fx(),'crown','category can restore after leaving a game');
  console.log('ok three categories: off/on, rapid toggles, independent choices, explicit None and game protection');
  await page.evaluate(()=>{window.__chat.toggleTray(null);window.__chat.toggleTray('accessories',true);});
  await page.locator('#effect-list').hover();
  await page.mouse.wheel(220,0);
  await page.waitForTimeout(1200);
  const centered=await page.evaluate(()=>{
    const list=document.querySelector('#effect-list'),r=list.getBoundingClientRect(),mid=r.left+r.width/2;
    const items=[...list.children].filter(b=>!b.hidden);
    items.sort((a,b)=>{const dist=el=>{const r=el.getBoundingClientRect();return Math.abs(r.left+r.width/2-mid);};return dist(a)-dist(b);});
    return items[0].dataset.fx || null;
  });
  assert.equal(await fx(),centered,'a user scroll can change the effect immediately after restoration');

  for(const theme of ['kid','teen','art','classic']) for(const width of [320,390,900]) {
    await page.setViewportSize({width,height:844});
    await page.evaluate(theme=>{
      const s=document.querySelector('#set-theme');s.value=theme;s.dispatchEvent(new Event('change'));
      document.documentElement.style.setProperty('--safe-b','24px');
      window.__chat.toggleTray('backgrounds',true);window.__chat.selectEffect('underwater');
      // Use a realistic long title to prove that wrapping grows the row safely.
      document.querySelector('#info-name').textContent='🌊 Underwater World with Fish';
    },theme);
    await page.waitForTimeout(850);
    const layout=await page.evaluate(()=>{
      const rect=id=>document.querySelector(id).getBoundingClientRect().toJSON();
      return {row:rect('#controls'),name:rect('#info-name'),actions:rect('#info-actions'),list:rect('#effect-list'),panel:rect('#tray-effects'),nameOverflow:document.querySelector('#info-name').scrollWidth>document.querySelector('#info-name').clientWidth};
    });
    assert.ok(layout.name.bottom<=layout.actions.top,`${theme}/${width}: title above actions`);
    assert.equal(layout.nameOverflow,false,`${theme}/${width}: full name fits`);
    assert.ok(layout.list.bottom<=layout.row.top,`${theme}/${width}: strip clears wrapped row`);
    assert.equal(Math.round(layout.panel.bottom),844,`${theme}/${width}: gradient reaches screen bottom`);
    await page.evaluate(()=>document.querySelector('#tray-effects .sheet-grip').click());
    await page.waitForTimeout(350);
    assert.equal(await page.evaluate(()=>Math.round(document.querySelector('#tray-effects').getBoundingClientRect().bottom)),844,'grid backing reaches bottom');
    await page.evaluate(()=>{const list=document.querySelector('#effect-list');list.scrollTop=list.scrollHeight;});
    const last=await page.evaluate(()=>{
      const list=document.querySelector('#effect-list'),visible=[...list.children].filter(b=>!b.hidden);
      return {label:visible.at(-1).querySelector('.fx-label').getBoundingClientRect().bottom,bottom:list.getBoundingClientRect().bottom};
    });
    assert.ok(last.label<=last.bottom,`${theme}/${width}: final grid label is not cut off`);
    if(width===390&&theme==='kid') await page.screenshot({path:`${root}local/chat-shots/effect-controls-grid.png`});
    await page.evaluate(()=>document.querySelector('#tray-effects .sheet-grip').click());
    await page.waitForTimeout(350);
    if(width===390&&theme==='kid') await page.screenshot({path:`${root}local/chat-shots/effect-controls-strip.png`});
    await page.evaluate(()=>window.__chat.toggleTray(null));
    const shade=await page.locator('#bottom-shade').boundingBox();
    assert.ok(shade && Math.round(shade.y+shade.height)===844,'closed-strip row gradient reaches bottom');
  }
  console.log('ok all themes at phone/desktop widths: full title, row clearance, grid labels and bottom backings');
  for (const [kind, panel, content] of [['games','#tray-games','.sheet-body'],['chat','#chat-box','.chat-form']]) {
    await page.evaluate(kind=>window.__chat.toggleTray(kind,true),kind);
    await page.waitForTimeout(350);
    const bounds=await page.evaluate(([panel,content])=>({
      bottom:document.querySelector(panel).getBoundingClientRect().bottom,
      content:document.querySelector(`${panel} ${content}`).getBoundingClientRect().bottom,
      row:document.querySelector('#controls').getBoundingClientRect().top,
    }),[panel,content]);
    assert.equal(Math.round(bounds.bottom),844,`${kind}: panel backing reaches bottom`);
    assert.ok(bounds.content<=bounds.row,`${kind}: content stays above controls`);
  }
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>{window.__chat.toggleTray('effects',true);window.__chat.selectEffect('swirl');});
  await page.waitForTimeout(850);
  const up=await page.locator('#fx-votes [data-value="1"]').boundingBox();
  await page.mouse.click(up.x+up.width/2,up.y-5);
  assert.equal(await page.evaluate(()=>window.__chat.votes.mine('fx-swirl')),1,'expanded thumb target works above its visible pill');
  await page.evaluate(()=>window.__chat.setUiLevel(1));await page.waitForTimeout(400);
  assert.equal(await page.evaluate(()=>Math.round(document.querySelector('#tray-effects').getBoundingClientRect().bottom)),844);
  await page.evaluate(()=>window.__chat.setUiLevel(0));await page.waitForTimeout(400);
  assert.equal(await page.locator('#bottom-shade').isVisible(),false);
  assert.deepEqual(errors,[]);
  console.log('ok expanded thumb touch area and tucked UI levels');
} finally {await browser.close();server.close();}
