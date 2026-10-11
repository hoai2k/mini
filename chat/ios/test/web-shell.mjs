// Checks the iOS app's layer over the web app (chat/ios/web/native.js and
// native.css) in Chromium, playing the app's part: it injects the script the
// way the app's WKWebView does and records what the page posts to native code.
// Against the published web app and a local relay:
//   chat/publish.sh local/pages/chat && node chat/ios/test/web-shell.mjs
// (needs `npm ci` in multiplayer/server). Screenshot: local/chat-shots/ios-shell.png
import { spawn } from 'node:child_process';
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { serve, launch } from '../../test/lib.mjs';

const root = fileURLToPath(new URL('../../../', import.meta.url));
await mkdir(`${root}local/chat-shots`, { recursive: true });
const relayDir = `${root}multiplayer/server`;
const relay = spawn(process.execPath, [`${relayDir}/node_modules/wrangler/bin/wrangler.js`, 'dev', '--port', '8787', '--ip', '127.0.0.1', '--persist-to', '.wrangler/ios-shell-state'], {
  cwd: relayDir, stdio: 'ignore', detached: true, env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
});
process.on('exit', () => { try { process.kill(-relay.pid, 'SIGTERM'); } catch {} });
for (let i = 0; ; i++) {
  try { if ((await fetch('http://127.0.0.1:8787/')).ok) break; } catch {}
  if (i > 120) throw new Error('relay did not start');
  await new Promise(r => setTimeout(r, 500));
}

const js = await readFile(new URL('../web/native.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../web/native.css', import.meta.url), 'utf8');
// What WebCallView.swift injects at document start.
const shell = `window.__gamesChatCSS = ${JSON.stringify(css)};
window.__native = [];
window.webkit = { messageHandlers: { native: { postMessage: m => window.__native.push(m) } } };
${js}`;

const server = await serve(`${root}local/pages`);
const browser = await launch();
const failures = [];
const check = (ok, what) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failures.push(what); };
const room = `call-shell${Date.now() % 100000}`;

// Ana in the iOS app (iPhone-sized), Bo in a browser, same call room.
const appCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, permissions: ['camera', 'microphone'] });
await appCtx.addInitScript(shell);
const app = await appCtx.newPage();
const errors = [];
app.on('pageerror', e => errors.push(e.message));
await app.goto(`${server.url}/chat/?app=ios&name=Ana&room=${room}`);
await app.waitForFunction(() => document.querySelector('#call')?.classList.contains('active') || document.querySelector('#call:not([hidden])'), null, { timeout: 15000 }).catch(() => {});
await app.waitForTimeout(2500);
const posted = () => app.evaluate(() => window.__native.map(m => m.type));
check((await posted()).includes('ready'), 'page tells the app it is ready');
check((await posted()).includes('joined'), 'joins the call straight away with the account name');
check(await app.evaluate(() => !document.querySelector('#title.screen.active')), 'title screen skipped');
const fsVisible = await app.evaluate(() => [...document.querySelectorAll('[data-action="fullscreen"]')].some(b => b.offsetParent));
check(!fsVisible, 'no fullscreen buttons');
check(await app.evaluate(() => document.querySelector('#controls').lastElementChild?.id === 'btn-hangup'), 'hang-up is the last button on the strip');
check(await app.evaluate(() => getComputedStyle(document.getElementById('btn-hangup')).backgroundColor === 'rgb(255, 59, 48)'), 'hang-up is red');
// Unfocused (as a web view is until tapped), the page still counts as here.
await app.evaluate(() => window.dispatchEvent(new Event('blur')));
await app.waitForTimeout(300);
check(await app.evaluate(() => document.hasFocus() === !document.hidden), 'not counted as away just for lacking focus (the web app checks hasFocus)');

const webCtx = await browser.newContext({ viewport: { width: 700, height: 600 }, permissions: ['camera', 'microphone'] });
const web = await webCtx.newPage();
await web.goto(`${server.url}/chat/?room=${room}`);
await web.fill('#name-input', 'Bo');
await web.click('#start-btn');
await app.waitForFunction(() => window.__native.some(m => m.type === 'peers' && m.count === 1), null, { timeout: 20000 }).catch(() => {});
check(await app.evaluate(() => window.__native.some(m => m.type === 'peers' && m.count === 1)), 'the app hears when someone joins the call');
check(await web.evaluate(() => !document.documentElement.classList.contains('ios-app') && !document.getElementById('btn-hangup')), 'the web version is untouched');
await app.screenshot({ path: `${root}local/chat-shots/ios-shell.png` });

// Someone in the shared room isn't in this call.
const otherCtx = await browser.newContext({ permissions: ['camera', 'microphone'] });
const other = await otherCtx.newPage();
await other.goto(`${server.url}/chat/`);
await other.fill('#name-input', 'Cy');
await other.click('#start-btn');
await app.waitForTimeout(3000);
check(await app.evaluate(() => window.__native.filter(m => m.type === 'peers').pop()?.count === 1), 'people in the shared room stay out of the call');

// Settings: Messages stays, Leave becomes hang up.
await app.evaluate(() => document.querySelector('.round-btn[data-open="settings"]')?.click());
await app.waitForTimeout(400);
check(await app.evaluate(() => !!document.getElementById('open-chat')?.offsetParent), 'Messages still in Settings');
check(await app.evaluate(() => !document.getElementById('btn-leave')?.offsetParent), 'Leave in Settings is hidden (the strip has hang up)');
await app.evaluate(() => document.getElementById('settings')?.close());
await app.click('#btn-hangup');
check(await app.evaluate(() => window.__native.some(m => m.type === 'hangup')), 'hang up tells the app');
check(errors.length === 0, `no page errors${errors.length ? `: ${errors.join(' | ')}` : ''}`);
await browser.close();
server.close();
if (failures.length) { console.log(`${failures.length} failed`); process.exit(1); }
console.log('all iOS shell checks passed');
process.exit(0);   // stops the relay too (see the exit handler)
