// A debug log, kept on the device, for problems that only show on a real
// phone (sound too quiet over Bluetooth, the mic keeping the phone in call
// mode). It records what the sound and the microphone did and why: each
// audio context and its states, Safari's audio session, every mic request and
// release and the reason for it, the speakers and mics the phone reports,
// each take played, what the app was playing, and how loud its output was.
// Nothing leaves the device unless the person sends it: "Include debugging
// data" in Send feedback adds the state and the most recent events that fit
// in a message, and Audio check's "Export debug data" saves all of it as a
// JSON file.
//
// Kept in localStorage, the newest MAX_EVENTS events, across visits (a
// problem noticed today can be sent tomorrow). Writing is batched.

export const KEY = 'musicpractice.debuglog.v1';
export const MAX_EVENTS = 1500;
const HEARTBEAT_MS = 10000;

let events = [];
try {
  const saved = JSON.parse(localStorage.getItem(KEY) || '[]');
  if (Array.isArray(saved)) events = saved.slice(-MAX_EVENTS);
} catch { /* a broken log starts again */ }

let saveTimer = 0;
function save() {
  clearTimeout(saveTimer);
  saveTimer = 0;
  try { localStorage.setItem(KEY, JSON.stringify(events)); } catch { /* full: kept in memory */ }
}

/** Note something: `kind` and plain data (numbers, strings, booleans, small objects). */
export function dlog(kind, data = {}) {
  events.push({ t: Date.now(), k: kind, ...data });
  if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS);
  if (!saveTimer) saveTimer = setTimeout(save, 2000);
}

/** All of it, oldest first (a copy). */
export const debugEvents = () => events.slice();

/** A short stand-in for a device id: enough to tell devices apart, nothing more. */
export function shortId(id = '') {
  if (!id) return '';
  if (id === 'default' || id === 'communications') return id;
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36).slice(0, 6);
}

const session = () => (globalThis.navigator?.audioSession ? { type: navigator.audioSession.type, state: navigator.audioSession.state ?? null } : null);

// ---------------------------------------------------------------- state providers

const providers = new Map(); // name -> () => object
/** Something the heartbeat and the snapshot ask about (the app's own state). */
export function debugState(name, f) {
  providers.set(name, f);
}
export function snapshot() {
  const out = { session: session(), visible: globalThis.document?.visibilityState ?? null };
  for (const [name, f] of providers) {
    try { out[name] = f(); } catch (err) { out[name] = { error: String(err) }; }
  }
  return out;
}

// ---------------------------------------------------------------- output level

/*
 * How loud the app's own Web Audio output is (output.js taps the limiter
 * with an analyser): the peak and RMS since the last heartbeat, in dBFS. If
 * this is healthy while the phone sounds quiet, the loss is after the app
 * (the phone's route or volume), not in it.
 */
const meters = new Set(); // { analyser, peak, sum, n }
const buf = new Float32Array(2048);
export function meterOutput(analyser) {
  meters.add({ analyser, peak: 0, sum: 0, n: 0 });
}
function readMeters() {
  for (const m of meters) {
    if (m.analyser.context.state === 'closed') { meters.delete(m); continue; }
    if (m.analyser.context.state !== 'running') continue;
    m.analyser.getFloatTimeDomainData(buf);
    let pk = 0, s = 0;
    for (const v of buf) { const a = Math.abs(v); if (a > pk) pk = a; s += v * v; }
    m.peak = Math.max(m.peak, pk);
    m.sum += s / buf.length;
    m.n++;
  }
}
const db = (x) => (x > 0 ? Math.round(20 * Math.log10(x) * 10) / 10 : -120);
function takeMeters() {
  let peak = 0, sum = 0, n = 0;
  for (const m of meters) { peak = Math.max(peak, m.peak); sum += m.sum; n += m.n; m.peak = 0; m.sum = 0; m.n = 0; }
  return n ? { peakDb: db(peak), rmsDb: db(Math.sqrt(sum / n)) } : null;
}

// ---------------------------------------------------------------- watchers

let last = '';
let lastBeat = 0;
function heartbeat(force = false) {
  const level = takeMeters();
  const s = snapshot();
  const sounding = level && level.peakDb > -80;
  const key = JSON.stringify(s);
  // While something sounds, every beat; otherwise only when something changed.
  if (force || sounding || key !== last || Date.now() - lastBeat > 5 * 60000) {
    dlog('state', { ...s, level });
    last = key;
    lastBeat = Date.now();
  }
}

async function logDevices(why) {
  try {
    const all = await navigator.mediaDevices.enumerateDevices();
    dlog('devices', {
      why,
      list: all.filter((d) => d.kind !== 'videoinput').map((d) => `${d.kind === 'audioinput' ? 'in' : 'out'}:${shortId(d.deviceId)}:${shortId(d.groupId)}:${d.label || '?'}`),
    });
  } catch (err) {
    dlog('devices', { why, error: String(err) });
  }
}

let started = false;
/** Start watching (once, at load). */
export function startDebugLog(info = {}) {
  if (started) return;
  started = true;
  dlog('load', {
    ...info,
    ua: navigator.userAgent,
    standalone: !!(navigator.standalone || matchMedia?.('(display-mode: standalone)').matches),
    screen: `${screen.width}x${screen.height}@${devicePixelRatio}`,
    session: session(),
    hasAudioSession: !!navigator.audioSession,
    hasSetSinkId: typeof HTMLMediaElement !== 'undefined' && 'setSinkId' in HTMLMediaElement.prototype,
  });
  logDevices('load');
  navigator.mediaDevices?.addEventListener?.('devicechange', () => logDevices('change'));
  navigator.audioSession?.addEventListener?.('statechange', () => dlog('session-state', { session: session() }));
  document.addEventListener('visibilitychange', () => {
    dlog('visibility', { state: document.visibilityState, session: session() });
    if (document.visibilityState === 'hidden') save();
  });
  addEventListener('pagehide', () => { dlog('pagehide'); save(); });
  addEventListener('pageshow', (e) => { if (e.persisted) dlog('pageshow', { persisted: true }); });
  addEventListener('error', (e) => dlog('error', { message: String(e.message || e.error || '?').slice(0, 300), where: `${e.filename || ''}:${e.lineno || ''}` }));
  addEventListener('unhandledrejection', (e) => dlog('error', { message: String(e.reason?.message || e.reason || '?').slice(0, 300), where: 'promise' }));
  setInterval(() => { if (document.visibilityState === 'visible') readMeters(); }, 500);
  setInterval(() => { if (document.visibilityState === 'visible') heartbeat(); }, HEARTBEAT_MS);
}
/** Log the state now (when something worth seeing at once happened). */
export const debugBeat = () => heartbeat(true);

// ---------------------------------------------------------------- sending

/**
 * The state now and the most recent events, as text within `max` characters
 * (what fits in a feedback message; Audio check's Export debug data has all).
 */
export function debugText(max = 2800) {
  const head = `Debug log: ${events.length} events since ${events.length ? new Date(events[0].t).toISOString() : '-'}\nNow: ${JSON.stringify(snapshot())}`.slice(0, Math.floor(max / 2));
  const lines = [];
  let room = max - head.length - 40;
  for (let i = events.length - 1; i >= 0 && room > 0; i--) {
    const { t, k, ...rest } = events[i];
    const line = `${new Date(t).toISOString().slice(11, 23)} ${k} ${JSON.stringify(rest)}`.slice(0, 400);
    if (line.length + 1 > room) break;
    lines.unshift(line);
    room -= line.length + 1;
  }
  return `${head}\nLast ${lines.length} events (UTC):\n${lines.join('\n')}`;
}

/** Everything, as a JSON file's text (Audio check's Export debug data). */
export function debugJson(extra = {}) {
  return JSON.stringify({ app: 'musicpractice', exported: new Date().toISOString(), ...extra, now: snapshot(), events }, null, 1);
}
