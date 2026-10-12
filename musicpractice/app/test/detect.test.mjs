import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeFrame, PlayDetector, trimBounds, cut, peaks, FRAME } from '../src/detect.js';

const SR = 48000;

// A seeded random source so the noise is the same every run.
function rng(seed = 1) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
}

function silence(sec, level = 0.0005, seed = 7) {
  const r = rng(seed);
  return Float32Array.from({ length: Math.round(sec * SR) }, () => r() * level);
}

/** A plucked/struck note: a few harmonics with a fast attack and slow decay. */
function note(hz, sec, amp = 0.2) {
  const n = Math.round(sec * SR);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const env = Math.min(1, t / 0.005) * Math.exp(-t * 1.2);
    out[i] = amp * env * (Math.sin(2 * Math.PI * hz * t) + 0.5 * Math.sin(4 * Math.PI * hz * t) + 0.25 * Math.sin(6 * Math.PI * hz * t)) / 1.75;
  }
  return out;
}

function chord(hzs, sec, amp = 0.2) {
  const parts = hzs.map((h) => note(h, sec, amp / hzs.length));
  return parts[0].map((_, i) => parts.reduce((s, p) => s + p[i], 0));
}

/** Broadband noise: hiss, or a chair scraping when shaped into bursts. */
function noise(sec, amp = 0.15, seed = 3) {
  const r = rng(seed);
  return Float32Array.from({ length: Math.round(sec * SR) }, () => r() * amp);
}

/** A chair scrape: band-limited noise with a jittery envelope. */
function scrape(sec, amp = 0.3, seed = 5) {
  const r = rng(seed);
  const n = Math.round(sec * SR);
  const out = new Float32Array(n);
  let lp = 0, env = 0.5;
  for (let i = 0; i < n; i++) {
    lp += (r() - lp) * 0.3;
    if (i % 480 === 0) env = 0.3 + Math.abs(r()) * 0.7;
    out[i] = lp * amp * env * 3;
  }
  return out;
}

/** A thump (foot, desk knock): a decaying low-frequency impulse with noise. */
function thump(amp = 0.5, seed = 9) {
  const r = rng(seed);
  const n = Math.round(0.25 * SR);
  return Float32Array.from({ length: n }, (_, i) => {
    const t = i / SR;
    return amp * Math.exp(-t * 30) * (Math.sin(2 * Math.PI * 70 * t * (1 - t * 2)) * 0.6 + r() * 0.4);
  });
}

function concat(...parts) {
  const out = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

/** Run a detector over a signal, returning its events with times in seconds. */
function run(signal, opts = {}) {
  const d = new PlayDetector({ sampleRate: SR, ...opts });
  const events = [];
  for (let at = 0; at + FRAME <= signal.length; at += FRAME) {
    const e = d.feed(analyzeFrame(signal.subarray(at, at + FRAME), SR), at, FRAME);
    if (e) {
      events.push({ ...e, t: (at + FRAME) / SR });
      if (e.type === 'end') d.reset();
    }
  }
  return { events, detector: d };
}

test('a steady tone is clear and its pitch is found', () => {
  for (const hz of [82.4, 196, 440, 1046.5]) {
    const f = analyzeFrame(note(hz, 0.2).subarray(2000, 2000 + FRAME), SR);
    assert.ok(f.clarity > 0.9, `clarity ${f.clarity} at ${hz} Hz`);
    assert.ok(Math.abs(f.hz - hz) / hz < 0.02, `found ${f.hz} for ${hz}`);
  }
});

test('hiss and scrapes are not clearly pitched', () => {
  // (A thump can ring at a low pitch for a frame; it is too short to start a take.)
  for (const [name, sig] of [['hiss', noise(0.2)], ['scrape', scrape(0.2)]]) {
    const f = analyzeFrame(sig.subarray(0, FRAME), SR);
    assert.ok(f.clarity < 0.6, `${name} clarity ${f.clarity}`);
  }
});

test('moving a chair and knocking the desk does not start a take', () => {
  const sig = concat(silence(1), scrape(1.2), silence(0.5), thump(), thump(0.7, 4), silence(0.5), noise(0.8, 0.2), silence(1));
  for (const sensitivity of ['low', 'medium', 'high']) {
    const { events } = run(sig, { sensitivity });
    assert.deepEqual(events, [], `sensitivity ${sensitivity}`);
  }
});

test('playing starts a take quickly, and it ends after the chosen silence', () => {
  const phrase = concat(note(262, 0.5), note(330, 0.5), chord([262, 330, 392], 1.2), note(294, 0.6));
  const sig = concat(silence(1), scrape(0.5), silence(0.5), phrase, silence(5));
  const { events } = run(sig, { silenceSec: 3 });
  assert.equal(events.length, 2);
  const [start, end] = events;
  assert.equal(start.type, 'start');
  assert.ok(start.t > 2 && start.t < 2.25, `started ${start.t}`);
  assert.ok(Math.abs(start.at / SR - 2) < 0.06, `take begins at ${start.at / SR}`);
  assert.equal(end.type, 'end');
  const phraseEnd = 2 + phrase.length / SR;
  assert.ok(end.t > phraseEnd + 2 && end.t < phraseEnd + 3.5, `ended ${end.t} for phrase end ${phraseEnd}`);
});

test('pauses shorter than the silence setting stay in one take', () => {
  const sig = concat(silence(0.5), note(440, 0.8), silence(1.5), note(494, 0.8), silence(4));
  const { events } = run(sig, { silenceSec: 2.5 });
  assert.deepEqual(events.map((e) => e.type), ['start', 'end']);
  const short = run(sig, { silenceSec: 1 });
  assert.deepEqual(short.events.map((e) => e.type), ['start', 'end', 'start', 'end']);
});

test('"any sound" mode starts on drums', () => {
  const hits = concat(...Array.from({ length: 6 }, () => concat(thump(0.6), silence(0.15, 0.0005, 2))));
  const sig = concat(silence(1), hits, silence(4));
  assert.equal(run(sig).events.length, 0);
  assert.deepEqual(run(sig, { mode: 'any', silenceSec: 2 }).events.map((e) => e.type), ['start', 'end']);
});

test('trimming keeps the attack and the ring-out but drops the silence', () => {
  const sig = concat(silence(2), note(330, 1.5), silence(4));
  const { events, detector } = run(sig, { silenceSec: 3 });
  const end = events.find((e) => e.type === 'end');
  const b = trimBounds(sig, SR, end.start, end.end, detector.floor);
  assert.ok(b.start / SR > 1.9 && b.start / SR <= 2.0, `start ${b.start / SR}`);
  assert.ok(b.end / SR > 3.3 && b.end / SR < 5, `end ${b.end / SR}`);
  const take = cut(sig, b.start, b.end, SR);
  assert.equal(take.length, b.end - b.start);
  assert.ok(take[0] === 0);
});

test('peaks gives min and max per column', () => {
  const p = peaks(Float32Array.from([0, 1, -1, 0.5, 0, -0.25]), 2);
  assert.deepEqual(Array.from(p), [-1, 1, -0.25, 0.5]);
});

test('a bowed note with vibrato starts a take', () => {
  const n = Math.round(1.5 * SR);
  let ph = 0;
  const bowed = Float32Array.from({ length: n }, (_, i) => {
    const t = i / SR;
    ph += (2 * Math.PI * 392 * (1 + 0.015 * Math.sin(2 * Math.PI * 6 * t))) / SR;
    return 0.1 * Math.min(1, t / 0.08) * (Math.sin(ph) + 0.4 * Math.sin(2 * ph) + 0.3 * Math.sin(3 * ph));
  });
  const { events } = run(concat(silence(1), bowed, silence(4)));
  assert.deepEqual(events.map((e) => e.type), ['start', 'end']);
});
