// The metronome and the drone in the iOS and Android apps: played by native
// code (the PracticeAudio plugin, mobile/), so they keep going with the
// screen locked, when the web view's JavaScript is paused. The web code still
// makes the sounds: it renders the metronome's clicks and hands over the
// drone's loops, and the native mixer plays them (and moves a timed drone on
// by itself). NativeMetronome and NativeDrone stand in for Metronome and
// Drone in main.js. On the website none of this is used.

import { TEXT } from './text-config.js';
import { call, hasPlugin, listen } from './native.js';
import { Metronome, SUB } from './metronome.js';
import { barPlan } from './settings.js';
import { SAMPLED, loadLoop, renderSynthLoop, synthSpec, SYNTH_ANCHORS, SYNTH_MAX_SHIFT, droneGain, DRONE_DEFAULT } from './drone.js';
import { extraDelaySec } from './audio.js';

const PLUGIN = 'PracticeAudio';
const run = (method, options) => call(PLUGIN, method, options);

/** Does this app have native audio? */
export const nativeAudio = () => hasPlugin(PLUGIN);

/** Something stopped from the lock screen, the notification, or a call: fn({ what: 'metronome' | 'drone' | 'all' }). */
export function onNativeStopped(fn) {
  listen(PLUGIN, 'addListener', { eventName: 'stopped' }, (data) => fn(data || {}));
}

/** Samples as base64 16-bit, for the bridge. */
export function encode(samples) {
  const pcm = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    pcm[i] = v < 0 ? v * 0x8000 : v * 0x7fff;
  }
  const bytes = new Uint8Array(pcm.buffer);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

/** The metronome's four clicks (weak, mid, strong, between the beats) for `sound`, rendered by metronome.js. */
export async function renderClicks(sound, sampleRate) {
  const out = [];
  for (const strength of [0, 1, 2, SUB]) {
    const ctx = new OfflineAudioContext(1, Math.ceil(0.1 * sampleRate), sampleRate);
    const m = new Metronome(ctx);
    m.configure({ bpm: 120, meter: '4/4', accent: true, sound, volume: 1 });
    m.synth(0, strength);
    out.push((await ctx.startRendering()).getChannelData(0));
  }
  return out;
}

/** A drone voice's loops, as plain samples: { level, wet, lowpass, maxShift, loops: [{ hz, sampleRate, channels, samples }] }. */
export async function voiceLoops(voice) {
  const spec = SAMPLED[voice];
  if (spec) {
    const ctx = new OfflineAudioContext(1, 1, 44100);
    const loops = await Promise.all(spec.loops.map(async (l) => {
      const buf = await loadLoop(ctx, l.file);
      const start = Math.round(l.margin * buf.sampleRate);
      const end = Math.min(buf.length, Math.round((l.margin + l.loop) * buf.sampleRate));
      const channels = Math.min(2, buf.numberOfChannels);
      const samples = new Float32Array((end - start) * channels);
      for (let c = 0; c < channels; c++) {
        const d = buf.getChannelData(c);
        for (let i = start; i < end; i++) samples[(i - start) * channels + c] = d[i];
      }
      return { hz: l.hz, sampleRate: buf.sampleRate, channels, samples };
    }));
    return { level: spec.level, wet: spec.wet ?? 0.32, lowpass: spec.lowpass ?? 0, maxShift: spec.maxShift ?? 4, loops };
  }
  const synth = synthSpec(voice);
  if (!synth) throw new Error(`no voice ${voice}`);
  const loops = [];
  for (const midi of SYNTH_ANCHORS) {
    const hz = 440 * 2 ** ((midi - 69) / 12);
    loops.push({ hz, sampleRate: 44100, channels: 1, samples: await renderSynthLoop(voice, hz) });
  }
  return { level: synth.level, wet: synth.wet, lowpass: 0, maxShift: SYNTH_MAX_SHIFT, loops };
}

let sampleRate = 0;
async function outputRate() {
  if (!sampleRate) sampleRate = (await run('info'))?.sampleRate || 48000;
  return sampleRate;
}

// ---------------------------------------------------------------- metronome

/**
 * The metronome, played natively. Same interface as Metronome for main.js,
 * but its times are in seconds of the system clock (Date.now() / 1000), which
 * the native side uses for when each beat is heard: heardNow() and beatAt()
 * work in that clock.
 */
export class NativeMetronome {
  constructor() {
    this.native = true;
    this.running = false;
    this.bpm = 120;
    this.strengths = [2, 0, 0, 0];
    this.volume = 0.8;
    this.sound = 'wood';
    this.clicksFor = ''; // the sound whose clicks the native side has
    this.clock = null; // { at (s), count, beat, period }: when beat `count` is heard
    this.pollTimer = 0;
  }

  get period() {
    return 60 / this.bpm;
  }

  configure(s) {
    this.bpm = s.bpm;
    this.subdivision = s.subdivision || 1;
    const plan = barPlan(s);
    this.strengths = plan.strengths;
    this.slots = plan.slots || []; // custom strong beats: the click for every position (empty: the plain rules)
    this.volume = s.volume;
    this.sound = s.sound;
    if (this.running) this.update();
  }

  label() {
    return TEXT.nowPlaying.metronome(this.bpm);
  }

  async clicks() {
    if (this.clicksFor === this.sound) return null;
    const rate = await outputRate();
    const sound = this.sound;
    const c = await renderClicks(sound, rate);
    this.clicksFor = sound;
    return { clicks: c.map(encode), clickRate: rate };
  }

  async start() {
    this.running = true;
    this.clock = null;
    const clicks = await this.clicks();
    if (!this.running) return;
    await run('metronomeStart', { bpm: this.bpm, strengths: this.strengths, subdivision: this.subdivision, slots: this.slots, volume: this.volume, label: this.label(), ...clicks });
    this.poll();
    clearInterval(this.pollTimer);
    this.pollTimer = setInterval(() => this.poll(), 1000);
  }

  stop() {
    this.running = false;
    clearInterval(this.pollTimer);
    run('metronomeStop').catch(() => {});
  }

  async update() {
    const token = (this.updating = (this.updating || 0) + 1);
    const clicks = await this.clicks();
    if (token !== this.updating || !this.running) return;
    await run('metronomeUpdate', { bpm: this.bpm, strengths: this.strengths, subdivision: this.subdivision, slots: this.slots, volume: this.volume, label: this.label(), ...clicks });
    this.poll();
  }

  /** Ask the native side when the next beat will be heard. Resolves false if it has stopped. */
  async poll() {
    try {
      const c = await run('metronomeClock');
      if (!c?.running) return false;
      this.clock = { at: c.nextBeatAt / 1000, count: c.nextCount, beat: c.nextBeat, period: c.period };
      return true;
    } catch {
      return this.running;
    }
  }

  /** Now, in this metronome's clock, as heard: looked `lead` seconds ahead, less the sync adjustment. */
  heardNow(lead = 0) {
    return Date.now() / 1000 + lead - extraDelaySec();
  }

  /** The beat being heard at time `t`, or null before the first. */
  beatAt(t) {
    const c = this.clock;
    if (!c) return null;
    const k = Math.floor((t - c.at) / c.period); // beats after the clock's beat
    const count = c.count + k;
    if (count < 0) return null;
    const n = this.strengths.length;
    const beat = (((c.beat + k) % n) + n) % n;
    return { time: c.at + k * c.period, beat, count, strength: this.strengths[beat] ?? 0 };
  }

  /** The last few beats heard by `t` (for the sync bar's tap timing). */
  beatsUntil(t) {
    const last = this.beatAt(t);
    if (!last) return [];
    const out = [];
    for (let k = 3; k >= 0; k--) {
      const b = this.beatAt(last.time - k * this.clock.period + 1e-6);
      if (b) out.push(b);
    }
    return out;
  }
}

// ---------------------------------------------------------------- drone

/** The drone, played natively. Same interface as Drone for droneui.js, plus a schedule for timed drones and state(). */
export class NativeDrone {
  constructor() {
    this.native = true;
    this.playing = false;
    this.volume = DRONE_DEFAULT;
    this.loaded = new Map(); // voice -> Promise
    this.ticket = 0;
  }

  /** `v`: the slider, 0 to 1; the native mixer takes its gain (droneGain, up to DRONE_MAX_GAIN). */
  setVolume(v) {
    this.volume = v;
    run('droneVolume', { volume: droneGain(v) }).catch(() => {});
  }

  /** Hand a voice's loops to the native side (once). */
  ensureVoice(voice) {
    if (!this.loaded.has(voice)) {
      const p = (async () => {
        const has = await run('hasVoice', { id: voice });
        if (has?.loaded) return;
        const v = await voiceLoops(voice);
        await run('loadVoice', {
          id: voice,
          level: v.level,
          wet: v.wet,
          lowpass: v.lowpass,
          maxShift: v.maxShift,
          loops: v.loops.map((l) => ({ hz: l.hz, sampleRate: l.sampleRate, channels: l.channels, data: encode(l.samples) })),
        });
      })();
      p.catch(() => this.loaded.delete(voice));
      this.loaded.set(voice, p);
    }
    return this.loaded.get(voice);
  }

  /** { midi, voice, a4, fifth, schedule, label }: start, or move to a new note or voice. */
  async play({ midi, voice, a4 = 440, fifth = false, schedule = null, label = TEXT.nowPlaying.drone }) {
    const ticket = ++this.ticket;
    this.playing = true;
    await this.ensureVoice(voice);
    if (ticket !== this.ticket) return;
    await run('dronePlay', { voice, midi, a4, fifth, volume: droneGain(this.volume), schedule, label });
  }

  stop() {
    this.ticket++;
    this.playing = false;
    run('droneStop').catch(() => {});
  }

  /** { playing, midi, changes, remaining, stoppedByTimer } from the native side. */
  state() {
    return run('droneState');
  }
}
