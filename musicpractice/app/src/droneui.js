// The Drone screen: pick a note (− / + or the list) and an instrument, play
// and pause with smooth fades. Timed drones stop, or move to the next note
// of a sequence, after a set time. The note, instrument and timing are kept
// in the settings.

import { TEXT, setRich } from './text.js';
import { droneTiming } from './settings.js';
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
  then.replaceChildren(...SEQUENCES.filter((q) => q.id !== 'stop').map((q) => new Option(q.label, q.id)));

  function show() {
    const n = name(settings.droneMidi);
    $('dr-letter').textContent = n.name[0];
    $('dr-acc').textContent = n.name.slice(1);
    $('dr-oct').textContent = n.octave;
    $('dr-hz-val').textContent = `${midiToHz(settings.droneMidi, settings.a4).toFixed(1)} Hz`;
    // "(+5th)" lit beside the frequency while the fifth plays, faint while it doesn't.
    $('dr-fifth-tag').classList.toggle('on', settings.droneFifth);
    $('dr-hz').setAttribute('aria-pressed', String(settings.droneFifth));
    $('dr-hz').setAttribute('aria-label', `${$('dr-hz-val').textContent}. ${TEXT.drone.fifthButton(settings.droneFifth)}`);
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

  // ---- volume: the upright slider beside the picture, or (the Bow as
  // volume, the default) the bow standing beside the cello, its hair lit from the
  // frog up to the level; either is dragged up or down, or set with the
  // arrow keys. The settings sheet has a slider too.
  const vol = $('dr-volume');
  const sliders = [
    { el: $('dr-vol'), track: $('dr-vol').querySelector('.vslider-track') },
    { el: $('dr-bow'), track: $('dr-bow').querySelector('.bow-hair') },
  ];
  function showVolume() {
    vol.value = settings.droneVolume;
    for (const { el } of sliders) {
      el.style.setProperty('--v', settings.droneVolume);
      el.setAttribute('aria-valuenow', String(Math.round(settings.droneVolume * 100)));
      el.setAttribute('aria-valuetext', `${Math.round(settings.droneVolume * 100)}%`);
    }
  }
  function setVolume(v) {
    settings.droneVolume = Math.round(Math.max(0, Math.min(1, v)) * 100) / 100;
    persist();
    showVolume();
    engine().setVolume(settings.droneVolume);
  }
  vol.addEventListener('input', () => setVolume(Number(vol.value)));
  for (const { el, track } of sliders) {
    const fromPointer = (e) => {
      const r = track.getBoundingClientRect();
      return (r.bottom - e.clientY) / r.height;
    };
    el.addEventListener('pointerdown', (e) => {
      if (e.button) return;
      e.preventDefault();
      el.focus({ preventScroll: true });
      el.setPointerCapture(e.pointerId);
      el.classList.add('held');
      setVolume(fromPointer(e));
    });
    el.addEventListener('pointermove', (e) => { if (el.hasPointerCapture(e.pointerId)) setVolume(fromPointer(e)); });
    for (const type of ['pointerup', 'pointercancel']) el.addEventListener(type, () => el.classList.remove('held'));
    el.addEventListener('keydown', (e) => {
      const step = { ArrowUp: 0.05, ArrowRight: 0.05, ArrowDown: -0.05, ArrowLeft: -0.05, PageUp: 0.2, PageDown: -0.2 }[e.key];
      if (e.key === 'Home' || e.key === 'End') setVolume(e.key === 'End' ? 1 : 0);
      else if (step) setVolume(settings.droneVolume + step);
      else return;
      e.preventDefault();
      e.stopPropagation(); // not the page's arrow keys (which move the note)
    });
  }
  // Bow as volume (on by default; off gives the plain slider): the cello
  // drawn without its bow, and the bow beside it is the volume.
  function showBow() {
    const bow = settings.droneBow;
    $('dr-art').hidden = bow;
    $('dr-art-nobow').hidden = !bow;
    $('dr-vol').hidden = bow;
    $('dr-bow-col').hidden = !bow;
    $('drone-body').classList.toggle('bowed', bow);
    $('dr-bow-on').checked = bow;
    queueFit();
  }
  $('dr-bow-on').addEventListener('change', () => {
    settings.droneBow = $('dr-bow-on').checked;
    settings.droneBowChosen = true;
    persist();
    showBow();
  });
  showVolume();

  // ---- settings
  // The fifth: the switch here, or a tap on the frequency under the note.
  const fifth = $('dr-fifth');
  fifth.checked = settings.droneFifth;
  function setFifth(on) {
    settings.droneFifth = on;
    settings.droneFifthChosen = true;
    fifth.checked = on;
    persist();
    show();
    if (playing) sound();
  }
  fifth.addEventListener('change', () => setFifth(fifth.checked));
  $('dr-hz').addEventListener('click', () => setFifth(!settings.droneFifth));
  // Timing: Continuous pitch (Loop forever, or a Length after which it stops)
  // or Change periodically (Time on each pitch, then When time's up). The
  // drone plays by droneTimed, droneMinutes and droneThen (droneTiming).
  const fmtMin = (m) => (m % 1 ? m.toFixed(1) : m);
  const tabs = ['continuous', 'change'].map((id) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.setAttribute('role', 'radio');
    b.textContent = TEXT.drone.settings.modes[id];
    b.addEventListener('click', () => { settings.droneMode = id; timingChanged(); });
    return b;
  });
  $('dr-mode-tabs').replaceChildren(...tabs);
  function showTimingOpts() {
    const change = settings.droneMode === 'change';
    tabs.forEach((b, i) => { b.setAttribute('aria-checked', String(change === (i === 1))); b.tabIndex = change === (i === 1) ? 0 : -1; });
    $('dr-mode-tabs').dataset.on = change ? 'last' : 'first';
    $('dr-continuous-opts').hidden = change;
    $('dr-change-opts').hidden = !change;
    $('dr-loop').checked = settings.droneLoop;
    $('dr-length-row').hidden = settings.droneLoop;
    $('dr-length').value = settings.droneLength;
    $('dr-step').value = settings.droneStep;
    then.value = settings.droneSeq;
    setRich($('dr-length-label'), TEXT.drone.settings.length(fmtMin(settings.droneLength)));
    setRich($('dr-step-label'), TEXT.drone.settings.step(fmtMin(settings.droneStep)));
  }
  /** A change of timing starts it again from now, and from the note playing. */
  function timingChanged() {
    droneTiming(settings);
    persist();
    remaining = settings.droneMinutes * 60;
    seqStart = settings.droneMidi;
    seqStep = 0;
    doneNote = '';
    showTimingOpts();
    show();
    if (playing) sound(); // the apps' native drone takes the new schedule with the note
  }
  $('dr-loop').addEventListener('change', () => { settings.droneLoop = $('dr-loop').checked; timingChanged(); });
  for (const [id, key] of [['dr-length', 'droneLength'], ['dr-step', 'droneStep']]) {
    $(id).addEventListener('input', () => {
      settings[key] = Number($(id).value);
      droneTiming(settings);
      persist();
      remaining = settings.droneMinutes * 60;
      showTimingOpts();
      showTimer();
    });
    $(id).addEventListener('change', () => { if (playing) sound(); });
  }
  then.addEventListener('change', () => {
    settings.droneSeq = then.value;
    timingChanged();
  });
  showTimingOpts();

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

  /*
   * Size: on a phone or tablet held upright, the picture takes the height the
   * controls leave (and as much width as there is), so the page fills the
   * screen without scrolling. Measured, since the controls' height varies by
   * theme, font and window; room is kept for the timer line, so it can come
   * and go without moving anything. Side by side (a phone on its side), the
   * stylesheet sizes it.
   */
  const scr = $('drone');
  const body = $('drone-body');
  const art = body.querySelector('.drone-art');
  function fit() {
    if (scr.hidden) return;
    if (getComputedStyle(body).display !== 'flex') { scr.style.removeProperty('--art'); return; }
    const cur = art.getBoundingClientRect().height;
    if (!cur) return;
    const timerEl = $('dr-timer');
    const gap = parseFloat(getComputedStyle(body).rowGap) || 0;
    const timerRoom = timerEl.hidden ? (parseFloat(getComputedStyle(timerEl).lineHeight) || 24) + gap : 0;
    // The controls sit centred in the space, so measure them from the first to the last.
    const shown = [...body.children].filter((e) => e.offsetParent).map((e) => e.getBoundingClientRect());
    const used = Math.max(...shown.map((r) => r.bottom)) - Math.min(...shown.map((r) => r.top));
    const pad = parseFloat(getComputedStyle(scr).paddingBottom) || 0;
    const room = innerHeight - pad - body.getBoundingClientRect().top;
    const tall = cur + room - used - timerRoom - 1;
    // Across: the slider beside it and a matching margin on the other side;
    // the bow (Bow as volume) is a quarter of the picture's height wide.
    const bodyW = body.getBoundingClientRect().width;
    const wide = settings.droneBow ? (bodyW - 16) / 1.5 : bodyW - 2 * (40 + 8);
    scr.style.setProperty('--art', `${Math.round(Math.max(110, Math.min(820, tall, wide)))}px`);
  }
  let fitQueued = 0;
  const queueFit = () => { cancelAnimationFrame(fitQueued); fitQueued = requestAnimationFrame(fit); };
  addEventListener('resize', queueFit);
  visualViewport?.addEventListener('resize', queueFit);
  document.fonts?.ready.then(queueFit);
  document.fonts?.addEventListener?.('loadingdone', queueFit);

  /** Bring the controls in line with the settings (also after the tuner changed A4 or spelling). */
  function refresh() {
    a4.value = settings.a4;
    setRich(document.querySelector('.dr-a4-label'), TEXT.common.referencePitch(settings.a4));
    fillPitches();
    showTimingOpts();
    showBow();
    show();
  }
  refresh();

  return {
    refresh,
    fit: queueFit,
    stop: pause,
    toggle: () => (playing ? pause() : play()),
    step: (d) => setNote(settings.droneMidi + d),
    syncNative,
    get playing() { return playing; },
  };
}
