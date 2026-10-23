// What a person does, end to end, on a phone (touch) and a desktop (mouse):
// the Practice Routine's list (editing, dragging, swiping, names), a routine
// running (tools waiting for the voice, breaks, Skip), the metronome's strong
// beats heard as they are set, and a saved theme that no longer exists.
//
//   node test/browser/flows.mjs
import { start, routine, checks } from './lib.mjs';

const c = checks('flows');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** Polls `f` (in the page) until it is truthy or `ms` pass; returns the time it took, or -1. */
async function until(p, f, ms = 10000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (await p.evaluate(f)) return Date.now() - t0;
    await wait(150);
  }
  return -1;
}

const names = (p) => p.evaluate(() => [...document.querySelectorAll('#timer-list .titem-name')].map((e) => e.textContent || e.value));
const metOn = () => document.querySelector('.tool-card[data-tool="metronome"]').classList.contains('on');

/** A touch drag through Chromium's own touch events (Playwright has no touch move). */
async function touchDrag(p, x, y, dx, dy, steps = 12) {
  const s = await p.context().newCDPSession(p);
  const at = (type, k) => s.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: x + (dx * k) / steps, y: y + (dy * k) / steps }] });
  await at('touchStart', 0);
  for (let k = 1; k <= steps; k++) { await at('touchMove', k); await wait(20); }
  await at('touchEnd');
}

async function list(env) {
  for (const touch of [true, false]) {
    const how = touch ? 'touch' : 'mouse';
    const p = await env.page({ touch, width: touch ? 390 : 1100, height: 844 });
    const timer = await routine(p, env.base, [{ kind: 'intonation' }, { kind: 'scales' }, { kind: null, name: 'Long tones' }, { kind: 'intonation' }]);
    await p.evaluate((t) => localStorage.setItem('musicpractice.routine.v1', JSON.stringify(t)), timer);
    await p.goto(env.base + '#routine');
    await p.reload();
    await p.waitForTimeout(800);
    const editing = () => p.evaluate(() => document.getElementById('timer-list').classList.contains('editing'));
    const heights = () => p.evaluate(() => [...new Set([...document.querySelectorAll('#timer-list .titem')].map((li) => Math.round(li.getBoundingClientRect().height)))]);
    c.ok((await heights()).length === 1, `${how}: rows one height in the list`);
    // The pencil and the total both turn editing on and off; editing says so.
    await p.click('#timer-clock');
    c.ok(await editing(), `${how}: a tap on the total edits the list`);
    c.ok(await p.isVisible('.timer-edit-label'), `${how}: editing shows "Drag to reorder items"`);
    await p.click('#timer-edit');
    c.ok(!(await editing()), `${how}: the pencil's check finishes editing`);
    await p.click('#timer-edit');
    // An item opened while the list is edited keeps its handle where it was, and every row its height.
    const handleX = () => p.evaluate(() => [...new Set([...document.querySelectorAll('.titem-handle')].map((b) => Math.round(b.getBoundingClientRect().left)))]);
    await p.click('#timer-list .titem:nth-child(2) .titem-pencil');
    c.ok((await handleX()).length === 1, `${how}: an open item's handle stays in line`);
    c.ok((await heights()).length === 1, `${how}: an open item keeps its height`);
    c.ok(await p.isVisible('#timer-list .titem:nth-child(2) .titem-del'), `${how}: an open item has its trash`);
    await p.click('#timer-list .titem:nth-child(2) .titem-pencil');
    // Dragged from its name (not the handle), the first item moves down past the third.
    const before = await names(p);
    const r = await p.locator('#timer-list .titem:nth-child(1) .titem-name').boundingBox();
    const x = r.x + r.width / 2, y = r.y + r.height / 2;
    if (touch) await touchDrag(p, x, y, 0, 132);
    else { await p.mouse.move(x, y); await p.mouse.down(); for (let k = 1; k <= 12; k++) await p.mouse.move(x, y + k * 11); await p.mouse.up(); }
    await p.waitForTimeout(400);
    const after = await names(p);
    c.ok(after[2] === before[0] && after[0] === before[1], `${how}: dragged from its name, an item moves (${before} -> ${after})`);
    c.ok(await p.evaluate(() => scrollY) === 0, `${how}: the drag doesn't scroll the page`);
    if (touch) {
      // A sideways swipe takes one off.
      const b = await p.locator('#timer-list .titem:nth-child(4) .titem-name').boundingBox();
      await touchDrag(p, b.x + 10, b.y + b.height / 2, 250, 0, 14);
      await p.waitForTimeout(500);
      c.ok((await names(p)).length === 3, `${how}: a swipe deletes`);
    }
    await p.click('#timer-edit');
    // An item of its own opens with the kinds' list and no field; Custom... gives the field; a suggestion's name is that suggestion.
    const row = '#timer-list .titem:nth-child(2)';
    const own = await p.evaluate((r) => document.querySelector(`${r} .titem-name`).textContent, row);
    await p.click(`${row} .titem-pencil`);
    const opened = await p.evaluate((r) => ({ field: !!document.querySelector(`${r} input.titem-name`), picked: document.querySelector(`${r} select.titem-kind`).value, focus: document.activeElement?.className }), row);
    c.ok(own === 'Long tones' && !opened.field && opened.picked === '' && opened.focus === 'titem-kind', `${how}: an item of its own opens like any other (${JSON.stringify(opened)})`);
    await p.selectOption(`${row} select.titem-kind`, 'custom');
    c.ok(await p.evaluate((r) => document.activeElement === document.querySelector(`${r} input.titem-name`), row), `${how}: Custom... gives the name to type`);
    await p.fill(`${row} input.titem-name`, 'scales');
    await p.click(`${row} .titem-pencil`); // closed by its check
    await p.waitForTimeout(400);
    const named = await p.evaluate((r) => ({ name: document.querySelector(`${r} .titem-name`).textContent, open: !!document.querySelector(`${r}.item-edit`), kind: JSON.parse(localStorage.getItem('musicpractice.routine.v1')).items[1].kind }), row);
    c.ok(named.name === 'Scales' && named.kind === 'scales' && !named.open, `${how}: "scales" typed is Scales, and its check closes it (${JSON.stringify(named)})`);
    c.ok(!p.errors.length, `${how}: no page errors in the list (${p.errors})`);
    await p.close();
  }
}

async function running(env) {
  const p = await env.page();
  // The voice: the metronome of the first item waits for "Let's begin..."; one on in both carries on, one dropped stops at once.
  let timer = await routine(p, env.base, [{ kind: 'intonation', minutes: 1 }, { kind: 'scales' }, { kind: 'intonation' }], { rest: 0, voiceOn: true, chimeOn: true });
  timer.items.forEach((it, i) => { it.tools = { metronome: i < 2, drone: false, playback: false }; });
  await p.evaluate((t) => localStorage.setItem('musicpractice.routine.v1', JSON.stringify(t)), timer);
  await p.goto(env.base + '#routine');
  await p.reload();
  await p.waitForTimeout(800);
  await p.click('#timer-go');
  const waited = await until(p, metOn, 10000);
  c.ok(waited > 1200, `the first item's metronome waits for the voice (${waited} ms)`);
  c.ok(await p.evaluate(() => document.getElementById('trun-icon').dataset.asset) === 'practice-intonation', "the header shows the item's picture");
  await p.click('#trun-skip');
  await p.waitForTimeout(250);
  c.ok(await p.evaluate(metOn), 'a tool on in both items carries on');
  await p.click('#trun-skip');
  await p.waitForTimeout(250);
  c.ok(!(await p.evaluate(metOn)), 'a tool the next item drops stops at once');
  await p.click('#trun-stop');
  // A 15 second break: Break counts down with the tools resting, then the next item starts with its own.
  timer = await routine(p, env.base, [{ kind: 'intonation' }, { kind: 'scales' }, { kind: 'intonation' }], { rest: 15, voiceOn: false });
  timer.items.forEach((it) => { it.tools = { metronome: true, drone: false, playback: false }; });
  await p.evaluate((t) => localStorage.setItem('musicpractice.routine.v1', JSON.stringify(t)), timer);
  await p.goto(env.base + '#routine');
  await p.reload();
  await p.waitForTimeout(800);
  const total = await p.textContent('#timer-sub');
  c.ok(/15 s breaks/.test(total) && (await p.textContent('#timer-clock')) === '11:30', `the total counts the breaks (${await p.textContent('#timer-clock')}, ${total})`);
  await p.click('#timer-go');
  await until(p, metOn, 4000);
  await p.click('#trun-skip');
  await p.waitForTimeout(500);
  const head = () => p.evaluate(() => ({ name: document.getElementById('trun-name').textContent, clock: document.getElementById('trun-clock').textContent, next: document.querySelector('.titem.up-next .titem-name')?.textContent, met: document.querySelector('.tool-card[data-tool="metronome"]').classList.contains('on') }));
  const rest = await head();
  c.ok(rest.name === 'Break' && /^00:1[45]$/.test(rest.clock) && rest.next === 'Scales' && !rest.met, `a break: Break counting down, Scales up next, tools resting (${JSON.stringify(rest)})`);
  const over = await until(p, () => document.getElementById('trun-name').textContent === 'Scales', 17000);
  await p.waitForTimeout(400);
  c.ok(over > 10000 && (await head()).met, `the break ends on time and the next item starts its tools (${over} ms)`);
  await p.click('#trun-skip');
  await p.waitForTimeout(300);
  await p.click('#trun-skip');
  await p.waitForTimeout(300);
  c.ok((await head()).name === 'Intonation', 'Skip goes a step at a time: the item, then its break');
  await p.click('#trun-stop');
  // Pause when done: the break waits until play.
  timer.rest = 'pause';
  await p.evaluate((t) => localStorage.setItem('musicpractice.routine.v1', JSON.stringify(t)), timer);
  await p.reload();
  await p.waitForTimeout(800);
  await p.click('#timer-go');
  await p.waitForTimeout(600);
  await p.click('#trun-skip');
  await p.waitForTimeout(2500);
  c.ok((await head()).name === 'Break', 'pause when done: the break waits');
  await p.click('#trun-go');
  await p.waitForTimeout(500);
  c.ok((await head()).name === 'Scales' && (await head()).met, 'pause when done: play starts the next item');
  c.ok(!p.errors.length, `no page errors running a routine (${p.errors})`);
  await p.close();
}

async function strongBeats(env) {
  const p = await env.page({ theme: 'scifi', mode: 'light' });
  await p.goto(env.base + '#metronome');
  await p.waitForTimeout(800);
  await p.click('#met-toggle');
  const state = () => p.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('musicpractice.settings.v1'));
    return { pattern: s.accentPattern?.pos?.join(',') ?? null, dots: [...document.querySelectorAll('#beats li.strong')].map((l) => [...l.parentElement.children].indexOf(l)).join(','), on: document.getElementById('accent').checked };
  });
  await p.click('#met-settings-btn');
  await p.click('#accent-edit');
  await p.click('#accent-grid .accent-cell >> nth=2');
  await p.waitForTimeout(300);
  let s = await state();
  c.ok(s.pattern === '0,24' && s.dots === '0,2', `a tap is heard at once, on the running metronome (${JSON.stringify(s)})`);
  await p.click('#accent-clear');
  await p.waitForTimeout(300);
  c.ok(!(await state()).on, 'Clear turns Strong beat off');
  await p.click('#accent-grid .accent-cell >> nth=1');
  await p.click('#accent-editor .sheet-head .icon-btn');
  await p.waitForTimeout(300);
  s = await state();
  c.ok(s.pattern === '12' && s.on, `closing keeps the pattern (${JSON.stringify(s)})`);
  c.ok(!p.errors.length, `no page errors in strong beats (${p.errors})`);
  await p.close();
}

async function themes(env) {
  // A theme saved and since taken out (Bebop, archived) opens as Classic.
  const p = await env.page({ theme: 'bebop' });
  const missing = [];
  p.on('response', (r) => { if (r.status() >= 400) missing.push(r.url()); });
  await p.goto(env.base);
  await p.waitForTimeout(1000);
  c.ok(await p.evaluate(() => document.documentElement.dataset.theme) === 'classic', 'a theme that no longer exists opens as Classic');
  c.ok(!missing.length && !p.errors.length, `nothing missing, no page errors (${missing} ${p.errors})`);
  await p.close();
}

export async function run(env) {
  for (const part of [list, running, strongBeats, themes]) {
    try { await part(env); } catch (e) { c.ok(false, `${part.name}: ${e.message.split('\n')[0]}`); }
  }
  return c.done();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const env = await start();
  const failed = await run(env);
  await env.stop();
  process.exitCode = failed ? 1 : 0;
}
