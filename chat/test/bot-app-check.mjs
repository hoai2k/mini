// The real app with debug bots (Settings > Add Debug Bot): starts the relay
// locally, adds a bot, starts each game from the Games sheet and checks the
// bot actually plays it: its animation keeps running in its hidden window,
// and it makes moves (putts, hits, throws...) so the game goes on.
//   chat/publish.sh local/pages/chat && node chat/test/bot-app-check.mjs [ids] [--secs=25]
// Needs `npm ci` in multiplayer/server.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { serve, launch } from './lib.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const args = process.argv.slice(2);
const secs = parseFloat(args.find(a => a.startsWith('--secs='))?.slice(7) ?? '25');
const { GAME_IDS } = await import('../games/index.js');
const ids = args.filter(a => !a.startsWith('--')).length ? args.filter(a => !a.startsWith('--')) : GAME_IDS;

const relayDir = `${root}multiplayer/server`;
const relay = spawn(process.execPath, [`${relayDir}/node_modules/wrangler/bin/wrangler.js`, 'dev', '--local', '--port', '8787', '--ip', '127.0.0.1', '--persist-to', '.wrangler/bot-check-state'], {
  cwd: relayDir, stdio: 'ignore', detached: true, env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
});
process.on('exit', () => { try { process.kill(-relay.pid, 'SIGTERM'); } catch {} });
for (let i = 0; ; i++) {
  try { if ((await fetch('http://127.0.0.1:8787/')).ok) break; } catch {}
  if (i > 120) throw new Error('relay did not start');
  await new Promise(r => setTimeout(r, 500));
}

const server = await serve(`${root}local/pages`);
const browser = await launch();
let failed = 0;
for (const id of ids) {
  const ctx = await browser.newContext({ viewport: { width: 900, height: 700 }, permissions: ['camera', 'microphone'] });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${server.url}/chat/?room=botcheck-${id}-${Date.now() % 1e6}`);
  await page.fill('#name-input', 'Ana');
  await page.click('#start-btn');
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.querySelector('.round-btn[data-open="settings"]').click());
  await page.click('#debug-bot-plus');
  await page.evaluate(() => document.getElementById('settings').close());
  await page.waitForFunction(() => document.querySelector('.debug-bot-frame')?.contentWindow?.debugBot, null, { timeout: 20000 });
  await page.waitForTimeout(2000);
  await page.click('#btn-games');
  await page.waitForTimeout(400);
  await page.evaluate(gid => document.querySelector(`.game-card[data-game="${gid}"]`)?.click(), id);
  // Some games deal from a lobby: press its start button if there is one.
  await page.waitForTimeout(2500);
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.game-panel button')].find(x => /deal|start|play/i.test(x.textContent) && x.offsetParent);
    b?.click();
  });
  await page.screenshot({ path: `${root}local/chat-shots/bot-${id}.png` });
  const human = await page.evaluate(() => ({ inGame: document.getElementById('call')?.classList.contains('has-game'), botPresence: [...document.querySelectorAll('.tile')].length }));
  console.log(`     ${id}: human in game ${human.inGame}, tiles ${human.botPresence}`);
  const report = await page.evaluate(async secs => {
    const win = document.querySelector('.debug-bot-frame').contentWindow;
    const bot = win.debugBot;
    // The human's seat takes its turns too (same simple moves as a bot), so
    // turn-based games come round to the bot.
    const { driveRookie } = await import('./js/rookie.js');
    let humanStep = 0;
    const human = setInterval(() => { const c = window.gamesChatDebug?.current; if (c) driveRookie(c, ++humanStep); }, 400);
    let frames = 0, stop = false;
    const tick = () => { frames++; if (!stop) win.requestAnimationFrame(tick); };
    win.requestAnimationFrame(tick);
    const seen = new Set(), sends = [];
    const t0 = Date.now();
    let hooked = null;
    while (Date.now() - t0 < secs * 1000) {
      const cur = bot.host.current;
      if (cur && hooked !== cur) {
        hooked = cur;
        const orig = cur.api.send;
        cur.api.send = (type, d) => { sends.push(type); return orig.call(cur.api, type, d); };
      }
      if (cur) seen.add(JSON.stringify(cur.api.state()));
      await new Promise(r => setTimeout(r, 250));
    }
    stop = true;
    clearInterval(human);
    return { inGame: !!bot.host.current, fps: frames / secs, states: seen.size, sends: [...new Set(sends)].join(','), nSends: sends.length };
  }, secs);
  const moved = report.states > 2 || report.nSends > 0;
  const ok = report.inGame && moved && report.fps > 5;   // > 5: running, not frozen (headless runs slow)
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${id.padEnd(11)} bot in game: ${report.inGame}, its window ${report.fps.toFixed(0)} fps, ${report.states} distinct states, ${report.nSends} messages (${report.sends})${errors.length ? `  ERRORS: ${errors.slice(0, 2).join(' | ')}` : ''}`);
  await ctx.close();
}
await browser.close();
server.close();
if (failed) { console.log(`${failed} failed`); process.exit(1); }
process.exit(0);
