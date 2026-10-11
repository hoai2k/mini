// Regression checks for effects, movable group videos and live game feedback.
// chat/publish.sh local/pages/chat && node chat/test/chat-fixes.mjs
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { serve, launch } from './lib.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
await mkdir(`${root}local/chat-shots`, { recursive: true });
const relayDir = `${root}multiplayer/server`;
const relay = spawn(process.execPath, [`${relayDir}/node_modules/wrangler/bin/wrangler.js`, 'dev', '--port', '8789', '--ip', '127.0.0.1', '--persist-to', '.wrangler/chat-fixes-state'], {
  cwd: relayDir, stdio: 'ignore', detached: true, env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
});
const stop = () => { try { process.kill(-relay.pid, 'SIGTERM'); } catch {} };
process.on('exit', stop);
for (let i = 0; ; i++) {
  try { if ((await fetch('http://127.0.0.1:8789/')).ok) break; } catch {}
  assert.ok(i < 120, 'relay starts');
  await new Promise(r => setTimeout(r, 500));
}
const server = await serve(root);
const browser = await launch();
const errors = [];
const watch = page => page.on('pageerror', e => errors.push(e.message));
try {
  const people = [];
  for (const name of ['Ana', 'Bo', 'Cy']) {
    const context = await browser.newContext({ viewport: { width: 900, height: 640 }, permissions: ['camera', 'microphone'] });
    const page = await context.newPage(); watch(page);
    await page.goto(`${server.url}/local/pages/chat/?rooms=http://127.0.0.1:8789`);
    await page.fill('#name-input', name); await page.click('#start-btn');
    await page.waitForFunction(() => window.__chat.games?.games.has('bowling'));
    people.push(page);
  }
  const [a, b] = people;
  await a.waitForFunction(() => window.__chat.tiles.size === 3);
  await a.waitForTimeout(400);
  const geometry = () => a.evaluate(() => [...document.querySelectorAll('#stage .tile')].map(e => {
    const r = e.getBoundingClientRect();
    return { id: e.dataset.id, pip: e.classList.contains('pip'), x: r.x, y: r.y, w: r.width, h: r.height };
  }));
  let tiles = await geometry();
  assert.equal(tiles.filter(t => t.pip).length, 2);
  assert.equal(tiles.find(t => !t.pip).w, 900);
  const floats = tiles.filter(t => t.pip);
  const first = floats[0];
  await a.mouse.move(first.x + first.w / 2, first.y + first.h / 2);
  await a.mouse.down(); await a.mouse.move(first.x + first.w / 2 + (first.x > 450 ? -100 : 100), first.y + first.h / 2 + 100, { steps: 8 }); await a.mouse.up();
  await a.waitForTimeout(300);
  tiles = await geometry();
  assert.ok(Math.abs(tiles.find(t => t.id === first.id).x - first.x) > 50);
  assert.equal(tiles.find(t => t.id === floats[1].id).x, floats[1].x);
  const newPrimary = floats[1].id;
  await a.locator(`.tile[data-id="${newPrimary}"]`).click();
  assert.equal((await geometry()).find(t => !t.pip).id, newPrimary);
  await a.screenshot({ path: `${root}local/chat-shots/group-floating.png` });
  await a.setViewportSize({ width: 390, height: 844 });
  await a.waitForTimeout(350);
  for (const tile of await geometry()) if (tile.pip) assert.ok(tile.x >= 0 && tile.x + tile.w <= 391 && tile.y + tile.h <= 844);
  console.log('ok group views: primary selection, independent drag, phone resize');

  for (const [kind, fx] of [['effects', 'swirl'], ['accessories', 'crown'], ['backgrounds', 'space']]) {
    await a.evaluate(([kind, fx]) => { window.__chat.toggleTray(kind, true); window.__chat.selectEffect(fx); }, [kind, fx]);
    await a.click(`#btn-${kind}`);
    await a.waitForTimeout(650);
    assert.equal(await a.evaluate(() => window.__chat.studio.effect), null);
    assert.equal(await a.evaluate(() => window.__chat.net.presence.fx), null);
  }
  console.log('ok deselecting all three categories removes the effect and presence');
  await b.evaluate(() => window.__chat.selectEffect('crown'));
  const copyPrimary = await b.evaluate(() => window.__chat.me.id);
  await a.locator(`.tile[data-id="${copyPrimary}"]`).click();
  await a.waitForFunction(() => [...document.querySelectorAll('.copy-effect,#grab-fx')].some(e => !e.hidden && e.dataset.fx === 'crown'));
  await a.locator('.copy-effect[data-fx="crown"]:visible,#grab-fx[data-fx="crown"]:visible').click();
  assert.equal(await a.evaluate(() => window.__chat.studio.effect.id), 'crown');
  await a.evaluate(() => window.__chat.games.open('burger'));
  await a.evaluate(() => window.__chat.selectEffect('swirl'));
  assert.equal(await a.evaluate(() => window.__chat.studio.effect), null);
  assert.equal(await a.evaluate(() => window.__chat.net.presence.fx), null);
  assert.equal(await a.locator('.copy-effect:visible,#grab-fx:visible').count(), 0);
  await a.evaluate(() => window.__chat.games.close());
  assert.equal(await a.evaluate(() => window.__chat.studio.effect), null);
  console.log('ok labelled friend-effect copy works in a group; effects stay off during games');

  const burger = await browser.newPage({ viewport: { width: 1500, height: 800 } }); watch(burger);
  await burger.goto(`${server.url}/chat/test/game.html?game=burger&n=3&expr=0&h=650`);
  await burger.waitForFunction(() => Array.isArray(window.seats) && window.seats.length === 3 && window.seats.every(s => s.gh.current?.api.players().length === 3));
  await burger.waitForFunction(() => window.seats[0].gh.current.api.state().burger?.falling.length > 0);
  for (let i = 0; i < 100; i++) {
    await burger.evaluate(() => {
      const s = window.seats[0], f = s.gh.current.api.state().burger?.falling.find(f => f.kind !== 'junk');
      if (!f) return;
      const c = s.el.querySelector('.game-root > canvas'), r = c.getBoundingClientRect();
      c.dispatchEvent(new PointerEvent('pointermove', { clientX: r.left + f.x * r.width, pointerType: 'mouse' }));
    });
    await burger.waitForTimeout(100);
    if (await burger.evaluate(() => window.seats[0].gh.current.api.state().burger.layers.length > 0)) break;
  }
  await burger.waitForFunction(() => window.seats[0].gh.current.api.state().burger.layers.length > 0);
  assert.equal(await burger.locator('.seat:nth-child(2) .burger-opponent').count(), 2);
  const score = await burger.evaluate(() => window.seats[0].gh.current.api.state().score);
  await burger.waitForFunction(score => document.querySelector('.seat:nth-child(2) .burger-opponent[data-player="client1"]').textContent.includes(String(score)), score);
  await burger.screenshot({ path: `${root}local/chat-shots/burger-opponents.png` });
  console.log('ok live opponent kitchens show real catches, ingredient layers and scores');

  const bowling = await browser.newPage({ viewport: { width: 1000, height: 800 } }); watch(bowling);
  await bowling.goto(`${server.url}/chat/test/game.html?game=bowling&n=2&expr=0&h=650`);
  await bowling.waitForFunction(() => Array.isArray(window.seats) && window.seats.length === 2 && window.seats.every(s => s.gh.current?.api.players().length === 2));
  await bowling.waitForFunction(() => Date.now() >= window.seats[0].gh.current.api.shared().readyAt);
  await bowling.evaluate(() => {
    window.transitions = [];
    const api = window.seats[0].gh.current.api, original = api.setShared;
    api.setShared = s => { window.transitions.push({ t: Date.now(), phase: s.phase, turn: s.turn, pins: s.pinsUp }); original(s); };
  });
  for (let ball = 0; ball < 2; ball++) {
    await bowling.waitForFunction(() => { const s = window.seats[0].gh.current.api.shared(); return s.phase === 'aim' && s.turn === 'client1'; });
    await bowling.waitForTimeout(300);
    await bowling.evaluate(() => window.seats[0].pad({ pressed: [true] }));
    await bowling.waitForTimeout(180);
    await bowling.evaluate(() => window.seats[0].pad({ pressed: [] }));
    await bowling.waitForFunction(() => window.seats[0].gh.current.api.shared().phase === 'settle', null, { timeout: 20000 });
    const settled = await bowling.evaluate(() => window.seats[0].gh.current.api.shared());
    assert.equal(settled.turn, 'client1');
    await bowling.waitForTimeout(750);
    assert.equal(await bowling.evaluate(() => window.seats[0].gh.current.api.shared().phase), 'settle');
    await bowling.screenshot({ path: `${root}local/chat-shots/bowling-fallen-${ball + 1}.png` });
    await bowling.waitForFunction(() => window.seats[0].gh.current.api.shared().phase === 'aim');
  }
  const timeline = await bowling.evaluate(() => window.transitions);
  for (let i = 0; i < timeline.length; i++) if (timeline[i].phase === 'settle') assert.ok(timeline[i + 1].t - timeline[i].t >= 1500);
  assert.equal(await bowling.evaluate(() => window.seats[0].gh.current.api.shared().turn), 'client2');
  console.log('ok bowling holds both rolls for 1.5 seconds before resetting and changing player');
  assert.deepEqual(errors, []);
} finally {
  await browser.close(); server.close(); stop();
}
