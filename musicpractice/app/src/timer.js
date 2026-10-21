// The Practice Routine's routine and its clock: a list of practice items, each
// a name and a number of minutes. While it runs, the routine is a shell around
// the tools: the Metronome, the Drone and the Playback Recorder, each turned
// on or off on its card and running with its own settings, whatever item is
// on (TOOLS; which were on is remembered for the next run). Pure: the screen
// is timerui.js, the tools come through main.js.
//
// Inside the code it is the timer (timer.js, timerui.js, TEXT.timer, #timer-…).

import { TEXT } from './text.js';
import { output } from './output.js';

const KEY = 'musicpractice.routine.v1';
export const MAX_ITEMS = 30;
export const MIN_MINUTES = 1;
export const MAX_MINUTES = 120;
const MAX_NAME = 60;

/** The tools a running routine offers, in the order of their cards. */
export const TOOLS = ['metronome', 'drone', 'playback'];

/**
 * The suggestions offered by +. Each needs its own picture, practice-<id>,
 * in the image requests (design/source/build_requests.py, PRACTICE_SUBJECT;
 * test/timer.test.mjs checks). `tool`: the tool it is usually practised
 * with, whose card comes into view as it starts (it turns nothing on).
 */
export const PRESETS = [
  { id: 'intonation', minutes: 3, tool: 'drone' },
  { id: 'scales', minutes: 5, tool: 'metronome' },
  { id: 'arpeggios', minutes: 5 },
  // Its picture is the Metronome's own.
  { id: 'metronome', minutes: 5, tool: 'metronome', picture: 'home-metronome' },
  { id: 'sight-reading', minutes: 5 },
  { id: 'improvisation', minutes: 5 },
  { id: 'rhythms', minutes: 3 },
  { id: 'ghosting', minutes: 3 },
];
/** The tool whose card comes into view as `it` starts, or null. */
export const toolFor = (it) => PRESETS.find((p) => p.id === it?.kind)?.tool || null;
/** The routine a first visit starts with. */
const FIRST_ROUTINE = ['intonation', 'scales'];

let nextId = 1;
const newId = () => `i${Date.now().toString(36)}${(nextId++).toString(36)}`;

/** A new item: from a suggestion (or blank, for Custom…), at the length last given to its kind. */
export function newItem(presetId, lastMinutes = {}) {
  const p = PRESETS.find((x) => x.id === presetId);
  const minutes = lastMinutes[presetId || 'custom'] ?? (p ? p.minutes : 5);
  return clean({ id: newId(), kind: p ? p.id : null, name: p ? TEXT.timer.presets[p.id] : '', minutes });
}

export const defaultRoutine = () => FIRST_ROUTINE.map((id) => newItem(id));

/** `items` with the one at `from` moved to `to` (a new array). */
export function move(items, from, to) {
  const out = items.slice();
  if (from < 0 || from >= out.length) return out;
  const [it] = out.splice(from, 1);
  out.splice(Math.max(0, Math.min(out.length, to)), 0, it);
  return out;
}

const clampInt = (v, lo, hi, d) => (Number.isFinite(Number(v)) ? Math.max(lo, Math.min(hi, Math.round(Number(v)))) : d);

/** One item, with anything missing or out of range put right. */
// A suggestion's name as it is now, or as it was ("Intonation practice", "Clapping rhythms").
const sameName = (preset, name) => [preset, `${preset} practice`].some((n) => n.toLowerCase() === name.trim().toLowerCase());

export function clean(it) {
  const o = it && typeof it === 'object' ? it : {};
  const saved = typeof o.name === 'string' ? o.name.slice(0, MAX_NAME) : '';
  // Which suggestion it came from (its picture), or null for one of its own.
  // Saved before items knew: by its name, if that is a suggestion's.
  const kind = PRESETS.some((p) => p.id === o.kind) ? o.kind
    : o.kind === undefined ? PRESETS.find((p) => sameName(TEXT.timer.presets[p.id], saved))?.id ?? null : null;
  // A suggestion's name as it is now, where it was saved under an earlier one ("Intonation practice").
  const name = kind && sameName(TEXT.timer.presets[kind], saved) ? TEXT.timer.presets[kind] : saved;
  return {
    id: typeof o.id === 'string' && o.id ? o.id.slice(0, 40) : newId(),
    kind,
    name,
    minutes: clampInt(o.minutes, MIN_MINUTES, MAX_MINUTES, 5),
  };
}

/** A saved routine, or the default one on a first visit (an emptied one stays empty). */
export function cleanRoutine(v) {
  if (!Array.isArray(v)) return defaultRoutine();
  const seen = new Set();
  return v.slice(0, MAX_ITEMS).map(clean).filter((it) => !seen.has(it.id) && seen.add(it.id));
}

/** The chime between items (and at the end), from design/chime-sounds.md's second batch, when chimes are on (chimeOn). */
export const CHIMES = ['kalimba', 'two-tone', 'celesta'];

/** The voice's loudness: a slider (0 to 1) to a gain, a curve so equal moves sound like equal steps; the default is the gain it always had (0.9). */
export const VOICE_MAX_GAIN = 1.6;
export const voiceGain = (v) => VOICE_MAX_GAIN * Math.max(0, Math.min(1, v)) ** 2;
export const VOICE_DEFAULT = Math.round(Math.sqrt(0.9 / VOICE_MAX_GAIN) * 100) / 100;

/** The timer's own saved state: the routine, the chime and the voice, and which tools were on. */
export function loadTimer(storage = globalThis.localStorage) {
  let saved = null;
  try { saved = JSON.parse(storage?.getItem(KEY) || 'null'); } catch { /* start afresh */ }
  return {
    items: cleanRoutine(saved?.items),
    tools: Object.fromEntries(TOOLS.map((t) => [t, saved?.tools?.[t] === true])),
    chime: CHIMES.includes(saved?.chime) ? saved.chime : 'kalimba',
    // Chimes on unless turned off ('none' was once a chime of its own: off).
    chimeOn: saved?.chimeOn !== false && saved?.chime !== 'none',
    lastMinutes: cleanLastMinutes(saved?.lastMinutes),
    // Spoken between items, in this voice; on unless turned off.
    voiceOn: saved?.voiceOn !== false,
    voice: SPEAKERS.includes(saved?.voice) ? saved.voice : SPEAKERS[0],
    voiceVolume: Number.isFinite(saved?.voiceVolume) ? Math.max(0, Math.min(1, saved.voiceVolume)) : VOICE_DEFAULT,
  };
}
export function saveTimer({ items, tools, chime, chimeOn, lastMinutes, voiceOn, voice, voiceVolume }, storage = globalThis.localStorage) {
  try { storage?.setItem(KEY, JSON.stringify({ items, tools, chime, chimeOn, lastMinutes, voiceOn, voice, voiceVolume })); } catch { /* not kept */ }
}

/**
 * The minutes last given to each kind of item (a suggestion's id, or
 * 'custom'), which a new one of that kind starts with; a kind never set
 * starts at its suggestion's default.
 */
function cleanLastMinutes(v) {
  const out = {};
  if (!v || typeof v !== 'object') return out;
  for (const k of [...PRESETS.map((p) => p.id), 'custom']) {
    if (Number.isFinite(v[k])) out[k] = Math.max(MIN_MINUTES, Math.min(MAX_MINUTES, Math.round(v[k])));
  }
  return out;
}

/**
 * The voices that speak between items, if Voice is on (the routine's
 * settings); each a calm read of every line (design/voice-samples.md):
 * assets/audio/voice/<voice>/<line>.mp3.
 */
export const SPEAKERS = ['lily', 'matilda', 'george', 'clara', 'autumn', 'theo'];

/*
 * What is said. Every kind of item (a suggestion's id) has its own lines,
 * and an item of its own (Custom…) the generic ones, 'custom':
 * done-<kind> ("Scales are complete."), next-<kind> ("Next, scales.") and
 * first-<kind> ("Let's begin with scales."); then 'finished' at the end, and
 * 'hello' to hear a voice as it is picked. A new suggestion needs its lines
 * generated in every voice (test/timer.test.mjs checks the files are there).
 */
const kindOf = (it) => it?.kind || 'custom';
export const voiceLines = {
  started: (first) => [`first-${kindOf(first)}`],
  changed: (done, next) => [`done-${kindOf(done)}`, `next-${kindOf(next)}`],
  finished: (done) => [`done-${kindOf(done)}`, 'finished'],
};
export const voiceUrl = (voice, line) => new URL(`../assets/audio/voice/${voice}/${line}.mp3`, import.meta.url).href;
export const chimeUrl = (id) => new URL(`../assets/audio/timer/${id}.mp3`, import.meta.url).href;

const clipBuffers = new WeakMap(); // AudioContext -> Map(url -> Promise<AudioBuffer>)
/** A clip decoded on `ctx` (once per context); null if it can't be had. */
export function loadClip(ctx, url) {
  let cache = clipBuffers.get(ctx);
  if (!cache) clipBuffers.set(ctx, (cache = new Map()));
  if (!cache.has(url)) {
    cache.set(url, fetch(url).then((r) => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      .then((data) => new Promise((resolve, reject) => ctx.decodeAudioData(data, resolve, reject)))
      .catch(() => { cache.delete(url); return null; }));
  }
  return cache.get(url);
}

/**
 * Play clips one after another, `gap` seconds apart. Returns { done, stop }:
 * `done` resolves when the last has finished (at once if there are none),
 * `stop` silences them.
 */
export function playClips(ctx, urls, { gap = 0.25, volume = 0.9 } = {}) {
  const sources = [];
  let stopped = false;
  const done = (async () => {
    if (!ctx || !urls.length) return;
    const bufs = (await Promise.all(urls.map((u) => loadClip(ctx, u)))).filter(Boolean);
    if (stopped || !bufs.length) return;
    let at = ctx.currentTime + 0.03;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    gain.connect(output(ctx));
    for (const b of bufs) {
      const src = ctx.createBufferSource();
      src.buffer = b;
      src.connect(gain);
      src.start(at);
      sources.push(src);
      at += b.duration + gap;
    }
    await new Promise((resolve) => { sources.at(-1).onended = resolve; });
  })();
  return { done, stop() { stopped = true; for (const s of sources) { try { s.stop(); } catch { /* not started */ } } } };
}

/** Play chime `id` on `ctx`. */
export function playChime(ctx, id, volume = 0.9) {
  if (!ctx || !CHIMES.includes(id)) return { done: Promise.resolve(), stop() {} };
  return playClips(ctx, [chimeUrl(id)], { volume });
}

export const totalSeconds = (items) => items.reduce((s, it) => s + it.minutes * 60, 0);

/**
 * An item's picture (its icon in the list): its own (practice-<kind>), else
 * its usual tool's (the Drone's cello, the Metronome's), else the default
 * practice picture, else the routine's hourglass. `has(id)` says whether a
 * picture is there to show in the current theme.
 */
export function pictureFor(it, has) {
  const ids = [];
  if (it.kind) ids.push(PRESETS.find((p) => p.id === it.kind)?.picture || `practice-${it.kind}`);
  const tool = toolFor(it);
  if (tool === 'drone') ids.push('drone-cello');
  if (tool === 'metronome') ids.push('home-metronome');
  ids.push('practice-default');
  return ids.find((id) => has(id)) || 'home-routine';
}

/*
 * Hooks for what else marks a change of item, beyond the chime (which the
 * screen plays): a spoken announcement ("Scales finished. Next, five minutes
 * of intonation."), still to be decided. The timer calls them at the right
 * moments and they do nothing yet.
 */
export const cues = {
  /** The routine began, with `item` first. */
  started: (item) => {},
  /** `done` finished and `next` begins now. */
  changed: (done, next) => {},
  /** The last item, `done`, finished. */
  finished: (done) => {},
};

/**
 * Runs a routine against a clock (`now`, in ms; Date.now in use, so time
 * with the screen locked counts). `tick` moves on whenever an item's time
 * is up, as many as are due, and reports what happened; the screen calls it
 * a few times a second and when it is shown again.
 */
export class TimerRun {
  constructor(items, now = Date.now()) {
    this.items = items;
    this.index = 0;
    this.paused = false;
    this.done = false;
    this.endsAt = now + this.items[0].minutes * 60000;
    this.left = 0; // ms left while paused
  }

  get item() { return this.items[this.index]; }
  get next() { return this.items[this.index + 1] || null; }

  /** Seconds left of the current item. */
  remaining(now = Date.now()) {
    if (this.done) return 0;
    return Math.max(0, (this.paused ? this.left : this.endsAt - now) / 1000);
  }

  /** How far through the current item, 0 to 1. */
  progress(now = Date.now()) {
    const total = this.item ? this.item.minutes * 60 : 1;
    return this.done ? 1 : Math.min(1, Math.max(0, 1 - this.remaining(now) / total));
  }

  pause(now = Date.now()) {
    if (this.paused || this.done) return;
    this.left = Math.max(0, this.endsAt - now);
    this.paused = true;
  }

  resume(now = Date.now()) {
    if (!this.paused || this.done) return;
    this.endsAt = now + this.left;
    this.paused = false;
  }

  /** The current item's minutes changed while it runs: its end moves with them. */
  retime(oldMinutes, now = Date.now()) {
    const d = (this.item.minutes - oldMinutes) * 60000;
    if (this.paused) this.left = Math.max(0, this.left + d);
    else this.endsAt += d;
  }

  /**
   * Move on if the time is up (or now, with `force`: Skip). Returns the
   * changes: [{ type: 'changed', done, next }] or [{ type: 'finished', done }].
   */
  tick(now = Date.now(), force = false) {
    const out = [];
    // Skip works while paused too: the next item waits, paused, at its full time.
    while (!this.done && (force || (!this.paused && now >= this.endsAt))) {
      const done = this.item;
      const at = force ? now : this.endsAt;
      force = false;
      if (this.index + 1 >= this.items.length) {
        this.done = true;
        this.paused = false;
        out.push({ type: 'finished', done });
      } else {
        this.index++;
        this.endsAt = at + this.item.minutes * 60000;
        if (this.paused) this.left = this.item.minutes * 60000;
        out.push({ type: 'changed', done, next: this.item });
      }
    }
    return out;
  }
}
