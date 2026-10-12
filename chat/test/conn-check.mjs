// Connection indicators: two browsers against a local relay.
// 1. A normal call: the tile overlay clears, the status pill turns green,
//    signal bars appear, and the connection panel shows the route.
// 2. Calls that can't connect (?rtcdrop=1 withholds ICE candidates;
//    ?rtcfast=0.2 speeds the watchdog up): the tiles go from "Connecting" to
//    "Still connecting" to "Can't connect" with a Try again button, and the
//    pill turns red.
//   chat/publish.sh local/pages/chat && node chat/test/conn-check.mjs
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { serve, launch } from './lib.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const outDir = `${root}local/chat-shots/`;
await mkdir(outDir, { recursive: true });
const relayDir = `${root}multiplayer/server`;
const relay = spawn(process.execPath, [`${relayDir}/node_modules/wrangler/bin/wrangler.js`, 'dev', '--local', '--port', '8787', '--ip', '127.0.0.1', '--persist-to', '.wrangler/chat-test-state'], {
  cwd: relayDir, stdio: 'ignore', detached: true, env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
});
const stopRelay = () => { try { process.kill(-relay.pid, 'SIGTERM'); } catch {} };
process.on('exit', stopRelay);
for (let i = 0; ; i++) {
  try { if ((await fetch('http://127.0.0.1:8787/')).ok) break; } catch {}
  if (i > 120) throw new Error('relay did not start');
  await new Promise(r => setTimeout(r, 500));
}
const server = await serve(`${root}local/pages`);
const browser = await launch();
const failures = [];
const check = (ok, what) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
  if (!ok) failures.push(what);
};
const until = async (page, fn, arg, ms = 20000) => {
  try { await page.waitForFunction(fn, arg, { timeout: ms }); return true; } catch { return false; }
};
async function person(name, query = '') {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, permissions: ['camera', 'microphone'] });
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', e => page.errors.push(e.message));
  await page.goto(`${server.url}/chat/${query}`);
  await page.fill('#name-input', name);
  await page.click('#start-btn');
  return page;
}
const pill = page => page.evaluate(() => document.querySelector('#status').dataset.level);
const overlay = page => page.evaluate(() => {
  const o = document.querySelector('.tile:not(.self) .call-status');
  return o && !o.hidden ? o.dataset.phase : 'hidden';
});

try {
  // 1. A call that works.
  const a = await person('Ana');
  await a.waitForTimeout(1200);
  const b = await person('Bo');
  check(await until(a, () => document.querySelector('#status').dataset.level === 'ok' && window.__chat.net.peers.size === 1), 'pill turns green once the call connects');
  check(await overlay(a) === 'hidden', 'no overlay on a connected tile');
  check(await until(a, () => !!document.querySelector('.tile:not(.self) .flag.bars.q3, .tile:not(.self) .flag.bars.q2'), null, 10000), 'signal bars show on the tile');
  await a.click('#status');
  check(await until(a, () => /Direct|relay server/.test(document.querySelector('#connection-body').textContent), null, 8000), 'connection panel shows the route');
  await a.screenshot({ path: `${outDir}conn-ok-panel.png` });
  await a.click('#connection .btn[value="close"]');
  await a.context().close();
  await b.context().close();
  await new Promise(r => setTimeout(r, 4500));

  // 2. Calls that can't connect.
  const c = await person('Cy', '?rtcdrop=1&rtcfast=0.2');
  await c.waitForTimeout(1200);
  const d = await person('Di', '?rtcdrop=1&rtcfast=0.2');
  check(await until(c, () => window.__chat.net.peers.size === 1), 'both are in the room');
  const seen = new Set();
  for (let i = 0; i < 40; i++) {
    seen.add(await overlay(c));
    if (seen.has('failed')) break;
    await c.waitForTimeout(250);
  }
  check(seen.has('connecting') || seen.has('retrying'), `tile shows connecting / retrying first (${[...seen].join(', ')})`);
  check(seen.has('failed'), 'tile ends at "can\'t connect"');
  check(await pill(c) === 'bad', 'pill turns red');
  check(await c.evaluate(() => !!document.querySelector('.tile:not(.self) .call-status .btn')), 'a Try again button is offered');
  await c.screenshot({ path: `${outDir}conn-failed.png` });
  await c.click('.tile:not(.self) .call-status .btn');
  check(await until(c, () => ['connecting', 'retrying'].includes(document.querySelector('.tile:not(.self) .call-status').dataset.phase), null, 3000), 'Try again starts over');
  check(!c.errors.length && !d.errors.length, `no page errors ${[...c.errors, ...d.errors].join(' | ')}`);
} finally {
  await browser.close();
  server.close();
  stopRelay();
}
if (failures.length) {
  console.log(`${failures.length} failed`);
  process.exit(1);
}
console.log('all connection checks passed');
process.exit(0);
