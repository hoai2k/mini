// Browser check (Chromium through Playwright), run from icecreamcone/game:
//
//   node scripts/browser-check.mjs [--shots <dir>] [--bird <id>] [--no-games]
//
// It serves the game itself (the invite gate is off on localhost) and drives it
// with a simulated Xbox controller (navigator.getGamepads is replaced before
// the page loads) and with the keyboard:
//
//  1. Title: no errors; any controller button starts and opens the guide.
//  2. Guide → the first bird's page (its controls and tips on it) → Play →
//     count-in → play, with stick and A input. The pause menu: A on How to
//     play opens it, its Controls button opens the controls, B steps back, A
//     on a leaf page goes straight back to the game; B resumes, and so does a
//     click outside the dialog. A round short of the score: the result card
//     (no buttons) shows its score, the progress is saved, and after a moment
//     the guide is back with that bird chosen.
//  3. The sticker celebration: the first time the score is reached, presses
//     step through it (sticker, book, flight, stuck), then the guide shows
//     the next card opening and chooses it. Playing that bird again ends on
//     the brief result card, and a press goes back to the guide with it
//     chosen.
//  4. ?debug: every page is open; a round that reaches the score celebrates
//     even when passed before, the next card shows locked, opens, and then
//     every card is open again; B and a long press skip it all.
//  5. Keyboard: Enter through the title, guide and page; Space steps
//     through a celebration.
//  6. The guide's 28 cards with ?all: the D-pad moves down a row (not to the
//     buttons below) and on past the end of a row, the chosen card is
//     scrolled into view, the last row leads down to the buttons, and a
//     new bird's page shows its goal, controls and tips.
//  6b. The sticker book (with a few birds passed): Y on the guide opens it;
//     the mouse drags a sticker to the other page; the controller's hand
//     picks one up with A, carries it and puts it down with A (on top of the
//     pile), and B puts a carried one back; RB / LB change the picture; B
//     closes it, and reopening, and reloading the page, keep every place, the
//     pile's order, the picture and the spread.
//  7. Every minigame (all 28, or only --bird) is started with ?all, played
//     for a while with random input, and must run without errors, draw, and
//     reach its end (the result card, or with luck a celebration).
//
// Screenshots go to --shots (default: none). Playwright is found as the
// `playwright` package, at PLAYWRIGHT_MODULE, or in /opt/node-tools.

import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : null;
};
const shots = arg('--shots');
const only = arg('--bird');
const noGames = process.argv.includes('--no-games'); // skip step 7

async function playwright() {
  const tries = [process.env.PLAYWRIGHT_MODULE && pathToFileURL(process.env.PLAYWRIGHT_MODULE).href, 'playwright', '/opt/node-tools/node_modules/playwright/index.mjs'].filter(Boolean);
  for (const t of tries) {
    try {
      return await import(t);
    } catch {
      /* next */
    }
  }
  console.error('Playwright not found: install it (npm i -D playwright) or set PLAYWRIGHT_MODULE.');
  process.exit(2);
}

const server = createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (path.endsWith('/')) path += 'index.html';
  try {
    const body = await readFile(join(root, path));
    res.writeHead(200, { 'content-type': TYPES[extname(path)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end('not found');
  }
});
await new Promise((r) => server.listen(0, r));
const url = `http://localhost:${server.address().port}/`;

const FAKE_PADS = () => {
  const pads = [];
  const make = (i) => ({ index: i, id: 'Xbox Wireless Controller (STANDARD GAMEPAD)', connected: true, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })), vibrationActuator: { playEffect: () => Promise.resolve('complete') } });
  window.__pad = (i, { buttons = {}, axes } = {}) => {
    if (!pads[i]) {
      pads[i] = make(i);
      window.dispatchEvent(Object.assign(new Event('gamepadconnected'), { gamepad: pads[i] }));
    }
    const p = pads[i];
    for (const [b, on] of Object.entries(buttons)) p.buttons[b] = { pressed: !!on, touched: !!on, value: on ? 1 : 0 };
    if (axes) p.axes = axes.slice();
    p.timestamp++;
  };
  navigator.getGamepads = () => pads.map((p) => (p ? { ...p, buttons: p.buttons.map((b) => ({ ...b })), axes: p.axes.slice() } : null));
};

const { chromium } = await playwright();
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
let failures = 0;
const fail = (msg) => {
  failures++;
  console.error('FAIL:', msg);
};
const ok = (msg) => console.log('ok:', msg);
if (shots) await mkdir(shots, { recursive: true });

async function newPage(query = '') {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && !/fonts\.g/.test(m.text()) && errors.push(m.text()));
  await page.addInitScript(FAKE_PADS);
  await page.goto(url + '?dt=0.05' + query);
  await page.waitForFunction(() => window.__coot && window.__coot.S.screen === 'title');
  await page.waitForSelector('#loading', { state: 'detached', timeout: 60000 });
  return { page, errors };
}
const shot = async (page, name) => shots && page.screenshot({ path: join(shots, name + '.png') });
const wait = (page, ms) => page.waitForTimeout(ms);
const press = async (page, b) => {
  await page.evaluate((b) => window.__pad(0, { buttons: { [b]: true } }), b);
  await wait(page, 80);
  await page.evaluate((b) => window.__pad(0, { buttons: { [b]: false } }), b);
  await wait(page, 80);
};
// The guide: which card is chosen, which are locked, which is opening.
const guideState = (page) =>
  page.evaluate(() => ({
    screen: window.__coot.S.screen,
    focus: document.activeElement?.dataset?.bird !== undefined ? Number(document.activeElement.dataset.bird) : null,
    locked: [...document.querySelectorAll('#cards .card.locked')].map((c) => Number(c.dataset.bird)),
    unlock: window.__coot.S.unlock ? window.__coot.S.unlock.i : null,
  }));
// Ends the round now, reaching the bird's score or not.
const reach = (page, pass) =>
  page.evaluate((pass) => {
    const S = window.__coot.S;
    S.game.score = pass ? window.__coot.BIRDS[S.bird].pass : 0;
    S.game.done = true;
  }, pass);
const state = (page) => page.evaluate(() => ({ screen: window.__coot.S.screen, phase: window.__coot.S.phase, paused: window.__coot.S.paused, modals: [...window.__coot.S.modals] }));
const A = 0;
const B = 1;
const MENU = 9;

// ---------- 1 and 2: controller ----------
{
  const { page, errors } = await newPage();
  await page.evaluate(() => window.__pad(0, {}));
  await wait(page, 300);
  await shot(page, '01-title');
  await press(page, A);
  let s = await state(page);
  s.screen === 'guide' ? ok('controller A on the title opens the guide') : fail(`after A on title: ${JSON.stringify(s)}`);
  await wait(page, 300);
  await shot(page, '02-guide');
  await press(page, A);
  s = await state(page);
  s.screen === 'page' ? ok('A on the first card opens its page') : fail(`after A on card: ${JSON.stringify(s)}`);
  await wait(page, 400);
  await shot(page, '03-page');
  const pageInfo = await page.evaluate(() => ({
    buttons: [...document.querySelectorAll('#page [data-nav]')].map((b) => b.textContent.trim()),
    controls: document.querySelectorAll('#page-controls li').length,
  }));
  pageInfo.buttons.join() === 'Play' && pageInfo.controls > 0
    ? ok('the page has only Play, with the controls on it')
    : fail(`page: ${JSON.stringify(pageInfo)}`);
  await press(page, A); // Play
  await page.waitForFunction(() => window.__coot.S.phase === 'play', null, { timeout: 8000 }).catch(() => {});
  s = await state(page);
  s.phase === 'play' ? ok('count-in leads to play') : fail(`after start: ${JSON.stringify(s)}`);
  for (let i = 0; i < 12; i++) {
    await page.evaluate((x) => window.__pad(0, { axes: [x, 0, 0, 0] }), i % 2 ? 0.8 : -0.8);
    await wait(page, 120);
  }
  await page.evaluate(() => window.__pad(0, { axes: [0, 0, 0, 0] }));
  await shot(page, '05-play');
  await press(page, MENU);
  s = await state(page);
  s.paused ? ok('Menu pauses') : fail('Menu did not pause');
  await shot(page, '06-pause');
  const pauseButtons = await page.evaluate(() => [...document.querySelectorAll('#pause [data-nav]')].map((b) => b.textContent.trim()));
  pauseButtons.join() === 'How to play,Settings,Restart,Exit to Field Guide'
    ? ok('the pause menu: How to play, Settings, then Restart and Exit')
    : fail(`pause buttons: ${pauseButtons}`);
  await press(page, A); // How to play
  s = await state(page);
  s.modals.join() === 'howto' ? ok('A opens How to play') : fail(`how to play: ${JSON.stringify(s)}`);
  await shot(page, '06b-howto');
  await press(page, B);
  s = await state(page);
  s.paused && !s.modals.length ? ok('B steps back to the pause menu') : fail(`B from how to play: ${JSON.stringify(s)}`);
  await press(page, A);
  await page.evaluate(() => window.__pad(0, { axes: [0, 1, 0, 0] }));
  await wait(page, 150);
  await page.evaluate(() => window.__pad(0, { axes: [0, 0, 0, 0] }));
  await wait(page, 100);
  await press(page, A); // Controls
  s = await state(page);
  s.modals.join() === 'howto,instructions' ? ok('Controls opens from How to play') : fail(`controls: ${JSON.stringify(s)}`);
  await shot(page, '06c-controls');
  await press(page, A);
  s = await state(page);
  !s.paused && !s.modals.length ? ok('A on the controls goes straight back to the game') : fail(`A on controls: ${JSON.stringify(s)}`);
  await press(page, MENU);
  await page.mouse.click(8, 200); // outside the dialog
  await wait(page, 100);
  s = await state(page);
  !s.paused ? ok('a click outside the pause menu resumes') : fail(`click outside: ${JSON.stringify(s)}`);
  await press(page, MENU);
  await press(page, B);
  s = await state(page);
  !s.paused ? ok('B resumes') : fail('B did not resume');
  // End the round short of the score.
  await page.evaluate(() => { const S = window.__coot.S; S.game.score = 3; S.game.done = true; });
  await page.waitForFunction(() => window.__coot.S.phase === 'result', null, { timeout: 60000 }).catch(() => {});
  s = await state(page);
  s.phase === 'result' ? ok('a round short of the score ends on the result card') : fail(`no result: ${JSON.stringify(s)}`);
  await shot(page, '07-result');
  const card = await page.evaluate(() => ({ buttons: document.querySelectorAll('#result button').length, score: document.querySelector('#result-score').textContent, extra: document.querySelector('#result-extra').textContent }));
  card.buttons === 0 && /^3 /.test(card.score) && !/new page/i.test(card.extra) ? ok(`the result card: ${card.score}, no buttons`) : fail(`result card: ${JSON.stringify(card)}`);
  const saved = await page.evaluate(() => window.__coot.progress.coot);
  saved && saved.plays === 1 ? ok(`progress saved (best ${saved.best})`) : fail('progress not saved');
  await page.waitForFunction(() => window.__coot.S.screen === 'guide', null, { timeout: 8000 }).catch(() => {});
  s = await guideState(page);
  s.screen === 'guide' && s.focus === 0 ? ok('after a moment the guide is back, the bird just played chosen') : fail(`after the result: ${JSON.stringify(s)}`);
  await shot(page, '08-guide-after-result');
  errors.length ? fail('page errors: ' + errors.join(' | ')) : ok('no page errors in the controller round');
  await page.close();
}

// ---------- 3: the sticker celebration, the first time ----------
{
  const { page, errors } = await newPage();
  await page.evaluate(() => window.__pad(0, {}));
  await wait(page, 200);
  await press(page, A); // title → guide
  await press(page, A); // the Coot's page
  await press(page, A); // Play
  await page.waitForFunction(() => window.__coot.S.phase === 'play', null, { timeout: 8000 }).catch(() => {});
  await reach(page, true);
  await page.waitForFunction(() => window.__coot.S.screen === 'celebrate', null, { timeout: 8000 }).catch(() => {});
  let s = await state(page);
  s.screen === 'celebrate' ? ok('the first pass celebrates instead of showing the result card') : fail(`first pass: ${JSON.stringify(s)}`);
  const resultHidden = await page.evaluate(() => document.querySelector('#result').hidden);
  resultHidden ? ok('no result card with the celebration') : fail('the result card showed with the celebration');
  // (read at once: the celebration moves on while we wait, and a
  // screenshot takes long enough to miss a step)
  const steps = [];
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => window.__pad(0, { buttons: { 0: true } }));
    await wait(page, 30);
    steps.push(await page.evaluate(() => window.__coot.S.cele && window.__coot.stepAt(window.__coot.S.cele.t)));
    await page.evaluate(() => window.__pad(0, { buttons: { 0: false } }));
    await wait(page, 30);
  }
  steps.join() === 'book,fly,stuck' ? ok('A steps through the celebration: ' + steps.join(' → ')) : fail(`celebration steps: ${steps}`);
  await page.evaluate(() => window.__pad(0, { buttons: { 0: true } }));
  await wait(page, 40);
  s = await guideState(page);
  await page.evaluate(() => window.__pad(0, { buttons: { 0: false } }));
  s.screen === 'guide' && s.unlock === 1 && s.locked.includes(1) ? ok('then the guide, the next card still locked, opening') : fail(`after the celebration: ${JSON.stringify(s)}`);
  await shot(page, '12-guide-unlocking');
  await page.waitForFunction(() => !window.__coot.S.unlock, null, { timeout: 8000 }).catch(() => {});
  s = await guideState(page);
  s.focus === 1 && !s.locked.includes(1) && s.locked.includes(2) ? ok('the new card opens and is chosen') : fail(`after opening: ${JSON.stringify(s)}`);
  await shot(page, '13-guide-opened');
  // The Coot again: a pass, but not the first: the brief result.
  await press(page, 14); // D-pad left, to the Coot
  await press(page, A);
  await press(page, A);
  await page.waitForFunction(() => window.__coot.S.phase === 'play', null, { timeout: 8000 }).catch(() => {});
  await reach(page, true);
  await page.waitForFunction(() => window.__coot.S.phase === 'result', null, { timeout: 8000 }).catch(() => {});
  s = await state(page);
  s.phase === 'result' && s.screen === 'play' ? ok('passing again shows the brief result card') : fail(`repeat pass: ${JSON.stringify(s)}`);
  await shot(page, '14-repeat-result');
  await wait(page, 300);
  await press(page, A);
  s = await guideState(page);
  s.screen === 'guide' && s.focus === 0 && s.unlock === null ? ok('A goes back to the guide early, the Coot chosen') : fail(`after the repeat: ${JSON.stringify(s)}`);
  errors.length ? fail('page errors: ' + errors.join(' | ')) : ok('no page errors in the celebration round');
  await page.close();
}

// ---------- 4: ?debug ----------
{
  const { page, errors } = await newPage('&debug');
  await page.evaluate(() => window.__pad(0, {})); // connected now, so its first press counts
  await page.keyboard.press('Enter');
  await wait(page, 200);
  let s = await guideState(page);
  s.screen === 'guide' && s.locked.length === 0 ? ok('?debug opens every page') : fail(`debug guide: ${JSON.stringify(s)}`);
  // A pass of a bird with nothing passed: the whole celebration, untouched.
  await page.evaluate(() => window.__coot.startBird(5));
  await page.waitForFunction(() => window.__coot.S.phase === 'play', null, { timeout: 8000 }).catch(() => {});
  await reach(page, true);
  await page.waitForFunction(() => window.__coot.S.screen === 'celebrate', null, { timeout: 8000 }).catch(() => {});
  await page.waitForFunction(() => window.__coot.S.screen === 'guide', null, { timeout: 15000 }).catch(() => {});
  s = await guideState(page);
  s.unlock === 6 && s.locked.join() === '6' ? ok('?debug: after the celebration the next card shows locked, then opens') : fail(`debug unlock: ${JSON.stringify(s)}`);
  await page.waitForFunction(() => !window.__coot.S.unlock, null, { timeout: 8000 }).catch(() => {});
  s = await guideState(page);
  s.focus === 6 && s.locked.length === 0 ? ok('?debug: then every card is open again, the new one chosen') : fail(`debug after: ${JSON.stringify(s)}`);
  // The same bird again: celebrates again in debug; B skips it all.
  await page.evaluate(() => window.__coot.startBird(5));
  await page.waitForFunction(() => window.__coot.S.phase === 'play', null, { timeout: 8000 }).catch(() => {});
  await reach(page, true);
  await page.waitForFunction(() => window.__coot.S.screen === 'celebrate', null, { timeout: 8000 }).catch(() => {});
  s = await state(page);
  s.screen === 'celebrate' ? ok('?debug: a pass celebrates again') : fail(`debug repeat: ${JSON.stringify(s)}`);
  await press(page, B);
  s = await guideState(page);
  s.screen === 'guide' && s.unlock === null && s.focus === 6 ? ok('B skips the whole celebration') : fail(`B skip: ${JSON.stringify(s)}`);
  // A long press skips it too.
  await page.evaluate(() => window.__coot.startBird(5));
  await page.waitForFunction(() => window.__coot.S.phase === 'play', null, { timeout: 8000 }).catch(() => {});
  await reach(page, true);
  await page.waitForFunction(() => window.__coot.S.screen === 'celebrate', null, { timeout: 8000 }).catch(() => {});
  await page.evaluate(() => window.__pad(0, { buttons: { 0: true } }));
  await page.waitForFunction(() => window.__coot.S.screen === 'guide', null, { timeout: 4000 }).catch(() => {});
  const early = await page.evaluate(() => window.__coot.S.screen === 'guide' && !window.__coot.S.unlock);
  await page.evaluate(() => window.__pad(0, { buttons: { 0: false } }));
  early ? ok('a long press skips the whole celebration') : fail('a long press did not skip');
  // Short of the score in debug: the brief result.
  await page.evaluate(() => window.__coot.startBird(2));
  await page.waitForFunction(() => window.__coot.S.phase === 'play', null, { timeout: 8000 }).catch(() => {});
  await reach(page, false);
  await page.waitForFunction(() => window.__coot.S.phase === 'result', null, { timeout: 8000 }).catch(() => {});
  s = await state(page);
  s.phase === 'result' ? ok('?debug: a round short of the score shows the brief result') : fail(`debug short: ${JSON.stringify(s)}`);
  await page.waitForFunction(() => window.__coot.S.screen === 'guide', null, { timeout: 8000 }).catch(() => {});
  s = await guideState(page);
  s.focus === 2 && s.locked.length === 0 ? ok('?debug: then the guide, that bird chosen, every page open') : fail(`debug short after: ${JSON.stringify(s)}`);
  const plays = await page.evaluate(() => window.__coot.progress[window.__coot.BIRDS[5].id]?.plays);
  plays === 3 ? ok('?debug still records progress') : fail(`debug progress: ${plays}`);
  errors.length ? fail('page errors: ' + errors.join(' | ')) : ok('no page errors in the debug round');
  await page.close();
}

// ---------- 5: keyboard ----------
{
  const { page, errors } = await newPage();
  await page.keyboard.press('Enter');
  await wait(page, 200);
  let s = await state(page);
  s.screen === 'guide' ? ok('Enter on the title opens the guide') : fail(`keyboard title: ${JSON.stringify(s)}`);
  await page.keyboard.press('Enter');
  await wait(page, 200);
  s = await state(page);
  s.screen === 'page' ? ok('Enter opens the first page') : fail(`keyboard guide: ${JSON.stringify(s)}`);
  await page.keyboard.press('Escape');
  await wait(page, 200);
  s = await state(page);
  s.screen === 'guide' ? ok('Escape goes back to the guide') : fail(`keyboard back: ${JSON.stringify(s)}`);
  await page.keyboard.press('Enter');
  await wait(page, 200);
  await page.keyboard.press('Enter'); // Play
  await page.waitForFunction(() => window.__coot.S.phase === 'play', null, { timeout: 8000 }).catch(() => {});
  await reach(page, true);
  await page.waitForFunction(() => window.__coot.S.screen === 'celebrate', null, { timeout: 8000 }).catch(() => {});
  await page.keyboard.press('Space');
  await wait(page, 60);
  const step = await page.evaluate(() => window.__coot.S.cele && window.__coot.stepAt(window.__coot.S.cele.t));
  step === 'book' ? ok('Space steps through the celebration') : fail(`Space in the celebration: ${step}`);
  await page.keyboard.press('Escape');
  await wait(page, 100);
  s = await guideState(page);
  s.screen === 'guide' && s.focus === 1 ? ok('Escape skips to the guide, the next card chosen') : fail(`Escape in the celebration: ${JSON.stringify(s)}`);
  errors.length ? fail('page errors: ' + errors.join(' | ')) : ok('no page errors in the keyboard round');
  await page.close();
}

// ---------- 6: the guide's 28 cards ----------
if (!only) {
  const { page, errors } = await newPage('&all');
  await page.evaluate(() => window.__pad(0, {}));
  await press(page, A); // title → guide
  await wait(page, 300);
  const info = await page.evaluate(() => ({ cards: document.querySelectorAll('#cards .card').length, count: document.querySelector('#guide-count').textContent }));
  info.cards === 28 && /of 28 birds/.test(info.count) ? ok(`the guide has 28 cards (${info.count})`) : fail(`guide: ${JSON.stringify(info)}`);
  const cols = await page.evaluate(() => getComputedStyle(document.querySelector('#cards')).gridTemplateColumns.split(' ').length);
  const inView = () =>
    page.evaluate(() => {
      const el = document.activeElement;
      const r = el.getBoundingClientRect();
      const v = document.querySelector('#cards').getBoundingClientRect();
      return { bird: el.dataset.bird !== undefined ? Number(el.dataset.bird) : el.textContent.trim(), visible: r.top >= v.top - 2 && r.bottom <= v.bottom + 2 };
    });
  await press(page, 13); // D-pad down
  await wait(page, 400);
  let f = await inView();
  f.bird === cols ? ok(`down moves a row (${cols} to a row)`) : fail(`down from the first card: ${JSON.stringify(f)}`);
  for (let i = 0; i < cols - 1; i++) await press(page, 15); // right, to the end of the row
  await press(page, 15); // and on, to the next row
  await wait(page, 400);
  f = await inView();
  f.bird === cols * 2 ? ok('right past the end of a row goes on to the next') : fail(`right past the row: ${JSON.stringify(f)}`);
  for (let i = 0; i < 6; i++) await press(page, 13);
  await wait(page, 700);
  f = await inView();
  f.bird >= 28 - cols && f.visible ? ok(`down to the last row, card ${f.bird} kept in view`) : fail(`the last row: ${JSON.stringify(f)}`);
  await shot(page, '15-guide-end');
  await page.evaluate(() => document.querySelector('#cards .card[data-bird="27"]').focus());
  await press(page, 13);
  f = await inView();
  typeof f.bird === 'string' ? ok(`down from the last row goes to the buttons (${f.bird})`) : fail(`below the last row: ${JSON.stringify(f)}`);
  await page.evaluate(() => document.querySelector('#cards .card[data-bird="16"]').focus());
  await press(page, A);
  await wait(page, 400);
  const pg = await page.evaluate(() => ({ screen: window.__coot.S.screen, name: document.querySelector('#page-name').textContent, number: document.querySelector('#page-number').textContent, goal: document.querySelector('#page-goal').textContent, controls: document.querySelectorAll('#page-controls li').length, tips: document.querySelectorAll('#page-tips li').length }));
  pg.screen === 'page' && pg.number === 'Page 17 of 28' && pg.goal && pg.controls && pg.tips ? ok(`a new bird's page: ${pg.name}, ${pg.number}, ${pg.controls} controls, ${pg.tips} tips`) : fail(`new page: ${JSON.stringify(pg)}`);
  await shot(page, '16-new-page');
  errors.length ? fail('page errors: ' + errors.join(' | ')) : ok('no page errors in the guide round');
  await page.close();
}

// ---------- 6b: the sticker book ----------
if (!only) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && !/fonts\.g/.test(m.text()) && errors.push(m.text()));
  await page.addInitScript(FAKE_PADS);
  await page.addInitScript(() => {
    const p = {};
    for (const id of ['coot', 'cupadee', 'shuttercluck', 'gullfinch', 'plume']) p[id] = { best: 99999, plays: 1 };
    localStorage.setItem('icecreamcone.progress.v1', JSON.stringify(p));
  });
  const load = async () => {
    await page.goto(url + '?dt=0.05');
    await page.waitForFunction(() => window.__coot && window.__coot.S.screen === 'title');
    await page.waitForSelector('#loading', { state: 'detached', timeout: 60000 });
    await page.evaluate(() => window.__pad(0, {}));
    await wait(page, 100);
  };
  await load();
  await press(page, A); // title → guide
  await press(page, 3); // Y
  let s = await state(page);
  s.screen === 'stickers' ? ok('Y on the guide opens the sticker book') : fail(`Y on the guide: ${JSON.stringify(s)}`);
  await shot(page, '17-sticker-book');
  // stage units → screen pixels
  const toScreen = (x, y) => page.evaluate(([x, y]) => { const v = window.__coot.stage(); return [v.ox + x * v.s, v.oy + y * v.s]; }, [x, y]);
  const L = await page.evaluate(() => window.__coot.stickerLayout());
  // the mouse drags the Coot onto the other page
  const from = await toScreen(L.slots[0].x, L.slots[0].y);
  const to = await toScreen(L.pages[1].x + L.pages[1].w * 0.5, L.pages[1].y + L.pages[1].h * 0.5);
  await page.mouse.move(...from);
  await page.mouse.down();
  for (let k = 1; k <= 8; k++) {
    await page.mouse.move(from[0] + ((to[0] - from[0]) * k) / 8, from[1] + ((to[1] - from[1]) * k) / 8);
    await wait(page, 40);
  }
  await page.mouse.up();
  await wait(page, 100);
  let book = await page.evaluate(() => window.__coot.book);
  const c = book.pos.coot;
  c && c.page === 1 && Math.abs(c.u - 0.5) < 0.03 && Math.abs(c.v - 0.5) < 0.03 ? ok('the mouse drags a sticker onto the other page') : fail(`mouse drag: ${JSON.stringify(book)}`);
  // the controller's hand: to the Cupadee, A, across, A
  const steer = async (tx, ty) => {
    for (let k = 0; k < 120; k++) {
      const h = await page.evaluate(() => window.__coot.S.sb.hand);
      const dx = tx - h.x;
      const dy = ty - h.y;
      if (Math.hypot(dx, dy) < 12) break;
      const ax = Math.max(-1, Math.min(1, dx / 120));
      const ay = Math.max(-1, Math.min(1, dy / 120));
      await page.evaluate(([x, y]) => window.__pad(0, { axes: [x, y, 0, 0] }), [Math.abs(ax) < 0.25 ? Math.sign(ax) * 0.25 : ax, Math.abs(ay) < 0.25 ? Math.sign(ay) * 0.25 : ay]);
      await wait(page, 40);
    }
    await page.evaluate(() => window.__pad(0, { axes: [0, 0, 0, 0] }));
    await wait(page, 60);
  };
  await press(page, 13); // wakes the controller (the hand shows)
  await steer(L.slots[1].x, L.slots[1].y);
  await press(page, A);
  const held = await page.evaluate(() => window.__coot.S.sb.held?.id);
  held === 'cupadee' ? ok('A picks up the sticker under the hand') : fail(`hand pick: ${held}`);
  await steer(L.pages[1].x + L.pages[1].w * 0.5, L.pages[1].y + L.pages[1].h * 0.5);
  await shot(page, '18-sticker-carried');
  await press(page, A);
  book = await page.evaluate(() => window.__coot.book);
  book.pos.cupadee?.page === 1 && book.pos.cupadee.z > book.pos.coot.z ? ok('A puts it down, on top of the pile') : fail(`hand drop: ${JSON.stringify(book)}`);
  // B puts a carried one back
  await steer(L.slots[2].x, L.slots[2].y);
  await press(page, A);
  await steer(L.slots[2].x + 200, L.slots[2].y + 100);
  await press(page, B);
  book = await page.evaluate(() => window.__coot.book);
  const after = await page.evaluate(() => ({ screen: window.__coot.S.screen, held: window.__coot.S.sb?.held }));
  !book.pos.shuttercluck && after.screen === 'stickers' && !after.held ? ok('B puts a carried sticker back') : fail(`B while carrying: ${JSON.stringify({ book, after })}`);
  // the pictures: RB, RB, LB → the Coot's seaside
  await press(page, 5);
  await press(page, 5);
  await press(page, 4);
  book = await page.evaluate(() => window.__coot.book);
  book.bg === 'coot' ? ok('RB and LB change the picture') : fail(`pictures: ${book.bg}`);
  await shot(page, '19-sticker-picture');
  await press(page, 7); // RT: the second spread
  book = await page.evaluate(() => window.__coot.book);
  book.spread === 1 ? ok('RT turns to the second spread') : fail(`spread: ${book.spread}`);
  await press(page, 6); // LT: back
  await press(page, B);
  s = await state(page);
  s.screen === 'guide' ? ok('B closes the sticker book') : fail(`B in the book: ${JSON.stringify(s)}`);
  await press(page, 3);
  await press(page, 7);
  const again = await page.evaluate(() => window.__coot.book);
  again.pos.coot && again.pos.cupadee && again.bg === 'coot' && again.spread === 1 ? ok('reopened, the stickers are where they were') : fail(`reopened: ${JSON.stringify(again)}`);
  // the reload: everything kept
  const before = await page.evaluate(() => JSON.stringify(window.__coot.book));
  await load();
  const reloaded = await page.evaluate(() => JSON.stringify(window.__coot.book));
  reloaded === before ? ok('after a reload the places, the pile, the picture and the spread are kept') : fail(`reload: ${before} → ${reloaded}`);
  await page.evaluate(() => window.__coot.act('stickers'));
  await wait(page, 200);
  await shot(page, '20-sticker-reloaded');
  errors.length ? fail('page errors: ' + errors.join(' | ')) : ok('no page errors in the sticker book');
  await page.close();
}

// ---------- 7: every minigame ----------
const { BIRDS } = await import(pathToFileURL(join(root, 'src/birds.js')).href);
for (const id of noGames ? [] : BIRDS.map((b) => b.id)) {
  if (only && id !== only) continue;
  if (!existsSync(join(root, 'src/games', id + '.js'))) {
    fail(`${id}: no game`);
    continue;
  }
  const { page, errors } = await newPage('&all');
  await page.evaluate((id) => window.__coot.startBird(window.__coot.BIRDS.findIndex((b) => b.id === id)), id);
  await page.waitForFunction(() => window.__coot.S.phase === 'play', null, { timeout: 8000 }).catch(() => {});
  let k = 0;
  const deadline = Date.now() + 90000;
  while (Date.now() < deadline) {
    const ended = await page.evaluate((id) => window.__coot.S.last?.id === id, id);
    if (ended) break;
    const r = Math.sin(k * 1.7);
    await page.evaluate(([x, y, a, sh]) => window.__pad(0, { axes: [x, y, 0, 0], buttons: { 0: a, 4: sh === 1, 5: sh === 2 } }), [r, Math.cos(k), k % 3 === 0, k % 4]);
    await wait(page, 90);
    if (k === 20) await shot(page, `game-${id}-1-play`);
    k++;
  }
  const s = await state(page);
  const last = await page.evaluate(() => window.__coot.S.last);
  last?.id === id ? ok(`${id}: plays to its end (${last.outcome}, ${last.score})`) : fail(`${id}: no end (${JSON.stringify(s)})`);
  await shot(page, `game-${id}-2-result`);
  errors.length ? fail(`${id}: page errors: ` + errors.join(' | ')) : ok(`${id}: no page errors`);
  await page.close();
}

await browser.close();
server.close();
if (failures) {
  console.error(`${failures} failure(s)`);
  process.exit(1);
}
console.log('browser check passed');
