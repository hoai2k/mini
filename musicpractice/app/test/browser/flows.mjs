// What a person does, end to end, on a phone (touch) and a desktop (mouse):
// the Practice Routine's list (editing, dragging, swiping, names), a routine
// running (tools waiting for the voice, breaks, Skip), the metronome's strong
// beats heard as they are set, and a saved theme that no longer exists.
//
//   node test/browser/flows.mjs
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { start, routine, checks, playerWav } from './lib.mjs';

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

/** Named routines: one saved before there were several is "My routine"; add, switch, rename, delete and undo. */
async function routines(env) {
  const p = await env.page();
  const timer = await routine(p, env.base, [{ kind: 'intonation' }, { kind: 'scales' }]);
  await p.evaluate((t) => localStorage.setItem('musicpractice.routine.v1', JSON.stringify(t)), timer);
  await p.goto(env.base + '#routine');
  await p.reload();
  await p.waitForTimeout(800);
  const pickName = () => p.textContent('#routine-pick-name');
  const rows = () => p.evaluate(() => document.querySelectorAll('#routine-list .routine-row').length);
  c.ok(await pickName() === 'My routine', `a routine saved before there were several is "My routine" (${await pickName()})`);
  await p.click('#routine-pick');
  c.ok(await p.isVisible('#routines'), 'the name opens Routines');
  c.ok(await rows() === 1 && !(await p.isVisible('.routine-del')), 'one routine, which cannot be deleted');
  // A new one starts empty, named where it stands.
  await p.click('#routine-add');
  c.ok(await p.evaluate(() => document.activeElement?.classList.contains('routine-input')), 'a new routine is named at once');
  await p.keyboard.type('Warm-up');
  await p.keyboard.press('Enter');
  c.ok(await rows() === 2 && await pickName() === 'Warm-up', `the new routine is the one shown (${await pickName()})`);
  await p.click('#routines .sheet-head .icon-btn');
  c.ok(await p.isVisible('#timer-empty') && await p.isDisabled('#timer-go'), 'a new routine is empty');
  // Back to the first: its items are there.
  await p.click('#routine-pick');
  await p.click('#routine-list .routine-row:first-child .routine-use');
  c.ok(!(await p.isVisible('#routines')), 'picking a routine closes Routines');
  c.ok(await pickName() === 'My routine' && await p.evaluate(() => document.querySelectorAll('#timer-list .titem').length) === 2, 'the first routine has its two items');
  // Delete, undo, delete again; it lasts a reload.
  await p.click('#routine-pick');
  await p.click('#routine-list .routine-row:last-child .routine-del');
  c.ok(await rows() === 1 && await p.isVisible('#routine-undo'), 'a deleted routine goes, with Undo');
  await p.click('#routine-undo button');
  c.ok(await rows() === 2, 'Undo puts it back');
  await p.click('#routine-list .routine-row:first-child .routine-rename');
  await p.fill('#routine-list .routine-input', 'Daily');
  await p.press('#routine-list .routine-input', 'Enter');
  c.ok(await pickName() === 'Daily', 'renaming the routine shown renames its button');
  await p.click('#routine-list .routine-row:first-child .routine-del');
  c.ok(await pickName() === 'Warm-up', 'deleting the routine shown shows another');
  await p.click('#routines .sheet-head .icon-btn');
  await p.reload();
  await p.waitForTimeout(800);
  c.ok(await pickName() === 'Warm-up' && await p.evaluate(() => JSON.parse(localStorage.getItem('musicpractice.routine.v1')).routines.length) === 1, 'it lasts a reload');
  c.ok(!p.errors.length, `no page errors with routines (${p.errors})`);
  await p.close();
}

/** The practice log: a seeded log shows its streak and days; the metronome playing adds to today. */
async function practiceLog(env) {
  const p = await env.page();
  await p.goto(env.base);
  const days = await p.evaluate(() => {
    const key = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
    const log = { days: { [key(1)]: 1500, [key(2)]: 600, [key(3)]: 30, [key(4)]: 900 } };
    localStorage.setItem('musicpractice.log.v1', JSON.stringify(log));
    return log.days;
  });
  await p.goto(env.base + '#routine');
  await p.reload();
  await p.waitForTimeout(800);
  const summary = await p.textContent('#log-summary');
  c.ok(summary === '2-day streak · 50 min in the last 7 days', `the line under the routine: streak and week (${summary})`);
  await p.click('#log-open');
  const shown = await p.evaluate(() => ({ streak: document.getElementById('log-streak').textContent, week: document.getElementById('log-week').textContent, today: document.getElementById('log-today').textContent, bars: document.querySelectorAll('#log-bars .log-bar').length, days: document.querySelectorAll('#log-days li').length }));
  c.ok(shown.streak === '2' && shown.week === '50 min' && shown.today === '0 min' && shown.bars === 7 && shown.days === 3, `the log: streak, week, today, 7 bars, 3 days practised (${JSON.stringify(shown)})`);
  await p.click('#practice-log .sheet-head .icon-btn');
  // Practice counts: the metronome playing adds to today.
  await p.goto(env.base + '#metronome');
  await p.click('#met-toggle');
  await p.waitForTimeout(11500);
  await p.click('#met-toggle');
  const today = await p.evaluate((seeded) => Object.entries(JSON.parse(localStorage.getItem('musicpractice.log.v1')).days).find(([k]) => !(k in seeded))?.[1] ?? 0, days);
  c.ok(today >= 5 && today <= 13, `the metronome playing counts as practice (${today} s)`);
  c.ok(!p.errors.length, `no page errors with the practice log (${p.errors})`);
  await p.close();
}

/** Tap tempo, big: the first tap grows the button into a pad; taps on it set the tempo; it shrinks back when they stop. */
async function tapPad(env) {
  const p = await env.page();
  await p.goto(env.base + '#metronome');
  await p.waitForTimeout(800);
  // When each tap really landed (each takes the test a moment), button and pad alike.
  await p.evaluate(() => {
    window.__taps = [];
    for (const id of ['tap-tempo', 'tap-pad']) document.getElementById(id).addEventListener('pointerdown', (e) => window.__taps.push(e.timeStamp));
  });
  const box = await p.locator('#tap-tempo').boundingBox();
  await p.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  c.ok(await p.isVisible('#tap-pad') && await p.textContent('#tap-pad-bpm') === '–', 'the first tap grows the Tap button into the pad');
  await p.waitForTimeout(400); // grown
  const padBox = await p.locator('#tap-pad').boundingBox();
  c.ok(padBox.width > 300 && padBox.height > 400, `the pad is big (${Math.round(padBox.width)}×${Math.round(padBox.height)})`);
  const circle = await p.locator('#tap-pad-circle').boundingBox();
  for (let k = 0; k < 5; k++) {
    await p.waitForTimeout(450);
    await p.touchscreen.tap(circle.x + circle.width / 2, circle.y + circle.height / 2);
  }
  const want = await p.evaluate(() => Math.round((60000 * (window.__taps.length - 1)) / (window.__taps.at(-1) - window.__taps[0])));
  const shown = Number(await p.textContent('#tap-pad-bpm'));
  c.ok(Math.abs(shown - want) <= 6 && shown > 90, `taps about every half second show their tempo at the top (${shown}, taps ${want})`);
  const gone = await until(p, () => document.getElementById('tap-pad').hidden, 4000);
  c.ok(gone >= 1500 && gone <= 2600, `2 s after the last tap it shrinks back (${gone} ms)`);
  const bpm = Number(await p.inputValue('#bpm-input'));
  c.ok(bpm === shown, `leaving the tempo set (${bpm})`);
  // One tap and nothing more: it waits 3 s for the next, then closes with the tempo as it was.
  await p.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  const waited = await until(p, () => document.getElementById('tap-pad').hidden, 5000);
  c.ok(waited >= 2600 && waited <= 3600 && Number(await p.inputValue('#bpm-input')) === bpm, `a lone tap waits 3 s, then closes leaving the tempo (${waited} ms)`);
  // Escape closes it at once.
  await p.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  await p.keyboard.press('Escape');
  c.ok(await until(p, () => document.getElementById('tap-pad').hidden, 1000) >= 0, 'Escape closes the pad');
  c.ok(!p.errors.length, `no page errors with the tap pad (${p.errors})`);
  await p.close();
}

/** The weight with a mouse, the metronome swinging: taken hold of anywhere on the rod, the same drag always the same change. */
async function weightGrab(env) {
  const p = await env.page({ touch: false, width: 1100, height: 900 });
  await p.goto(env.base + '#metronome');
  await p.waitForTimeout(1200);
  const bpm = () => p.evaluate(() => Number(document.getElementById('bpm-input').value));
  const setBpm = async (n) => { await p.fill('#bpm-input', String(n)); await p.press('#bpm-input', 'Enter'); };
  const swinging = () => p.evaluate(() => JSON.parse(localStorage.getItem('musicpractice.settings.v1')).swing);
  await setBpm(60);
  await p.click('#met-toggle');
  // The same 60 px drag, grabbed at different points in the swing.
  const changes = [];
  for (let trial = 0; trial < 4; trial++) {
    await setBpm(60);
    await p.waitForTimeout(250 + trial * 290);
    const r = await p.locator('#pend-weight').boundingBox();
    const x = r.x + r.width / 2, y = r.y + r.height / 2;
    await p.mouse.move(x, y);
    await p.mouse.down();
    for (let k = 1; k <= 6; k++) await p.mouse.move(x, y + k * 10);
    await p.mouse.up();
    changes.push((await bpm()) - 60);
  }
  c.ok(changes.every((d) => d > 0 && Math.abs(d - changes[0]) <= 1), `the same drag is the same change wherever the swing was (${changes})`);
  c.ok(await swinging(), 'grabbing the weight leaves the swing on');
  // A press on the rod well above the weight brings the weight there (slower); a plain press there never turns the swing off.
  await setBpm(120);
  await p.waitForTimeout(700);
  const art = await p.locator('#metronome-art').boundingBox();
  await p.evaluate(() => { document.getElementById('pendulum').style.transform = 'rotate(0deg)'; });
  const w = await p.locator('#pend-weight').boundingBox();
  await p.mouse.click(w.x + w.width / 2, w.y - 60);
  c.ok(await bpm() === 120 && await swinging(), 'a click on the rod (no drag) neither moves the tempo nor turns the swing off');
  await p.mouse.move(w.x + w.width / 2, w.y - 60);
  await p.mouse.down();
  await p.mouse.move(w.x + w.width / 2, w.y - 50);
  await p.mouse.move(w.x + w.width / 2, w.y - 60);
  await p.mouse.up();
  c.ok(await bpm() < 120, `pressing on the rod above the weight and moving brings it up there, slower (${await bpm()})`);
  // A click on the case away from the rod is still a tap on the metronome: the swing goes off.
  await p.mouse.click(art.x + art.width * 0.15, art.y + art.height * 0.85);
  c.ok(!(await swinging()), 'a click on the case away from the rod still turns the swing off');
  c.ok(!p.errors.length, `no page errors grabbing the weight (${p.errors})`);
  await p.close();
}

/** Keys: Space plays and stops on every screen, even with a clicked button focused; a button reached with Tab is pressed by it. */
async function keys(env) {
  const p = await env.page({ touch: false, width: 1100, height: 900 });
  const saved = () => p.evaluate(() => JSON.parse(localStorage.getItem('musicpractice.settings.v1')));
  // The drone: click the note down, then Space starts it (the note stays), Space again stops it.
  await p.goto(env.base + '#drone');
  await p.waitForTimeout(1000);
  await p.click('#dr-down');
  await p.waitForTimeout(300);
  const note = () => p.evaluate(() => document.getElementById('dr-pitch').value);
  const droneOn = () => p.evaluate(() => document.getElementById('dr-toggle').getAttribute('aria-pressed') === 'true');
  const midi = await note();
  await p.keyboard.press(' ');
  c.ok(await until(p, () => document.getElementById('dr-toggle').getAttribute('aria-pressed') === 'true', 8000) >= 0, 'drone: Space starts it');
  c.ok(await note() === midi, `drone: Space after clicking the note down doesn't move the note (${midi} -> ${await note()})`);
  await p.keyboard.press(' ');
  await p.waitForTimeout(400);
  c.ok(!(await droneOn()), 'drone: Space again stops it');
  await p.keyboard.press('ArrowUp');
  await p.waitForTimeout(200);
  c.ok(Number(await note()) === Number(midi) + 1, 'drone: the up arrow moves the note up');
  // The metronome: click +, then Space starts it (the tempo stays).
  await p.goto(env.base + '#metronome');
  await p.waitForTimeout(800);
  await p.click('#bpm-up');
  const bpm = (await saved()).bpm;
  await p.keyboard.press(' ');
  await p.waitForTimeout(300);
  c.ok(await p.getAttribute('#met-toggle', 'aria-pressed') === 'true' && (await saved()).bpm === bpm, `metronome: Space after clicking + starts it, the tempo as it was (${bpm})`);
  await p.keyboard.press('PageUp');
  c.ok((await saved()).bpm === bpm + 10, 'metronome: Page Up is 10 faster');
  await p.keyboard.press('-');
  c.ok((await saved()).bpm === bpm + 9, 'metronome: − is 1 slower');
  await p.keyboard.press(' ');
  await p.waitForTimeout(300);
  c.ok(await p.getAttribute('#met-toggle', 'aria-pressed') === 'false', 'metronome: Space stops it');
  // A button reached with Tab is pressed by Space, as usual (here the tempo's +).
  await p.focus('#bpm-down');
  await p.keyboard.press('Tab');
  const focused = await p.evaluate(() => document.activeElement?.id);
  if (focused === 'bpm-up') {
    const before = (await saved()).bpm;
    await p.keyboard.press(' ');
    await p.waitForTimeout(200);
    c.ok((await saved()).bpm === before + 1 && await p.getAttribute('#met-toggle', 'aria-pressed') === 'false', 'metronome: Space presses a button reached with Tab, and does not start it');
  }
  // The routine: Space starts it, and pauses it.
  await p.goto(env.base + '#routine');
  await p.waitForTimeout(800);
  await p.keyboard.press(' ');
  c.ok(await until(p, () => !document.getElementById('timer-run').hidden, 3000) >= 0, 'routine: Space starts it');
  await p.waitForTimeout(400);
  await p.keyboard.press(' ');
  c.ok(await p.getAttribute('#trun-go', 'aria-pressed') === 'false', 'routine: Space pauses it');
  await p.click('#trun-stop');
  c.ok(!p.errors.length, `no page errors with the keys (${p.errors})`);
  await p.close();
}

async function savedTempos(env) {
  const p = await env.page();
  await p.goto(env.base + '#metronome');
  await p.waitForTimeout(800);
  const bpm = () => p.evaluate(() => Number(document.getElementById('bpm-input').value));
  const saved = () => p.evaluate(() => JSON.parse(localStorage.getItem('musicpractice.settings.v1')).savedTempos);
  await p.fill('#bpm-input', '72');
  await p.press('#bpm-input', 'Enter');
  await p.click('#met-settings-btn');
  await p.selectOption('#meter', '3/4');
  await p.click('#met-settings .sheet-head .icon-btn');
  // Save it from the tempo sheet, naming it as it is saved.
  await p.click('#marking');
  c.ok(await p.textContent('#save-tempo') === 'Save 72 BPM · 3/4' && await p.isVisible('#saved-none'), 'the tempo sheet offers to save this tempo');
  await p.click('#save-tempo');
  await p.waitForTimeout(150);
  c.ok(await p.evaluate(() => document.activeElement?.classList.contains('saved-input')), 'a saved tempo is ready to be named');
  await p.keyboard.type('Bach prelude');
  await p.keyboard.press('Enter');
  await p.waitForTimeout(150);
  c.ok(await p.evaluate(() => document.getElementById('tempo-picker').open), 'Enter names it without closing the sheet');
  c.ok(JSON.stringify((await saved()).map(({ name, bpm, meter }) => [name, bpm, meter])) === '[["Bach prelude",72,"3/4"]]', `it is kept (${JSON.stringify(await saved())})`);
  c.ok(await p.evaluate(() => document.getElementById('save-tempo').hidden), 'the same tempo isn\'t offered twice');
  await p.click('#tempo-picker .sheet-head .icon-btn');
  // Somewhere else, then back to it in one tap: tempo and time signature.
  await p.fill('#bpm-input', '140');
  await p.press('#bpm-input', 'Enter');
  await p.click('#met-settings-btn');
  await p.selectOption('#meter', '4/4');
  await p.click('#met-settings .sheet-head .icon-btn');
  await p.reload();
  await p.waitForTimeout(800);
  await p.click('#marking');
  await p.click('#saved-list .saved-use');
  const back = await p.evaluate(() => ({ bpm: Number(document.getElementById('bpm-input').value), meter: document.getElementById('meter').value, open: document.getElementById('tempo-picker').open }));
  c.ok(back.bpm === 72 && back.meter === '3/4' && !back.open, `a saved tempo comes back in one tap, after a reload (${JSON.stringify(back)})`);
  await p.click('#marking');
  await p.click('#saved-list .saved-del');
  c.ok((await saved()).length === 0 && await p.isVisible('#saved-none'), '✕ deletes it');
  c.ok(!p.errors.length, `no page errors with saved tempos (${p.errors})`);
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

/** Practising with the metronome: volume per beat, the tempo trainer and silent bars. */
async function exercises(env) {
  const p = await env.page();
  await p.goto(env.base + '#metronome');
  await p.waitForTimeout(800);
  const saved = () => p.evaluate(() => JSON.parse(localStorage.getItem('musicpractice.settings.v1')));
  // Volume per beat: with the switch on, a tap goes strong, soft, silent, normal.
  await p.click('#met-settings-btn');
  await p.click('#accent-edit');
  await p.click('#levels-on');
  const cell = '#accent-grid .accent-cell >> nth=1';
  const level = () => p.getAttribute('#accent-grid .accent-cell >> nth=1', 'data-level');
  const seen = [];
  for (let k = 0; k < 4; k++) { await p.click(cell); seen.push(await level()); }
  c.ok(seen.join(',') === 'strong,soft,silent,normal', `volume per beat: a tap goes strong, soft, silent, normal (${seen})`);
  await p.click(cell);
  await p.click(cell);
  await p.click('#accent-grid .accent-cell >> nth=3');
  await p.click('#accent-grid .accent-cell >> nth=3');
  await p.click('#accent-grid .accent-cell >> nth=3');
  let s = await saved();
  c.ok(JSON.stringify(s.beatLevels) === '{"meter":"4/4","soft":[12],"silent":[36]}', `beat 2 soft and beat 4 silent are kept (${JSON.stringify(s.beatLevels)})`);
  const dots = await p.evaluate(() => [...document.querySelectorAll('#beats li')].map((l) => (l.classList.contains('soft') ? 'soft' : l.classList.contains('silent') ? 'silent' : '-')).join(','));
  c.ok(dots === '-,soft,-,silent', `the dots show them (${dots})`);
  await p.click('#levels-on');
  c.ok((await saved()).beatLevels === null, 'turning volume per beat off clears soft and silent');
  await p.click('#accent-editor .sheet-head .icon-btn');
  await p.click('#met-settings .sheet-head .icon-btn');
  // The tempo trainer: from 120, up 10 every bar to 140; Stop goes back to 120.
  await p.fill('#bpm-input', '120');
  await p.press('#bpm-input', 'Enter');
  await p.click('#met-settings-btn');
  c.ok(!(await p.isVisible('#trainer-section')), 'the tempo trainer is a switch, its numbers folded away');
  await p.click('#trainer-on');
  c.ok(await p.isVisible('#trainer-section'), 'turned on, its numbers open under it');
  const field = (n) => `#trainer-fields .ex-row:nth-child(${n}) .ex-value`;
  await p.fill(field(1), '140');
  await p.press(field(1), 'Enter');
  await p.fill(field(2), '10');
  await p.press(field(2), 'Enter');
  await p.fill(field(3), '1');
  await p.press(field(3), 'Enter');
  s = await saved();
  c.ok(JSON.stringify(s.trainer) === '{"on":true,"step":10,"every":1,"to":140}', `the trainer's numbers are kept (${JSON.stringify(s.trainer)})`);
  await p.click('#met-settings .sheet-head .icon-btn');
  c.ok(await p.isVisible('#met-exercise'), 'a line under the tempo says the trainer is on');
  await p.click('#met-toggle');
  const climbed = await until(p, () => document.getElementById('bpm-input').value === '140', 9000);
  c.ok(climbed > 1500, `the tempo climbs bar by bar to 140 (${climbed} ms)`);
  await p.waitForTimeout(2500);
  c.ok(await p.inputValue('#bpm-input') === '140', 'and stays at its target');
  await p.click('#met-toggle');
  c.ok(await p.inputValue('#bpm-input') === '120' && (await saved()).bpm === 120, 'Stop puts the tempo back where it started');
  // Silent bars: 2/4 at 240, one bar on and one off: clicks only in every other half second.
  await p.click('#met-settings-btn');
  await p.click('#trainer-on');
  await p.selectOption('#meter', '2/4');
  await p.click('#gap-edit');
  await p.fill('#gap-fields .ex-row:nth-child(1) .ex-value', '1');
  await p.press('#gap-fields .ex-row:nth-child(1) .ex-value', 'Enter');
  await p.fill('#gap-fields .ex-row:nth-child(2) .ex-value', '1');
  await p.press('#gap-fields .ex-row:nth-child(2) .ex-value', 'Enter');
  await p.click('#gap-editor .sheet-head .icon-btn');
  await p.click('#gap-on');
  await p.click('#met-settings .sheet-head .icon-btn');
  await p.fill('#bpm-input', '240');
  await p.press('#bpm-input', 'Enter');
  // Every sound the page schedules, with its time: clicks fall only in the bars with clicks.
  await p.evaluate(() => {
    window.__starts = [];
    for (const Node of [AudioBufferSourceNode, OscillatorNode]) {
      const orig = Node.prototype.start;
      Node.prototype.start = function (when = 0, ...rest) { window.__starts.push(when); return orig.call(this, when, ...rest); };
    }
  });
  await p.click('#met-toggle');
  await p.waitForTimeout(3300);
  await p.click('#met-toggle');
  const bars = await p.evaluate(() => {
    const t = window.__starts.filter((x) => x > 0).sort((a, b) => a - b);
    const t0 = t[0];
    const out = [0, 0, 0, 0, 0, 0];
    for (const x of t) { const b = Math.floor((x - t0 + 0.01) / 0.5); if (b < out.length) out[b]++; }
    return out;
  });
  c.ok(bars[0] > 0 && bars[1] === 0 && bars[2] > 0 && bars[3] === 0 && bars[4] > 0 && bars[5] === 0, `silent bars: clicks in every other bar (${bars})`);
  // The polyrhythm: 3 against 4 at 120 (a bar is 2 s): the higher click a third of a bar apart.
  await p.click('#met-settings-btn');
  await p.click('#gap-on');
  await p.selectOption('#meter', '4/4');
  await p.click('#poly-edit');
  await p.click('#poly-chips .chip >> nth=1');
  c.ok(await p.isChecked('#poly-on') && (await p.textContent('#poly-label')) === 'Polyrhythm: 3 against 4', `choosing 3 turns the polyrhythm on (${await p.textContent('#poly-label')})`);
  await p.click('#poly-editor .sheet-head .icon-btn');
  await p.click('#met-settings .sheet-head .icon-btn');
  await p.fill('#bpm-input', '120');
  await p.press('#bpm-input', 'Enter');
  await p.evaluate(() => {
    window.__poly = [];
    const orig = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (when = 0, ...rest) { if (this.playbackRate.value === 1.5) window.__poly.push(when); return orig.call(this, when, ...rest); };
  });
  await p.click('#met-toggle');
  await p.waitForTimeout(4300);
  const lit = await p.evaluate(() => document.querySelectorAll('#poly-beats li').length);
  await p.click('#met-toggle');
  const gaps = await p.evaluate(() => window.__poly.slice(0, 5).map((t, i, a) => (i ? Math.round((t - a[i - 1]) * 1000) : 0)).slice(1));
  c.ok(gaps.length >= 3 && gaps.every((g) => Math.abs(g - 667) <= 2), `the polyrhythm clicks every third of a bar (${gaps} ms)`);
  c.ok(lit === 3, `three small dots show it (${lit})`);
  c.ok(!p.errors.length, `no page errors practising with the metronome (${p.errors})`);
  await p.close();
}

async function metronomeScreen(env) {
  for (const touch of [true, false]) {
    const how = touch ? 'touch' : 'mouse';
    const p = await env.page({ touch, width: touch ? 390 : 1100, height: 844 });
    await p.goto(env.base + '#metronome');
    await p.waitForTimeout(800);
    const bpm = () => p.evaluate(() => Number(document.getElementById('bpm-input').value));
    const saved = () => p.evaluate(() => JSON.parse(localStorage.getItem('musicpractice.settings.v1')));
    const start = await bpm();
    await p.click('#bpm-up');
    await p.waitForTimeout(100);
    c.ok(await bpm() === start + 1 && (await saved()).bpm === start + 1, `${how}: + adds a beat a minute`);
    await p.fill('#bpm-input', '132');
    await p.press('#bpm-input', 'Enter');
    c.ok(await bpm() === 132 && await p.evaluate(() => document.getElementById('bpm-slider').value) === '132', `${how}: a typed tempo moves the slider`);
    // Tap tempo: four taps half a second apart set 120; T on the keyboard taps too.
    for (let k = 0; k < 4; k++) { await p.locator('#tap-tempo').dispatchEvent('pointerdown', { button: 0 }); await p.waitForTimeout(500); }
    const tapped = await bpm();
    c.ok(Math.abs(tapped - 120) <= 3, `${how}: tapping every half second sets about 120 (${tapped})`);
    await p.waitForTimeout(2500); // a pause starts the taps again
    for (let k = 0; k < 3; k++) { await p.keyboard.press('t'); await p.waitForTimeout(750); }
    const keyed = await bpm();
    c.ok(Math.abs(keyed - 80) <= 3, `${how}: T every 0.75 s sets about 80 (${keyed})`);
    // Start and stop.
    await p.click('#met-toggle');
    await p.waitForTimeout(400);
    const running = await p.evaluate(() => document.getElementById('met-toggle').getAttribute('aria-pressed'));
    const swinging = await p.evaluate(() => document.getElementById('pendulum').style.transform);
    await p.click('#met-toggle');
    c.ok(running === 'true' && /rotate/.test(swinging), `${how}: Start plays and the pendulum swings`);
    c.ok(await p.evaluate(() => document.getElementById('met-toggle').getAttribute('aria-pressed')) === 'false', `${how}: Stop stops`);
    // The marking opens common tempos; one picked sets the tempo.
    await p.click('#marking');
    const pick = await p.evaluate(() => { const b = document.querySelector('#tempo-list .tempo-main'); return Number(b.textContent); });
    await p.click('#tempo-list .tempo-main >> nth=0');
    c.ok(await bpm() === pick && !(await p.evaluate(() => document.getElementById('tempo-picker').open)), `${how}: a common tempo sets ${pick}`);
    // A tap on the dots shows the next view; a tap on the metronome turns the swing off and on.
    const views = [];
    for (let k = 0; k < 3; k++) { await p.click('#met-foot'); await p.waitForTimeout(700); views.push((await saved()).footView); }
    c.ok(views.join() === 'big,bars,dots', `${how}: the dots cycle big, Visualizer, dots (${views})`);
    const swing = (await saved()).swing;
    await p.click('#metronome-art', { position: { x: 20, y: 20 } });
    c.ok((await saved()).swing === !swing, `${how}: a tap on the metronome turns its swing ${swing ? 'off' : 'on'}`);
    await p.click('#metronome-art', { position: { x: 20, y: 20 } });
    // Settings: time signature, eighth notes.
    await p.click('#met-settings-btn');
    await p.selectOption('#meter', '3/4');
    await p.click('#sub-on');
    const set = await p.evaluate(() => ({ dots: document.querySelectorAll('#beats li').length, note: document.getElementById('meter-note').textContent }));
    const s2 = await saved();
    c.ok(set.dots === 3 && s2.meter === '3/4' && s2.subOn === true, `${how}: 3/4 shows three beats and eighths go on (${JSON.stringify(set)})`);
    // The sync bar opens from Audio check, starts the metronome, and Done closes it.
    await p.click('#met-settings .open-audio-check');
    await p.click('#ac-sync-open');
    await p.waitForTimeout(500);
    const open = await p.evaluate(() => ({ bar: !document.getElementById('sync-bar').hidden, playing: document.getElementById('met-toggle').getAttribute('aria-pressed') }));
    await p.click('#sync-down');
    const ms = (await saved()).syncMs;
    await p.click('#sync-done');
    c.ok(open.bar && open.playing === 'true' && await p.evaluate(() => document.getElementById('sync-bar').hidden), `${how}: the sync bar opens with the clicks going, and Done closes it (${JSON.stringify(open)})`);
    c.ok(typeof ms === 'number', `${how}: the sync adjusts (${ms} ms)`);
    await p.click('#met-toggle').catch(() => {});
    // The pendulum's weight: dragged up, the tempo slows.
    if (!touch) {
      const before = await bpm();
      const w = await p.locator('#pend-weight').boundingBox();
      if (w) {
        await p.mouse.move(w.x + w.width / 2, w.y + w.height / 2);
        await p.mouse.down();
        for (let k = 1; k <= 8; k++) await p.mouse.move(w.x + w.width / 2, w.y + w.height / 2 - k * 8);
        await p.mouse.up();
        c.ok(await bpm() < before, `${how}: dragging the weight up slows the tempo (${before} -> ${await bpm()})`);
      } else c.ok(false, `${how}: the pendulum's weight is on screen`);
    }
    c.ok(!p.errors.length, `${how}: no page errors on the metronome (${p.errors})`);
    await p.close();
  }
}

/** The microphone, with a player at it (a looped WAV): the recorder makes a take and plays it back, the tuner reads the note. */
async function microphone() {
  const dir = mkdtempSync(join(tmpdir(), 'mp-mic-'));
  const wav = join(dir, 'player.wav');
  writeFileSync(wav, playerWav(220)); // A3
  const env = await start({ micFile: wav });
  try {
    const p = await env.page();
    await p.goto(env.base + '#record');
    await p.waitForTimeout(1000);
    const state = () => p.evaluate(() => document.getElementById('rec-toggle').dataset.state);
    c.ok(await state() === 'off', 'the recorder opens off');
    await p.click('#rec-toggle');
    c.ok(await until(p, () => document.getElementById('rec-toggle').dataset.state === 'waiting', 5000) >= 0, 'the record button listens');
    c.ok(await until(p, () => document.getElementById('rec-toggle').dataset.state === 'recording', 15000) >= 0, 'a note starts a take');
    c.ok(await until(p, () => document.querySelectorAll('#takes .take').length === 1, 20000) >= 0, 'silence ends it, and the take is listed');
    c.ok(await until(p, () => document.getElementById('rec-toggle').dataset.state === 'playing', 5000) >= 0, 'the take plays back');
    const take = await p.evaluate(() => ({ len: document.querySelector('#takes .take .name > span').textContent, label: document.querySelector('#takes .take .title').textContent }));
    c.ok(/^0:0[2-5]$/.test(take.len), `the take is the note's length (${JSON.stringify(take)})`);
    await p.click('#rec-toggle');
    c.ok(await until(p, () => document.getElementById('rec-toggle').dataset.state === 'off', 5000) >= 0, 'the record button turns it off');
    // Played from the list, the take shows its tools: speed and an A–B loop.
    await p.click('#takes .take .play');
    c.ok(await until(p, () => {
      const t = document.querySelector('#takes .take.playing .take-tools');
      return t && t.offsetHeight > 0 && !t.querySelector('.take-loop').disabled;
    }, 8000) >= 0, 'a playing take shows its speed and loop');
    await p.click('#takes .take.playing .take-speed .chip:first-child');
    c.ok(await p.evaluate(() => JSON.parse(localStorage.getItem('musicpractice.settings.v1')).playRate) === 0.5, 'half speed is chosen and kept');
    await p.click('#takes .take.playing .take-loop');
    c.ok(await p.evaluate(() => document.querySelector('#takes .take-loop').dataset.state) === 'armed', 'the loop button marks a start');
    // At half speed the take would be over in 10 s at most; armed, it goes back to the start instead.
    await p.waitForTimeout(11000);
    c.ok(await p.evaluate(() => !!document.querySelector('#takes .take.playing')), 'a loop with only a start keeps playing past the end');
    await p.click('#takes .take.playing .take-loop');
    c.ok(await p.evaluate(() => document.querySelector('#takes .take-loop').dataset.state) === 'on', 'a second tap marks the end');
    if (process.env.SHOTS) await p.screenshot({ path: `${process.env.SHOTS}/take-tools.png` });
    await p.click('#takes .take.playing .take-loop');
    c.ok(await p.evaluate(() => document.querySelector('#takes .take-loop').dataset.state) === 'off', 'a third tap stops looping');
    await p.click('#takes .take.playing .take-speed .chip:last-child');
    await p.click('#takes .take.playing .play');
    c.ok(await until(p, () => !document.querySelector('#takes .take.playing'), 3000) >= 0, 'its play button stops it');
    // The tuner takes the same mic (no new prompt) and reads A3.
    await p.goto(env.base + '#tuner');
    const read = await until(p, () => document.getElementById('tn-letter').textContent === 'A' && document.getElementById('tn-oct').textContent === '3', 20000);
    c.ok(read >= 0, `the tuner reads the player's A3 (${await p.evaluate(() => document.querySelector('.tuner-note').textContent)})`);
    // The pitch trace draws the note (solid strokes, not just the band and the middle line).
    const traced = await until(p, () => {
      const cv = document.getElementById('pitch-trace');
      if (!cv.width) return false;
      const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
      let n = 0;
      for (let i = 3; i < d.length; i += 4) if (d[i] > 200) n++;
      return n > 50;
    }, 5000);
    c.ok(traced >= 0, 'the pitch trace draws the note');
    // Intonation Exercises → Pure Intervals: against a D3 drone, A3 is a fifth, and a pure fifth is 2 cents wider than the piano's.
    await p.click('#exercises-open');
    c.ok(await p.isVisible('#scale-open') && await p.isVisible('#pure-open'), 'Intonation Exercises offers the scale test and Pure Intervals');
    await p.click('#pure-open');
    c.ok(await p.isVisible('#pure-bar') && !(await p.isVisible('#scale-test')), 'Pure Intervals puts its bar over the gauge');
    for (let k = 0; k < 30 && (await p.textContent('#pure-root')) !== 'Drone D3'; k++) {
      const midi = await p.evaluate(() => JSON.parse(localStorage.getItem('musicpractice.settings.v1')).droneMidi);
      await p.click(midi > 50 ? '#pure-down' : '#pure-up');
    }
    c.ok(await p.textContent('#pure-root') === 'Drone D3', `the drone's note steps to D3 (${await p.textContent('#pure-root')})`);
    const pureRead = await until(p, () => /Perfect fifth/.test(document.getElementById('tn-pure').textContent) && /^−[1-3] cents$/.test(document.getElementById('tn-cents').textContent), 15000);
    c.ok(pureRead >= 0, `A3 over D3 reads as a fifth, a little flat of pure (${await p.textContent('#tn-pure')}; ${await p.textContent('#tn-cents')})`);
    await p.click('#pure-done');
    c.ok(!(await p.isVisible('#pure-bar')) && await p.isVisible('#scale-test'), 'Done goes back to the tuner as it was');
    // Tone Matching: the cello plays a note (the pick fixed here), then the player's A3 is judged.
    const matchRound = async (randomValue) => {
      await p.evaluate((v) => { Math.random = () => v; }, randomValue);
      await p.click('#match-go');
      c.ok(await p.textContent('#match-status') === 'Listen…', 'the cello plays the note first');
      await until(p, () => document.getElementById('match-sheet').dataset.step === 'result', 30000);
      return p.evaluate(() => ({ verdict: document.getElementById('match-verdict').textContent, detail: document.getElementById('match-detail').textContent, score: document.getElementById('match-score').textContent }));
    };
    await p.click('#exercises-open');
    await p.click('#match-open');
    c.ok(await p.isVisible('#match-sheet') && await p.textContent('#match-go') === 'Play a note', 'Tone Matching opens ready to play a note');
    let m = await matchRound(0.7); // A3
    c.ok(m.verdict === 'Right note: A' && /^(Right in tune|[1-5] cents? (sharp|flat)) · in tune$/.test(m.detail) && m.score === '1 of 1 right', `matching A: right note, in tune (${JSON.stringify(m)})`);
    m = await matchRound(0); // G2
    c.ok(m.verdict === 'You played A. The note was G' && m.detail === '2 semitones too high' && m.score === '1 of 2 right', `against G: the wrong note, and by how much (${JSON.stringify(m)})`);
    await p.click('#match-sheet .sheet-head .icon-btn');
    c.ok(await until(p, () => document.getElementById('tn-letter').textContent === 'A', 15000) >= 0, 'closing Tone Matching, the tuner reads again');
    if (process.env.SHOTS) await p.screenshot({ path: `${process.env.SHOTS}/tuner-trace.png` });
    // Back on the recorder, the take is still there (kept on the device).
    await p.goto(env.base + '#record');
    await p.reload();
    c.ok(await until(p, () => document.querySelectorAll('#takes .take').length === 1, 5000) >= 0, 'the take is kept after a reload');
    c.ok(!p.errors.length, `no page errors with the microphone (${p.errors})`);
    await p.close();
    // On an iPhone, Pure Intervals plays the drone for a few seconds, then the tuner listens again.
    const ip = await env.page({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
    await ip.goto(env.base + '#tuner');
    await ip.waitForTimeout(1500);
    await ip.click('#exercises-open');
    await ip.click('#pure-open');
    c.ok(await ip.isVisible('#pure-burst-note') && await ip.textContent('#pure-drone') === 'Hear the drone', 'iPhone: Pure Intervals offers the drone for a few seconds');
    await ip.click('#pure-drone');
    c.ok(await until(ip, () => document.getElementById('pure-drone').textContent === 'Drone playing…', 3000) >= 0, 'iPhone: the drone plays');
    const back = await until(ip, () => document.getElementById('pure-drone').textContent === 'Hear the drone', 12000);
    c.ok(back > 3500, `iPhone: then it stops (${back} ms)`);
    c.ok(await until(ip, () => /Perfect fifth|Major|Minor|Unison|Tritone|Perfect fourth/.test(document.getElementById('tn-pure').textContent), 15000) >= 0, 'iPhone: and the tuner listens again, judging against the drone');
    c.ok(!ip.errors.length, `iPhone: no page errors (${ip.errors})`);
    await ip.close();
  } finally {
    await env.stop();
    rmSync(dir, { recursive: true, force: true });
  }
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

/** `only`: the names of the parts to run (all of them if empty): node flows.mjs exercises routines */
export async function run(env, only = []) {
  for (const part of [list, running, routines, practiceLog, metronomeScreen, tapPad, weightGrab, keys, savedTempos, strongBeats, exercises, microphone, themes]) {
    if (only.length && !only.includes(part.name)) continue;
    try { await part(env); } catch (e) { c.ok(false, `${part.name}: ${e.message.split('\n')[0]}`); }
  }
  return c.done();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const env = await start();
  const failed = await run(env, process.argv.slice(2));
  await env.stop();
  process.exitCode = failed ? 1 : 0;
}
