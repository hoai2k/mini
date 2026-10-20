// The Drone screen: pick a note (− / + or the list) and an instrument, play
// and pause with smooth fades. Timed drones stop, or move to the next note
// of a sequence, after a set time. The note, instrument and timing are kept
// in the settings.

import { TEXT, setRich } from './text.js';
import { droneTiming } from './settings.js';
import { DRONE_MIN, DRONE_MAX, VOICES, SEQUENCES, SEQ_DIRECTION, sequenceNote, wrap, spelling } from './drone.js';
import { noteName, midiToHz, A4_MIN, A4_MAX } from './tuning.js';

const $ = (id) => document.getElementById(id);
const fmt = (sec) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
/** A practice time as MM:SS, or H:MM:SS from an hour. */
export const clock = (sec) => {
  const s = Math.max(0, Math.floor(sec));
  const mm = String(Math.floor(s / 60) % 60).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return s >= 3600 ? `${Math.floor(s / 3600)}:${mm}:${ss}` : `${mm}:${ss}`;
};

/**
 * @param {{ settings: object, persist: () => void, chips: Function, engine: () => import('./drone.js').Drone,
 *   onPlaying: (on: boolean) => void }} opts
 */
export function setupDrone({ settings, persist, chips, engine, onPlaying }) {
  let playing = false;
  let remaining = settings.droneMinutes * 60; // seconds left of a timed drone (counts only while playing)
  let seqStart = settings.droneMidi; // the note a sequence began on
  let seqStep = 0;
  let lastTick = 0;
  let timer = 0;
  let doneNote = '';
  let changesSeen = 0; // changes the native drone made by itself that are counted here (the apps)
  // How long the drone has played since Play (by the clock, so time with the
  // screen locked counts), and after a stop how long the last one played
  // (droneLastSecs, kept across visits).
  let startedAt = 0;
  let endsAt = 0; // a drone timed to stop: when it will (the apps report only that it did)

  // Sharps or flats: the Accidentals setting, or on Auto the way the note
  // was reached (droneSpelling, kept so the note reads the same next time).
  const spelled = (direction = 0) => spelling(settings.droneAccidentals, settings.droneSpelling, direction);
  const name = (midi, how = spelled()) => {
    const n = noteName(midi, { flats: how === 'flats' });
    return { ...n, text: `${n.name}${n.octave}` };
  };
  /** Spell from now on as reached going `direction` (the list follows). */
  function reached(direction) {
    const how = spelled(direction);
    if (how === settings.droneSpelling && pitch.options.length) return;
    settings.droneSpelling = how;
    fillPitches();
  }

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

  function showElapsed() {
    const el = $('dr-elapsed');
    el.classList.toggle('live', playing);
    if (playing) el.textContent = TEXT.drone.elapsed(clock((Date.now() - startedAt) / 1000));
    else el.textContent = settings.droneLastSecs != null ? TEXT.drone.lastDrone(clock(settings.droneLastSecs)) : '';
  }
  /** The drone stopped (at `at`, by the clock): keep how long it played. */
  function stopped(at = Date.now()) {
    if (!startedAt) return;
    settings.droneLastSecs = Math.round(Math.max(0, at - startedAt) / 1000);
    startedAt = 0;
    persist();
  }

  function show() {
    showElapsed();
    const n = name(settings.droneMidi);
    $('dr-letter').textContent = n.name[0];
    $('dr-acc').textContent = n.name.slice(1);
    $('dr-oct').textContent = n.octave;
    $('dr-hz-val').textContent = `${midiToHz(settings.droneMidi, settings.a4).toFixed(1)} Hz`;
    // "(+5th)" beside the frequency while the fifth plays, and nothing while it doesn't.
    $('dr-fifth-tag').hidden = !settings.droneFifth;
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
      const next = name(sequenceNote(settings.droneThen, seqStart, seqStep + 1), spelled(SEQ_DIRECTION[settings.droneThen])).text;
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
      reached(SEQ_DIRECTION[settings.droneThen]);
      persist();
    }
    if (s.remaining >= 0) remaining = s.remaining;
    lastTick = performance.now();
    if (!s.playing) {
      playing = false;
      clearInterval(timer);
      onPlaying(false);
      stopped(s.stoppedByTimer && endsAt ? Math.min(Date.now(), endsAt) : Date.now());
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
    startedAt = Date.now();
    endsAt = settings.droneTimed && settings.droneThen === 'stop' ? startedAt + remaining * 1000 : 0;
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
    stopped();
    show();
  }

  /** The countdown of a timed drone; at zero, stop or move on. */
  function tick() {
    const now = performance.now();
    const dt = (now - lastTick) / 1000;
    lastTick = now;
    if (playing) showElapsed();
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
    reached(SEQ_DIRECTION[settings.droneThen]);
    persist();
    sound(); // crossfades to the new note
    show();
  }

  /**
   * A note chosen by hand: a sequence starts again from it, with the full
   * time. `direction` is +1 or −1 for a step up or down (which spells it on
   * Auto), 0 for a note picked from the list (spelled as the list shows it).
   */
  function setNote(midi, direction = 0) {
    reached(direction);
    settings.droneMidi = wrap(midi);
    persist();
    seqStart = settings.droneMidi;
    seqStep = 0;
    remaining = settings.droneMinutes * 60;
    doneNote = '';
    if (playing) sound();
    show();
  }

  $('dr-down').addEventListener('click', () => setNote(settings.droneMidi - 1, -1));
  $('dr-up').addEventListener('click', () => setNote(settings.droneMidi + 1, 1));
  pitch.addEventListener('change', () => setNote(Number(pitch.value)));
  voice.addEventListener('change', () => {
    settings.droneVoice = voice.value;
    persist();
    showVoiceArt();
    if (playing) sound();
  });
  $('dr-toggle').addEventListener('click', () => (playing ? pause() : play()));

  // The picture follows the voice: the cello and its bow for the cellos, the
  // organ (Organ, Synth organ) and a plain volume slider for the organs.
  const isOrgan = () => settings.droneVoice.startsWith('organ');
  function showVoiceArt() {
    const organ = isOrgan();
    $('dr-art').hidden = organ;
    $('dr-art-organ').hidden = !organ;
    $('dr-bow-col').hidden = organ;
    $('dr-vol').hidden = !organ;
    $('drone-body').classList.toggle('organ', organ);
    queueFit();
  }

  // ---- volume: beside the cello its bow, lit behind from the frog up to the
  // level; beside the organ a plain upright slider. Either is dragged up or
  // down, or set with the arrow keys; they are one volume.
  const sliders = [
    { el: $('dr-bow'), track: $('dr-bow').querySelector('.bow-hair') },
    { el: $('dr-vol'), track: $('dr-vol').querySelector('.vslider-track') },
  ];
  function showVolume() {
    for (const { el } of sliders) {
      el.style.setProperty('--v', settings.droneVolume);
      el.setAttribute('aria-valuenow', String(Math.round(settings.droneVolume * 100)));
      el.setAttribute('aria-valuetext', `${Math.round(settings.droneVolume * 100)}%`);
    }
  }
  function setVolume(v) {
    settings.droneVolume = Math.round(Math.max(0, Math.min(1, v)) * 100) / 100;
    settings.droneVolumeChosen = true; // kept from now on, even if it is the old default
    persist();
    showVolume();
    engine().setVolume(settings.droneVolume);
  }
  for (const { el, track } of sliders) {
    const fromPointer = (e) => {
      const r = track.getBoundingClientRect();
      return (r.bottom - e.clientY) / r.height;
    };
    el.addEventListener('pointerdown', (e) => {
      if (e.button) return;
      e.preventDefault(); // no focus ring for a finger or mouse (keyboards reach it with Tab)
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

  // Accidentals: Auto (sharps going up, flats going down), Sharps or Flats.
  chips($('dr-accidentals'), ['auto', 'sharps', 'flats'].map((id) => ({ id, label: TEXT.drone.settings.accidentalModes[id] })),
    () => settings.droneAccidentals,
    (v) => {
      settings.droneAccidentals = v;
      if (v !== 'auto') settings.droneSpelling = v; // Auto then starts from what is showing
      persist();
      fillPitches();
      show();
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
    if (getComputedStyle(body).display !== 'flex') {
      // Side by side: the stylesheet sizes it, with smaller controls (#drone.tight) if they don't fit.
      scr.style.removeProperty('--art');
      scr.classList.remove('tight');
      if (document.documentElement.scrollHeight > innerHeight) scr.classList.add('tight');
      return;
    }
    scr.classList.remove('tight');
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
    // Across: the bow beside the cello (a quarter of the picture's height
    // wide) or the slider beside the organ, and a matching margin on the
    // other side.
    const bodyW = body.getBoundingClientRect().width;
    const wide = isOrgan() ? bodyW - 2 * (40 + 8) : (bodyW - 16) / 1.5;
    scr.style.setProperty('--art', `${Math.round(Math.max(110, Math.min(820, tall, wide)))}px`);
  }
  let fitQueued = 0;
  const queueFit = () => { cancelAnimationFrame(fitQueued); fitQueued = requestAnimationFrame(fit); };
  addEventListener('resize', queueFit);
  visualViewport?.addEventListener('resize', queueFit);
  document.fonts?.ready.then(queueFit);
  document.fonts?.addEventListener?.('loadingdone', queueFit);

  /** Bring the controls in line with the settings (also after the tuner changed A4). */
  function refresh() {
    a4.value = settings.a4;
    setRich(document.querySelector('.dr-a4-label'), TEXT.common.referencePitch(settings.a4));
    fillPitches();
    showTimingOpts();
    showVoiceArt();
    show();
  }
  refresh();

  return {
    refresh,
    fit: queueFit,
    stop: pause,
    toggle: () => (playing ? pause() : play()),
    step: (d) => setNote(settings.droneMidi + d, Math.sign(d)),
    syncNative,
    get playing() { return playing; },
  };
}
