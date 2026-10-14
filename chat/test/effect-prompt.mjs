import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { serve, launch } from './lib.mjs';
import { GAME_IDS } from '../games/index.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const server = await serve(root);
const browser = await launch();
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('pageerror', e => errors.push(e.message));
  const fake = (await readFile(`${root}chat/test/fake-rooms.js`, 'utf8')).replace('export function', 'function');
  await page.route('**/mini-rooms.js', route => route.fulfill({ contentType: 'text/javascript', body: `${fake}\nwindow.MiniRooms = createFakeRooms({latency:10}); MiniRooms.defaultServer = () => location.origin;` }));
  await page.goto(`${server.url}/local/pages/chat/`);
  await page.fill('#name-input', 'Tester');
  await page.click('#start-btn');
  await page.waitForFunction(n => window.__chat.games?.games.size === n, GAME_IDS.length);
  await page.evaluate(() => window.__chat.debugBots.setCount(2));
  await page.waitForFunction(() => window.__chat.tiles.size === 3 && [...window.__chat.debugBots.bots.values()].every(b => b.runtime));
  const ids = await page.evaluate(() => [...window.__chat.debugBots.bots.keys()]);
  const tile = id => page.locator(`.tile[data-id="${id}"]`);
  const prompt = page.locator('#effect-prompt');
  const copy = page.locator('#grab-fx');
  await copy.waitFor({ state: 'visible' });
  assert.equal(await page.locator('.tile button').count(), 0, 'video tiles contain no action buttons');
  await tile(ids[1]).focus();
  await page.keyboard.press('Enter');
  await page.waitForFunction(id => !document.querySelector(`.tile[data-id="${id}"]`).classList.contains('pip'), ids[1]);
  await page.evaluate(id => window.__chat.net.sendTo(id, 'fxshare', {fx:'swirl'}), ids[1]);
  await page.waitForFunction(() => document.querySelector('#grab-fx').dataset.fx === 'swirl');
  assert.match(await copy.textContent(), /Copy$/);
  assert.equal(await prompt.evaluate(el => el.classList.contains('shared')), false);
  await page.evaluate(id => window.__chat.debugBots.bots.get(id).runtime.net.sendTo(window.__chat.me.id, 'fxshare', {fx:'crown'}), ids[0]);
  await page.waitForFunction(() => document.querySelector('#effect-prompt').classList.contains('shared'));
  assert.match(await copy.textContent(), /Try$/);
  assert.equal(await copy.getAttribute('data-fx'), 'crown');
  assert.equal(await prompt.count(), 1, 'offers replace the passive prompt');
  await page.locator('.effect-prompt-dismiss').click();
  assert.equal(await copy.getAttribute('data-fx'), 'swirl');
  assert.match(await copy.textContent(), /Copy$/);
  await page.evaluate(id => window.__chat.debugBots.bots.get(id).runtime.net.sendTo(window.__chat.me.id, 'fxshare', {fx:'crown'}), ids[0]);
  await page.waitForFunction(() => document.querySelector('#effect-prompt').classList.contains('shared'));
  await page.waitForFunction(() => !document.querySelector('#effect-prompt').classList.contains('shared'), null, {timeout:18000});
  assert.equal(await copy.getAttribute('data-fx'), 'swirl', 'expiry restores the primary effect');
  await copy.click();
  await page.waitForFunction(() => window.__chat.studio.effect?.id === 'swirl');
  assert.equal(await prompt.isVisible(), false, 'already wearing the primary effect');
  await page.evaluate(id => window.__chat.debugBots.bots.get(id).runtime.net.sendTo(window.__chat.me.id, 'fxshare', {fx:'crown'}), ids[0]);
  await copy.waitFor({state:'visible'});
  await copy.click();
  await page.waitForFunction(() => window.__chat.studio.effect?.id === 'crown');
  assert.equal(await copy.getAttribute('data-fx'), 'swirl', 'copy follows the primary rather than the last offer');
  for (const width of [320, 390]) {
    await page.setViewportSize({width, height:844});
    const box = await prompt.boundingBox();
    assert.ok(box.x >= 0 && box.x + box.width <= width, 'mobile prompt fits the viewport');
    for (const pip of await page.locator('.tile.pip').all()) {
      const small = await pip.boundingBox();
      const apart = box.x + box.width <= small.x || small.x + small.width <= box.x || box.y + box.height <= small.y || small.y + small.height <= box.y;
      assert.ok(apart, 'the copy chip never covers a small video');
    }
  }
  await page.screenshot({path: `${root}local/chat-shots/effect-prompt.png`});
  const self = await page.evaluate(() => window.__chat.me.id);
  await tile(self).focus();
  await page.keyboard.press('Space');
  assert.equal(await prompt.isVisible(), false, 'self as main has no copy action');
  await tile(ids[1]).click();
  await copy.waitFor({state:'visible'});
  await page.evaluate(() => window.__chat.games.open('burger'));
  await page.waitForFunction(() => !!window.__chat.games.current);
  assert.equal(await prompt.isVisible(), false, 'games hide the prompt');
  await page.evaluate(id => window.__chat.debugBots.bots.get(id).runtime.net.sendTo(window.__chat.me.id, 'fxshare', {fx:'crown'}), ids[0]);
  await page.waitForTimeout(100);
  assert.equal(await prompt.isVisible(), false, 'offers remain hidden during games');
  await page.evaluate(() => window.__chat.games.close());
  await page.waitForFunction(() => document.querySelector('#effect-prompt').classList.contains('shared') && !document.querySelector('#effect-prompt').hidden);
  await page.evaluate(() => window.__chat.debugBots.setCount(0));
  await page.waitForFunction(() => window.__chat.net.peers.size === 0);
  assert.equal(await prompt.isVisible(), false, 'departed peers leave no effect prompt');
  assert.deepEqual(errors, []);
  console.log('ok main-only Copy, keyboard promotion, shared replacement/dismissal/acceptance, mobile layout, games and departures');
} finally {
  await browser.close(); server.close();
}
