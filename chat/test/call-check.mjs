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

  // Tapping the small video swaps it with the big one, and back.
  const pipOf = () => a.evaluate(() => {
    const pip = document.querySelector('#stage .tile.pip');
    return pip ? (pip.classList.contains('self') ? 'me' : 'friend') : null;
  });
  const before = await pipOf();
  await a.click('#stage .tile.pip');
  await a.waitForTimeout(300);
  const swapped = await pipOf();
  await a.screenshot({ path: `${outDir}call-ana-swapped.png` });
  await a.click('#stage .tile.pip');
  await a.waitForTimeout(300);
  check(before === 'me' && swapped === 'friend' && (await pipOf()) === 'me', `tapping the small video swaps it with the big one and back (${before} → ${swapped})`);

  // Bubble Blow, driven by the "hold" fallback since the fake camera has no face.
  await a.evaluate(() => window.__chat.selectEffect('bubble'));
  await a.evaluate(() => { window.__chat.studio.input.held = true; });
  await a.waitForTimeout(1800);
  await a.screenshot({ path: `${outDir}call-ana-blowing.png` });
  await a.evaluate(() => { window.__chat.studio.input.held = false; });
  await b.waitForTimeout(700);
  await b.screenshot({ path: `${outDir}call-bo-bubble-flying.png` });
  check(await until(b, () => [...document.querySelectorAll('.toast')].some(t => /popped a bubble on you/.test(t.textContent)), null, 6000), 'Ana’s bubble pops on Bo');

  // Votes: Ana gives Bubble Blow a thumbs up from the Accessories strip; Bo sees it.
  await a.click('#btn-accessories');
  await a.click('#fx-votes .vote[data-value="1"]');
  await a.waitForTimeout(800);
  await a.click('#btn-accessories');
  const seen = await b.evaluate(async () => {
    await window.__chat.votes.refresh();
    return window.__chat.votes.counts('fx-bubble');
  });
  check(seen.up >= 1, `a thumbs up is counted for everyone (${JSON.stringify(seen)})`);

  // Download: Bo puts Ana's effect on himself from the button over her video.
  await a.evaluate(() => window.__chat.selectEffect('crown'));
  check(await until(b, () => { const g = document.querySelector('#grab-fx'); return g && !g.hidden && g.dataset.fx === 'crown'; }, null, 8000), 'Bo sees a button to use Ana’s effect');
  await b.click('#grab-fx');
  check(await b.evaluate(() => window.__chat.studio.effect?.id === 'crown'), 'the download button puts Ana’s effect on Bo');
  // Share: Ana offers Swirl to everyone; Bo accepts.
  await a.evaluate(() => window.__chat.selectEffect('swirl'));
  await a.click('#btn-effects');
  await a.click('#fx-share');
  await a.click('#btn-effects');
  check(await until(b, () => [...document.querySelectorAll('.invite')].some(i => /shared .*Swirl/.test(i.textContent)), null, 8000), 'Bo gets Ana’s shared effect');
  await b.waitForTimeout(600);
  const offers = await b.evaluate(() => [...document.querySelectorAll('.invite')].map(i => i.textContent));
  check(offers.length === 1, `exactly one offer arrives (${JSON.stringify(offers)})`);
  await b.click('.invite:has-text("Swirl") button.btn.aqua');
  check(await b.evaluate(() => window.__chat.studio.effect?.id === 'swirl'), 'accepting the share puts it on');
  await a.evaluate(() => window.__chat.selectEffect(null));
  await b.evaluate(() => window.__chat.selectEffect(null));

  // Text chat.
  await b.click('#topbar [data-open="settings"]');
  await b.click('#open-chat');
  await b.fill('#chat-input', 'hello from Bo');
  await b.press('#chat-input', 'Enter');
  check(await until(a, () => document.querySelector('#chat-log')?.textContent.includes('hello from Bo')), 'chat message arrives');

  // A game: Ana starts Hoops, Bo joins from the invite.
  await a.click('#btn-games');
  await a.click('.game-card:has-text("Hoops")');
  check(await until(b, () => [...document.querySelectorAll('.invite')].some(i => /started/.test(i.textContent))), 'Bo gets an invite');
  await b.click('.invite:has-text("started") button.btn.aqua');
  const joined = await until(b, () => window.__chat.games.current?.api.players().length === 2);
  if (!joined) console.log('DEBUG', await b.evaluate(() => ({ cur: window.__chat.games.current?.game.id, players: window.__chat.games.current?.api.players().map(p => p.name), sessions: window.__chat.games.sessions().map(s => s.sid), toasts: [...document.querySelectorAll('.toast')].map(t => t.textContent), invites: [...document.querySelectorAll('.invite')].map(i => i.textContent) })));
  check(joined, 'Bo joins Ana’s Hoops session');
  check(await until(a, () => window.__chat.games.current?.api.players().length === 2), 'Ana sees Bo in the session');
  check(await a.evaluate(() => !document.querySelector('#controls').checkVisibility()), 'the bottom controls hide while a game is on');
  await a.waitForTimeout(800);
  await a.screenshot({ path: `${outDir}call-ana-hoops.png` });
  await b.screenshot({ path: `${outDir}call-bo-hoops.png` });

  // Ana switches tabs: her camera pauses, her mic stays on, the app's sounds
  // go quiet and Bo sees "Away". She mutes while away; on return the camera
  // comes back and the mic stays muted.
  const setHidden = hidden => a.evaluate(hidden => {
    Object.defineProperty(document, 'hidden', { get: () => hidden, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  }, hidden);
  const tracks = () => a.evaluate(() => {
    const s = window.__chat.studio;
    return { away: s.away, cam: s.video.srcObject.getVideoTracks().every(t => t.enabled), mic: s.stream.getAudioTracks().every(t => t.enabled) };
  });
  check(JSON.stringify(await tracks()) === '{"away":false,"cam":true,"mic":true}', 'Ana’s camera and mic are on while her tab is in front');
  await setHidden(true);
  check(JSON.stringify(await tracks()) === '{"away":true,"cam":false,"mic":true}', 'a background tab pauses the camera but keeps the mic');
  check(await a.evaluate(() => window.__chat.sfxMuted()), 'and quiets the app’s sound effects');
  check(await until(b, () => !!document.querySelector('.tile .flag.away'), null, 8000), 'Bo sees Ana as away');
  await a.evaluate(() => document.querySelector('#btn-mic').click());
  await setHidden(false);
  check(JSON.stringify(await tracks()) === '{"away":false,"cam":true,"mic":false}', 'coming back turns the camera on and keeps the mute');
  check(!(await a.evaluate(() => window.__chat.sfxMuted())), 'and the sound effects come back');
  check(await until(b, () => !document.querySelector('.tile .flag.away') && !!document.querySelector('.tile .flag.muted'), null, 8000), 'Bo sees Ana back, muted');
  await a.evaluate(() => document.querySelector('#btn-mic').click());

  // Bo leaves; Ana is alone again.
  await b.click('#topbar [data-open="settings"]');
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
