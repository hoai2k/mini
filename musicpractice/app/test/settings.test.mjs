import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load, save, sanitize, clampBpm, beatStrengths, resolveMode, THEMES, DEFAULTS, barPlan, cleanPattern, TICKS } from '../src/settings.js';
import { pendulumAngle } from '../src/metronome.js';

function memoryStorage() {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) };
}

test('defaults: 120 BPM in 4/4 with a strong first beat', () => {
  const s = load(memoryStorage());
  assert.equal(s.bpm, 120);
  assert.equal(s.meter, '4/4');
  assert.equal(s.accent, true);
  assert.equal(s.silenceSec, 3);
  assert.equal(s.recordDuringPlayback, false);
});

test('settings survive a save and load', () => {
  const store = memoryStorage();
  save({ ...DEFAULTS, bpm: 72, meter: '6/8', accent: false, silenceSec: 4.5, startOn: 'any', recordDuringPlayback: true }, store);
  const s = load(store);
  assert.deepEqual([s.bpm, s.meter, s.accent, s.silenceSec, s.startOn, s.recordDuringPlayback], [72, '6/8', false, 4.5, 'any', true]);
});

test('bad or damaged values fall back safely', () => {
  assert.equal(clampBpm(20), 40);
  assert.equal(clampBpm(9000), 500);
  assert.equal(clampBpm('133.6'), 134);
  assert.equal(clampBpm('abc'), 120);
  const s = sanitize({ bpm: 'x', meter: '13/7', silenceSec: 99, sensitivity: 'max' });
  assert.deepEqual([s.bpm, s.meter, s.silenceSec, s.sensitivity], [120, '4/4', 10, 'medium']);
  const broken = { getItem: () => '{not json', setItem() { throw new Error('full'); } };
  assert.equal(load(broken).bpm, 120);
  save(DEFAULTS, broken); // must not throw
});

test('beat strengths follow the time signature', () => {
  assert.deepEqual(beatStrengths('4/4', true), [2, 0, 0, 0]);
  assert.deepEqual(beatStrengths('3/4', false), [0, 0, 0]);
  assert.deepEqual(beatStrengths('6/8', true), [2, 0, 0, 1, 0, 0]);
  assert.deepEqual(beatStrengths('12/8', true), [2, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0]);
  assert.deepEqual(beatStrengths('1', true), [0]);
});

test('the pendulum reaches alternate ends on each beat', () => {
  const p = 0.5;
  assert.equal(pendulumAngle(null, 0, p), 0);
  assert.equal(pendulumAngle({ time: 1, count: 0 }, 1, p, 24), 24);
  assert.ok(Math.abs(pendulumAngle({ time: 1, count: 0 }, 1.25, p, 24)) < 1e-9);
  assert.ok(Math.abs(pendulumAngle({ time: 1, count: 0 }, 1.5, p, 24) + 24) < 1e-9);
  assert.equal(pendulumAngle({ time: 1.5, count: 1 }, 1.5, p, 24), -24);
  // As a real pendulum: fastest through the middle, easing to a stop at the ends.
  const speed = (t) => Math.abs(pendulumAngle({ time: 1, count: 0 }, t + 0.001, p, 24) - pendulumAngle({ time: 1, count: 0 }, t, p, 24));
  assert.ok(speed(1.249) > 10 * speed(1.498), 'faster through the middle than at the end');
  assert.ok(Math.abs(pendulumAngle({ time: 1, count: 0 }, 1 + p / 3, p, 24) - 12) < 1e-9, 'a cosine: half way out a third of the way through');
});

test('Classic is the default theme; a picked theme is kept', () => {
  assert.equal(load(memoryStorage()).theme, 'classic');
  // An earlier save stored the old default without anyone choosing it.
  assert.equal(sanitize({ theme: 'deco' }).theme, 'classic');
  assert.equal(sanitize({ theme: 'deco', themeChosen: true }).theme, 'deco');
  // Classic used to be called Straight.
  assert.equal(sanitize({ theme: 'straight', themeChosen: true }).theme, 'classic');
  const store = memoryStorage();
  save({ ...DEFAULTS, theme: 'deco', themeChosen: true }, store);
  assert.equal(load(store).theme, 'deco');
});

test('tuner settings: defaults, saved, and bad values fall back', () => {
  const store = memoryStorage();
  const d = load(store);
  assert.deepEqual([d.tuning, d.a4, d.flats, d.transpose], ['chromatic', 440, false, 'C']);
  save({ ...DEFAULTS, tuning: 'bass5', a4: 442, flats: true, transpose: 'Eb' }, store);
  const s = load(store);
  assert.deepEqual([s.tuning, s.a4, s.flats, s.transpose], ['bass5', 442, true, 'Eb']);
  const bad = sanitize({ tuning: 'kazoo', a4: 1000, transpose: 'G' });
  assert.deepEqual([bad.tuning, bad.a4, bad.transpose], ['chromatic', 466, 'C']);
});

test('home order: metronome, tuner, drone, recorder by default; a saved order is kept and repaired', () => {
  assert.deepEqual(load(memoryStorage()).homeOrder, ['metronome', 'tuner', 'drone', 'record']);
  assert.deepEqual(sanitize({ homeOrder: ['record', 'drone', 'metronome', 'tuner'] }).homeOrder, ['record', 'drone', 'metronome', 'tuner']);
  // An order saved before the Drone: it goes in after the Tuner, wherever that is.
  assert.deepEqual(sanitize({ homeOrder: ['metronome', 'tuner', 'record'] }).homeOrder, ['metronome', 'tuner', 'drone', 'record']);
  assert.deepEqual(sanitize({ homeOrder: ['tuner', 'record', 'metronome'] }).homeOrder, ['tuner', 'drone', 'record', 'metronome']);
  // Unknown or repeated tools dropped.
  assert.deepEqual(sanitize({ homeOrder: ['tuner', 'kazoo', 'tuner'] }).homeOrder, ['metronome', 'tuner', 'drone', 'record']);
  assert.deepEqual(sanitize({ homeOrder: 'record' }).homeOrder, ['metronome', 'tuner', 'drone', 'record']);
});

test('drone settings: defaults, kept, and bad values fall back', () => {
  const d = sanitize({});
  assert.deepEqual([d.droneMidi, d.droneVoice, d.droneFifth], [48, 'cello', false]);
  // Continuous pitch, looping forever: no timer.
  assert.deepEqual([d.droneMode, d.droneLoop, d.droneLength, d.droneStep, d.droneSeq], ['continuous', true, 10, 2, 'chrom-up']);
  assert.deepEqual([d.droneTimed, d.droneMinutes, d.droneThen], [false, 10, 'stop']);
  // Continuous, not looping: stops after its length.
  const once = sanitize({ droneMode: 'continuous', droneLoop: false, droneLength: 7.5 });
  assert.deepEqual([once.droneTimed, once.droneMinutes, once.droneThen], [true, 7.5, 'stop']);
  // Changing periodically: moves on after each step.
  const s = sanitize({ droneMidi: 41, droneVoice: 'organ', droneMode: 'change', droneStep: 1.5, droneSeq: 'fifths', droneFifth: true, droneFifthChosen: true });
  assert.deepEqual([s.droneMidi, s.droneVoice, s.droneTimed, s.droneMinutes, s.droneThen], [41, 'organ', true, 1.5, 'fifths']);
  const bad = sanitize({ droneMidi: 90, droneVoice: 'tanpura', droneMode: 'change', droneStep: -2, droneSeq: 'random' });
  assert.deepEqual([bad.droneMidi, bad.droneVoice, bad.droneMinutes, bad.droneThen], [59, 'cello', 0.5, 'chrom-up']);
  assert.equal(sanitize({ droneMode: 'sometimes' }).droneMode, 'continuous');
});

test('an old timed drone becomes the matching timing', () => {
  const stop = sanitize({ droneTimed: true, droneMinutes: 5, droneThen: 'stop' });
  assert.deepEqual([stop.droneMode, stop.droneLoop, stop.droneLength], ['continuous', false, 5]);
  const moving = sanitize({ droneTimed: true, droneMinutes: 1.5, droneThen: 'fifths' });
  assert.deepEqual([moving.droneMode, moving.droneStep, moving.droneSeq], ['change', 1.5, 'fifths']);
  const untimed = sanitize({ droneTimed: false, droneMinutes: 3, droneThen: 'fifths' });
  assert.deepEqual([untimed.droneMode, untimed.droneLoop], ['continuous', true]);
});

test('Dark Mode: each theme as designed by default; a choice made at the setting is kept', () => {
  assert.equal(DEFAULTS.appearance, 'default');
  assert.equal(sanitize({ appearance: 'system' }).appearance, 'default'); // an earlier save's default
  assert.equal(sanitize({ appearance: 'system', appearanceChosen: true }).appearance, 'system');
  assert.equal(sanitize({ appearance: 'sepia', appearanceChosen: true }).appearance, 'default');
  assert.equal(resolveMode('classic', 'default', false), 'dark');
  assert.equal(resolveMode('sixties', 'default', true), 'light');
  assert.equal(resolveMode('sixties', 'dark', false), 'dark');
  assert.equal(resolveMode('classic', 'light', true), 'light');
  assert.equal(resolveMode('baroque', 'system', true), 'dark');
  assert.equal(resolveMode('steampunk', 'system', false), 'light');
  for (const t of THEMES) assert.ok(t.mode === 'light' || t.mode === 'dark', t.id);
});

test('every theme has its other mode in styles.css, and the early script knows which are dark', async () => {
  const fs = await import('node:fs');
  const here = new URL('..', import.meta.url).pathname;
  const css = fs.readFileSync(`${here}styles.css`, 'utf8');
  const html = fs.readFileSync(`${here}index.html`, 'utf8');
  const darkList = JSON.parse(html.match(/: 'system', dark = (\[[^\]]*\])/)[1].replace(/'/g, '"'));
  for (const t of THEMES) {
    const other = t.mode === 'dark' ? 'light' : 'dark';
    assert.ok(css.includes(`[data-theme="${t.id}"][data-mode="${other}"] {`), `${t.id} has no ${other} block`);
    assert.equal(darkList.includes(t.id), t.mode === 'dark', `early script: ${t.id}`);
  }
});

test('the drone fifth is off by default; a choice is kept, an old save\'s default is not', () => {
  assert.equal(sanitize({}).droneFifth, false);
  assert.equal(sanitize({ droneFifth: true }).droneFifth, false); // an earlier save's default (it was on)
  assert.equal(sanitize({ droneFifth: true, droneFifthChosen: true }).droneFifth, true);
  assert.equal(sanitize({ droneFifth: false, droneFifthChosen: true }).droneFifth, false);
});

test('the swing and the dots: on and small by default; every earlier save carries over', () => {
  const look = (s) => { const o = sanitize(s); return [o.swing, o.footView]; };
  assert.deepEqual(look({}), [true, 'dots']);
  assert.deepEqual(look({ swing: false, footView: 'big' }), [false, 'big']);
  assert.deepEqual(look({ footView: 'disco' }), [true, 'dots']);
  // On each beat: Swing, Pulse or Off, and the Visualizer as a view of its own.
  assert.deepEqual(look({ pendulumMode: 'swing' }), [true, 'dots']);
  assert.deepEqual(look({ pendulumMode: 'pulse' }), [false, 'big']);
  assert.deepEqual(look({ pendulumMode: 'off' }), [false, 'dots']);
  assert.deepEqual(look({ pendulumMode: 'swing', metView: 'bars' }), [true, 'bars']);
  assert.deepEqual(look({ pendulumMode: 'pulse', metView: 'bars' }), [false, 'bars']);
  // Before that, two switches.
  assert.deepEqual(look({ metMotion: true, metPulse: true }), [true, 'dots']); // the old default pulse, never chosen
  assert.deepEqual(look({ metMotion: true, metPulse: true, metPulseChosen: true }), [false, 'big']);
  assert.deepEqual(look({ metMotion: false, metPulse: false }), [false, 'dots']);
});

test('metronome clicks and view: quarter notes and the metronome by default, kept, bad values fall back', () => {
  assert.equal(DEFAULTS.subdivision, 1);
  assert.equal(sanitize({ subdivision: 3, footView: 'bars' }).subdivision, 3);
  assert.equal(sanitize({ subdivision: 5 }).subdivision, 1);
  assert.equal(sanitize({ subdivision: '2' }).subdivision, 1);
  assert.equal(DEFAULTS.vizBars, 4);
  assert.equal(sanitize({ vizBars: 8 }).vizBars, 8);
  assert.equal(sanitize({ vizBars: 3 }).vizBars, 4);
});

test('custom strong beats: kept for their own time signature; beat 1 alone is not custom', () => {
  assert.deepEqual(cleanPattern({ meter: '4/4', pos: [24, 0, 24, 6] }, '4/4'), { meter: '4/4', pos: [0, 6, 24] });
  assert.equal(cleanPattern({ meter: '4/4', pos: [0] }, '4/4'), null);
  assert.equal(cleanPattern({ meter: '3/4', pos: [12] }, '4/4'), null); // another time signature's
  assert.deepEqual(cleanPattern({ meter: '3/4', pos: [12, 99, -1, 1.5] }, '3/4'), { meter: '3/4', pos: [12] });
  assert.equal(sanitize({ meter: '4/4', accentPattern: { meter: '3/4', pos: [12] } }).accentPattern, null);
  assert.deepEqual(sanitize({ meter: '3/4', accentPattern: { meter: '3/4', pos: [12] } }).accentPattern, { meter: '3/4', pos: [12] });
});

test('the bar plan: the plain rules, or every click from a custom pattern', () => {
  assert.deepEqual(barPlan({ meter: '4/4', accent: true, subdivision: 2 }), { strengths: [2, 0, 0, 0], slots: null });
  // Strong on 2 and on the '&' of 3, in eighths: beats [0,2,0,0]; clicks per position.
  const p = barPlan({ meter: '4/4', accent: true, subdivision: 2, accentPattern: { meter: '4/4', pos: [TICKS, 2 * TICKS + 6] } });
  assert.deepEqual(p.strengths, [0, 2, 0, 0]);
  assert.deepEqual(p.slots, [0, 3, 2, 3, 0, 2, 0, 3]);
  // The same pattern in triplets: the '&' isn't a triplet, so it isn't played (but is kept).
  assert.deepEqual(barPlan({ meter: '4/4', accent: true, subdivision: 3, accentPattern: { meter: '4/4', pos: [TICKS, 30] } }).slots, [0, 3, 3, 2, 3, 3, 0, 3, 3, 0, 3, 3]);
  // Off: no strong beats whatever the pattern says.
  assert.deepEqual(barPlan({ meter: '4/4', accent: false, accentPattern: { meter: '4/4', pos: [12] } }).strengths, [0, 0, 0, 0]);
});

test('extra notes: off by default, a kind kept while off, saves from the Clicks list carried over; full volume', () => {
  assert.deepEqual([DEFAULTS.subOn, DEFAULTS.subKind, sanitize({}).subdivision], [false, 2, 1]);
  assert.equal(sanitize({ subOn: false, subKind: 4 }).subdivision, 1);
  assert.equal(sanitize({ subOn: true, subKind: 3 }).subdivision, 3);
  const old = sanitize({ subdivision: 4 }); // the old Clicks list
  assert.deepEqual([old.subOn, old.subKind, old.subdivision], [true, 4, 4]);
  assert.equal(sanitize({ volume: 0.3 }).volume, 1); // an earlier save's, from a removed control
  assert.equal(sanitize({ volume: 0.3, volumeChosen: true }).volume, 0.3); // the metronome's own slider
  assert.equal(sanitize({ volume: 7, volumeChosen: true }).volume, 1);
});

test('drone accidentals: Auto by default, and only real choices kept', () => {
  assert.equal(sanitize({}).droneAccidentals, 'auto');
  assert.equal(sanitize({}).droneSpelling, 'sharps');
  assert.equal(sanitize({ droneAccidentals: 'flats', droneSpelling: 'flats' }).droneAccidentals, 'flats');
  assert.equal(sanitize({ droneSpelling: 'flats' }).droneSpelling, 'flats');
  assert.equal(sanitize({ droneAccidentals: 'double-sharps', droneSpelling: 'x' }).droneAccidentals, 'auto');
  assert.equal(sanitize({ droneSpelling: 'x' }).droneSpelling, 'sharps');
});
