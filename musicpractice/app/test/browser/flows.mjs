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
    // The tuner takes the same mic (no new prompt) and reads A3.
    await p.goto(env.base + '#tuner');
    const read = await until(p, () => document.getElementById('tn-letter').textContent === 'A' && document.getElementById('tn-oct').textContent === '3', 20000);
    c.ok(read >= 0, `the tuner reads the player's A3 (${await p.evaluate(() => document.querySelector('.tuner-note').textContent)})`);
    // Back on the recorder, the take is still there (kept on the device).
    await p.goto(env.base + '#record');
    await p.reload();
    c.ok(await until(p, () => document.querySelectorAll('#takes .take').length === 1, 5000) >= 0, 'the take is kept after a reload');
    c.ok(!p.errors.length, `no page errors with the microphone (${p.errors})`);
    await p.close();
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

export async function run(env) {
  for (const part of [list, running, metronomeScreen, savedTempos, strongBeats, microphone, themes]) {
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
