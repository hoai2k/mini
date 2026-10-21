import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TimerRun, cleanRoutine, newItem, PRESETS, TOOLS, totalSeconds, enabledItems, setKind, matchKind, loadTimer, saveTimer, CHIMES, VOICE_DEFAULT, voiceGain, move } from '../src/timer.js';

const base = { bpm: 100, meter: '3/4', sound: 'beep', subOn: true, subKind: 3, accent: false, volume: 0.5, droneMidi: 50, droneVoice: 'organ', droneFifth: true, droneVolume: 0.4, silenceSec: 2.5, autoPlay: false, playVolume: 0.9 };

const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };

test('a first visit starts with Intonation and Scales; + offers eight; each item has its own tools, all off to begin with', () => {
  const { items, chime } = loadTimer(base, mem());
  assert.deepEqual(items.map((i) => [i.name, i.minutes, i.enabled]), [['Intonation', 3, true], ['Scales', 5, true]]);
  assert.equal(chime, 'kalimba');
  assert.deepEqual(TOOLS, ['metronome', 'drone', 'playback']);
  assert.deepEqual(PRESETS.map((p) => [p.id, p.minutes]), [
    ['intonation', 3], ['scales', 5], ['arpeggios', 5], ['metronome', 5],
    ['sight-reading', 5], ['improvisation', 5], ['rhythms', 3], ['ghosting', 3],
  ]);
  // Its tools start off, their settings from the app's own.
  const it = newItem('scales', {}, base);
  assert.deepEqual(it.tools, { metronome: false, drone: false, playback: false });
  assert.deepEqual(it.met, { bpm: 100, meter: '3/4', sound: 'beep', sub: 3, accent: false, volume: 0.5 });
  assert.deepEqual(it.drn, { midi: 50, voice: 'organ', fifth: true, volume: 0.4 });
  assert.deepEqual(it.pb, { silenceSec: 2.5, autoPlay: false, volume: 0.9 });
  assert.equal(newItem('ghosting').name, 'Ghosting');
  assert.equal(newItem('rhythms').name, 'Clapping Rhythms');
  assert.equal(newItem(undefined).name, ''); // Custom…
});

test('saved routines are kept and cleaned, tools and all; an emptied one stays empty', () => {
  const s = mem();
  saveTimer({ items: [], chime: 'celesta' }, s);
  assert.deepEqual(loadTimer(base, s), { items: [], chime: 'celesta', chimeOn: true, lastMinutes: {}, voiceOn: true, voice: 'lily', voiceVolume: VOICE_DEFAULT, metView: 'pendulum' });
  const items = cleanRoutine([{ id: 'a', name: 'x'.repeat(99), minutes: 999, enabled: false, tools: { playback: true, drone: 'yes' }, met: { bpm: 9999, meter: '13/4', sound: 'gong', sub: 5 }, drn: { midi: 10, voice: '?' }, pb: { silenceSec: 99 } }, { id: 'a' }, 'junk']);
  assert.equal(items.length, 2); // the duplicate id dropped, the junk made a blank item
  assert.equal(items[0].name.length, 60);
  assert.equal(items[0].minutes, 120);
  assert.equal(items[0].enabled, false);
  assert.deepEqual(items[0].tools, { metronome: false, drone: false, playback: true });
  assert.deepEqual(items[0].met, { bpm: 500, meter: '4/4', sound: 'wood', sub: 1, accent: true, volume: 0.75 });
  assert.deepEqual(items[0].pb, { silenceSec: 10, autoPlay: true, volume: 1 });
  assert.deepEqual(items[0].drn, { midi: 24, voice: 'cello', fifth: false, volume: 0.7 });
  assert.equal(items[1].enabled, true);
  // Saved when an item had only its own metronome and drone: those carry over.
  assert.deepEqual(cleanRoutine([{ id: 'b', metronome: true, drone: false }])[0].tools, { metronome: true, drone: false, playback: false });
  assert.deepEqual(CHIMES, ['kalimba', 'two-tone', 'celesta']);
});

test('items turned off stay in the list but out of the routine and its time', () => {
  const items = cleanRoutine([{ id: 'a', minutes: 3 }, { id: 'b', minutes: 5, enabled: false }, { id: 'c', minutes: 2 }]);
  assert.deepEqual(enabledItems(items).map((i) => i.id), ['a', 'c']);
  assert.equal(totalSeconds(items), 300);
  assert.equal(totalSeconds([{ minutes: 3 }, { minutes: 5 }]), 480);
});

test('an item\'s kind: a suggestion names it; Custom keeps the name to type', () => {
  const it = newItem('scales');
  setKind(it, 'ghosting');
  assert.deepEqual([it.kind, it.name], ['ghosting', 'Ghosting']);
  setKind(it, null);
  assert.deepEqual([it.kind, it.name], [null, 'Ghosting']);
  it.name = 'Long tones';
  setKind(it, 'nonsense');
  assert.deepEqual([it.kind, it.name], [null, 'Long tones']);
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

test("an item's picture: its own, else its drone's or metronome's, else the default, else the hourglass", async () => {
  const { pictureFor } = await import('../src/timer.js');
  const scales = newItem('scales');
  const drone = { ...newItem(undefined, {}, base), tools: { drone: true } };
  const organ = { ...drone, drn: { voice: 'organ-synth' } };
  const cello = { ...drone, drn: { voice: 'cello' } };
  const met = { ...newItem(undefined), tools: { metronome: true } };
  const plain = newItem(undefined);
  const all = () => true;
  const none = () => false;
  const only = (...ids) => (id) => ids.includes(id);
  assert.equal(pictureFor(scales, all), 'practice-scales');
  assert.equal(pictureFor(cello, only('drone-cello', 'practice-default')), 'drone-cello');
  assert.equal(pictureFor(organ, all), 'drone-organ');
  assert.equal(pictureFor(met, only('home-metronome', 'practice-default')), 'home-metronome');
  assert.equal(pictureFor(newItem('metronome'), all), 'home-metronome');
  assert.equal(pictureFor(plain, only('practice-default')), 'practice-default');
  assert.equal(pictureFor(plain, none), 'home-routine');
  // An item saved before items knew their kind is matched by its name.
  assert.equal(cleanRoutine([{ id: 'x', name: 'Ghosting' }])[0].kind, 'ghosting');
  // One of its own named exactly as a suggestion is that suggestion (only exactly).
  assert.equal(cleanRoutine([{ id: 'x', name: ' ghosting ', kind: null }])[0].kind, 'ghosting');
  assert.equal(cleanRoutine([{ id: 'x', name: 'Ghosting', kind: null }])[0].name, 'Ghosting');
  assert.equal(cleanRoutine([{ id: 'x', name: 'Ghosting drills', kind: null }])[0].kind, null);
  const own = { kind: null, name: 'Scales' };
  assert.equal(matchKind(own).kind, 'scales');
  assert.equal(matchKind({ kind: null, name: 'Scales 2' }).kind, null);
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
  assert.deepEqual(loadTimer(base, s).lastMinutes, { scales: 9, custom: 120 });
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
  assert.equal(loadTimer(base, s).voiceOn, true);
  saveTimer({ items: [], chime: 'kalimba', lastMinutes: {}, voiceOn: false, voice: 'theo' }, s);
  assert.deepEqual([loadTimer(base, s).voiceOn, loadTimer(base, s).voice], [false, 'theo']);
  saveTimer({ items: [], chime: 'kalimba', lastMinutes: {}, voiceOn: true, voice: 'nobody' }, s);
  assert.equal(loadTimer(base, s).voice, 'lily');
});

test('chimes on or off (an old "none" chime is off), and the voice\'s volume kept', () => {
  const s = mem();
  saveTimer({ items: [], chime: 'none' }, s);
  assert.deepEqual([loadTimer(base, s).chimeOn, loadTimer(base, s).chime], [false, 'kalimba']);
  saveTimer({ items: [], chime: 'celesta', chimeOn: false, voiceVolume: 0.3 }, s);
  assert.deepEqual([loadTimer(base, s).chimeOn, loadTimer(base, s).chime, loadTimer(base, s).voiceVolume], [false, 'celesta', 0.3]);
  saveTimer({ items: [], voiceVolume: 7 }, s);
  assert.equal(loadTimer(base, s).voiceVolume, 1);
  assert.ok(Math.abs(voiceGain(VOICE_DEFAULT) - 0.9) < 0.02, 'the default is as loud as the voice always was');
});

test('a Metronome item has the Metronome\'s picture', async () => {
  const { pictureFor } = await import('../src/timer.js');
  const it = newItem('metronome');
  assert.equal(it.name, 'Metronome');
  assert.equal(pictureFor(it, () => true), 'home-metronome');
  assert.equal(newItem('sight-reading').name, 'Sight Reading');
});

test('an item saved under its suggestion\'s earlier name shows the name as it is now', () => {
  assert.equal(cleanRoutine([{ id: 'a', name: 'Intonation practice', kind: 'intonation' }])[0].name, 'Intonation');
  assert.equal(cleanRoutine([{ id: 'b', name: 'Intonation practice' }])[0].name, 'Intonation');
  assert.equal(cleanRoutine([{ id: 'c', name: 'clapping rhythms', kind: 'rhythms' }])[0].name, 'Clapping Rhythms');
  assert.equal(cleanRoutine([{ id: 'd', name: 'My scales', kind: 'scales' }])[0].name, 'My scales'); // a name of one's own stays
});

test('a routine can start from any item (a tap on it in the list)', () => {
  const r = new TimerRun([{ minutes: 1 }, { minutes: 2 }, { minutes: 3 }], 0, 1);
  assert.equal(r.index, 1);
  assert.equal(r.remaining(0), 120);
  assert.deepEqual(r.tick(120000).map((c) => c.type), ['changed']);
  assert.equal(r.index, 2);
  assert.equal(new TimerRun([{ minutes: 1 }], 0, 9).index, 0); // past the end: the last
});

test('an item with more than three settings of its own asks before it is deleted', async () => {
  const { customCount, CONFIRM_OVER } = await import('../src/timer.js');
  const it = newItem('scales', {}, base);
  assert.equal(customCount(it, base), 0); // as the tools are: nothing of its own
  it.tools.metronome = true;
  it.met.bpm = 72;
  it.met.meter = '6/8';
  assert.equal(customCount(it, base), 3);
  assert.ok(!(customCount(it, base) > CONFIRM_OVER));
  it.drn.volume = 0.2;
  assert.equal(customCount(it, base), 4);
  assert.ok(customCount(it, base) > CONFIRM_OVER);
});
