// The Drone screen: pick a note (− / + or the list) and an instrument, play
// and pause with smooth fades. Timed drones stop, or move to the next note
// of a sequence, after a set time. The note, instrument and timing are kept
// in the settings.

import { TEXT, setRich } from './text.js';
import { DRONE_MIN, DRONE_MAX, VOICES, SEQUENCES, sequenceNote, wrap } from './drone.js';
import { noteName, midiToHz, A4_MIN, A4_MAX } from './tuning.js';

const $ = (id) => document.getElementById(id);
const fmt = (sec) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

/**
 * @param {{ settings: object, persist: () => void, engine: () => import('./drone.js').Drone,
 *   onPlaying: (on: boolean) => void }} opts
 */
export function setupDrone({ settings, persist, engine, onPlaying }) {
  let playing = false;
  let remaining = settings.droneMinutes * 60; // seconds left of a timed drone (counts only while playing)
  let seqStart = settings.droneMidi; // the note a sequence began on
  let seqStep = 0;
  let lastTick = 0;
  let timer = 0;
  let doneNote = '';
  let changesSeen = 0; // changes the native drone made by itself that are counted here (the apps)

  const name = (midi) => {
    const n = noteName(midi, { flats: settings.flats });
    return { ...n, text: `${n.name}${n.octave}` };
  };

  // ---- controls
  const pitch = $('dr-pitch');
  function fillPitches() {
    pitch.replaceChildren(...Array.from({ length: DRONE_MAX - DRONE_MIN + 1 }, (_, i) => {
      const m = DRONE_MIN + i;
      return new Option(name(m).text, String(m));
    }));
    pitch.value = String(settings.droneMidi);
  }
  const voice = $('dr-voice');
  voice.replaceChildren(...VOICES.map((v) => new Option(v.label, v.id)));
  voice.value = settings.droneVoice;
  const then = $('dr-then');
  then.replaceChildren(...SEQUENCES.map((q) => new Option(q.label, q.id)));

  function show() {
    const n = name(settings.droneMidi);
    $('dr-letter').textContent = n.name[0];
    $('dr-acc').textContent = n.name.slice(1);
    $('dr-oct').textContent = n.octave;
    $('dr-hz').textContent = `${midiToHz(settings.droneMidi, settings.a4).toFixed(1)} Hz`;
    pitch.value = String(settings.droneMidi);
    $('dr-down').disabled = false;
    $('dr-up').disabled = false;
    const btn = $('dr-toggle');
    btn.setAttribute('aria-pressed', String(playing));
    $('dr-toggle-label').textContent = playing ? TEXT.drone.pause : TEXT.drone.play;
    $('drone-body').classList.toggle('playing', playing);
    showTimer();
  }

  function showTimer() {
    const el = $('dr-timer');
    el.hidden = !settings.droneTimed && !doneNote;
    if (!settings.droneTimed) { el.textContent = doneNote; return; }
    const left = fmt(Math.max(0, remaining));
    if (settings.droneThen === 'stop') {
      el.textContent = doneNote || (playing ? TEXT.drone.stopsIn(left) : TEXT.drone.playsFor(left));
    } else {
      const next = name(sequenceNote(settings.droneThen, seqStart, seqStep + 1)).text;
      el.textContent = TEXT.drone.nextIn(next, left);
    }
  }

  /**
   * For the apps' native drone, which keeps a timed drone going with the screen
   * locked: when the time is up and the notes that follow (the web Drone ignores it).
   */
  function schedule() {
    if (!settings.droneTimed) return null;
    const first = Math.max(0, remaining);
    const interval = settings.droneMinutes * 60;
    if (settings.droneThen === 'stop') return { first, interval, notes: [], stopAtEnd: true };
    const notes = Array.from({ length: 64 }, (_, k) => sequenceNote(settings.droneThen, seqStart, seqStep + 1 + k));
    return { first, interval, notes, stopAtEnd: false };
  }

  function sound() {
    changesSeen = 0;
    const voiceLabel = VOICES.find((v) => v.id === settings.droneVoice)?.label || '';
    engine().play({
      midi: settings.droneMidi,
      voice: settings.droneVoice,
      a4: settings.a4,
      fifth: settings.droneFifth,
      schedule: schedule(),
      label: TEXT.drone.nowPlaying(name(settings.droneMidi).text, voiceLabel),
    });
  }

  /**
   * The apps: catch up with the native drone, which may have moved on through
   * a sequence, or stopped (its timer, the lock screen, the notification),
   * while this page was asleep.
   */
  async function syncNative() {
    const e = engine();
    if (!e.native || !playing) return;
    let s;
    try { s = await e.state(); } catch { return; }
    if (!playing) return;
    const fresh = s.changes - changesSeen;
    if (fresh > 0) {
      changesSeen = s.changes;
      seqStep += fresh;
      settings.droneMidi = s.midi;
      persist();
    }
    if (s.remaining >= 0) remaining = s.remaining;
    lastTick = performance.now();
    if (!s.playing) {
      playing = false;
      clearInterval(timer);
      onPlaying(false);
      if (s.stoppedByTimer) {
        remaining = settings.droneMinutes * 60;
        doneNote = TEXT.drone.done(fmt(settings.droneMinutes * 60), name(settings.droneMidi).text);
      }
    }
    show();
  }

  // ---- play, pause
  function play() {
    if (playing) return;
    playing = true;
    doneNote = '';
    if (remaining <= 0) remaining = settings.droneMinutes * 60;
    sound();
    lastTick = performance.now();
    clearInterval(timer);
    timer = setInterval(tick, 250);
    onPlaying(true);
    show();
  }

  function pause() {
    if (!playing) return;
    playing = false;
    clearInterval(timer);
    engine().stop();
    onPlaying(false);
    show();
  }

  /** The countdown of a timed drone; at zero, stop or move on. */
  function tick() {
    const now = performance.now();
    const dt = (now - lastTick) / 1000;
    lastTick = now;
    if (!playing || !settings.droneTimed) { showTimer(); return; }
    remaining -= dt;
    if (remaining > 0) { showTimer(); return; }
    remaining = settings.droneMinutes * 60;
    if (settings.droneThen === 'stop') {
      pause();
      doneNote = TEXT.drone.done(fmt(settings.droneMinutes * 60), name(settings.droneMidi).text);
      showTimer();
      return;
    }
    seqStep++;
    settings.droneMidi = sequenceNote(settings.droneThen, seqStart, seqStep);
    persist();
    sound(); // crossfades to the new note
    show();
  }

  /** A note chosen by hand: a sequence starts again from it, with the full time. */
  function setNote(midi) {
    settings.droneMidi = wrap(midi);
    persist();
    seqStart = settings.droneMidi;
    seqStep = 0;
    remaining = settings.droneMinutes * 60;
    doneNote = '';
    if (playing) sound();
    show();
  }

  $('dr-down').addEventListener('click', () => setNote(settings.droneMidi - 1));
  $('dr-up').addEventListener('click', () => setNote(settings.droneMidi + 1));
  pitch.addEventListener('change', () => setNote(Number(pitch.value)));
  voice.addEventListener('change', () => {
    settings.droneVoice = voice.value;
    persist();
    if (playing) sound();
  });
  $('dr-toggle').addEventListener('click', () => (playing ? pause() : play()));

  // ---- settings
  const vol = $('dr-volume');
  vol.value = settings.droneVolume;
  vol.addEventListener('input', () => {
    settings.droneVolume = Number(vol.value);
    persist();
    engine().setVolume(settings.droneVolume);
  });
  const fifth = $('dr-fifth');
  fifth.checked = settings.droneFifth;
  fifth.addEventListener('change', () => {
    settings.droneFifth = fifth.checked;
    settings.droneFifthChosen = true;
    persist();
    if (playing) sound();
  });
  const timed = $('dr-timed');
  const minutes = $('dr-minutes');
  function showTimedOpts() {
    $('dr-timed-opts').hidden = !settings.droneTimed;
    setRich($('dr-minutes-label'), TEXT.drone.settings.length(settings.droneMinutes % 1 ? settings.droneMinutes.toFixed(1) : settings.droneMinutes));
  }
  timed.checked = settings.droneTimed;
  timed.addEventListener('change', () => {
    settings.droneTimed = timed.checked;
    persist();
    remaining = settings.droneMinutes * 60;
    seqStart = settings.droneMidi;
    seqStep = 0;
    doneNote = '';
    showTimedOpts();
    show();
  });
  minutes.value = settings.droneMinutes;
  minutes.addEventListener('input', () => {
    settings.droneMinutes = Number(minutes.value);
    persist();
    remaining = settings.droneMinutes * 60;
    showTimedOpts();
    showTimer();
  });
  then.value = settings.droneThen;
  then.addEventListener('change', () => {
    settings.droneThen = then.value;
    persist();
    seqStart = settings.droneMidi;
    seqStep = 0;
    showTimer();
  });

  // Reference pitch, shared with the tuner.
  const a4 = document.querySelector('.dr-a4');
  function setA4(v) {
    settings.a4 = Math.max(A4_MIN, Math.min(A4_MAX, Math.round(Number(v) || 440)));
    persist();
    refresh();
    if (playing) sound();
  }
  a4.addEventListener('input', () => setA4(a4.value));
  document.querySelector('.dr-a4-down').addEventListener('click', () => setA4(settings.a4 - 1));
  document.querySelector('.dr-a4-up').addEventListener('click', () => setA4(settings.a4 + 1));

  /** Bring the controls in line with the settings (also after the tuner changed A4 or spelling). */
  function refresh() {
    a4.value = settings.a4;
    setRich(document.querySelector('.dr-a4-label'), TEXT.common.referencePitch(settings.a4));
    fillPitches();
    showTimedOpts();
    show();
  }
  refresh();

  return {
    refresh,
    stop: pause,
    toggle: () => (playing ? pause() : play()),
    step: (d) => setNote(settings.droneMidi + d),
    syncNative,
    get playing() { return playing; },
  };
}
