// End-to-end check of the published app: starts the relay locally
// (wrangler dev on :8787, which pages on localhost use), opens two browsers
// with fake cameras, joins both, and checks the video call, a bubble flying
// from one to the other, text chat, and a game invite being joined.
//   chat/publish.sh local/pages/chat && node chat/test/call-check.mjs
// Needs `npm ci` in multiplayer/server. Screenshots go to local/chat-shots/.
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { serve, launch } from './lib.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const outDir = `${root}local/chat-shots/`;
await mkdir(outDir, { recursive: true });

const relayDir = `${root}multiplayer/server`;
const relay = spawn(process.execPath, [`${relayDir}/node_modules/wrangler/bin/wrangler.js`, 'dev', '--port', '8787', '--ip', '127.0.0.1', '--persist-to', '.wrangler/chat-test-state'], {
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

async function person(name) {
  const ctx = await browser.newContext({ viewport: { width: 900, height: 640 }, permissions: ['camera', 'microphone'] });
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', e => page.errors.push(e.message));
  page.on('console', m => {
    if (m.type() === 'error' && !/Failed to load resource|mediapipe|vision_wasm|WebGL|GPU|TensorFlow Lite/i.test(m.text())) page.errors.push(m.text());
  });
  await page.goto(`${server.url}/chat/`);
  await page.fill('#name-input', name);
  await page.click('#start-btn');
  return page;
}

const until = async (page, fn, arg, ms = 20000) => {
  try {
    await page.waitForFunction(fn, arg, { timeout: ms });
    return true;
  } catch {
    return false;
  }
};

try {
  const a = await person('Ana');
  await a.waitForTimeout(1500);
  const b = await person('Bo');

  check(await until(a, () => window.__chat.net?.peers.size === 1), 'Ana sees Bo in the room');
  check(await until(b, () => window.__chat.net?.peers.size === 1), 'Bo sees Ana in the room');
  const videoUp = () => [...document.querySelectorAll('.tile video')].some(v => v.videoWidth > 0 && v.currentTime > 0);
  check(await until(a, videoUp), 'Ana receives Bo’s video');
  check(await until(b, videoUp), 'Bo receives Ana’s video');
  check(await b.evaluate(() => document.querySelector('#stage').dataset.count === '2'), 'two-person layout');

  // Bubble Blow, driven by the "hold" fallback since the fake camera has no face.
  await a.evaluate(() => window.__chat.selectEffect('bubble'));
  await a.evaluate(() => { window.__chat.studio.input.held = true; });
  await a.waitForTimeout(1800);
  await a.screenshot({ path: `${outDir}call-ana-blowing.png` });
  await a.evaluate(() => { window.__chat.studio.input.held = false; });
  await b.waitForTimeout(700);
  await b.screenshot({ path: `${outDir}call-bo-bubble-flying.png` });
  check(await until(b, () => [...document.querySelectorAll('.toast')].some(t => /popped a bubble on you/.test(t.textContent)), null, 6000), 'Ana’s bubble pops on Bo');

  // Text chat.
  await b.click('#btn-chat');
  await b.fill('#chat-input', 'hello from Bo');
  await b.press('#chat-input', 'Enter');
  check(await until(a, () => document.querySelector('#chat-log')?.textContent.includes('hello from Bo')), 'chat message arrives');

  // A game: Ana starts Hoops, Bo joins from the invite.
  await a.click('#btn-games');
  await a.click('.game-card:has-text("Hoops")');
  check(await until(b, () => !!document.querySelector('.invite button.btn.aqua')), 'Bo gets an invite');
  await b.click('.invite button.btn.aqua');
  check(await until(b, () => window.__chat.games.current?.api.players().length === 2), 'Bo joins Ana’s Hoops session');
  check(await until(a, () => window.__chat.games.current?.api.players().length === 2), 'Ana sees Bo in the session');
  await a.waitForTimeout(800);
  await a.screenshot({ path: `${outDir}call-ana-hoops.png` });
  await b.screenshot({ path: `${outDir}call-bo-hoops.png` });

  // Bo leaves; Ana is alone again.
  await b.click('#btn-leave');
  await b.close();
  check(await until(a, () => window.__chat.net.peers.size === 0, null, 15000), 'Ana sees Bo leave');

  check(!a.errors.length, `no page errors for Ana ${a.errors.join(' | ')}`);
  check(!b.errors.length, `no page errors for Bo ${b.errors.join(' | ')}`);
} finally {
  await browser.close();
  server.close();
  stopRelay();
}
if (failures.length) {
  console.log(`${failures.length} failed`);
  process.exit(1);
}
console.log('all call checks passed');
process.exit(0);
