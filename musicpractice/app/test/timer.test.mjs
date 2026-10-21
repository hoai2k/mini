import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TimerRun, cleanRoutine, newItem, PRESETS, TOOLS, totalSeconds, loadTimer, saveTimer, CHIMES, VOICE_DEFAULT, voiceGain, move, toolFor } from '../src/timer.js';

const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };

test('a first visit starts with Intonation and Scales; + offers eight, each with the tool it is usually practised with', () => {
  const { items, chime, tools } = loadTimer(mem());
  assert.deepEqual(items.map((i) => [i.name, i.minutes]), [['Intonation', 3], ['Scales', 5]]);
  assert.deepEqual(Object.keys(items[0]).sort(), ['id', 'kind', 'minutes', 'name']); // a name and minutes: the tools are the routine's, not the item's
  assert.equal(chime, 'kalimba');
  assert.deepEqual(tools, { metronome: false, drone: false, playback: false });
  assert.deepEqual(TOOLS, ['metronome', 'drone', 'playback']);
  assert.deepEqual(PRESETS.map((p) => [p.id, p.minutes, p.tool ?? null]), [
    ['intonation', 3, 'drone'], ['scales', 5, 'metronome'], ['arpeggios', 5, null], ['metronome', 5, 'metronome'],
    ['sight-reading', 5, null], ['improvisation', 5, null], ['rhythms', 3, null], ['ghosting', 3, null],
  ]);
  assert.equal(toolFor(items[0]), 'drone');
  assert.equal(toolFor(newItem(undefined)), null);
  assert.equal(newItem('ghosting').name, 'Ghosting');
  assert.equal(newItem('rhythms').name, 'Clapping Rhythms');
  assert.equal(newItem(undefined).name, ''); // Custom…
});

test('saved routines are kept, cleaned, and an emptied one stays empty; the tools that were on are remembered', () => {
  const s = mem();
  saveTimer({ items: [], tools: { metronome: true, drone: false, playback: true }, chime: 'celesta' }, s);
  assert.deepEqual(loadTimer(s), { items: [], tools: { metronome: true, drone: false, playback: true }, chime: 'celesta', chimeOn: true, lastMinutes: {}, voiceOn: true, voice: 'lily', voiceVolume: VOICE_DEFAULT });
  // Saved when items had their own metronome and drone: those are let go.
  const items = cleanRoutine([{ id: 'a', name: 'x'.repeat(99), minutes: 999, metronome: true, met: { bpm: 90 }, drone: true, drn: { midi: 10 } }, { id: 'a' }, 'junk']);
  assert.equal(items.length, 2); // the duplicate id dropped, the junk made a blank item
  assert.equal(items[0].name.length, 60);
  assert.equal(items[0].minutes, 120);
  assert.deepEqual(Object.keys(items[0]).sort(), ['id', 'kind', 'minutes', 'name']);
  assert.deepEqual(CHIMES, ['kalimba', 'two-tone', 'celesta']);
  assert.equal(totalSeconds([{ minutes: 3 }, { minutes: 5 }]), 480);
});

test('items are moved up and down the list (dragged, or with the arrow keys)', () => {
  const l = ['a', 'b', 'c', 'd'];
  assert.deepEqual(move(l, 0, 2), ['b', 'c', 'a', 'd']);
  assert.deepEqual(move(l, 3, 0), ['d', 'a', 'b', 'c']);
  assert.deepEqual(move(l, 1, 1), l);
  assert.deepEqual(move(l, 2, 99), ['a', 'b', 'd', 'c']);
  assert.deepEqual(l, ['a', 'b', 'c', 'd']); // the original is left alone
});

test('the run moves on at each item\'s end, pauses, skips and finishes', () => {
  const items = [{ minutes: 1 }, { minutes: 2 }, { minutes: 1 }];
  const r = new TimerRun(items, 0);
  assert.equal(r.remaining(30000), 30);
  assert.deepEqual(r.tick(59999), []);
  const c = r.tick(60000);
  assert.equal(c.length, 1);
  assert.equal(c[0].type, 'changed');
  assert.equal(r.index, 1);
  assert.equal(r.remaining(60000), 120);
  r.pause(90000);
  assert.equal(r.remaining(500000), 90); // the clock stops while paused
  assert.deepEqual(r.tick(500000), []);
  r.resume(500000);
  assert.equal(r.remaining(530000), 60);
  // Asleep through the rest: every change is reported, in order.
  const all = r.tick(10_000_000);
  assert.deepEqual(all.map((x) => x.type), ['changed', 'finished']);
  assert.equal(r.done, true);
  assert.equal(r.progress(), 1);
});

test('skip works running or paused; minutes changed while running move the end', () => {
  const r = new TimerRun([{ minutes: 3 }, { minutes: 5 }], 0);
  r.pause(1000);
  r.tick(2000, true);
  assert.equal(r.index, 1);
  assert.equal(r.paused, true);
  assert.equal(r.remaining(99999), 300); // the next item waits at its full time
  r.resume(10000);
  r.item.minutes = 6;
  r.retime(5, 10000);
  assert.equal(r.remaining(10000), 360);
  assert.equal(r.tick(20000, true)[0].type, 'finished');
});

test('every suggestion has its picture in the image requests, in every theme', async () => {
  const { readFileSync } = await import('node:fs');
  const list = JSON.parse(readFileSync(new URL('../data/asset-list.json', import.meta.url)));
  const { THEMES } = await import('../src/settings.js');
  for (const id of [...PRESETS.filter((p) => !p.picture).map((p) => `practice-${p.id}`), 'practice-default']) {
    for (const t of THEMES) assert.ok(list.some((a) => a.id === id && a.theme === t.id), `${id} in ${t.id}: add it to build_requests.py PRACTICE_SUBJECT`);
  }
});

test("an item's picture: its own, else its usual tool's, else the default, else the hourglass", async () => {
  const { pictureFor } = await import('../src/timer.js');
  const scales = newItem('scales');
  const intonation = newItem('intonation');
  const plain = newItem(undefined);
  const all = () => true;
  const none = () => false;
  const only = (...ids) => (id) => ids.includes(id);
  assert.equal(pictureFor(scales, all), 'practice-scales');
  assert.equal(pictureFor(scales, only('home-metronome', 'practice-default')), 'home-metronome');
  assert.equal(pictureFor(intonation, only('drone-cello', 'practice-default')), 'drone-cello');
  assert.equal(pictureFor(newItem('metronome'), all), 'home-metronome');
  assert.equal(pictureFor(plain, only('practice-default')), 'practice-default');
  assert.equal(pictureFor(plain, none), 'home-routine');
  // An item saved before items knew their kind is matched by its name.
  assert.equal(cleanRoutine([{ id: 'x', name: 'Ghosting' }])[0].kind, 'ghosting');
  assert.equal(cleanRoutine([{ id: 'x', name: 'Ghosting', kind: null }])[0].kind, null);
  // Saved before items knew, under a suggestion's earlier name.
  assert.equal(cleanRoutine([{ id: 'x', name: 'Intonation practice' }])[0].kind, 'intonation');
  assert.equal(cleanRoutine([{ id: 'y', name: 'clapping rhythms' }])[0].kind, 'rhythms');
});

test('a new item starts at the length last given to its kind, else the default', () => {
  const s = mem();
  assert.equal(newItem('scales', {}).minutes, 5);
  assert.equal(newItem('scales', { scales: 12 }).minutes, 12);
  assert.equal(newItem('ghosting', { scales: 12 }).minutes, 3);
  assert.equal(newItem(undefined, { custom: 7 }).minutes, 7);
  saveTimer({ items: [], chime: 'kalimba', lastMinutes: { scales: 9, custom: 999, bogus: 4 } }, s);
  assert.deepEqual(loadTimer(s).lastMinutes, { scales: 9, custom: 120 });
});

test('every voice has every line, for every suggestion and for Custom', async () => {
  const { existsSync } = await import('node:fs');
  const { SPEAKERS, voiceLines } = await import('../src/timer.js');
  assert.deepEqual(SPEAKERS, ['lily', 'matilda', 'george', 'clara', 'autumn', 'theo']);
  const kinds = [...PRESETS.map((p) => ({ kind: p.id })), { kind: null }];
  const lines = new Set(['hello']);
  for (const a of kinds) {
    voiceLines.started(a).forEach((l) => lines.add(l));
    voiceLines.finished(a).forEach((l) => lines.add(l));
    for (const b of kinds) voiceLines.changed(a, b).forEach((l) => lines.add(l));
  }
  assert.equal(lines.size, 29);
  for (const v of SPEAKERS) {
    for (const l of lines) assert.ok(existsSync(new URL(`../assets/audio/voice/${v}/${l}.mp3`, import.meta.url)), `${v}/${l}.mp3: generate it (design/voice-samples.md)`);
  }
});

test('voice settings: on by default in Lily\'s voice; kept; an unknown voice falls back', () => {
  const s = mem();
  assert.equal(loadTimer(s).voiceOn, true);
  saveTimer({ items: [], chime: 'kalimba', lastMinutes: {}, voiceOn: false, voice: 'theo' }, s);
  assert.deepEqual([loadTimer(s).voiceOn, loadTimer(s).voice], [false, 'theo']);
  saveTimer({ items: [], chime: 'kalimba', lastMinutes: {}, voiceOn: true, voice: 'nobody' }, s);
  assert.equal(loadTimer(s).voice, 'lily');
});

test('chimes on or off (an old "none" chime is off), and the voice\'s volume kept', () => {
  const s = mem();
  saveTimer({ items: [], chime: 'none' }, s);
  assert.deepEqual([loadTimer(s).chimeOn, loadTimer(s).chime], [false, 'kalimba']);
  saveTimer({ items: [], chime: 'celesta', chimeOn: false, voiceVolume: 0.3 }, s);
  assert.deepEqual([loadTimer(s).chimeOn, loadTimer(s).chime, loadTimer(s).voiceVolume], [false, 'celesta', 0.3]);
  saveTimer({ items: [], voiceVolume: 7 }, s);
  assert.equal(loadTimer(s).voiceVolume, 1);
  assert.ok(Math.abs(voiceGain(VOICE_DEFAULT) - 0.9) < 0.02, 'the default is as loud as the voice always was');
});

test('a Metronome item brings the Metronome\'s card into view, with the Metronome\'s picture', async () => {
  const { pictureFor } = await import('../src/timer.js');
  const it = newItem('metronome');
  assert.deepEqual([it.name, toolFor(it)], ['Metronome', 'metronome']);
  assert.equal(pictureFor(it, () => true), 'home-metronome');
  assert.equal(newItem('sight-reading').name, 'Sight Reading');
});

test('an item saved under its suggestion\'s earlier name shows the name as it is now', () => {
  assert.equal(cleanRoutine([{ id: 'a', name: 'Intonation practice', kind: 'intonation' }])[0].name, 'Intonation');
  assert.equal(cleanRoutine([{ id: 'b', name: 'Intonation practice' }])[0].name, 'Intonation');
  assert.equal(cleanRoutine([{ id: 'c', name: 'clapping rhythms', kind: 'rhythms' }])[0].name, 'Clapping Rhythms');
  assert.equal(cleanRoutine([{ id: 'd', name: 'My scales', kind: 'scales' }])[0].name, 'My scales'); // a name of one's own stays
});
