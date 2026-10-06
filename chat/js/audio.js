// Tiny synthesised sound effects (no audio files). sfx('pop') etc.
// The AudioContext starts on the first user gesture; until then calls are
// silently dropped.

import { load } from './store.js';

let ctx = null;
let volume = load('settings', {}).volume ?? 0.6;

export function setVolume(v) {
  volume = v;
}

export function unlockAudio() {
  if (!ctx) {
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
}

function tone({ freq = 440, to = freq, type = 'sine', dur = 0.15, gain = 0.3, delay = 0 }) {
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain * volume, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noise({ dur = 0.2, gain = 0.3, freq = 1200, delay = 0 }) {
  const t0 = ctx.currentTime + delay;
  const len = Math.ceil(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.value = gain * volume;
  src.connect(filter).connect(g).connect(ctx.destination);
  src.start(t0);
}

const SOUNDS = {
  pop: () => { tone({ freq: 900, to: 180, dur: 0.09, gain: 0.5 }); noise({ dur: 0.08, gain: 0.25, freq: 3000 }); },
  blow: () => noise({ dur: 0.35, gain: 0.12, freq: 600 }),
  whoosh: () => noise({ dur: 0.4, gain: 0.2, freq: 900 }),
  click: () => tone({ freq: 700, to: 500, dur: 0.05, gain: 0.2, type: 'triangle' }),
  score: () => { tone({ freq: 660, dur: 0.1, gain: 0.3, type: 'triangle' }); tone({ freq: 990, dur: 0.18, gain: 0.3, type: 'triangle', delay: 0.09 }); },
  miss: () => tone({ freq: 300, to: 160, dur: 0.25, gain: 0.25, type: 'sawtooth' }),
  bounce: () => tone({ freq: 220, to: 120, dur: 0.08, gain: 0.3 }),
  win: () => [523, 659, 784, 1046].forEach((f, i) => tone({ freq: f, dur: 0.18, gain: 0.3, type: 'triangle', delay: i * 0.1 })),
  lose: () => [392, 330, 262].forEach((f, i) => tone({ freq: f, dur: 0.25, gain: 0.25, type: 'triangle', delay: i * 0.14 })),
  tick: () => tone({ freq: 1200, dur: 0.03, gain: 0.15, type: 'square' }),
  join: () => { tone({ freq: 523, dur: 0.12, gain: 0.25 }); tone({ freq: 784, dur: 0.2, gain: 0.25, delay: 0.1 }); },
  leave: () => { tone({ freq: 784, dur: 0.12, gain: 0.2 }); tone({ freq: 523, dur: 0.2, gain: 0.2, delay: 0.1 }); },
  zap: () => { tone({ freq: 1800, to: 80, dur: 0.3, gain: 0.25, type: 'sawtooth' }); noise({ dur: 0.3, gain: 0.2, freq: 2000 }); },
  fire: () => noise({ dur: 0.5, gain: 0.25, freq: 400 }),
  bang: () => { noise({ dur: 0.25, gain: 0.6, freq: 500 }); tone({ freq: 120, to: 40, dur: 0.25, gain: 0.5 }); },
  flap: () => noise({ dur: 0.08, gain: 0.2, freq: 1500 }),
  honk: () => tone({ freq: 330, to: 300, dur: 0.25, gain: 0.3, type: 'square' }),
};

export function sfx(name) {
  if (!ctx || ctx.state !== 'running' || volume <= 0) return;
  try { SOUNDS[name]?.(); } catch {}
}

export const SOUND_NAMES = Object.keys(SOUNDS);
