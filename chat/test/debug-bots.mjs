// Real bot runtimes, real game hosts, and an in-memory room instead of the
// public relay. Exercises the same published files that users load.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { serve, launch } from './lib.mjs';
const root = fileURLToPath(new URL('../../', import.meta.url));
const server = await serve(root);
const browser = await launch();
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 800 } });
  page.on('pageerror', e => errors.push(e.message));
  const fake = (await readFile(`${root}chat/test/fake-rooms.js`, 'utf8')).replace('export function', 'function');
  await page.route('**/mini-rooms.js', route => route.fulfill({ contentType: 'text/javascript', body: `${fake}\nwindow.MiniRooms = createFakeRooms({latency:10}); MiniRooms.defaultServer = () => location.origin;` }));
  await page.goto(`${server.url}/local/pages/chat/`);
  assert.equal(await page.locator('#set-motion').count(), 0);
  await page.fill('#name-input', 'Tester');
  await page.click('#start-btn');
  await page.waitForFunction(() => window.__chat.games?.games.size === 21);
  await page.locator('#call [data-open="settings"]').click();
  assert.equal(await page.locator('#debug-bot-minus').isDisabled(), true);
  for (let i = 0; i < 4; i++) await page.click('#debug-bot-plus');
  assert.equal(await page.locator('#debug-bot-plus').isDisabled(), true);
  await page.click('#debug-bot-minus'); await page.click('#debug-bot-minus');
  assert.equal(await page.evaluate(() => window.__chat.net.peers.size), 0, 'defer joins until close');
  await page.locator('#settings button[value="close"]').click();
  await page.waitForFunction(() => window.__chat.debugBots.bots.size === 2 && [...window.__chat.debugBots.bots.values()].every(b => b.runtime) && window.__chat.tiles.size === 3);
  await page.waitForFunction(() => [...window.__chat.tiles.values()].filter(t => t.id !== window.__chat.me.id).every(t => t.media.videoWidth > 0));
  const ids = await page.evaluate(() => [...window.__chat.debugBots.bots.keys()]);
  await page.waitForFunction(() => [...document.querySelectorAll('.copy-effect,#grab-fx')].some(b => !b.hidden && b.dataset.fx));
  await page.locator('.copy-effect:visible,#grab-fx:visible').first().click();
  assert.ok(await page.evaluate(() => window.__chat.studio.effect?.id));
  await page.evaluate(id => window.__chat.net.sendTo(id, 'fxshare', { fx: 'swirl' }), ids[0]);
  await page.waitForFunction(id => window.__chat.debugBots.bots.get(id).runtime.studio.effect?.id === 'swirl', ids[0]);
  await page.evaluate(() => window.__chat.net.send('fxshare', {fx:'space'}));
  await page.waitForFunction(() => [...window.__chat.debugBots.bots.values()].every(b => b.runtime.studio.effect?.id === 'space'));
  await page.screenshot({ path: `${root}local/chat-shots/debug-bots.png` });
  console.log('ok Settings close adds two real bot cameras, copy action and direct/broadcast effect offers');
  // Check every game can run with the bots and its actual rookie inputs.
  const games = process.env.DEBUG_BOT_GAME_IDS?.split(',') || await page.evaluate(() => [...window.__chat.games.games.keys()]);
  for (const game of games) {
    await page.evaluate(game => window.__chat.games.open(game), game);
    await page.waitForFunction(game => [...window.__chat.debugBots.bots.values()].every(b => b.runtime.host.current?.game.id === game && b.runtime.host.current.api.players().length === 3), game);
    await page.waitForTimeout(2600);
    assert.equal(await page.evaluate(() => [...window.__chat.debugBots.bots.values()].every(b => b.runtime.studio.effect === null)), true, `${game}: effects off`);
    assert.equal(await page.evaluate(() => {
      const c = [...window.__chat.debugBots.bots.values()][0].runtime.host.current;
      const key = `chat.game.${c.game.id}.best`, before = localStorage.getItem(key);
      c.api.store.set('best', 9999);
      return c.api.store.get('best') === 9999 && localStorage.getItem(key) === before;
    }), true, `${game}: bot records stay isolated`);
    if (game === 'bowling') {
      await page.evaluate(() => {
        const api = window.__chat.games.current.api, s = api.shared();
        api.setShared({ ...s, turn: [...window.__chat.debugBots.bots.keys()][0], phase: 'aim', readyAt: Date.now() });
      });
      await page.waitForFunction(() => ['roll', 'settle'].includes(window.__chat.games.current.api.shared()?.phase), null, {timeout:15000});
    }
    if (game === 'burger') await page.waitForFunction(() => [...window.__chat.debugBots.bots.values()].every(b => b.runtime.host.current.api.state().burger?.falling.length > 0));
    await page.evaluate(() => window.__chat.games.close());
    await page.waitForFunction(() => [...window.__chat.debugBots.bots.values()].every(b => !b.runtime.host.current && b.runtime.studio.effect?.id === 'space'));
    assert.deepEqual(errors, [], `${game}: no runtime errors`);
    console.log(`ok ${game}: bots join, exercise rookie controls, and leave with the human`);
  }

  // Confirm a bot actually drops a Connect Four piece on its turn.
  await page.evaluate(() => window.__chat.games.open('connect4'));
  await page.waitForFunction(() => window.__chat.games.current.api.players().length === 3);
  await page.waitForTimeout(1000);
  await page.evaluate(() => window.__chat.games.current.instance.onPad({ a: true, x: 0 }));
  await page.waitForFunction(() => {
    const s = window.__chat.games.current.api.shared();
    return typeof s?.board === 'string' && s.board.split('').filter(c => c !== '.').length >= 2;
  }, null, {timeout:15000});
  console.log('ok rookie takes an actual turn in Connect Four');
  await page.evaluate(() => window.__chat.games.close());
  await page.locator('#call [data-open="settings"]').click();
  await page.click('#debug-bot-minus'); await page.click('#debug-bot-minus');
  assert.equal(await page.evaluate(() => window.__chat.debugBots.bots.size), 2, 'defer removal until close');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => window.__chat.debugBots.bots.size === 0 && document.querySelectorAll('.debug-bot-frame').length === 0 && window.__chat.net.peers.size === 0, null, {timeout:15000});
  await page.reload();
  await page.locator('#title [data-open="settings"]').click();
  assert.equal(await page.locator('#debug-bot-count').textContent(), '0');
  console.log('ok Escape applies removals, disposes windows and connections; count resets on reload');
  assert.deepEqual(errors, []);
} finally {
  await browser.close(); server.close();
}
