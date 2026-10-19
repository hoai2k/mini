// The Practice Routine screen: the routine as a list of cards, each a practice
// item (name, minutes, and a Metronome and a Drone that can be turned on
// for it, with their own settings in the card, opened with its chevron),
// + to add one (a suggestion or Custom…), and Start to run through them.
// The model and the clock are timer.js; the sound is main.js's engines,
// handed in as `audio`, set up for each item without touching the
// Metronome's or the Drone's own settings.
//
// IN DEVELOPMENT: set up only with ?routine in the address (main.js).

import { TEXT } from './text.js';
import { METERS, BPM_MIN, BPM_MAX } from './settings.js';
import { DRONE_MIN, DRONE_MAX, VOICES, spelling } from './drone.js';
import { noteName } from './tuning.js';
import { clock } from './droneui.js';
import { hasArt, showArt } from './art.js';
import { PRESETS, CHIMES, MAX_ITEMS, MIN_MINUTES, MAX_MINUTES, newItem, loadTimer, saveTimer, totalSeconds, cues, TimerRun, pictureFor } from './timer.js';

const $ = (id) => document.getElementById(id);
const TRASH = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/></svg>';
const CHIME_GAP = 1100; // ms from the chime to the next item's sound
const CHEVRON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';

/**
 * @param {{ settings: object, audio: {
 *   metronome: (met: { bpm: number, meter: string }) => void, stopMetronome: () => void,
 *   drone: (drn: { midi: number, voice: string, fifth: boolean }) => void, stopDrone: () => void,
 *   chime: (id: string) => void, running: (on: boolean) => void },
 *   chips: Function, canDrone: () => boolean, askDrone: () => void }} opts
 */
export function setupTimer({ settings, audio, chips, canDrone, askDrone }) {
  const state = loadTimer(settings);
  const items = state.items;
  const open = new Set(); // cards opened to their settings (not kept)
  let run = null; // the TimerRun while one is going (or finished, until Stop)
  let ticker = 0;
  let undo = null; // { item, index } of the item just deleted
  let toastTimer = 0;
  const save = () => saveTimer(state);
  let soundLater = 0; // the next item's sound, started once the chime has rung
  const label = (it) => it.name.trim() || TEXT.timer.item.untitled;

  // ---- sound for the item that is running
  function sound(it) {
    if (!it || !run || run.paused || run.done) { audio.stopMetronome(); audio.stopDrone(); return; }
    if (it.metronome) audio.metronome(it.met); else audio.stopMetronome();
    if (it.drone && canDrone()) audio.drone(it.drn); else audio.stopDrone();
  }
  const isNow = (it) => run && !run.done && run.item === it;

  // ---- the list
  const list = $('timer-list');
  const noteText = (midi) => {
    const n = noteName(midi, { flats: spelling(settings.droneAccidentals, settings.droneSpelling) === 'flats' });
    return `${n.name}${n.octave}`;
  };

  function card(it, i) {
    const li = document.createElement('li');
    li.className = 'titem';
    li.dataset.id = it.id;
    const tools = it.metronome || it.drone;
    const expanded = tools && open.has(it.id);
    li.classList.toggle('open', expanded);
    const T = TEXT.timer.item;
    li.innerHTML = `
      <div class="titem-head">
        <span class="titem-num" aria-hidden="true">${i + 1}</span>
        <input class="titem-name" type="text" maxlength="60" enterkeyhint="done" autocomplete="off">
        <button type="button" class="icon-btn titem-open">${CHEVRON}</button>
        <button type="button" class="icon-btn titem-del">${TRASH}</button>
      </div>
      <div class="titem-tools">
        <div class="titem-time">
          <button type="button" class="step titem-less">−</button>
          <input class="titem-min" type="number" inputmode="numeric" min="${MIN_MINUTES}" max="${MAX_MINUTES}" step="1">
          <span class="titem-unit" aria-hidden="true">${T.min}</span>
          <button type="button" class="step titem-more-min">+</button>
        </div>
        <button type="button" class="chip titem-tool" data-tool="metronome"></button>
        <button type="button" class="chip titem-tool" data-tool="drone"></button>
      </div>
      <div class="titem-detail"></div>
      <div class="titem-bar" aria-hidden="true"><div class="titem-bar-fill"></div></div>`;
    const name = li.querySelector('.titem-name');
    name.value = it.name;
    name.placeholder = T.untitled;
    name.setAttribute('aria-label', `${T.name} ${i + 1}`);
    name.addEventListener('input', () => { it.name = name.value; save(); readout(); delBtn.setAttribute('aria-label', T.delete(label(it))); });
    name.addEventListener('keydown', (e) => { if (e.key === 'Enter') name.blur(); });

    const min = li.querySelector('.titem-min');
    min.value = it.minutes;
    min.setAttribute('aria-label', `${T.minutes}: ${label(it)}`);
    const setMinutes = (v) => {
      const old = it.minutes;
      it.minutes = Math.max(MIN_MINUTES, Math.min(MAX_MINUTES, Math.round(Number(v) || old)));
      min.value = it.minutes;
      if (isNow(it) && old !== it.minutes) run.retime(old);
      state.lastMinutes[it.kind || 'custom'] = it.minutes; // the next of its kind starts here
      save();
      readout();
    };
    min.addEventListener('change', () => setMinutes(min.value));
    min.addEventListener('focus', () => min.select());
    const less = li.querySelector('.titem-less');
    const more = li.querySelector('.titem-more-min');
    less.setAttribute('aria-label', T.fewer);
    more.setAttribute('aria-label', T.more);
    less.addEventListener('click', () => setMinutes(it.minutes - 1));
    more.addEventListener('click', () => setMinutes(it.minutes + 1));

    const delBtn = li.querySelector('.titem-del');
    delBtn.setAttribute('aria-label', T.delete(label(it)));
    // While a routine runs, only what is still to come can be taken out.
    delBtn.disabled = !!run && !run.done && items.indexOf(it) <= run.index;
    delBtn.addEventListener('click', () => remove(it));

    for (const b of li.querySelectorAll('.titem-tool')) {
      const tool = b.dataset.tool;
      b.textContent = T[tool];
      b.setAttribute('aria-pressed', String(it[tool]));
      b.addEventListener('click', () => {
        if (tool === 'drone' && !it.drone && !canDrone()) { askDrone(); return; }
        it[tool] = !it[tool];
        if (it[tool]) open.add(it.id); // turned on: show its settings
        save();
        if (isNow(it)) sound(it);
        render(it.id, `.titem-tool[data-tool="${tool}"]`);
      });
    }
    const opener = li.querySelector('.titem-open');
    opener.hidden = !tools;
    opener.setAttribute('aria-expanded', String(expanded));
    opener.setAttribute('aria-label', T.settings(label(it)));
    opener.addEventListener('click', () => {
      if (open.has(it.id)) open.delete(it.id); else open.add(it.id);
      render(it.id, '.titem-open');
    });

    if (expanded) detail(li.querySelector('.titem-detail'), it);
    return li;
  }

  /** The card's own metronome and drone settings. */
  function detail(box, it) {
    const T = TEXT.timer.item;
    if (it.metronome) {
      const f = document.createElement('fieldset');
      f.className = 'titem-met';
      f.innerHTML = `<legend>${T.metronome}</legend>
        <div class="tempo">
          <button type="button" class="step" data-d="-1">−</button>
          <label class="bpm-box"><input type="number" inputmode="numeric" min="${BPM_MIN}" max="${BPM_MAX}" step="1"><span>${T.bpm}</span></label>
          <button type="button" class="step" data-d="1">+</button>
        </div>
        <input type="range" class="slider" min="${BPM_MIN}" max="${BPM_MAX}" step="1">
        <label class="row"><span>${T.meter}</span><select class="select"></select></label>`;
      const [down, up] = f.querySelectorAll('.step');
      down.setAttribute('aria-label', T.slower);
      up.setAttribute('aria-label', T.faster);
      const num = f.querySelector('.bpm-box input');
      const slider = f.querySelector('.slider');
      num.setAttribute('aria-label', `${T.tempo} (${T.bpm})`);
      slider.setAttribute('aria-label', T.tempo);
      const meter = f.querySelector('select');
      meter.replaceChildren(...METERS.map((m) => new Option(m.label || m.id, m.id)));
      const show = () => { num.value = it.met.bpm; slider.value = it.met.bpm; meter.value = it.met.meter; };
      const set = (patch) => {
        Object.assign(it.met, patch);
        it.met.bpm = Math.max(BPM_MIN, Math.min(BPM_MAX, Math.round(Number(it.met.bpm) || 80)));
        show();
        save();
        if (isNow(it)) audio.metronome(it.met);
      };
      down.addEventListener('click', () => set({ bpm: it.met.bpm - 1 }));
      up.addEventListener('click', () => set({ bpm: it.met.bpm + 1 }));
      slider.addEventListener('input', () => set({ bpm: slider.value }));
      num.addEventListener('change', () => set({ bpm: num.value }));
      num.addEventListener('focus', () => num.select());
      meter.addEventListener('change', () => set({ meter: meter.value }));
      show();
      box.append(f);
    }
    if (it.drone) {
      const f = document.createElement('fieldset');
      f.className = 'titem-drn';
      f.innerHTML = `<legend>${T.drone}</legend>
        <div class="tempo">
          <button type="button" class="step" data-d="-1">−</button>
          <select class="select titem-note"></select>
          <button type="button" class="step" data-d="1">+</button>
        </div>
        <label class="row"><span>${T.instrument}</span><select class="select titem-voice"></select></label>
        <label class="row toggle"><span>${T.fifth}</span><input type="checkbox" role="switch"></label>`;
      const [down, up] = f.querySelectorAll('.step');
      down.setAttribute('aria-label', T.noteDown);
      up.setAttribute('aria-label', T.noteUp);
      const note = f.querySelector('.titem-note');
      note.setAttribute('aria-label', T.note);
      note.replaceChildren(...Array.from({ length: DRONE_MAX - DRONE_MIN + 1 }, (_, k) => new Option(noteText(DRONE_MIN + k), String(DRONE_MIN + k))));
      const voice = f.querySelector('.titem-voice');
      voice.replaceChildren(...VOICES.map((v) => new Option(v.label, v.id)));
      const fifth = f.querySelector('input[role="switch"]');
      const show = () => { note.value = String(it.drn.midi); voice.value = it.drn.voice; fifth.checked = it.drn.fifth; };
      const set = (patch) => {
        Object.assign(it.drn, patch);
        // Past either end, a note wraps round by an octave (as on the Drone).
        while (it.drn.midi < DRONE_MIN) it.drn.midi += 12;
        while (it.drn.midi > DRONE_MAX) it.drn.midi -= 12;
        show();
        save();
        if (isNow(it) && canDrone()) audio.drone(it.drn);
      };
      down.addEventListener('click', () => set({ midi: it.drn.midi - 1 }));
      up.addEventListener('click', () => set({ midi: it.drn.midi + 1 }));
      note.addEventListener('change', () => set({ midi: Number(note.value) }));
      voice.addEventListener('change', () => set({ voice: voice.value }));
      fifth.addEventListener('change', () => set({ fifth: fifth.checked }));
      show();
      box.append(f);
    }
  }

  /** Draw the list again, keeping focus on the control that was used (`id`'s card, `sel` in it). */
  function render(id, sel) {
    list.replaceChildren(...items.map(card));
    $('timer-empty').hidden = items.length > 0;
    $('timer-add').disabled = items.length >= MAX_ITEMS;
    if (id && sel) list.querySelector(`[data-id="${id}"] ${sel}`)?.focus({ preventScroll: true });
    readout();
  }

  // ---- add and delete
  function add(presetId) {
    const it = newItem(presetId, settings, state.lastMinutes);
    items.push(it);
    if (it.metronome || it.drone) open.add(it.id);
    save();
    render();
    const li = list.querySelector(`[data-id="${it.id}"]`);
    li?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    if (!presetId) li?.querySelector('.titem-name')?.focus();
  }

  function remove(it) {
    const index = items.indexOf(it);
    if (index < 0) return;
    items.splice(index, 1);
    open.delete(it.id);
    save();
    render();
    undo = { item: it, index };
    $('timer-toast-text').textContent = TEXT.timer.deleted(label(it));
    $('timer-toast').hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { $('timer-toast').hidden = true; undo = null; }, 6000);
  }
  $('timer-undo').addEventListener('click', () => {
    if (!undo) return;
    // Back where it was (or after the item now running, if that has moved past it).
    const floor = run && !run.done ? run.index + 1 : 0;
    items.splice(Math.max(floor, Math.min(undo.index, items.length)), 0, undo.item);
    undo = null;
    $('timer-toast').hidden = true;
    save();
    render();
  });

  const sheet = $('timer-add-sheet');
  $('timer-presets').replaceChildren(...[...PRESETS, null].map((p) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'timer-preset';
    const tools = p ? ['metronome', 'drone'].filter((t) => p[t]).map((t) => TEXT.timer.item[t]) : [];
    b.innerHTML = '<span class="timer-preset-name"></span><span class="timer-preset-line"></span>';
    b.firstChild.textContent = p ? TEXT.timer.presets[p.id] : TEXT.timer.custom;
    // What it turns on (the length is the one last used for it, set on its card).
    b.lastChild.textContent = p ? tools.join(' + ') : TEXT.timer.customLine;
    b.lastChild.hidden = !b.lastChild.textContent;
    b.addEventListener('click', () => { sheet.close(); add(p?.id); });
    return b;
  }));
  $('timer-add').addEventListener('click', () => sheet.showModal());
  sheet.addEventListener('click', (e) => { if (e.target === sheet) sheet.close(); });

  // ---- settings: the chime (each one plays as it is picked)
  chips($('timer-chime'), CHIMES.map((id) => ({ id, label: TEXT.timer.chimes[id] })),
    () => state.chime,
    (id) => { state.chime = id; save(); audio.chime(id); });
  const settingsSheet = $('timer-settings');
  $('timer-settings-btn').addEventListener('click', () => settingsSheet.showModal());
  settingsSheet.addEventListener('click', (e) => { if (e.target === settingsSheet) settingsSheet.close(); });

  // ---- the picture of the item running, large, so a glance says what is being practised
  const pic = $('timer-picture');
  let picFor = ''; // the item and picture last shown
  function picture() {
    const it = run && !run.done ? run.item : null;
    if (!it) return;
    const id = pictureFor(it, hasArt);
    if (picFor === `${it.id}:${id}`) return;
    picFor = `${it.id}:${id}`;
    showArt(pic, id);
    pic.animate?.([{ opacity: 0, transform: 'scale(0.94)' }, { opacity: 1, transform: 'none' }], { duration: 380, easing: 'ease-out' });
  }
  // A change of theme can change which pictures there are.
  document.addEventListener('art-applied', () => { picFor = ''; picture(); });

  // ---- running
  function readout() {
    const now = Date.now();
    const T = TEXT.timer;
    const go = $('timer-go');
    const going = run && !run.done;
    $('timer-side').hidden = !going;
    $('timer-now').classList.toggle('running', !!going);
    $('timer-now').classList.toggle('paused', !!going && run.paused);
    let name = '';
    let time;
    let sub;
    let fill = 0;
    if (!run) {
      time = clock(totalSeconds(items));
      sub = T.total(items.length);
    } else if (run.done) {
      name = T.finished;
      time = clock(0);
      sub = '';
      fill = 1;
    } else {
      name = label(run.item);
      time = clock(Math.ceil(run.remaining(now)));
      const next = run.next;
      sub = (run.paused ? `${T.paused} · ` : '') + (next ? T.next(label(next), next.minutes) : T.lastItem);
      fill = run.progress(now);
    }
    picture();
    $('timer-name').textContent = name;
    $('timer-name').hidden = !name;
    $('timer-clock').textContent = time;
    $('timer-sub').textContent = sub;
    $('timer-fill').style.width = `${(fill * 100).toFixed(2)}%`;
    const playing = going && !run.paused;
    go.setAttribute('aria-pressed', String(!!playing));
    $('timer-go-label').textContent = run?.done ? T.restart : playing ? T.pause : going ? T.resume : T.start;
    go.disabled = !items.length;
    // The cards: the one running, its progress, and those already done.
    for (const li of list.children) {
      const it = items.find((x) => x.id === li.dataset.id);
      const k = items.indexOf(it);
      const now_ = going && k === run.index;
      li.classList.toggle('now', !!now_);
      li.classList.toggle('done', !!run && (run.done || k < run.index));
      li.querySelector('.titem-bar-fill').style.width = now_ ? `${(fill * 100).toFixed(2)}%` : '0%';
    }
  }

  /**
   * An item ended: the chime, then (once it has mostly rung, so the clicks or
   * the drone don't start over it) the next item's metronome and drone.
   */
  function changes(list_) {
    const last = list_.at(-1);
    if (!last) return;
    clearTimeout(soundLater);
    audio.stopMetronome();
    audio.stopDrone();
    audio.chime(state.chime);
    if (last.type === 'changed') {
      cues.changed(last.done, last.next);
      const it = last.next;
      soundLater = setTimeout(() => { if (isNow(it)) sound(it); }, state.chime === 'none' ? 0 : CHIME_GAP);
    } else {
      cues.finished(last.done);
      stopSound();
    }
    render();
  }

  function tick() {
    if (!run) return;
    changes(run.tick(Date.now()));
    readout();
  }

  function stopSound() {
    clearTimeout(soundLater);
    audio.stopMetronome();
    audio.stopDrone();
    clearInterval(ticker);
    audio.running(false);
  }

  function start() {
    if (!items.length) return;
    run = new TimerRun(items);
    cues.started(run.item);
    sound(run.item);
    clearInterval(ticker);
    ticker = setInterval(tick, 250);
    audio.running(true);
    render();
  }

  function stop() {
    if (!run) return;
    stopSound();
    run = null;
    render();
  }

  $('timer-go').addEventListener('click', () => {
    if (!run || run.done) { start(); return; }
    if (run.paused) {
      run.resume();
      sound(run.item);
      clearInterval(ticker);
      ticker = setInterval(tick, 250);
      audio.running(true);
    } else {
      run.pause();
      stopSound();
    }
    readout();
  });
  $('timer-skip').addEventListener('click', () => { if (run && !run.done) changes(run.tick(Date.now(), true)); readout(); });
  $('timer-stop').addEventListener('click', stop);
  // Coming back to the page (a phone woken up), catch up at once.
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });

  render();

  return {
    /** Leaving the screen stops a routine, as leaving the Metronome stops it. */
    leave: () => { stop(); undo = null; $('timer-toast').hidden = true; },
    enter: () => render(),
  };
}
