// The Practice Routine screen. Set up, it is the routine as a list: each item
// its number, picture and name on the left and its minutes on the right, +
// to add one (a suggestion or Custom…) and Start. The pencil in the header
// edits the list: names and minutes, a trash button on each item (or swipe
// it off either side), and a handle to drag it up or down.
//
// Running, it is a shell around the tools: a compact header (the item, its
// time left, what is next, Pause, Skip and Stop) over a row of cards that
// swipe sideways, one per tool (the Metronome, the Drone, the Playback
// Recorder), each a small version of the tool with its own switch, running
// with the tool's own settings whatever item is on. All of them stop when the
// routine ends; a take being recorded or played back is let finish first.
// The model and the clock are timer.js; the tools are main.js's, handed in.

import { TEXT } from './text.js';
import { VOICES } from './drone.js';
import { BPM_MIN, BPM_MAX } from './settings.js';
import { clock } from './droneui.js';
import { hasArt, showArt } from './art.js';
import { PRESETS, TOOLS, CHIMES, SPEAKERS, MAX_ITEMS, MIN_MINUTES, MAX_MINUTES, newItem, loadTimer, saveTimer, voiceGain, totalSeconds, cues, TimerRun, pictureFor, toolFor, move, voiceLines, voiceUrl, chimeUrl } from './timer.js';

const $ = (id) => document.getElementById(id);
const TRASH = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/></svg>';
const HANDLE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14M5 12h14M5 16h14"/></svg>';
const CHIME_GAP = 1100; // ms from the chime to the voice's silence after it
const CHIME_TO_VOICE = 900; // ms from the chime to the voice
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const ICONS = { metronome: 'home-metronome', drone: 'home-drone', playback: 'home-record' };
const SWIPE_OFF = 0.35; // of the item's width: past this, a swipe deletes it

/**
 * @param {{ settings: object,
 *   tools: Record<'metronome'|'drone'|'playback', { start: () => void, stop: () => void, on: () => boolean }> & {
 *     metronome: { bpm: () => number, setBpm: (n: number) => void, meter: () => string, beat: () => ({ idx: number, strengths: number[] } | null) },
 *     drone: { note: () => string, step: (d: number) => void, voice: () => string, setVoice: (id: string) => void, fifth: () => boolean, setFifth: (on: boolean) => void, allowed: () => boolean, ask: () => void },
 *     playback: { status: () => { state: string, seconds: number, takes: number }, busy: () => boolean, ignoreFor: (sec: number) => void } },
 *   audio: { chime: (id: string) => { done: Promise<void>, stop: () => void },
 *     clips: (urls: string[], volume?: number) => { done: Promise<void>, stop: () => void }, preload: (urls: string[]) => void,
 *     running: (on: boolean) => void } }} opts
 */
export function setupTimer({ settings, tools, audio }) {
  const state = loadTimer();
  let items = state.items;
  let run = null; // the TimerRun while a routine is going
  let finishing = false; // its time is up, and a take is being let finish
  let calm = 0; // ticks in a row with no take on the go, while finishing
  let finishedNote = false; // say "All done" until the routine is touched again
  let editing = false;
  let ticker = 0;
  let undo = null; // { item, index } of the item just deleted
  let toastTimer = 0;
  const save = () => { state.items = items; saveTimer(state); };
  let seq = 0; // the announcement in progress (a newer one, Pause or Stop ends it)
  let saying = null; // the voice speaking, to stop
  const label = (it) => it.name.trim() || TEXT.timer.item.untitled;
  const T = TEXT.timer;

  // ---------------------------------------------------------------- the list

  const list = $('timer-list');

  function row(it, i) {
    const li = document.createElement('li');
    li.className = 'titem';
    li.dataset.id = it.id;
    const I = T.item;
    if (!editing) {
      li.innerHTML = `<span class="titem-num" aria-hidden="true">${i + 1}.</span><span class="titem-icon" aria-hidden="true"></span>
        <span class="titem-name"></span><span class="titem-min"></span>
        <div class="titem-bar" aria-hidden="true"><div class="titem-bar-fill"></div></div>`;
      li.querySelector('.titem-name').textContent = label(it);
      li.querySelector('.titem-min').textContent = I.minutesShort(it.minutes);
      li.setAttribute('aria-label', I.summary(i + 1, label(it), it.minutes));
      return li;
    }
    li.classList.add('editing');
    li.innerHTML = `<button type="button" class="icon-btn titem-handle">${HANDLE}</button>
      <span class="titem-num" aria-hidden="true">${i + 1}.</span>
      <input class="titem-name" type="text" maxlength="60" enterkeyhint="done" autocomplete="off">
      <div class="titem-time">
        <button type="button" class="step titem-less">−</button>
        <input class="titem-mins" type="number" inputmode="numeric" min="${MIN_MINUTES}" max="${MAX_MINUTES}" step="1">
        <button type="button" class="step titem-more">+</button>
      </div>
      <button type="button" class="icon-btn titem-del">${TRASH}</button>`;
    const name = li.querySelector('.titem-name');
    name.value = it.name;
    name.placeholder = I.untitled;
    name.setAttribute('aria-label', `${I.name} ${i + 1}`);
    name.addEventListener('input', () => { it.name = name.value; save(); readout(); });
    name.addEventListener('keydown', (e) => { if (e.key === 'Enter') name.blur(); });
    const min = li.querySelector('.titem-mins');
    min.value = it.minutes;
    min.setAttribute('aria-label', `${I.minutes}: ${label(it)}`);
    const setMinutes = (v) => {
      it.minutes = Math.max(MIN_MINUTES, Math.min(MAX_MINUTES, Math.round(Number(v) || it.minutes)));
      min.value = it.minutes;
      state.lastMinutes[it.kind || 'custom'] = it.minutes; // the next of its kind starts here
      save();
      readout();
    };
    min.addEventListener('change', () => setMinutes(min.value));
    min.addEventListener('focus', () => min.select());
    li.querySelector('.titem-less').setAttribute('aria-label', I.fewer);
    li.querySelector('.titem-more').setAttribute('aria-label', I.more);
    li.querySelector('.titem-less').addEventListener('click', () => setMinutes(it.minutes - 1));
    li.querySelector('.titem-more').addEventListener('click', () => setMinutes(it.minutes + 1));
    const del = li.querySelector('.titem-del');
    del.setAttribute('aria-label', I.delete(label(it)));
    del.addEventListener('click', () => remove(it));
    const handle = li.querySelector('.titem-handle');
    handle.setAttribute('aria-label', I.reorder(label(it)));
    // Arrow keys move it too, for a keyboard.
    handle.addEventListener('keydown', (e) => {
      const d = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
      if (!d) return;
      e.preventDefault();
      const k = items.indexOf(it);
      if (k + d < 0 || k + d >= items.length) return;
      items = move(items, k, k + d);
      save();
      render(it.id, '.titem-handle');
    });
    dragToReorder(li, handle, it);
    swipeToDelete(li, it);
    return li;
  }

  /**
   * Drag an item up or down by its handle: it follows the finger, the others
   * make room as it passes their middles, and it lands where it was let go.
   */
  function dragToReorder(li, handle, it) {
    handle.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      handle.setPointerCapture(e.pointerId);
      const rows = [...list.children];
      const from = rows.indexOf(li);
      const boxes = rows.map((r) => r.getBoundingClientRect());
      const step = boxes.length > 1 ? boxes[1].top - boxes[0].top : boxes[0].height + 8;
      const y0 = e.clientY;
      let to = from;
      li.classList.add('dragging');
      const moved = (ev) => {
        const dy = ev.clientY - y0;
        li.style.transform = `translateY(${dy}px)`;
        const mid = boxes[from].top + boxes[from].height / 2 + dy;
        to = from;
        while (to < rows.length - 1 && mid > boxes[to + 1].top + boxes[to + 1].height / 2) to++;
        while (to > 0 && mid < boxes[to - 1].top + boxes[to - 1].height / 2) to--;
        rows.forEach((r, k) => {
          if (r === li) return;
          const shift = from < to && k > from && k <= to ? -step : from > to && k < from && k >= to ? step : 0;
          r.style.transform = shift ? `translateY(${shift}px)` : '';
        });
      };
      const up = () => {
        handle.removeEventListener('pointermove', moved);
        handle.removeEventListener('pointerup', up);
        handle.removeEventListener('pointercancel', up);
        for (const r of rows) r.style.transform = '';
        li.classList.remove('dragging');
        if (to !== from) {
          items = move(items, from, to);
          save();
          render(it.id, '.titem-handle');
        }
      };
      handle.addEventListener('pointermove', moved);
      handle.addEventListener('pointerup', up);
      handle.addEventListener('pointercancel', up);
    });
  }

  /** Swipe an item off either side to delete it (while editing; Undo brings it back). */
  function swipeToDelete(li, it) {
    li.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || e.target.closest('input, button')) return;
      const x0 = e.clientX, y0 = e.clientY;
      let dx = 0, claimed = false;
      const moved = (ev) => {
        dx = ev.clientX - x0;
        if (!claimed) {
          if (Math.abs(ev.clientY - y0) > 10) { done(); return; } // a scroll, not a swipe
          if (Math.abs(dx) < 10) return;
          claimed = true;
          li.setPointerCapture(e.pointerId);
          li.classList.add('swiping');
        }
        li.style.transform = `translateX(${dx}px)`;
        li.style.opacity = String(1 - Math.min(0.7, Math.abs(dx) / li.offsetWidth));
      };
      const done = () => {
        li.removeEventListener('pointermove', moved);
        li.removeEventListener('pointerup', up);
        li.removeEventListener('pointercancel', cancel);
      };
      const up = () => {
        done();
        if (!claimed) return;
        li.classList.remove('swiping');
        if (Math.abs(dx) > li.offsetWidth * SWIPE_OFF) {
          const out = Math.sign(dx) * li.offsetWidth * 1.1;
          const a = li.animate([{ transform: `translateX(${dx}px)`, opacity: li.style.opacity }, { transform: `translateX(${out}px)`, opacity: 0 }], { duration: 180, easing: 'ease-in', fill: 'forwards' });
          a.onfinish = () => remove(it);
        } else {
          li.animate([{ transform: `translateX(${dx}px)` }, { transform: 'none' }], { duration: 200, easing: 'ease-out' });
          li.style.transform = '';
          li.style.opacity = '';
        }
      };
      const cancel = () => { done(); li.classList.remove('swiping'); li.style.transform = ''; li.style.opacity = ''; };
      li.addEventListener('pointermove', moved);
      li.addEventListener('pointerup', up);
      li.addEventListener('pointercancel', cancel);
    });
  }

  /*
   * Each item's icon, and each suggestion's in the + menu: its picture
   * (pictureFor), small. Again whenever a theme's art arrives, since which
   * pictures there are is the theme's.
   */
  function icons() {
    for (const li of list.children) {
      const it = items.find((x) => x.id === li.dataset.id);
      const el = li.querySelector('.titem-icon');
      if (it && el) showArt(el, pictureFor(it, hasArt));
    }
    for (const b of document.querySelectorAll('.timer-preset')) {
      showArt(b.querySelector('.timer-preset-icon'), pictureFor({ kind: b.dataset.preset === 'custom' ? null : b.dataset.preset }, hasArt));
    }
    for (const c of cards.querySelectorAll('.tool-card')) showArt(c.querySelector('.tool-icon'), ICONS[c.dataset.tool]);
  }
  document.addEventListener('art-applied', icons);

  /** Draw the list again, keeping focus on the control that was used (`id`'s item, `sel` in it). */
  function render(id, sel) {
    list.replaceChildren(...items.map(row));
    list.classList.toggle('editing', editing);
    icons();
    const going = !!run;
    $('timer-empty').hidden = items.length > 0 || editing;
    $('timer-add').hidden = going;
    $('timer-add').disabled = items.length >= MAX_ITEMS;
    const edit = $('timer-edit');
    edit.hidden = going || (!items.length && !editing);
    edit.setAttribute('aria-pressed', String(editing));
    edit.setAttribute('aria-label', editing ? T.editDone : T.edit);
    edit.classList.toggle('on', editing);
    if (id && sel) list.querySelector(`[data-id="${id}"] ${sel}`)?.focus({ preventScroll: true });
    readout();
  }

  function setEditing(on) {
    editing = on && !run;
    if (!editing) { list.querySelectorAll('input').forEach((i) => i.blur()); }
    render();
  }
  $('timer-edit').addEventListener('click', () => setEditing(!editing));

  // ---- add and delete
  function add(presetId) {
    const it = newItem(presetId, state.lastMinutes);
    items.push(it);
    finishedNote = false;
    save();
    if (!presetId) editing = true; // Custom…: straight to its name
    render();
    const li = list.querySelector(`[data-id="${it.id}"]`);
    li?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    if (!presetId) li?.querySelector('.titem-name')?.focus();
  }

  function remove(it) {
    const index = items.indexOf(it);
    if (index < 0) return;
    items = items.filter((x) => x !== it);
    save();
    if (!items.length) editing = false;
    render();
    undo = { item: it, index };
    $('timer-toast-text').textContent = T.deleted(label(it));
    $('timer-toast').hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { $('timer-toast').hidden = true; undo = null; }, 6000);
  }
  $('timer-undo').addEventListener('click', () => {
    if (!undo) return;
    items = items.slice();
    items.splice(Math.min(undo.index, items.length), 0, undo.item);
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
    b.dataset.preset = p?.id ?? 'custom';
    b.innerHTML = '<span class="timer-preset-icon" aria-hidden="true"></span><span class="timer-preset-name"></span>';
    b.lastChild.textContent = p ? T.presets[p.id] : T.custom;
    b.addEventListener('click', () => { sheet.close(); add(p?.id); });
    return b;
  }));
  $('timer-add').addEventListener('click', () => { icons(); sheet.showModal(); });
  sheet.addEventListener('click', (e) => { if (e.target === sheet) sheet.close(); });

  // ---------------------------------------------------------------- the tool cards

  const cards = $('tool-cards');
  const card = {}; // tool -> { el, on (its switch), show() }
  const C = T.cards;

  function toolCard(tool, body) {
    const el = document.createElement('article');
    el.className = 'tool-card';
    el.dataset.tool = tool;
    el.setAttribute('aria-label', C[tool]);
    el.innerHTML = `<header class="tool-head"><span class="tool-icon art" aria-hidden="true"></span><h3></h3>
      <label class="tool-switch"><input type="checkbox" role="switch"></label></header><div class="tool-body"></div>`;
    el.querySelector('h3').textContent = C[tool];
    const on = el.querySelector('input');
    on.setAttribute('aria-label', C.turnOn(C[tool]));
    on.addEventListener('change', () => setTool(tool, on.checked));
    el.querySelector('.tool-body').append(...body);
    cards.append(el);
    return { el, on };
  }
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const stepper = (cls, labelText, down, up, downLabel, upLabel) => {
    const box = h('div', `tool-step ${cls}`);
    const less = h('button', 'step', '−'); less.type = 'button'; less.setAttribute('aria-label', downLabel); less.addEventListener('click', down);
    const more = h('button', 'step', '+'); more.type = 'button'; more.setAttribute('aria-label', upLabel); more.addEventListener('click', up);
    const big = h('span', 'tool-big');
    big.setAttribute('aria-live', 'polite');
    box.append(less, big, more);
    if (labelText) box.setAttribute('aria-label', labelText);
    return { box, big };
  };

  // The Metronome: its tempo with − and + and a slider, its beats lighting as they are heard, its time signature.
  {
    const M = tools.metronome;
    const tempo = stepper('tool-tempo', C.tempo, () => { M.setBpm(M.bpm() - 1); show(); }, () => { M.setBpm(M.bpm() + 1); show(); }, T.item.slower, T.item.faster);
    const slider = h('input', 'slider');
    Object.assign(slider, { type: 'range', min: BPM_MIN, max: BPM_MAX, step: 1 });
    slider.setAttribute('aria-label', C.tempo);
    slider.addEventListener('input', () => { M.setBpm(Number(slider.value)); show(); });
    const beats = h('ol', 'tool-beats');
    beats.setAttribute('aria-hidden', 'true');
    const meter = h('p', 'tool-note');
    const { el, on } = toolCard('metronome', [tempo.box, slider, beats, meter]);
    let shownStrengths = '';
    function show() {
      tempo.big.innerHTML = `<b>${M.bpm()}</b> <small>${C.bpm}</small>`;
      slider.value = String(M.bpm());
      meter.textContent = M.meter();
      on.checked = M.on();
      el.classList.toggle('on', on.checked);
      const b = M.beat();
      const strengths = b?.strengths || [2, 0, 0, 0];
      if (strengths.join() !== shownStrengths) {
        shownStrengths = strengths.join();
        beats.replaceChildren(...strengths.map((s) => h('li', s === 2 ? 'strong' : s === 1 ? 'mid' : '')));
      }
      [...beats.children].forEach((d, i) => d.classList.toggle('lit', !!b && b.idx === i));
    }
    card.metronome = { el, on, show };
  }

  // The Drone: its note with − and +, its instrument, and the fifth.
  {
    const D = tools.drone;
    const note = stepper('tool-note-step', C.note, () => { D.step(-1); show(); }, () => { D.step(1); show(); }, T.item.noteDown, T.item.noteUp);
    const voice = h('select', 'select tool-voice');
    voice.replaceChildren(...VOICES.map((v) => new Option(v.label, v.id)));
    voice.setAttribute('aria-label', T.item.instrument);
    voice.addEventListener('change', () => { D.setVoice(voice.value); show(); });
    const fifthRow = h('label', 'row');
    fifthRow.classList.add('toggle', 'tool-fifth');
    fifthRow.append(h('span', '', T.item.fifth));
    const fifth = h('input');
    Object.assign(fifth, { type: 'checkbox' });
    fifth.setAttribute('role', 'switch');
    fifth.addEventListener('change', () => { D.setFifth(fifth.checked); show(); });
    fifthRow.append(fifth);
    const { el, on } = toolCard('drone', [note.box, voice, fifthRow]);
    function show() {
      note.big.innerHTML = `<b>${D.note()}</b>`;
      if (document.activeElement !== voice) voice.value = D.voice();
      fifth.checked = D.fifth();
      on.checked = D.on();
      el.classList.toggle('on', on.checked);
    }
    card.drone = { el, on, show };
  }

  // The Playback Recorder: what it is doing (listening, recording, playing a take back) and how many takes.
  {
    const P = tools.playback;
    const light = h('span', 'tool-light');
    light.setAttribute('aria-hidden', 'true');
    const status = h('p', 'tool-status');
    status.setAttribute('aria-live', 'polite');
    const lamp = h('div', 'tool-rec');
    lamp.append(light, status);
    const takes = h('p', 'tool-note');
    const hint = h('p', 'tool-hint', C.playbackHint);
    const { el, on } = toolCard('playback', [lamp, takes, hint]);
    function show() {
      const s = P.status();
      on.checked = P.on();
      el.classList.toggle('on', on.checked);
      el.dataset.state = s.state;
      status.textContent = C.states[s.state]?.(clock(Math.floor(s.seconds))) ?? '';
      takes.textContent = C.takes(s.takes);
      hint.hidden = on.checked;
    }
    card.playback = { el, on, show };
  }

  const dots = $('tool-dots');
  dots.replaceChildren(...TOOLS.map((t, i) => {
    const b = h('button', 'tool-dot');
    b.type = 'button';
    b.setAttribute('aria-label', C.show(C[t]));
    b.addEventListener('click', () => showCard(TOOLS[i]));
    return b;
  }));
  /** Bring a tool's card into view (the row scrolls sideways). */
  function showCard(tool, smooth = true) {
    const el = card[tool]?.el;
    if (!el) return;
    cards.scrollTo({ left: el.offsetLeft - (cards.clientWidth - el.offsetWidth) / 2, behavior: smooth ? 'smooth' : 'instant' });
  }
  function showDots() {
    const mid = cards.scrollLeft + cards.clientWidth / 2;
    let near = 0, best = Infinity;
    TOOLS.forEach((t, i) => { const el = card[t].el; const d = Math.abs(el.offsetLeft + el.offsetWidth / 2 - mid); if (d < best) { best = d; near = i; } });
    [...dots.children].forEach((d, i) => d.setAttribute('aria-current', String(i === near)));
  }
  cards.addEventListener('scroll', showDots, { passive: true });

  /** A tool switched on or off on its card: remembered for the next run, and started or stopped now. */
  function setTool(tool, onNow) {
    if (tool === 'drone' && onNow && !tools.drone.allowed()) { card.drone.on.checked = false; tools.drone.ask(); return; }
    state.tools[tool] = onNow;
    save();
    if (run && !run.paused && !finishing) { if (onNow) tools[tool].start(); else tools[tool].stop(); }
    else if (!onNow) tools[tool].stop();
    showCards();
  }
  function showCards() {
    for (const t of TOOLS) card[t].show();
  }
  function startTools() {
    for (const t of TOOLS) {
      if (!state.tools[t]) continue;
      if (t === 'drone' && !tools.drone.allowed()) continue;
      tools[t].start();
    }
  }
  function stopTools(which = TOOLS) {
    for (const t of which) tools[t].stop();
  }

  // The beats light as they are heard, while the cards are on screen.
  let frame = 0;
  function animate() {
    frame = 0;
    if (!run || document.hidden) return;
    card.metronome.show();
    frame = requestAnimationFrame(animate);
  }

  // ---------------------------------------------------------------- settings

  // Chimes on or off and which (each plays as it is picked); the voice on or
  // off, whose (each says hello as it is picked) and how loud.
  const fill = (select, ids, labels, value) => {
    select.replaceChildren(...ids.map((id) => new Option(labels[id], id)));
    select.value = value;
  };
  const chimeOn = $('timer-chime-on');
  const chimeSel = $('timer-chime');
  fill(chimeSel, CHIMES, T.chimes, state.chime);
  const showChime = () => { chimeOn.checked = state.chimeOn; $('timer-chime-row').hidden = !state.chimeOn; };
  chimeOn.addEventListener('change', () => {
    state.chimeOn = chimeOn.checked;
    save();
    showChime();
    if (state.chimeOn) audio.chime(state.chime);
  });
  chimeSel.addEventListener('change', () => { state.chime = chimeSel.value; save(); audio.chime(state.chime); });
  showChime();
  let hello = null;
  const sayHello = () => {
    hello?.stop();
    hello = audio.clips([voiceUrl(state.voice, 'hello')], voiceGain(state.voiceVolume));
  };
  const voiceOn = $('timer-voice-on');
  const voiceSel = $('timer-voice');
  const voiceVol = $('timer-voice-volume');
  fill(voiceSel, SPEAKERS, T.voices, state.voice);
  voiceVol.value = String(state.voiceVolume);
  const showVoice = () => {
    voiceOn.checked = state.voiceOn;
    for (const el of document.querySelectorAll('.timer-voice-only')) el.hidden = !state.voiceOn;
  };
  voiceOn.addEventListener('change', () => {
    state.voiceOn = voiceOn.checked;
    save();
    showVoice();
    if (!state.voiceOn) { hello?.stop(); hush(); } // turned on, it says nothing until it has something to say
  });
  voiceSel.addEventListener('change', () => { state.voice = voiceSel.value; save(); sayHello(); });
  voiceVol.addEventListener('input', () => { state.voiceVolume = Number(voiceVol.value); save(); });
  voiceVol.addEventListener('change', sayHello); // let go: hear it at the new level
  showVoice();
  const settingsSheet = $('timer-settings');
  $('timer-settings-btn').addEventListener('click', () => settingsSheet.showModal());
  settingsSheet.addEventListener('click', (e) => { if (e.target === settingsSheet) settingsSheet.close(); });

  // ---------------------------------------------------------------- running

  function readout() {
    const now = Date.now();
    const going = !!run;
    $('timer-now').hidden = going;
    $('timer-run').hidden = !going;
    $('routine').classList.toggle('running', going);
    if (!going) {
      $('timer-clock').textContent = clock(totalSeconds(items));
      $('timer-sub').textContent = finishedNote ? T.finished : T.total(items.length);
      $('timer-go').disabled = !items.length || editing;
    } else {
      const it = run.item;
      $('trun-name').textContent = finishing ? T.finishing : label(it);
      $('trun-clock').textContent = clock(Math.ceil(run.remaining(now)));
      const next = run.next;
      $('trun-sub').textContent = finishing ? T.finishingNote : (run.paused ? `${T.paused} · ` : '') + (next ? T.next(label(next), next.minutes) : T.lastItem);
      $('trun-fill').style.width = `${(run.progress(now) * 100).toFixed(2)}%`;
      $('timer-run').classList.toggle('paused', run.paused);
      const go = $('trun-go');
      go.setAttribute('aria-pressed', String(!run.paused));
      go.setAttribute('aria-label', run.paused ? T.resume : T.pause);
      go.disabled = finishing;
      $('trun-skip').disabled = finishing;
    }
    // The items: the one running, its progress, and those already done.
    for (const li of list.children) {
      const k = items.findIndex((x) => x.id === li.dataset.id);
      const isNow = going && !run.done && k === run.index;
      li.classList.toggle('now', isNow);
      li.classList.toggle('done', going && (run.done || k < run.index));
      const bar = li.querySelector('.titem-bar-fill');
      if (bar) bar.style.width = isNow ? `${(run.progress(now) * 100).toFixed(2)}%` : '0%';
    }
    if (going) showCards();
  }

  /**
   * Between items: the chime, then the voice (if on: what finished and what
   * is next). The tools carry on under it; a Playback Recorder listening for
   * you to start pays it no attention. Pause, Stop or another announcement
   * cuts it short.
   */
  async function announce({ chime = false, lines = [] } = {}) {
    const my = ++seq;
    saying?.stop();
    const speak = state.voiceOn && lines.length;
    if (!(chime && state.chimeOn) && !speak) return;
    tools.playback.ignoreFor(speak ? 8 : 3);
    if (chime && state.chimeOn) {
      audio.chime(state.chime);
      await wait(speak ? CHIME_TO_VOICE : CHIME_GAP);
    }
    if (my !== seq || !speak) return;
    saying = audio.clips(lines.map((l) => voiceUrl(state.voice, l)), voiceGain(state.voiceVolume));
    await saying.done;
    saying = null;
    if (my === seq) tools.playback.ignoreFor(0.6); // the voice's tail in the room
  }
  function hush() { seq++; saying?.stop(); saying = null; }

  /** An item ended (or was skipped): the next begins, or the routine's time is up. */
  function changes(list_) {
    const last = list_.at(-1);
    if (!last) return;
    if (last.type === 'changed') {
      cues.changed(last.done, last.next);
      announce({ chime: true, lines: voiceLines.changed(last.done, last.next) });
      const tool = toolFor(last.next);
      if (tool) showCard(tool);
      render();
    } else {
      cues.finished(last.done);
      endWhenFree(last.done);
    }
  }

  /**
   * The routine's time is up. Everything stops, unless a take is on the go:
   * then everything carries on until it has been recorded, the metronome and
   * the drone stop, and the take plays back; the routine ends after that.
   */
  let lastItem = null;
  function endWhenFree(done) {
    lastItem = done;
    if (state.tools.playback && tools.playback.busy()) {
      finishing = true;
      calm = 0;
      showCard('playback');
      readout();
      return;
    }
    finish();
  }
  function finishingTick() {
    const s = tools.playback.status().state;
    if (s !== 'recording') stopTools(['metronome', 'drone']); // the take is in: let it be heard
    calm = tools.playback.busy() ? 0 : calm + 1;
    if (calm >= 3) finish();
  }
  function finish() {
    finishing = false;
    stopTools();
    clearInterval(ticker);
    cancelAnimationFrame(frame);
    audio.running(false);
    run = null;
    finishedNote = true;
    announce({ chime: true, lines: voiceLines.finished(lastItem) });
    render();
  }

  function tick() {
    if (!run) return;
    if (finishing) finishingTick();
    else changes(run.tick(Date.now()));
    if (run) readout();
  }

  function start() {
    if (!items.length) return;
    setEditing(false);
    run = new TimerRun(items);
    finishing = false;
    finishedNote = false;
    cues.started(run.item);
    // Everything it may say or ring, decoded ahead so nothing waits on the network.
    if (state.voiceOn) audio.preload([...new Set(items.flatMap((it, i) => [...voiceLines.started(it), ...voiceLines.changed(it, items[i + 1] || it), ...voiceLines.finished(it)]))].map((l) => voiceUrl(state.voice, l)));
    if (state.chimeOn) audio.preload([chimeUrl(state.chime)]);
    announce({ lines: voiceLines.started(run.item) });
    startTools();
    clearInterval(ticker);
    ticker = setInterval(tick, 250);
    audio.running(true);
    render();
    showCard(toolFor(run.item) || TOOLS.find((t) => state.tools[t]) || TOOLS[0], false);
    showDots();
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(animate);
  }

  function stop() {
    if (!run) return;
    hush();
    stopTools();
    clearInterval(ticker);
    cancelAnimationFrame(frame);
    audio.running(false);
    run = null;
    finishing = false;
    render();
  }

  function pauseOrResume() {
    if (!run || finishing) return;
    if (run.paused) {
      run.resume();
      startTools();
      audio.running(true);
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(animate);
    } else {
      run.pause();
      hush();
      stopTools();
      audio.running(false);
    }
    readout();
  }

  $('timer-go').addEventListener('click', start);
  $('trun-go').addEventListener('click', pauseOrResume);
  $('trun-skip').addEventListener('click', () => { if (run && !finishing) changes(run.tick(Date.now(), true)); if (run) readout(); });
  $('trun-stop').addEventListener('click', stop);
  // Coming back to the page (a phone woken up), catch up at once.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    tick();
    if (run && !frame) frame = requestAnimationFrame(animate);
  });

  render();

  return {
    /** Leaving the screen stops a routine, as leaving the Metronome stops it. */
    leave: () => { stop(); setEditing(false); undo = null; $('timer-toast').hidden = true; },
    enter: () => render(),
    /** A tool changed elsewhere (the Drone's note, say): show it. */
    refresh: () => { if (run) showCards(); },
    get running() { return !!run; },
  };
}
