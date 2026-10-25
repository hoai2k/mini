import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load, save, sanitize, clampBpm, beatStrengths, resolveMode, THEMES, DEFAULTS, barPlan, cleanPattern, TICKS, cleanLevels, cleanGap, cleanTrainer, cleanPoly, trainerNext, metronomeGain, metronomeSlider, SOFT, SILENT } from '../src/settings.js';
import { pendulumAngle, clickSec, trimClick } from '../src/metronome.js';

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

test('a home order saved by an earlier version is dropped (the buttons are in one order)', () => {
  assert.equal(sanitize({ homeOrder: ['record', 'drone', 'metronome', 'tuner'] }).homeOrder, undefined);
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
  assert.deepEqual([bad.droneMidi, bad.droneVoice, bad.droneMinutes, bad.droneThen], [71, 'cello', 0.5, 'chrom-up']);
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

test('extra notes: off by default, a kind kept while off, saves from the Clicks list carried over; the volume', () => {
  assert.deepEqual([DEFAULTS.subOn, DEFAULTS.subKind, sanitize({}).subdivision], [false, 2, 1]);
  assert.equal(sanitize({ subOn: false, subKind: 4 }).subdivision, 1);
  assert.equal(sanitize({ subOn: true, subKind: 3 }).subdivision, 3);
  const old = sanitize({ subdivision: 4 }); // the old Clicks list
  assert.deepEqual([old.subOn, old.subKind, old.subdivision], [true, 4, 4]);
  assert.equal(sanitize({ volume: 0.3 }).volume, DEFAULTS.volume); // an earlier save's, from a removed control: the default
  assert.equal(sanitize({ volume: 0.3, volumeChosen: true, louder: true, volumeCurve: true }).volume, 0.3); // the metronome's own slider
  assert.equal(sanitize({ volume: 7, volumeChosen: true, volumeCurve: true }).volume, 1);
  // Saved on the straight line, the volume was the gain: the slider position with that gain (0.3 -> 0.55).
  assert.equal(sanitize({ volume: 0.3, volumeChosen: true, louder: true }).volume, 0.55);
  assert.equal(sanitize({ volume: 0.4, volumeChosen: true }).volume, 0.55); // saved before the louder clicks too: 0.4 x 0.75
  assert.equal(sanitize({ volume: 1, volumeChosen: true, louder: true }).volume, 1); // full stays full
  assert.equal(sanitize({}).volumeCurve, true);
  // The curve: equal moves, equal steps; full at the top, a quarter of the gain (-12 dB) half way.
  assert.equal(metronomeGain(1), 1);
  assert.equal(metronomeGain(0.5), 0.25);
  assert.equal(metronomeSlider(metronomeGain(0.37)), 0.37);
});

test('drone accidentals: Auto by default, and only real choices kept', () => {
  assert.equal(sanitize({}).droneAccidentals, 'auto');
  assert.equal(sanitize({}).droneSpelling, 'sharps');
  assert.equal(sanitize({ droneAccidentals: 'flats', droneSpelling: 'flats' }).droneAccidentals, 'flats');
  assert.equal(sanitize({ droneSpelling: 'flats' }).droneSpelling, 'flats');
  assert.equal(sanitize({ droneAccidentals: 'double-sharps', droneSpelling: 'x' }).droneAccidentals, 'auto');
  assert.equal(sanitize({ droneSpelling: 'x' }).droneSpelling, 'sharps');
});

test('the last drone\'s length: kept when it is a time, dropped otherwise', () => {
  assert.equal(sanitize({}).droneLastSecs, null);
  assert.equal(sanitize({ droneLastSecs: 754.4 }).droneLastSecs, 754);
  assert.equal(sanitize({ droneLastSecs: -3 }).droneLastSecs, null);
  assert.equal(sanitize({ droneLastSecs: '12' }).droneLastSecs, null);
});

test('the pendulum weight: high is slow, the everyday tempos get most of the rod', async () => {
  const { weightAt, bpmAtWeight, WEIGHT_BPM } = await import('../src/metronome.js');
  assert.deepEqual(WEIGHT_BPM, [40, 300]);
  assert.equal(weightAt(40), 0);
  assert.equal(weightAt(300), 1);
  assert.equal(weightAt(20), 0); // past the ends: stays there
  assert.equal(weightAt(500), 1);
  for (const b of [40, 60, 92, 120, 160, 208, 300]) assert.ok(Math.abs(bpmAtWeight(weightAt(b)) - b) < 1e-9, String(b));
  const span = (a, b) => weightAt(b) - weightAt(a);
  assert.ok(span(60, 160) > 0.4, `60-160 is ${span(60, 160)}`);
  assert.ok(span(200, 300) < 0.2, `200-300 is ${span(200, 300)}`);
  assert.ok(span(200, 300) < span(60, 160) / 2.5);
});

test('louder volumes: the defaults sound as before, and older saves keep their loudness', async () => {
  const { droneGain, droneSlider, DRONE_DEFAULT, DRONE_MAX_GAIN } = await import('../src/drone.js');
  const { METRONOME_DEFAULT } = await import('../src/metronome.js');
  assert.ok(Math.abs(metronomeGain(DEFAULTS.volume) - METRONOME_DEFAULT) < 0.01); // the default sounds as before
  assert.equal(DEFAULTS.droneVolume, DRONE_DEFAULT);
  assert.ok(Math.abs(droneGain(DRONE_DEFAULT) - 1.37) < 0.02); // about -14 LUFS, YouTube's level
  // The old default, saved without the slider being moved, becomes the new one; a chosen volume stays.
  assert.equal(sanitize({ droneVolume: 0.53, louder: true }).droneVolume, DRONE_DEFAULT);
  assert.equal(sanitize({ droneVolume: 0.53, louder: true, droneVolumeChosen: true }).droneVolume, 0.53);
  assert.equal(sanitize({ droneVolume: 0.4, louder: true }).droneVolume, 0.4);
  assert.equal(droneGain(1), DRONE_MAX_GAIN);
  assert.equal(droneGain(0), 0);
  assert.ok(Math.abs(droneSlider(droneGain(0.37)) - 0.37) < 1e-9);
  // A drone volume saved before (a gain) becomes the slider position with that gain.
  for (const old of [0.8, 0.5, 1]) {
    const v = sanitize({ droneVolume: old }).droneVolume;
    assert.ok(Math.abs(droneGain(v) - old) < 0.03, `${old} -> ${v}`);
  }
  assert.equal(sanitize({ droneVolume: 0.9, louder: true }).droneVolume, 0.9); // saved since: as it is
  assert.equal(sanitize({}).louder, true);
});

test('the pendulum weight spans the chosen genre, slowest named tempo to fastest', async () => {
  const { weightAt, bpmAtWeight } = await import('../src/metronome.js');
  const { genreRange, GENRES, GENRE_IDS } = await import('../src/tempos.js');
  assert.deepEqual(genreRange('classical'), [40, 240]);
  assert.deepEqual(genreRange('jazz'), [50, 320]);
  assert.deepEqual(genreRange('ballroom'), [84, 208]);
  for (const g of GENRE_IDS) {
    const r = genreRange(g);
    for (const t of GENRES[g]) for (const b of t.list) assert.ok(b >= r[0] && b <= r[1], `${g} ${b}`);
    assert.equal(weightAt(r[0], r), 0);
    assert.equal(weightAt(r[1], r), 1);
    assert.ok(Math.abs(bpmAtWeight(0, r) - r[0]) < 1e-9 && Math.abs(bpmAtWeight(1, r) - r[1]) < 1e-9, g);
  }
  assert.equal(weightAt(300, genreRange('ballroom')), 1); // past the end: stays there
});

test('Test My Scale difficulty: Hard by default; Custom keeps its own threshold and measure', () => {
  const d = sanitize(null);
  assert.deepEqual([d.scaleLevel, d.scaleTolerance, d.scaleAttack], ['hard', 15, 'mid']);
  const c = sanitize({ scaleLevel: 'custom', scaleTolerance: 99, scaleAttack: 'end' });
  assert.deepEqual([c.scaleLevel, c.scaleTolerance, c.scaleAttack], ['custom', 50, 'end']);
  assert.deepEqual([sanitize({ scaleLevel: 'expert' }).scaleLevel, sanitize({ scaleAttack: 'peak' }).scaleAttack], ['hard', 'mid']);
});

test('tap tempo: the taps\' tempo, from the last few; a pause starts again', async () => {
  const { tapTempo, TAP_RESET } = await import('../src/metronome.js');
  assert.equal(tapTempo([]), null);
  assert.equal(tapTempo([1000]), null);
  assert.equal(tapTempo([1000, 1500]), 120);
  assert.equal(tapTempo([0, 600, 1200, 1800]), 100);
  // A slip in the middle is averaged out.
  assert.equal(tapTempo([0, 500, 1040, 1500, 2000]), 120);
  // A long pause: only the taps since count.
  assert.equal(tapTempo([0, 500, 1000, 1000 + TAP_RESET + 1]), null);
  assert.equal(tapTempo([0, 500, 1000, 1000 + TAP_RESET + 1, 1000 + TAP_RESET + 1001]), 60);
  // Only the last six taps (five gaps) count: an old tempo fades out.
  assert.equal(tapTempo([0, 1000, 2000, 2500, 3000, 3500, 4000, 4500]), 120);
});

test('saved tempos are kept clean: a name, a tempo in range and a real time signature', async () => {
  const { cleanSavedTempos, SAVED_MAX, load } = await import('../src/settings.js');
  assert.deepEqual(cleanSavedTempos(null), []);
  const out = cleanSavedTempos([
    { id: 'a', name: '  Bach Prelude  ', bpm: 72, meter: '3/4' },
    { id: 'a', name: 'duplicate', bpm: 80, meter: '4/4' },
    { id: 'b', bpm: 9999, meter: 'bogus' },
    { name: 'no id', bpm: 60, meter: '4/4' },
    'junk',
  ]);
  assert.deepEqual(out, [
    { id: 'a', name: 'Bach Prelude', bpm: 72, meter: '3/4' },
    { id: 'b', name: '', bpm: 500, meter: '4/4' },
  ]);
  assert.equal(cleanSavedTempos(Array.from({ length: 60 }, (_, i) => ({ id: `x${i}`, bpm: 60, meter: '4/4' }))).length, SAVED_MAX);
  assert.deepEqual(load(null).savedTempos, []);
});

test('volume per beat: soft and silent positions, cleaned, laid over the bar', () => {
  assert.equal(cleanLevels({ meter: '4/4', soft: [], silent: [] }, '4/4'), null);
  assert.equal(cleanLevels({ meter: '3/4', soft: [12] }, '4/4'), null); // another time signature's
  assert.deepEqual(cleanLevels({ meter: '4/4', soft: [12, 12, 24, 99, 1.5], silent: [24, 36] }, '4/4'), { meter: '4/4', soft: [12], silent: [24, 36] });
  // Strong beat on 1, beat 2 soft, beat 4 silent: every position has its click.
  const p = barPlan({ meter: '4/4', accent: true, beatLevels: { meter: '4/4', soft: [TICKS], silent: [3 * TICKS] } });
  assert.deepEqual(p, { strengths: [2, 0, 0, 0], slots: [2, SOFT, 0, SILENT] });
  // With eighths and custom strong beats: the "and" of 3 silent.
  const q = barPlan({ meter: '4/4', accent: true, subdivision: 2, accentPattern: { meter: '4/4', pos: [TICKS] }, beatLevels: { meter: '4/4', soft: [], silent: [2 * TICKS + 6] } });
  assert.deepEqual(q.slots, [0, 3, 2, 3, 0, SILENT, 0, 3]);
  // Strong beat off: the levels still apply.
  assert.deepEqual(barPlan({ meter: '3/4', accent: false, beatLevels: { meter: '3/4', soft: [0] } }).slots, [SOFT, 0, 0]);
});

test('silent bars and the tempo trainer are kept within their ranges', () => {
  assert.deepEqual(cleanGap(undefined), { on: false, play: 2, silent: 2 });
  assert.deepEqual(cleanGap({ on: true, play: 0, silent: 99 }), { on: true, play: 1, silent: 16 });
  assert.deepEqual(cleanTrainer(null), { on: false, step: 2, every: 4, to: 140 });
  assert.deepEqual(cleanTrainer({ on: true, step: 50, every: 0, to: 9999 }), { on: true, step: 20, every: 1, to: 500 });
  assert.equal(trainerNext(100, { step: 4, to: 110 }), 104);
  assert.equal(trainerNext(108, { step: 4, to: 110 }), 110);
  assert.equal(trainerNext(110, { step: 4, to: 110 }), 110);
  assert.equal(trainerNext(120, { step: 5, to: 100 }), 115); // down, toward a slower target
  const s = sanitize({ gap: { on: true, play: 3, silent: 1 }, trainer: { on: true, step: 3, every: 2, to: 90 }, beatLevels: { meter: '4/4', soft: [12] } });
  assert.deepEqual([s.gap, s.trainer, s.beatLevels], [{ on: true, play: 3, silent: 1 }, { on: true, step: 3, every: 2, to: 90 }, { meter: '4/4', soft: [12], silent: [] }]);
});

test('the polyrhythm: 2 to 9 clicks across the bar', () => {
  assert.deepEqual(cleanPoly(undefined), { on: false, n: 3 });
  assert.deepEqual(cleanPoly({ on: true, n: 5 }), { on: true, n: 5 });
  assert.deepEqual(cleanPoly({ on: true, n: 12 }), { on: true, n: 3 });
  assert.deepEqual(sanitize({ poly: { on: true, n: 4 } }).poly, { on: true, n: 4 });
});

test('the metronome sounds: every one is kept as saved, an unknown one falls back to the woodblock', () => {
  for (const sound of ['wood', 'click', 'beep', 'mechanical', 'claves', 'stick', 'cowbell', 'hihat']) assert.equal(sanitize({ sound }).sound, sound);
  assert.equal(sanitize({ sound: 'gong' }).sound, 'wood');
  // The ringing ones are recorded for longer; the rest in a tenth of a second.
  assert.ok(clickSec('cowbell') > 0.2 && clickSec('mechanical') > 0.4);
  assert.equal(clickSec('claves'), 0.1);
  // A recording is cut after its last audible sample, and one that rings to the end is kept whole.
  assert.deepEqual([...trimClick(Float32Array.from([0.5, -0.25, 0.125, 0, 0, 0]))], [0.5, -0.25, 0.125, 0]);
  assert.equal(trimClick(Float32Array.from([0.5, 0.4])).length, 2);
});
